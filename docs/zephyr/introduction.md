---
title: Zephyr 简介
date: 2026-11-19
order: 1
---

# Zephyr 简介

Zephyr 是 Linux 基金会托管的开源实时操作系统（RTOS），采用 Apache 2.0 协议，面向资源受限的嵌入式设备。本文简单介绍它是什么、和 FreeRTOS 有什么不同，以及入门需要先了解的几个概念。

## Q: Zephyr 是什么？

Zephyr 不只是一个内核，而是一整套嵌入式软件平台：

- **内核**：线程、调度、信号量、消息队列、定时器等 RTOS 基础功能；
- **驱动**：GPIO、I2C、SPI、UART、显示、传感器等，使用统一的驱动接口；
- **协议栈**：蓝牙、TCP/IP、USB、文件系统、日志、Shell 等；
- **构建系统**：基于 CMake，由 `west` 工具统一管理代码仓库、编译和烧录。

它支持 ARM、RISC-V、Xtensa、x86 等多种架构，官方仓库里有上千块开发板的支持文件，乐鑫 ESP32 系列、Nordic nRF 系列、STM32 等都在其中。

## Q: Zephyr 和 FreeRTOS 有什么区别？

| 对比项 | FreeRTOS | Zephyr |
|---|---|---|
| 范围 | 主要是内核，驱动和协议栈由芯片厂商的 SDK 提供 | 内核 + 驱动 + 协议栈 + 构建系统，一套全包 |
| 硬件描述 | 写在代码里，换板子要改代码 | 用 **Devicetree** 描述，换板子主要改配置 |
| 功能裁剪 | `FreeRTOSConfig.h` 宏定义 | 用 **Kconfig** 配置，和 Linux 内核一样 |
| 驱动接口 | 每家厂商不同 | 统一的 API，同一份应用代码可以跑在不同芯片上 |
| 上手难度 | 低，几个源文件就能跑 | 较高，要先熟悉 west、Kconfig、Devicetree |

简单来说，Zephyr 的思路和 Linux 很像：**硬件用 Devicetree 描述，功能用 Kconfig 选择，应用只调用统一的驱动 API**。

## Q: 一个 Zephyr 应用由哪些文件组成？

以官方示例 `samples/basic/blinky`（LED 闪烁）为例：

```text
blinky/
├── CMakeLists.txt   # 构建脚本
├── prj.conf         # Kconfig 配置，例如 CONFIG_GPIO=y
├── boards/          # 针对特定板子的配置或 Devicetree overlay（可选）
└── src/
    └── main.c       # 应用代码
```

`main.c` 中不出现具体的引脚号，LED 接在哪个引脚由板子的 Devicetree 决定：

```c
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>

// 从 Devicetree 中找到别名为 led0 的节点，取出它的 GPIO 信息
#define LED0_NODE DT_ALIAS(led0)
static const struct gpio_dt_spec led = GPIO_DT_SPEC_GET(LED0_NODE, gpios);

int main(void)
{
    if (!gpio_is_ready_dt(&led)) {
        return 0;
    }
    gpio_pin_configure_dt(&led, GPIO_OUTPUT_ACTIVE);

    while (1) {
        gpio_pin_toggle_dt(&led);
        k_msleep(1000);
    }
    return 0;
}
```

同一份代码换到另一块板子上，只要那块板子的 Devicetree 里定义了 `led0`，就可以直接编译运行。

## Q: 入门需要先掌握哪几个概念？

| 概念 | 作用 | 对应文件 |
|---|---|---|
| **west** | 命令行工具，管理多个代码仓库，以及编译、烧录、调试 | `west.yml` |
| **Kconfig** | 选择要编译进来的功能和参数 | `prj.conf`、`Kconfig` |
| **Devicetree** | 描述板子上有哪些硬件、接在哪些引脚 | `.dts`、`.dtsi`、`.overlay` |
| **设备驱动模型** | 应用通过 Devicetree 宏拿到设备，再调用统一 API | `DT_*` 宏、`device_is_ready()` |
| **内核对象** | 线程、信号量、消息队列等 | `k_thread_*`、`k_sem_*`、`k_msgq_*` |

建议的学习顺序：先跑通 blinky，再分别理解 Kconfig 和 Devicetree，然后看驱动和内核对象。

## 参考资料

- [Zephyr 官方文档](https://docs.zephyrproject.org/latest/)
- [Zephyr 源码](https://github.com/zephyrproject-rtos/zephyr)：`samples/basic/blinky`
