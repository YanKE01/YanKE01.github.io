---
title: 8. USB 设备判断主机操作系统
date: 2026-11-19
order: 8
---

# 8. USB 设备判断主机操作系统

有些产品插到 Windows 上要枚举成 U 盘（MSC），插到 Linux 上要枚举成串口（CDC），这就需要设备自己判断主机是什么系统。本文以 esp_demos 中的示例 `examples/usb/device/usb_host_os_detect` 为例介绍原理。枚举和描述符的基础见 [USB 基础概念](/peripheral/usb/basics)、[USB 描述符](/peripheral/usb/descriptors)，`SET_CONFIGURATION` 等请求和设备状态见 [控制传输、标准请求与枚举](/peripheral/usb/requests)。

::: tip 一句话总结
**Windows 上没有厂商自定义设备（接口类 0xFF）的通用驱动。** 设备只暴露一个不带驱动信息的 vendor 接口：

- **Linux / macOS**：先给设备选好配置、发 `SET_CONFIGURATION`，再给接口找驱动，所以没有驱动也会配置；
- **Windows**：找不到驱动就不配置，设备停在配置 0。

设备看主机读完配置描述符后有没有发 `SET_CONFIGURATION`，就能区分两者。
:::

## 原理

USB 协议里没有"你是什么操作系统"这样的请求。设备只能**观察主机枚举自己时的行为差异**，像指纹一样推断出对方的系统。

## 指纹：是否发送 SET_CONFIGURATION

判断依据是：**主机会不会对一个没有驱动的设备发 `SET_CONFIGURATION`**。

设备只暴露一个"中性"的厂商自定义接口（接口类 0xFF），不带任何驱动信息。描述符简化如下：

```c
// 设备描述符：设备类不指定，由接口决定
static tusb_desc_device_t const desc_device = {
    .bDeviceClass       = TUSB_CLASS_UNSPECIFIED,   // 0x00
    .bDeviceSubClass    = 0x00,
    .bDeviceProtocol    = 0x00,
    .idVendor           = USB_VID,
    .idProduct          = USB_PID,
    .bNumConfigurations = 0x01,
    // ...
};

// 配置描述符：只有一个厂商自定义接口（接口类 0xFF），一对批量端点
enum { ITF_NUM_VENDOR = 0, ITF_NUM_TOTAL };
#define CONFIG_TOTAL_LEN  (TUD_CONFIG_DESC_LEN + TUD_VENDOR_DESC_LEN)

static uint8_t const desc_configuration[] = {
    TUD_CONFIG_DESCRIPTOR(1, ITF_NUM_TOTAL, 0, CONFIG_TOTAL_LEN, 0x00, 100),
    // 接口号, 字符串索引, OUT 端点, IN 端点, 端点大小
    TUD_VENDOR_DESCRIPTOR(ITF_NUM_VENDOR, 4, 0x01, 0x81, CFG_TUD_VENDOR_EPSIZE),
};
```

**为什么必须用厂商接口？** 这个方法依靠的是"主机能不能找到驱动"：

- CDC、HID、MSC 等标准类在 Windows 上都有系统自带驱动，Windows 找到驱动后同样会发 `SET_CONFIGURATION`，和 Linux 表现一样，就区分不出来了；
- 厂商接口在 Windows 上没有现成驱动，Windows 才会停下来；而 Linux / macOS 无论有没有驱动都会配置设备。

两种主机的行为如下：

| 主机 | 行为 |
|---|---|
| Linux / macOS | 即使没有驱动能接管，枚举时也照样发 `SET_CONFIGURATION`，设备进入已配置状态 |
| Windows | 读完配置描述符后，找不到驱动，就不发 `SET_CONFIGURATION`，设备停在配置 0 |

所以判断规则是：

```text
主机读取配置描述符（说明开始枚举）
  ├── 收到 SET_CONFIGURATION          → Linux / macOS / 其他
  └── 2000 ms 内没收到 SET_CONFIGURATION → Windows
```

在 TinyUSB 中，收到 `SET_CONFIGURATION` 会触发 `tud_mount_cb()`，读取配置描述符会调用 `tud_descriptor_configuration_cb()`，用这两个回调就能实现：

```c
void tud_mount_cb(void)        // 主机发了 SET_CONFIGURATION
{
    s_mounted = true;
}

uint8_t const *tud_descriptor_configuration_cb(uint8_t index)
{
    s_config_requested = true; // 主机开始枚举
    return desc_configuration;
}

// 主循环中判断
if (s_mounted) {
    os = HOST_LINUX_OR_OTHER;
} else if (s_config_requested && 距离读取配置描述符已超过 2000 ms) {
    os = HOST_WINDOWS;
}
```

嵌入式 Linux、Android、BSD 也会配置设备，都归为"Linux / macOS / 其他"这一类。

## 区分 Windows 和没有主机

Windows 的判断依据是"一直没有动静"，但**没插主机、只接了充电线、插错成串口芯片那个 USB 口**也是没有动静。如果从上电开始计时，这些情况都会被误判成 Windows。

只有真正的主机在枚举时才会读取配置描述符，所以把它作为计时起点：

- 读了配置描述符，之后 2 秒没有 `SET_CONFIGURATION`：Windows；
- 根本没读配置描述符：没有主机，继续等待，不下结论。

## 为什么不用 MSFT100

Windows 枚举时会读取索引为 **0xEE** 的字符串描述符，查看设备是否带有微软 OS 描述符（内容为 "MSFT100"），这是识别 Windows 最常见的特征。

但 Windows 会把结果缓存到注册表中（按 VID、PID、版本号区分），**同一个设备再插拔就不再询问**，所以只有第一次插入时有效。`SET_CONFIGURATION` 指纹不受缓存影响，每次都有效。

同理，这个探测接口**不能**带 WCID / MS OS 2.0 描述符，也不能在 Windows 上给它装 WinUSB（如用 Zadig）。否则 Windows 有了驱动就会发 `SET_CONFIGURATION`，被误判成 Linux。

## 判断后切换设备

示例采用"先探测、再重启"的方式：

1. 上电后以中性厂商接口枚举，判断出系统；
2. 把结果存到 **RTC RAM**（`RTC_NOINIT_ATTR` 变量），调用 `esp_restart()` 软件复位；
3. 重启后，如果复位原因是软件复位（`ESP_RST_SW`），就直接读取 RTC RAM 中的结果，按系统初始化对应的 USB 设备，例如 Windows 用 MSC，Linux 用 CDC。

用 RTC RAM 而不用 NVS（Flash）的原因：RTC RAM 在软件复位后保留、断电后清空。USB 供电的设备拔下来插到另一台电脑时会断电，结果自动清除并重新探测，不会把上一台电脑的结果带过来，也没有 Flash 擦写损耗。

## 参考资料

- esp_demos：`examples/usb/device/usb_host_os_detect`
