---
title: USB 描述符
date: 2026-11-12
order: 2
---

# USB 描述符

主机通过读取描述符认识一个 USB 设备：它是谁、有几个功能、每个功能用哪些端点。本文结合 esp_tinyusb 默认描述符（`esp_tinyusb/usb_descriptors.c`）的简化代码，介绍描述符之间的关系。描述符的通用格式和端点描述符见 [USB 基础概念](/peripheral/usb/basics)。

## Q: 描述符之间是什么关系？

一个设备只有一个**设备描述符**，下面是**配置描述符**，配置下面是**接口**和**端点**。**字符串描述符**是一张单独的表，其他描述符中以 `i` 开头的字段（如 `iProduct`、`iInterface`）填的是这张表的**索引**，0 表示没有字符串。

```text
设备描述符 ── iManufacturer / iProduct / iSerialNumber ──┐
└── 配置描述符 ── iConfiguration ─────────────────────────┤
    ├── 接口描述符 0 ── iInterface ──────────────────────┼──> 字符串描述符表
    │   └── 端点描述符 ...                                │    0: 语言 ID
    └── 接口描述符 1 ── iInterface ──────────────────────┘    1, 2, 3 ...: 字符串
        └── 端点描述符 ...
```

## Q: 设备描述符里写了什么？

设备描述符描述整个设备：USB 版本、设备类、VID/PID，以及厂商名、产品名、序列号三个字符串的索引。

```c
const tusb_desc_device_t descriptor_dev_default = {
    .bLength            = sizeof(descriptor_dev_default),
    .bDescriptorType    = TUSB_DESC_DEVICE,
    .bcdUSB             = 0x0200,            // USB 2.0
    .bDeviceClass       = TUSB_CLASS_MISC,   // 复合设备（含 IAD）用 0xEF / 0x02 / 0x01
    .bDeviceSubClass    = MISC_SUBCLASS_COMMON,
    .bDeviceProtocol    = MISC_PROTOCOL_IAD,
    .bMaxPacketSize0    = CFG_TUD_ENDPOINT0_SIZE,
    .idVendor           = TINYUSB_ESPRESSIF_VID,
    .idProduct          = USB_TUSB_PID,
    .bcdDevice          = CONFIG_TINYUSB_DESC_BCD_DEVICE,
    .iManufacturer      = 0x01,              // 字符串表索引 1
    .iProduct           = 0x02,              // 字符串表索引 2
    .iSerialNumber      = 0x03,              // 字符串表索引 3
    .bNumConfigurations = 0x01,
};
```

## Q: 配置描述符里写了什么？

配置描述符后面紧跟该配置下的所有接口和端点描述符，主机一次性读出，总长度由 `wTotalLength` 给出。TinyUSB 用宏来拼接：

```c
uint8_t const descriptor_fs_cfg_default[] = {
    // 配置号, 接口数量, 字符串索引, 总长度, 属性, 最大电流 (mA)
    TUD_CONFIG_DESCRIPTOR(1, ITF_NUM_TOTAL, 0, TUSB_DESC_TOTAL_LEN,
                          TUSB_DESC_CONFIG_ATT_REMOTE_WAKEUP, 100),

    // 接口号, 字符串索引, 通知端点及大小, 数据端点 (OUT, IN) 及大小
    TUD_CDC_DESCRIPTOR(ITF_NUM_CDC, STRID_CDC_INTERFACE,
                       0x81, 8, 0x02, 0x82, 64),

    // 接口号, 字符串索引, 端点 OUT, 端点 IN, 端点大小
    TUD_MSC_DESCRIPTOR(ITF_NUM_MSC, STRID_MSC_INTERFACE, 0x03, 0x83, 64),
};
```

- 配置的字符串索引填 0，表示配置没有名字；
- 每个功能宏的第二个参数是字符串索引，最终写入该功能接口描述符的 `iInterface`。

## Q: 字符串描述符和索引怎么对应？

字符串表就是一个数组，**数组下标就是索引**。代码中用一个枚举 `STRID_xxx` 给下标起名字，再在配置描述符中引用：

```c
const char *descriptor_str_default[] = {
    (char[]){0x09, 0x04},   // 0: 语言 ID，0x0409 = 美式英语
    "Espressif Systems",    // 1: 厂商名   <- 设备描述符 iManufacturer
    "Espressif Device",     // 2: 产品名   <- 设备描述符 iProduct
    NULL,                   // 3: 序列号   <- 设备描述符 iSerialNumber，运行时用 MAC 生成
    "Espressif CDC Device", // 4: CDC 接口 <- TUD_CDC_DESCRIPTOR 的 STRID_CDC_INTERFACE
    "Espressif MSC Device", // 5: MSC 接口 <- TUD_MSC_DESCRIPTOR 的 STRID_MSC_INTERFACE
};

enum {
    STRID_LANGID = 0,
    STRID_MANUFACTURER,     // 1
    STRID_PRODUCT,          // 2
    STRID_SERIAL,           // 3
    STRID_CDC_INTERFACE,    // 4
    STRID_MSC_INTERFACE,    // 5
};
```

数组和枚举的顺序必须一致，否则接口会显示成别的名字。主机读取时，TinyUSB 会把 C 字符串转换成 USB 要求的 UTF-16LE 编码。

## Q: 复合设备的字符串是不是只有一个？

**设备级的字符串只有一套**：复合设备只有一个设备描述符，所以只有一个厂商名、产品名和序列号（索引 1 ~ 3）。

但**每个功能还可以有自己的名字**：如上面的代码，CDC 接口和 MSC 接口分别引用了索引 4 和 5。由多个接口组成的功能（如 CDC 的控制接口 + 数据接口）还会用 IAD（接口关联描述符）打包，IAD 中的 `iFunction` 也可以引用一个字符串。主机是否用这些功能级的名字来显示子设备，取决于操作系统和驱动。
