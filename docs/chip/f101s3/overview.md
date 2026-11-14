---
title: 性能概览
date: 2026-11-13
order: 1
---

# F101S3 性能概览

F101S3 是全志（Allwinner）的一款 RISC-V 多媒体芯片，单核玄铁 C907，内置 16 MiB PSRAM，能直接驱动 RGB / LVDS / MIPI DSI 屏幕。本文是芯片性能的简单概览，数据来自 [YuzukiNeko](https://github.com/YuzukiHD/YuzukiNeko) 开发板的说明。

## Q: F101S3 的性能参数是怎样的？

**核心与存储**

| 项目 | 参数 |
|---|---|
| CPU | 平头哥玄铁 C907，RISC-V 单核 |
| 缓存 | 32 KB 指令缓存 + 16 KB 数据缓存 |
| 内存 | 内置 16 位 PSRAM：F101S3 为 16 MiB，F101S4 为 32 MiB，无外部 DDR |
| 存储 | 外挂 SPI NOR Flash，支持 XIP |
| 封装 | QFN68，7 mm × 7 mm |

**多媒体**

| 项目 | 参数 |
|---|---|
| 图片解码 | JPEG 最大 16384 × 16384，PNG 最大 2048 × 2048 |
| 编码 | JPEG / MJPEG 最高 720p@30fps |
| 显示处理 | 去隔行最高 720p@60fps，G2D 旋转与混合加速 |
| RGB 输出 | 最高 1280 × 720@60fps |
| LVDS 输出 | 单通道，最高 1366 × 768@60fps |
| MIPI DSI 输出 | 4 lane，最高 1280 × 800@60fps |
| 音频 | DAC 输出、I2S/PCM、OWA（S/PDIF）输出 |

**接口**

| 项目 | 数量 |
|---|---|
| USB 2.0 DRD（可做设备或主机） | 1 |
| SDIO 2.0 | 1 |
| UART / SPI / TWI（I2C） | 6 / 2 / 3 |
| CAN | 2 |
| 其他 | PWM、红外接收、GPADC、TPADC（触摸屏 ADC） |
| 安全 | 512 bit eFuse |

内存集成在芯片内部，板子上不需要布 DDR，用 QFN 封装就能做出带屏幕的产品，适合小尺寸的显示类设备。

## 参考资料

- [YuzukiNeko 开发板](https://github.com/YuzukiHD/YuzukiNeko)
