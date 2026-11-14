---
title: IO MUX 与 GPIO 交换矩阵
date: 2026-11-13
order: 1
---

# IO MUX 与 GPIO 交换矩阵

ESP32 系列芯片的外设信号（如 UART TX、SPI CLK）和芯片引脚之间，有两条连接路径：**IO MUX** 和 **GPIO 交换矩阵**（GPIO Matrix）。理解这两者，就能明白为什么 ESP32 的大部分外设可以"任意选引脚"。

## Q: IO MUX 和 GPIO 交换矩阵分别是什么？

```text
            ┌──────────── IO MUX（直连，固定引脚）────────────┐
外设信号 ──┤                                                    ├── 引脚
            └── GPIO 交换矩阵（可映射到任意引脚）── IO MUX ──┘
```

- **IO MUX**：每个引脚有几个固定的复用功能，选择其中一个，外设信号就**直连**到这个引脚。路径短、延迟小，但引脚是固定的；
- **GPIO 交换矩阵**：一个全交换的开关矩阵，可以把**任意外设信号连接到任意 GPIO**。所有引脚最终都经过 IO MUX，选择"GPIO 功能"时信号就来自交换矩阵。

| 对比项 | IO MUX | GPIO 交换矩阵 |
|---|---|---|
| 引脚选择 | 固定，只能用手册规定的引脚 | 任意 GPIO |
| 延迟 | 小 | 稍大，经过了矩阵 |
| 适用 | 高速信号，如 SPI Flash、SDIO、以太网 | 大多数普通外设，如 UART、I2C、PWM |

## Q: 为什么高速信号要用 IO MUX？

经过交换矩阵会多一段延迟。在 **ESP32**（初代）上这个延迟比较明显：SPI 主机读取从机数据时，用 IO MUX 引脚最高约 80 MHz，用交换矩阵引脚只有约 26 MHz。ESP-IDF 文档说明，ESP32 之后的芯片没有明显的这种延迟。

所以 SPI Flash、PSRAM、SDIO、以太网 RMII 这类高速接口，通常要用手册规定的 IO MUX 引脚。

## Q: 在 ESP-IDF 中怎么选择这两条路径？

一般**不需要手动选择**，驱动会自动处理。例如初始化 SPI 总线时，如果填写的引脚正好都是该 SPI 的 IO MUX 引脚，驱动就走 IO MUX，否则走 GPIO 交换矩阵。

需要手动连接信号时，可以调用 ROM 函数通过交换矩阵连接：

```c
#include "esp_rom_gpio.h"
#include "soc/gpio_sig_map.h"

// 把 UART0 的 TX 信号输出到 GPIO 4
esp_rom_gpio_connect_out_signal(4, U0TXD_OUT_IDX, false, false);

// 把 GPIO 5 的输入连接到 UART0 的 RX 信号
esp_rom_gpio_connect_in_signal(5, U0RXD_IN_IDX, false);
```

信号编号（如 `U0TXD_OUT_IDX`）定义在各芯片的 `soc/gpio_sig_map.h` 中。
