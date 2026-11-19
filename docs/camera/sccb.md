---
title: SCCB 与 I2C
date: 2026-11-19
order: 3
---

# SCCB 与 I2C

SCCB 全称 **Serial Camera Control Bus（串行摄像头控制总线）**，是 OmniVision（豪威）为摄像头传感器定义的寄存器配置接口。

电气和时序上它**基本就是 I2C**：SIO_C、SIO_D 对应 SCL、SDA，起始 / 停止条件、7 位设备地址、8 位数据都相同，主控直接用 I2C 控制器驱动即可。

## 和 I2C 的差别

| 项 | I2C | SCCB |
|---|---|---|
| 第 9 位 | ACK，从机必须应答 | Don't-Care 位，主机可以不检查 |
| 读寄存器 | 写寄存器地址后，用重复起始（Repeated Start）转为读 | 规范写法：写寄存器地址后发 STOP，再重新 START 读 |
| 读结束 | 主机发 NACK | 主机发 NA 位（高电平），等同 NACK |
| 线数 | 2 线 | 早期还有 3 线版本，多一根 SCCB_E 片选 |
| 多主机 / 仲裁 / 时钟拉伸 | 支持 | 只考虑单主机 |

- 寄存器地址宽度因传感器而异：OV2640 是 8 位，OV5640 是 16 位。
- 另起名字的常见说法是当年 I2C 是飞利浦的商标，使用需要授权，这一点没有官方文件证实。

## 实际使用

大多数传感器会正常回 ACK、也支持重复起始，当 I2C 用没有问题。容易出问题的是**读寄存器**：个别传感器不认重复起始，需要改成"写地址 → STOP → START → 读"两段式。

esp32-camera 的 `driver/sccb-ng.c` 就是这样兼容的：先用重复起始读，失败后再退回两段式。

```c
// 先尝试重复起始读
ret = i2c_master_transmit_receive(dev, &reg, 1, &val, 1, TIMEOUT_MS);
if (ret != ESP_OK) {
    // 退回两段式：写地址并 STOP，再单独读
    i2c_master_transmit(dev, &reg, 1, TIMEOUT_MS);
    i2c_master_receive(dev, &val, 1, TIMEOUT_MS);
}
```

## 参考资料

- [esp32-camera](https://github.com/espressif/esp32-camera)：`driver/sccb-ng.c`
