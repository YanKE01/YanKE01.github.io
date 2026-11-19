---
title: 3. USB 描述符
date: 2026-11-12
order: 3
---

# 3. USB 描述符

主机通过读取描述符认识一个 USB 设备：它是谁、有几个功能、每个功能用哪些端点。本文先介绍描述符的通用格式和类型，再结合 esp_tinyusb 默认描述符（`esp_tinyusb/usb_descriptors.c`）的简化代码，介绍描述符之间的关系，最后介绍端点和端点描述符。

## 描述符的格式和类型

**描述符（Descriptor）** 是设备用来向主机描述自身信息的数据结构。主机在枚举过程中读取描述符，从而得知设备是什么、有哪些功能、需要加载哪个驱动。

每个描述符的前两个字节格式固定：

| 偏移 | 字段 | 含义 |
|---|---|---|
| 0 | bLength | 描述符长度（字节） |
| 1 | bDescriptorType | 描述符类型 |

常见的描述符类型：

| 类型值 | 描述符 | 主要内容 |
|---|---|---|
| 0x01 | 设备描述符 | USB 版本、VID/PID、EP0 最大包长、配置数量，固定 18 字节 |
| 0x02 | 配置描述符 | 配置总长度 wTotalLength、接口数量、供电方式、最大电流 |
| 0x03 | 字符串描述符 | 厂商名、产品名、序列号等 Unicode 字符串 |
| 0x04 | 接口描述符 | 接口号、备用设置号、端点数量、设备类代码 |
| 0x05 | 端点描述符 | 端点地址、传输类型、最大包长、轮询间隔 |
| 0x06 | 设备限定描述符 | 高速设备在另一种速率下的信息 |
| 0x0B | 接口关联描述符（IAD） | 将多个接口关联为一个功能 |
| 0x24 / 0x25 | 类特定接口 / 端点描述符 | 由设备类规范定义，例如 UAC 的音频拓扑描述 |

需要注意，主机**不会单独读取**接口描述符和端点描述符。它们与类特定描述符一起，按层次顺序拼接在配置描述符之后，主机通过一次 `GET_DESCRIPTOR(Configuration)` 请求读取全部内容，总长度由配置描述符中的 `wTotalLength` 给出。

## 描述符之间的关系

一个设备只有一个**设备描述符**，下面是**配置描述符**，配置下面是**接口**和**端点**。**字符串描述符**是一张单独的表，其他描述符中以 `i` 开头的字段（如 `iProduct`、`iInterface`）填的是这张表的**索引**，0 表示没有字符串。

```text
设备描述符 ── iManufacturer / iProduct / iSerialNumber ──┐
└── 配置描述符 ── iConfiguration ─────────────────────────┤
    ├── 接口描述符 0 ── iInterface ──────────────────────┼──> 字符串描述符表
    │   └── 端点描述符 ...                                │    0: 语言 ID
    └── 接口描述符 1 ── iInterface ──────────────────────┘    1, 2, 3 ...: 字符串
        └── 端点描述符 ...
```

## 设备描述符

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

## 配置描述符

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

## 字符串描述符与索引

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

## 复合设备的字符串

**设备级的字符串只有一套**：复合设备只有一个设备描述符，所以只有一个厂商名、产品名和序列号（索引 1 ~ 3）。

但**每个功能还可以有自己的名字**：如上面的代码，CDC 接口和 MSC 接口分别引用了索引 4 和 5。由多个接口组成的功能（如 CDC 的控制接口 + 数据接口）还会用 IAD（接口关联描述符）打包，IAD 中的 `iFunction` 也可以引用一个字符串。主机是否用这些功能级的名字来显示子设备，取决于操作系统和驱动。

## 端点与端点地址

**端点（Endpoint）** 是设备上的一个数据通道，主机与设备之间的所有数据都通过端点传输。

端点地址为 1 个字节：

| 位 | 含义 |
|---|---|
| bit 7 | 方向：1 = IN，0 = OUT |
| bit 6 ~ 4 | 保留，为 0 |
| bit 3 ~ 0 | 端点号（0 ~ 15） |

例如 `0x01` 表示端点 1 OUT，`0x81` 表示端点 1 IN。**端点号相同、方向不同的是两个独立的端点**，可以分别用于不同的传输类型和用途。

**IN 和 OUT 永远以主机为视角**：

- **IN**：数据从设备流向主机，即"主机读"；
- **OUT**：数据从主机流向设备，即"主机写"。

在设备端编程时尤其容易混淆。例如 USB 扬声器的音频数据从主机流向设备，使用的是 **OUT** 端点；USB 麦克风的音频数据从设备流向主机，使用的是 **IN** 端点。

**端点 0（EP0）** 是每个设备都必须具备的**默认控制端点**，双向工作，在设备上电后即可使用，用于枚举和各类控制请求。

## 端点描述符的字段

**bmAttributes（端点属性）**：

| 位 | 含义 | 取值 |
|---|---|---|
| bit 1 ~ 0 | 传输类型 | 00 控制、01 等时、10 批量、11 中断 |
| bit 3 ~ 2 | 同步类型（仅等时） | 00 无同步、01 异步、10 自适应、11 同步 |
| bit 5 ~ 4 | 用途类型（仅等时） | 00 数据端点、01 反馈端点、10 隐式反馈数据端点 |

**wMaxPacketSize（最大包长）**：

- bit 10 ~ 0：单个包的最大字节数；
- bit 12 ~ 11：仅用于高速的等时和中断端点，表示**每个微帧额外的事务数**（0 ~ 2），即每个微帧最多可传输 1 ~ 3 个包，称为**高带宽端点**。

**bInterval（轮询间隔）**：含义与速率和传输类型有关：

| 端点类型 | 全速 / 低速 | 高速 |
|---|---|---|
| 等时 | 每 2<sup>bInterval−1</sup> 帧一次（bInterval 取 1 ~ 16） | 每 2<sup>bInterval−1</sup> 个微帧一次（bInterval 取 1 ~ 16） |
| 中断 | 每 bInterval 帧一次（1 ~ 255） | 每 2<sup>bInterval−1</sup> 个微帧一次（bInterval 取 1 ~ 16） |
| 批量 / 控制 | 不使用 | 仅用于高速批量/控制 OUT，表示最大 NAK 速率 |

例如高速等时端点 `bInterval = 1` 表示每个微帧传输一次，即每秒 8000 次；`bInterval = 4` 表示每 8 个微帧（1 ms）传输一次。
