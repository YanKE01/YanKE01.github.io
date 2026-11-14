---
title: YuzukiNeko 子板
date: 2026-11-13
order: 2
---

# YuzukiNeko 子板

[YuzukiNeko](https://github.com/YuzukiHD/YuzukiNeko) 是一块基于全志 F101S3 的开发板。

## 硬件设计

### 引脚分配

子板外设组合为：两通道 MIPI 屏 + 触摸 + SHT20 温湿度传感器 + ESP32-C3 SPI Wi-Fi。引脚名称按 Neko V1.4 丝印。

| 功能 | F101 接口 | 引脚 | 连接对象 |
|---|---|---|---|
| LCD 图像 | 两通道 MIPI DSI | PD12/PD13 = D0+/D0−，PD14/PD15 = D1+/D1−，PD16/PD17 = CLK+/CLK− | LCD 转接板 J3 |
| LCD 复位 | GPIO | PD9 = LCD_RST（低有效） | LCD 转接板 J6-6 |
| LCD 背光 | PWM0 通道 2 | PD22（高有效） | LCD 转接板 J6-5 LED_CTRL |
| 触摸通信 | I2C0（TWI0） | PE8 = SCL，PE9 = SDA | LCD 转接板 J3-11/J3-12 |
| 触摸控制 | GPIO | PD8 = TP_INT，PE4 = TP_RST | LCD 转接板 J6-7/J6-8 |
| 外部传感器 | I2C2（TWI2） | PB2 = SCL，PB3 = SDA | SHT20 |
| Wi-Fi 数据 | SPI1（F101 为主机） | PE0 = CS0，PE1 = CLK，PE2 = MOSI，PE3 = MISO | ESP32-C3 GPIO10/6/7/2 |
| Wi-Fi 控制 | GPIO | PD6 = Handshake，PD7 = Data Ready，PD4 = EN/Reset | ESP32-C3 GPIO3/GPIO4/EN |
| 调试串口 | UART1 | PB0 = TX，PB1 = RX | USB 转串口 |

### LCD

1. LCD 引脚定义

![LCD 引脚定义](/images/chip/f101s3/yuzukineko-daughterboard/lcd_pin.png)

## 参考设计

### 高信 LCD 开发板

![LCD](/images/chip/f101s3/yuzukineko-daughterboard/lcd_ref.png)

### P4 LCD 子板

![P4 LCD](/images/chip/f101s3/yuzukineko-daughterboard/lcd_p4_ref.png)

## 参考资料

- [YuzukiNeko 开发板](https://github.com/YuzukiHD/YuzukiNeko)
