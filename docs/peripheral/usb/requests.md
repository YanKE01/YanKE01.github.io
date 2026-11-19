---
title: 4. 控制传输、标准请求与枚举
date: 2026-11-19
order: 4
---

# 4. 控制传输、标准请求与枚举

主机对设备的所有管理操作，比如读描述符、分配地址、选择配置，都是通过 EP0 上的**控制传输**发出的**请求**完成的。本文依次介绍控制传输的阶段、SETUP 包、请求的分类和参数、设备状态，以及把这些串起来的枚举过程。

## 控制传输的阶段

控制传输由 **2 ~ 3 个阶段**组成：

```
建立阶段（Setup）  主机 → 设备   8 字节 SETUP 包，描述本次请求
数据阶段（Data）   可选          方向由请求决定，长度不超过 wLength
状态阶段（Status） 与数据阶段方向相反   0 字节数据包（ZLP），表示请求完成
```

根据数据阶段的方向，可以分为三种：

| 类型 | 阶段顺序 | 示例 |
|---|---|---|
| **控制读**（Control Read） | SETUP → IN 数据 → **OUT 状态** | `GET_DESCRIPTOR`、读取当前音量 |
| **控制写**（Control Write） | SETUP → OUT 数据 → **IN 状态** | 设置音量、设置采样率 |
| **无数据**（No-data Control） | SETUP → **IN 状态** | `SET_ADDRESS`、`SET_CONFIGURATION`、`SET_INTERFACE` |

**控制读示例**：主机读取 18 字节的设备描述符。

```usbflow
# 建立阶段
H SETUP 地址 0，端点 0
H DATA0 8 字节：80 06 00 01 00 00 12 00
D ACK 设备必须应答 SETUP
# 数据阶段（IN）
H IN
D DATA1 18 字节设备描述符
H ACK
# 状态阶段（OUT，与数据阶段方向相反）
H OUT
H DATA1 0 字节（ZLP）
D ACK 请求完成
```

**控制写示例**：USB 音频设备设置音量（UAC2 的 `SET_CUR` 请求，携带 2 字节音量值）。

```usbflow
# 建立阶段
H SETUP
H DATA0 8 字节：21 01 01 02 00 02 02 00
D ACK
# 数据阶段（OUT）
H OUT
H DATA1 2 字节音量值
D ACK
# 状态阶段（IN，与数据阶段方向相反）
H IN
D DATA1 0 字节（ZLP），表示已处理完成
H ACK
```

**状态阶段的方向总是与数据阶段相反**；没有数据阶段时，状态阶段为 IN。以控制写为例，主机发送完数据后发出 IN 令牌，设备回复一个 0 字节数据包（ZLP），表示"请求已处理完成"；若设备还没处理完，可以对状态阶段回复 NAK。

**注意事项**：

- 设备**必须对 SETUP 包回复 ACK**，不能回复 NAK 或 STALL；收到新的 SETUP 包时，此前未完成的控制传输会被直接放弃；
- 控制读的数据长度若恰好是 EP0 最大包长的整数倍，且小于 wLength，设备需要额外发送一个 ZLP，告诉主机数据已经发送完毕。

## SETUP 包

| 偏移 | 字段 | 长度 | 含义 |
|---|---|---|---|
| 0 | bmRequestType | 1 | 请求类型，见下表 |
| 1 | bRequest | 1 | 请求码 |
| 2 | wValue | 2 | 请求参数，含义由具体请求决定 |
| 4 | wIndex | 2 | 请求参数，通常为接口号或端点号 |
| 6 | wLength | 2 | 数据阶段的字节数，为 0 表示没有数据阶段 |

**bmRequestType** 的位定义：

| 位 | 含义 | 取值 |
|---|---|---|
| bit 7 | 数据阶段方向 | 0 = 主机到设备，1 = 设备到主机 |
| bit 6 ~ 5 | 请求类型 | 0 = 标准，1 = **类**，2 = 厂商 |
| bit 4 ~ 0 | 接收者 | 0 = 设备，1 = **接口**，2 = 端点，3 = 其他 |

所有多字节字段均为**小端序**。以主机读取设备描述符的 SETUP 包为例：

```
80 06 00 01 00 00 12 00
│  │  └─┬─┘ └─┬─┘ └─┬─┘
│  │    │     │     └ wLength = 0x0012：读取 18 字节
│  │    │     └ wIndex = 0x0000
│  │    └ wValue = 0x0100：高字节 0x01 = 设备描述符，低字节 0x00 = 索引 0
│  └ bRequest = 0x06：GET_DESCRIPTOR
└ bmRequestType = 0x80：设备到主机、标准请求、接收者为设备
```

## 请求的分类

SETUP 包中 `bmRequestType` 的 bit 6 ~ 5 决定请求类型：

| 类型 | 谁定义 | 例子 |
|---|---|---|
| **标准请求** | USB 规范第 9 章，所有设备都要处理 | `GET_DESCRIPTOR`、`SET_ADDRESS`、`SET_CONFIGURATION` |
| **类请求** | 各设备类规范（CDC、HID、UAC 等） | CDC 的 `SET_LINE_CODING`（设置波特率） |
| **厂商请求** | 厂商自己定义 | 自定义的读写寄存器、进入升级模式等 |

标准请求在枚举阶段就会用到，类请求和厂商请求要等设备配置完成、驱动加载后才会出现。

## 标准请求

标准请求由 USB 规范第 9 章定义，所有设备都必须支持（部分请求可视情况回复 STALL）：

| bRequest | 请求 | 作用 |
|---|---|---|
| 0x00 | GET_STATUS | 读取设备、接口或端点的状态（如是否 HALT） |
| 0x01 | CLEAR_FEATURE | 清除特性，如清除端点 HALT、关闭远程唤醒 |
| 0x03 | SET_FEATURE | 设置特性，如使能远程唤醒、进入测试模式 |
| 0x05 | SET_ADDRESS | 为设备分配地址 |
| 0x06 | GET_DESCRIPTOR | 读取描述符 |
| 0x07 | SET_DESCRIPTOR | 写入描述符（很少使用） |
| 0x08 | GET_CONFIGURATION | 读取当前配置值 |
| 0x09 | SET_CONFIGURATION | 选择配置，设备由此进入可工作状态 |
| 0x0A | GET_INTERFACE | 读取接口当前的备用设置 |
| 0x0B | SET_INTERFACE | 切换接口的备用设置 |
| 0x0C | SYNCH_FRAME | 同步帧（用于部分等时端点） |

## 标准请求的参数

| 请求 | bmRequestType | wValue | wIndex | wLength | 数据阶段 |
|---|---|---|---|---|---|
| GET_STATUS | 0x80 / 0x81 / 0x82 | 0 | 0 / 接口号 / 端点号 | 2 | 设备 → 主机：状态 |
| CLEAR_FEATURE | 0x00 / 0x01 / 0x02 | 特性选择器 | 0 / 接口号 / 端点号 | 0 | 无 |
| SET_FEATURE | 0x00 / 0x01 / 0x02 | 特性选择器 | 0 / 接口号 / 端点号 | 0 | 无 |
| SET_ADDRESS | 0x00 | 设备地址（1 ~ 127） | 0 | 0 | 无 |
| GET_DESCRIPTOR | 0x80 | 高字节：描述符类型，低字节：索引 | 0 或语言 ID | 描述符长度 | 设备 → 主机：描述符 |
| SET_DESCRIPTOR | 0x00 | 同上 | 同上 | 描述符长度 | 主机 → 设备：描述符 |
| GET_CONFIGURATION | 0x80 | 0 | 0 | 1 | 设备 → 主机：当前配置值 |
| SET_CONFIGURATION | 0x00 | 配置值 | 0 | 0 | 无 |
| GET_INTERFACE | 0x81 | 0 | 接口号 | 1 | 设备 → 主机：当前备用设置 |
| SET_INTERFACE | 0x01 | 备用设置号 | 接口号 | 0 | 无 |
| SYNCH_FRAME | 0x82 | 0 | 端点号 | 2 | 设备 → 主机：帧号 |

- `bmRequestType` 有多个值的，分别对应接收者为设备、接口、端点；
- 特性选择器有三个：`ENDPOINT_HALT`（0，端点）、`DEVICE_REMOTE_WAKEUP`（1，设备）、`TEST_MODE`（2，设备）。例如主机用 `CLEAR_FEATURE(ENDPOINT_HALT)` 解除端点的 STALL，用 `SET_FEATURE(DEVICE_REMOTE_WAKEUP)` 允许设备远程唤醒。

## 设备状态

| 状态 | 进入条件 | 此时能做什么 |
|---|---|---|
| **Attached（连接）** | 插入主机 | 还没有供电 |
| **Powered（供电）** | VBUS 上电 | 还没有复位，不响应请求 |
| **Default（默认）** | 总线复位 | 地址为 0，只能通过 EP0 通信 |
| **Address（已寻址）** | 收到 `SET_ADDRESS` | 有了自己的地址，但非零端点还不能用 |
| **Configured（已配置）** | 收到 `SET_CONFIGURATION`（非 0） | 所有端点可用，正常工作 |
| **Suspended（挂起）** | 总线空闲超过 3 ms | 低功耗，等待恢复 |

改变状态的请求主要是两个：

- **`SET_ADDRESS`**：Default → Address。设备要在这个请求的**状态阶段完成之后**才切换到新地址，这是它和其他请求不同的地方；
- **`SET_CONFIGURATION`**：配置值非 0 时 Address → Configured；配置值为 0 时回到 Address。

在 Address 状态下，主机已经能读取所有描述符，但设备的数据端点还不能用，必须等 `SET_CONFIGURATION`。主机通常在**找到驱动后**才发这个请求，所以它是判断"主机有没有接受这个设备"的关键信号，[USB 设备判断主机操作系统](/peripheral/usb/os-detect) 就是利用了这一点。

## 枚举过程

**枚举（Enumeration）** 是主机识别设备、分配地址、读取描述符并加载驱动的过程。典型流程如下：

1. **检测连接**：主机检测到 D+ 或 D− 被上拉，得知有设备接入；
2. **总线复位**：主机将总线驱动为 SE0（D+、D− 均为低）至少 10 ms，复位设备；高速设备在此期间完成 Chirp 握手；
3. **读取设备描述符**：设备此时地址为 0，主机向地址 0 的 EP0 发送 `GET_DESCRIPTOR(Device)`，主要目的是获取 **EP0 的最大包长** `bMaxPacketSize0`（Windows 通常请求 64 字节，并可能随后再复位一次）；
4. **分配地址**：主机发送 `SET_ADDRESS`，设备在**状态阶段完成之后**才切换到新地址；
5. **读取完整的设备描述符**：主机用新地址读取完整的 18 字节设备描述符，得到 VID、PID、配置数量等信息；
6. **读取配置描述符**：先读取 9 字节获取 `wTotalLength`，再按总长度读取完整的配置描述符集合（包含接口、端点和类特定描述符）；
7. **读取字符串描述符**：读取厂商名、产品名、序列号等；
8. **选择配置**：主机根据描述符加载驱动，并发送 `SET_CONFIGURATION`，设备进入**已配置（Configured）** 状态，非零端点开始可用；
9. **类相关初始化**：驱动发送类请求完成初始化，例如音频设备设置采样率、读取音量范围等。

把其中的请求按顺序画出来如下。图中每一行代表一次完整的控制传输（SETUP、数据、状态三个阶段合在一起），以一个 CDC 虚拟串口设备为例：

```usbflow
# 默认状态（Default）：地址 0
H GET_DESCRIPTOR 设备描述符，主要为了拿到 bMaxPacketSize0
D 描述符 设备描述符（可能只读前 8 / 64 字节）
H SET_ADDRESS 分配地址，例如 5
D ZLP 状态阶段完成后，设备切换到新地址
# 已寻址状态（Address）：用新地址读取描述符
H GET_DESCRIPTOR 完整设备描述符（18 字节）
D 描述符 VID、PID、配置数量
H GET_DESCRIPTOR 配置描述符的前 9 字节
D 描述符 得到 wTotalLength
H GET_DESCRIPTOR 完整配置描述符
D 描述符 IAD + CDC 控制接口 + CDC 数据接口，主机据此匹配 CDC 驱动
H GET_DESCRIPTOR 字符串描述符
D 描述符 厂商名、产品名、序列号
# 主机找到 CDC 驱动后选择配置
H SET_CONFIGURATION 配置值 1
D ZLP 进入已配置状态，批量和中断端点可用
# 已配置状态（Configured）：打开串口时，CDC 驱动发送类请求
H SET_LINE_CODING 7 字节：波特率、停止位、校验位、数据位
D ZLP
H GET_LINE_CODING 读回当前串口参数
D 数据 7 字节串口参数
H SET_CONTROL_LINE_STATE wValue：bit0 = DTR，bit1 = RTS
D ZLP 设备可据此判断"串口已打开"
```

- `GET_DESCRIPTOR` 在前：主机要先读描述符，才知道设备是什么；
- `SET_CONFIGURATION` 在中间：这是枚举的最后一步，之后数据端点才能用；
- CDC 的**类请求**在最后：由驱动在打开串口、修改波特率时发送，不同系统的顺序和次数略有不同。TinyUSB 中分别对应 `tud_cdc_line_coding_cb()` 和 `tud_cdc_line_state_cb()`。

**`SET_INTERFACE` 在哪里？** 它不属于枚举，只有带备用设置的接口才会用到，例如 USB 音频、摄像头的等时接口：驱动开始传输时切到备用设置 1，停止时切回 0，可以反复切换（原理见 [等时传输：备用设置与同步](/peripheral/usb/isochronous)）。CDC 串口的接口只有备用设置 0，正常情况下不会出现 `SET_INTERFACE`。

设备在此过程中经历的状态依次为：**连接（Attached）→ 供电（Powered）→ 默认（Default）→ 已寻址（Address）→ 已配置（Configured）**。

## TinyUSB 中的回调

标准请求由 TinyUSB 协议栈自己处理，应用只需要提供描述符，并在状态变化时收到通知：

| 主机的动作 | TinyUSB 回调 |
|---|---|
| `GET_DESCRIPTOR(Device)` | `tud_descriptor_device_cb()` 返回设备描述符 |
| `GET_DESCRIPTOR(Configuration)` | `tud_descriptor_configuration_cb()` 返回配置描述符 |
| `GET_DESCRIPTOR(String)` | `tud_descriptor_string_cb()` 返回字符串描述符 |
| `SET_CONFIGURATION`（非 0） | `tud_mount_cb()`，设备可以开始工作 |
| `SET_CONFIGURATION(0)` 或断开 | `tud_umount_cb()` |
| 总线挂起 / 恢复 | `tud_suspend_cb()` / `tud_resume_cb()` |
| 厂商请求 | `tud_vendor_control_xfer_cb()`，由应用自己解析 |

类请求由对应的类驱动处理，再通过回调通知应用。例如主机打开串口、设置波特率时会发 CDC 的 `SET_LINE_CODING`，应用在 `tud_cdc_line_coding_cb()` 中拿到新的波特率。

## 参考资料

- *Universal Serial Bus Specification Revision 2.0*：9.1（设备状态）、Table 9-3（标准请求）、Table 9-6（特性选择器）
- [TinyUSB](https://github.com/hathach/tinyusb)：`src/device/usbd.h`、`src/device/usbd.c`
