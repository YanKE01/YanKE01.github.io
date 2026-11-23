---
title: ESP-IDF 的启动流程与中断分配
date: 2026-11-19
order: 2
---

# ESP-IDF 的启动流程与中断分配

开发 STM32 时，启动文件 `startup_stm32xxx.s` 和中断向量表是绕不开的；但用 ESP-IDF 时几乎碰不到它们。原因是 IDF 把这两件事拆开、藏进了框架里。本文对照 STM32 介绍它们在 ESP-IDF 里的位置，源码基于 **ESP-IDF v5.5.4**，路径都相对于 `esp-idf/components/`。

::: tip 一句话总结
- **启动**：STM32 启动文件做的事，在 ESP32 上由 ROM、二级 bootloader 和 `call_start_cpu0` 三段分担，最后以 FreeRTOS 任务的形式调用 `app_main()`；
- **中断**：外设中断先经过可编程的**中断矩阵**接到 CPU 的 32 条中断线上，处理函数在运行时用 `esp_intr_alloc()` 注册，而不是写一个固定名字的 `XXX_IRQHandler`。
:::

## STM32 的启动文件做了什么

上电后，Cortex-M 从向量表第 0 项取出栈顶地址，从第 1 项取出 `Reset_Handler` 地址，然后：

1. 设置栈指针 SP；
2. 把 `.data` 段的初值从 Flash 拷贝到 RAM；
3. 把 `.bss` 段清零；
4. 调用 `SystemInit()` 配置时钟；
5. 跳转到 `main()`。

## ESP32 的三段启动

```text
① 一级 bootloader（固化在芯片 ROM，不可修改）
   读取 strapping 引脚，决定从 Flash 启动还是进入下载模式
   把二级 bootloader 从 Flash 读进 RAM 并跳转
        │
② 二级 bootloader（IDF 编译生成，ESP32/S2 烧在 0x1000，S3/C3 等烧在 0x0，P4 在 0x2000）
   读取分区表，选出要运行的 app 分区（OTA 就在这里选）
   把 app 镜像中需要放进 RAM 的段装入 IRAM / DRAM，
   放在 Flash 中的代码和常量通过 MMU / Cache 映射，不拷贝
   跳转到 app 入口 call_start_cpu0
        │
③ app 启动（IDF 的 esp_system 组件）
   call_start_cpu0 → start_cpu0 → esp_startup_start_app
   → 创建 main 任务 → app_main()
```

## 二级 bootloader 做了什么

二级 bootloader 的入口在 `bootloader/subproject/main/bootloader_start.c`，函数名也叫 `call_start_cpu0`（和 app 的入口同名，但它们是两个独立编译的程序）。主干只有三步：

```c
// bootloader/subproject/main/bootloader_start.c（节选）
void call_start_cpu0(void)
{
    bootloader_init();                              // 1. 硬件初始化
    int boot_index = select_partition_number(&bs);  // 2. 读分区表，选启动分区
    bootloader_utility_load_boot_image(&bs, boot_index); // 3. 加载、校验 app 并跳转
}
```

**1. 硬件初始化**（`bootloader_support/src/<芯片>/bootloader_<芯片>.c` 中的 `bootloader_init()`）

- 清零 bootloader 自己的 `.bss`；
- 配置时钟，初始化串口，打印 `2nd stage bootloader` 横幅；
- 初始化 Cache 和 MMU，读取 Flash ID，按 bootloader 镜像头中的 Flash 模式和频率配置 SPI Flash；
- 检查上次是不是看门狗复位，配置看门狗，打开随机数熵源。

**2. 选择启动分区**

- 从 Flash 的 `0x8000`（默认，`CONFIG_PARTITION_TABLE_OFFSET`）读出分区表；
- 有 `otadata` 分区时，按其中记录的 OTA 序号选择 `ota_0` / `ota_1` 等；没有则启动 `factory` 分区；
- 如果配置了恢复出厂设置，这里还会检查某个 GPIO 是否被长按。

**3. 加载、校验并跳转**（`bootloader_support/src/bootloader_utility.c` 和 `esp_image_format.c`）

app 的 `.bin` 不是一整块代码，而是由镜像头和若干个**段**组成的：

```text
app.bin
├── 镜像头：魔数 0xE9、段数、入口地址 entry_addr
├── 段 0：加载地址 + 长度 + 数据
├── 段 1：...
├── ...
├── 校验和
└── SHA-256 哈希（默认附加）
```

bootloader 逐段读取，按段的**加载地址**决定怎么处理：

| 加载地址落在 | 典型内容 | 处理方式 |
|---|---|---|
| IRAM | `IRAM_ATTR` 函数、中断向量表 | **load**：从 Flash 拷贝到 IRAM |
| DRAM | `.data` | **load**：拷贝到 DRAM，这就是 app 不需要再拷 `.data` 的原因 |
| RTC 内存 | `RTC_DATA_ATTR` 变量等 | load（深度睡眠唤醒时不覆盖） |
| IROM（Flash 映射的指令区） | 普通函数 `.text` | **map**：不拷贝，稍后用 MMU 映射 |
| DROM（Flash 映射的数据区） | 常量 `.rodata` | **map** |

逐段处理的同时计算校验和与 SHA-256；开启 Secure Boot 时还要验证签名。校验失败就尝试下一个可启动的分区。首次启动且开启了 Flash 加密 / Secure Boot 时，还会在这一步烧写 eFuse、就地加密 Flash。

最后 `set_cache_and_start_app()` 配置 MMU，把 Flash 中的 IROM、DROM 段映射到 CPU 地址空间，使能 Cache，然后跳到镜像头里的 `entry_addr`，也就是 app 的 `call_start_cpu0`。app 的入口由链接脚本指定：

```text
// esp_system/ld/esp32s3/sections.ld.in
ENTRY(call_start_cpu0);
```

这个过程在开机日志里看得很清楚（ESP32-S3 示意，地址和大小因工程而异）：

```text
I (26) boot: ESP-IDF v5.5.4 2nd stage bootloader
I (60) boot: Partition Table:
I (63) boot: ## Label            Usage          Type ST Offset   Length
I (69) boot:  0 nvs              WiFi data        01 02 00009000 00006000
I (76) boot:  1 phy_init         RF data          01 01 0000f000 00001000
I (82) boot:  2 factory          factory app      00 00 00010000 00100000
I (95) esp_image: segment 0: paddr=00010020 vaddr=3c020020 size=0a8c0h ( 43200) map
I (110) esp_image: segment 1: paddr=0001a8e8 vaddr=3fc92e00 size=02a90h ( 10896) load
I (114) esp_image: segment 2: paddr=0001d380 vaddr=40374000 size=02c98h ( 11416) load
I (120) esp_image: segment 3: paddr=00020020 vaddr=42000020 size=1a1d4h (106964) map
I (145) esp_image: segment 4: paddr=0003a1fc vaddr=40376c98 size=0c0b8h ( 49336) load
I (162) boot: Loaded app from partition at offset 0x10000
```

`vaddr` 以 `0x3C` 开头的是 DROM、`0x42` 开头的是 IROM，后面标 `map`；`0x3FC` 开头的是 DRAM、`0x4037` 开头的是 IRAM，后面标 `load`。

## 和 Reset_Handler 逐项对照

| STM32 `Reset_Handler` | ESP-IDF 中的位置 |
|---|---|
| 入口地址（向量表第 1 项） | 链接脚本里的 `ENTRY(call_start_cpu0)`，由二级 bootloader 跳转过来 |
| 设置 SP | bootloader 已准备好栈，`call_start_cpu0` 一开始就是 C 代码 |
| 拷贝 `.data` | **app 中没有这一步**，二级 bootloader 装载镜像时已把 `.data` 写入 DRAM |
| 清零 `.bss` | `esp_system/port/cpu_start.c` 的 `init_bss()`；深度睡眠唤醒时保留 RTC 内存中的 `.bss` |
| 设置向量表地址（`SCB->VTOR`） | `init_cpu()` 中的 `esp_cpu_intr_set_ivt_addr(&_vector_table)` |
| `SystemInit()` | `cache_init()`、`sys_rtc_init()`、`mspi_init()`（Flash / PSRAM 的 SPI 接口），随后在 `esp_clk_init()` 中配置时钟 |
| 跳转 `main()` | `freertos/app_startup.c` 创建 `main` 任务，在任务中调用 `app_main()` |

`call_start_cpu0` 本身很短，主干如下：

```c
// esp_system/port/cpu_start.c（节选）
void IRAM_ATTR call_start_cpu0(void)
{
    init_cpu();                 // 设置向量表地址等
    get_reset_reason(rst_reas);
    init_bss(rst_reas);         // 清零 .bss
    cache_init();               // 初始化 Cache，之后才能访问 Flash 映射的代码
    sys_rtc_init(rst_reas);
    mspi_init();                // Flash 调频、PSRAM 初始化
    system_early_init(rst_reas);// 包括唤醒 CPU1
    SYS_STARTUP_FN();           // → start_cpu0()
}
```

`start_cpu0()`（`esp_system/startup.c`）再分两个阶段执行用 `ESP_SYSTEM_INIT_FN` 注册的初始化函数（堆、看门狗、日志、Flash 驱动等），清单和优先级见 `esp_system/system_init_fn.txt`，最后调用 `esp_startup_start_app()` 启动 FreeRTOS 调度器。

与 STM32 相比，有两点明显不同：

- **`app_main` 运行时 FreeRTOS 已经启动**，它只是一个普通任务（`main` 任务），可以 `return`，返回后只是这个任务被删除，系统照常运行；
- **双核启动**：CPU0 完成早期初始化后，把 CPU1 的入口设为 `call_start_cpu1` 并释放它，两个核再各自完成初始化。`cpu_start.c` 中 `call_start_cpu0` 上方的注释有一张流程图。

开机日志里的 `cpu_start: ...`、`main_task: Calling app_main()` 等打印，都可以和这条链路一一对应。

## 中断：多了一层中断矩阵

STM32 的向量表是一个**函数指针数组**，每个外设中断占一项，默认处理函数用 `.weak` 定义，写一个同名的 `USART1_IRQHandler` 就会覆盖它，属于编译期的静态绑定。

ESP32 在外设和 CPU 之间多了一层**中断矩阵（Interrupt Matrix）**：

```text
外设中断源                         CPU 中断线（每个核 32 条）
ETS_UART0_INTR_SOURCE         ──┐
ETS_GPIO_INTR_SOURCE          ──┼──► 中断矩阵 ──► CPU0 中断 0～31
ETS_TG0_T0_LEVEL_INTR_SOURCE  ──┘   （可编程）     CPU1 中断 0～31
...
```

- 外设中断源定义在 `soc/<芯片>/include/soc/interrupts.h`，相当于 STM32 的 `IRQn_Type`；
- 每个核只有 32 条 CPU 中断线（`soc_caps.h` 中的 `SOC_CPU_INTR_NUM`），远少于外设中断源，因此要**在运行时**决定把哪个外设接到哪个核的哪条线上。

这和 [IO MUX 与 GPIO 交换矩阵](/chip/espressif/iomux-gpio-matrix) 的思路相同：用一个可编程的矩阵，让有限的资源灵活连接。

## 向量表和中断向量表是一回事吗

基本是一回事，只是叫法不同。严格地说，它是**异常向量表**：异常（Exception）是 CPU 打断正常执行流程的统称，中断只是其中由外部事件触发的一类。

- **Cortex-M**：表的第 0 项是初始栈顶地址（不是向量），第 1～15 项是系统异常（Reset、NMI、HardFault、SVCall、PendSV、SysTick 等），第 16 项开始才是外设中断 IRQ0、IRQ1……习惯上把整张表叫"中断向量表"；
- **ESP-IDF**：代码里叫 `_vector_table`，设置它的那行注释写的是 "Move exception vectors to IRAM"。表里同样既有异常入口，也有中断入口。

真正需要区分的是下面三样东西：

| 名称 | 是什么 | 由谁设置 |
|---|---|---|
| 向量表 `_vector_table` | CPU 发生异常或中断时**硬件跳转**的入口，放的是汇编指令 | 启动时 `esp_cpu_intr_set_ivt_addr()` 设置一次，之后不变 |
| 中断处理函数表 | 一个 C 数组，记录每条 CPU 中断线对应的处理函数和参数，由公共入口**软件查表**调用（Xtensa 为 `_xt_interrupt_table`，RISC-V 为 `riscv/interrupt.c` 中的 `s_intr_handlers`） | 运行时由 `esp_intr_alloc()` 填写 |
| 中断矩阵 | 硬件路由，决定哪个外设中断源接到哪个核的哪条中断线 | 运行时由 `esp_intr_alloc()` 配置 |

STM32 把这三样合在一起了：向量表里直接存 C 函数地址，外设中断号和表项一一对应，也就不需要路由。

## 向量表长什么样

ESP32 的向量表也不是"每个外设一项"，而是**所有中断进入同一个公共入口**，再查一张软件表：

- **RISC-V 内核**（ESP32-C3、C6、P4 等）：`riscv/vectors_intc.S` 中的 `_vector_table`，每一项都是一条跳转指令。第 0 项跳到异常处理 `_panic_handler`，其余都跳到 `_interrupt_handler`，后者保存现场、读出中断号，再从软件表中取出处理函数调用；

  ```asm
  _vector_table:
      j _panic_handler        /* 0: Exception entry */
      j _interrupt_handler    /* 1: Free interrupt number */
      j _interrupt_handler    /* 2: Free interrupt number */
      ...
  ```

- **Xtensa 内核**（ESP32、ESP32-S3）：`xtensa/xtensa_vectors.S` 按中断优先级设置入口（如 `_xt_lowint1`、`_Level2Vector`），同样再查软件表 `_xt_interrupt_table`。

所以在 ESP-IDF 中**不存在固定名字的中断函数**，处理函数需要在运行时填入软件表。

## esp_intr_alloc：运行时注册中断

`esp_intr_alloc()` 相当于把 STM32 的"写 `XXX_IRQHandler` + `NVIC_SetPriority()` + `NVIC_EnableIRQ()`"合成了一步：

```c
#include "esp_intr_alloc.h"

static void IRAM_ATTR my_isr(void *arg)
{
    // 清除外设中断标志，处理事件
}

esp_intr_handle_t handle;
esp_intr_alloc(ETS_GPIO_INTR_SOURCE,                      // 外设中断源
               ESP_INTR_FLAG_LEVEL1 | ESP_INTR_FLAG_IRAM, // 优先级、ISR 放在 IRAM
               my_isr, NULL, &handle);
```

内部实现在 `esp_hw_support/intr_alloc.c`，主要四步：

1. `get_available_int()`：在当前核上找一条空闲、优先级合适的 CPU 中断线；
2. `esp_cpu_intr_set_handler()`：把 `my_isr` 填入软件表；
3. `esp_rom_route_intr_matrix(cpu, source, intr)`：配置中断矩阵，把外设中断源接到这条线上；
4. `ESP_INTR_ENABLE(intr)`：使能这条 CPU 中断线。

几个 STM32 上没有的概念：

| 概念 | 说明 |
|---|---|
| 在哪个核注册，就在哪个核响应 | 中断分配到调用 `esp_intr_alloc()` 的那个核；想让中断在 CPU1 上处理，就在 CPU1 上的任务中注册 |
| 共享中断 `ESP_INTR_FLAG_SHARED` | 多个中断源共用一条 CPU 中断线，触发后依次调用各自的处理函数 |
| IRAM 中断 `ESP_INTR_FLAG_IRAM` | 擦写 Flash 时 Cache 会被关闭，放在 Flash 中的代码无法执行。ISR 及其访问的数据放在 IRAM / DRAM 中（函数加 `IRAM_ATTR`），中断才能在此期间继续响应 |

## 为什么平时碰不到

平时使用驱动时，连 `esp_intr_alloc()` 都不需要直接调用。驱动的安装函数会在内部完成中断分配，用户只需提供回调：

| 驱动 | 内部分配中断的接口 | 用户提供的 |
|---|---|---|
| GPIO | `gpio_install_isr_service()` | `gpio_isr_handler_add()` 注册的回调 |
| UART | `uart_driver_install()` | 无，从事件队列中读取 |
| GPTimer | `gptimer_register_event_callbacks()` | 注册的回调函数 |

这就是在 ESP-IDF 中几乎不需要关心启动文件和中断向量表的原因。

## 源码阅读顺序

1. `esp_system/port/cpu_start.c`：先看 `call_start_cpu0` 上方的流程图注释，再看函数本身；
2. `esp_system/startup.c`：`start_cpu0_default()`，看初始化阶段的顺序；
3. `esp_system/system_init_fn.txt`：启动阶段注册的初始化函数清单；
4. `riscv/vectors_intc.S` 或 `xtensa/xtensa_vectors.S`：向量表；
5. `esp_hw_support/intr_alloc.c`：`esp_intr_alloc_intrstatus_bind()`，即上面的四步。

## 参考资料

- ESP-IDF 编程指南：[应用程序的启动流程](https://docs.espressif.com/projects/esp-idf/zh_CN/stable/esp32s3/api-guides/startup.html)
- ESP-IDF 编程指南：[中断分配](https://docs.espressif.com/projects/esp-idf/zh_CN/stable/esp32s3/api-reference/system/intr_alloc.html)
- ESP-IDF v5.5.4 源码：`components/esp_system`、`components/esp_hw_support`、`components/riscv`、`components/xtensa`
