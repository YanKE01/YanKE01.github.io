---
title: 查看 USB 设备信息
date: 2026-11-13
order: 2
---

# 查看 USB 设备信息

调试 USB 设备时，经常要确认电脑有没有识别到设备、VID/PID 是多少、加载了哪个驱动、对应哪个串口。本文整理 Linux 下查看 USB 设备信息的常用命令。描述符的含义见 [USB 描述符](/peripheral/usb/descriptors)。

## Q: 如何查看电脑识别到了哪些 USB 设备？

使用 `lsusb`：

```bash
lsusb
```

```text
Bus 001 Device 008: ID 303a:0012 Espressif ESP32-P4
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
```

- `Bus 001 Device 008`：设备挂在 1 号总线上，设备地址是 8，每次重新插拔地址都会变；
- `303a:0012`：VID 和 PID，`303a` 是乐鑫的 VID；
- `root hub`：电脑 USB 控制器自带的根集线器，不是外接设备。

## Q: 如何查看设备的接口、驱动和速率？

使用 `lsusb -t` 以树形显示：

```bash
lsusb -t
```

```text
/:  Bus 01.Port 1: Dev 1, Class=root_hub, Driver=xhci_hcd/16p, 480M
    |__ Port 5: Dev 8, If 0, Class=Communications, Driver=cdc_acm, 12M
    |__ Port 5: Dev 8, If 1, Class=CDC Data, Driver=cdc_acm, 12M
    |__ Port 5: Dev 8, If 2, Class=Application Specific Interface, Driver=, 12M
```

- 同一个设备（Dev 8）有 3 个接口（If 0 ~ 2），说明这是一个**复合设备**；
- `Driver`：每个接口加载的驱动，`cdc_acm` 是 USB 虚拟串口驱动，为空表示没有驱动接管；
- 最后一列是速率：`12M` 为全速，`480M` 为高速。

## Q: 如何查看设备的完整描述符？

用 `-v` 并以 `-d VID:PID` 指定设备：

```bash
sudo lsusb -v -d 303a:0012
```

会按层次打印设备描述符、配置描述符、接口描述符和端点描述符的每个字段，例如 `iProduct`、`bNumInterfaces`、`bEndpointAddress` 等。不加 `sudo` 时部分字符串描述符可能读不出来。

## Q: 插上设备后，如何知道它对应哪个串口？

插拔设备时实时查看内核日志：

```bash
sudo dmesg -w
```

```text
usb 1-5: new full-speed USB device number 8 using xhci_hcd
usb 1-5: New USB device found, idVendor=303a, idProduct=0012, bcdDevice= 9.12
usb 1-5: New USB device strings: Mfr=1, Product=2, SerialNumber=3
usb 1-5: Product: ESP32-P4
usb 1-5: Manufacturer: Espressif
cdc_acm 1-5:1.0: ttyACM0: USB ACM device
```

- `New USB device strings: Mfr=1, Product=2, SerialNumber=3`：设备描述符中厂商名、产品名、序列号的字符串索引；
- 最后一行说明这个设备对应 `/dev/ttyACM0`。CDC 设备通常是 `ttyACM*`，CH340、CP2102 等 USB 转串口芯片通常是 `ttyUSB*`。

串口号会随插拔顺序变化，可以用 `/dev/serial/by-id/` 下的固定名称，它由厂商名、产品名和序列号组成：

```bash
ls -l /dev/serial/by-id/
```
