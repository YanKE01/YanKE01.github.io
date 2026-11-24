---
title: 9. USB 网卡：ECM、NCM 与 RNDIS
date: 2026-11-24
order: 9
---

# 9. USB 网卡：ECM、NCM 与 RNDIS

## 概览

三种协议的用途一样：让设备在主机上显示为一块网卡，在批量端点上传**以太网帧**。

**以太网帧 = 以太网头 + IP 数据**：以太网头 14 字节（目标 MAC 6 + 源 MAC 6 + 类型 2），后面是 lwIP 交下来的 IP 包。

```usbfields
以太网帧: 目标MAC 6 字节 | 源MAC 6 字节 | 类型 2 字节 | IP数据 46~1500 字节
```

帧长范围：

- **上限 1514 字节** = 14 字节头 + 1500 字节 IP 数据。1500 就是常说的 **MTU**，IP 包超过它要分片；
- **下限 60 字节**：IP 数据不足 46 字节时要补齐；
- 以上都不算末尾 4 字节的 FCS。带 FCS 时是 64 ~ 1518 字节，带 VLAN 标签时上限再加 4 字节。

ECM / NCM 描述符里的 `wMaxSegmentSize`（TinyUSB 宏参数 `_maxsegmentsize`）就是告诉主机这个上限，通常填 1514。

**帧里的“IP 数据”又是一层层套起来的**。以 TCP 为例，应用调 `send()` 发出的数据，依次被加上 TCP 头、IP 头、以太网头：

<div class="netlayers">
<svg viewBox="0 0 760 290" role="img" aria-label="TCP 数据逐层封装：应用数据依次加上 TCP 头、IP 头、以太网头，成为以太网帧">
<text class="nl-name" x="16" y="47">应用数据</text>
<rect class="nl-p4" x="520" y="20" width="220" height="44" rx="4"/>
<text class="nl-name" x="630" y="40" text-anchor="middle">应用数据</text><text class="nl-small" x="630" y="57" text-anchor="middle">≤ 1460 字节</text>
<text class="nl-name" x="16" y="109">TCP 段</text>
<rect class="nl-c6" x="420" y="82" width="100" height="44" rx="4"/>
<text class="nl-name" x="470" y="102" text-anchor="middle">TCP 头</text><text class="nl-small" x="470" y="119" text-anchor="middle">20 字节</text>
<rect class="nl-p4" x="520" y="82" width="220" height="44" rx="4"/>
<text class="nl-name" x="630" y="102" text-anchor="middle">应用数据</text><text class="nl-small" x="630" y="119" text-anchor="middle">≤ 1460 字节</text>
<text class="nl-key" x="410" y="109" text-anchor="end">+ TCP 加</text>
<text class="nl-name" x="16" y="171">IP 包</text>
<rect class="nl-c6" x="320" y="144" width="100" height="44" rx="4"/>
<text class="nl-name" x="370" y="164" text-anchor="middle">IP 头</text><text class="nl-small" x="370" y="181" text-anchor="middle">20 字节</text>
<rect class="nl-p4" x="420" y="144" width="100" height="44" rx="4"/>
<text class="nl-name" x="470" y="164" text-anchor="middle">TCP 头</text><text class="nl-small" x="470" y="181" text-anchor="middle">20 字节</text>
<rect class="nl-p4" x="520" y="144" width="220" height="44" rx="4"/>
<text class="nl-name" x="630" y="164" text-anchor="middle">应用数据</text><text class="nl-small" x="630" y="181" text-anchor="middle">≤ 1460 字节</text>
<text class="nl-key" x="310" y="171" text-anchor="end">+ IP 加</text>
<text class="nl-name" x="16" y="233">以太网帧</text>
<rect class="nl-c6" x="220" y="206" width="100" height="44" rx="4"/>
<text class="nl-name" x="270" y="226" text-anchor="middle">以太网 头</text><text class="nl-small" x="270" y="243" text-anchor="middle">14 字节</text>
<rect class="nl-p4" x="320" y="206" width="100" height="44" rx="4"/>
<text class="nl-name" x="370" y="226" text-anchor="middle">IP 头</text><text class="nl-small" x="370" y="243" text-anchor="middle">20 字节</text>
<rect class="nl-p4" x="420" y="206" width="100" height="44" rx="4"/>
<text class="nl-name" x="470" y="226" text-anchor="middle">TCP 头</text><text class="nl-small" x="470" y="243" text-anchor="middle">20 字节</text>
<rect class="nl-p4" x="520" y="206" width="220" height="44" rx="4"/>
<text class="nl-name" x="630" y="226" text-anchor="middle">应用数据</text><text class="nl-small" x="630" y="243" text-anchor="middle">≤ 1460 字节</text>
<text class="nl-key" x="210" y="233" text-anchor="end">+ netif 加</text>
<text class="nl-small" x="380" y="280" text-anchor="middle">每往下一层，左边多一个头（绿色为这一层新加的），右边的内容原封不动</text>
</svg>
</div>

| 层 | 谁加的 | 头里有什么 |
|---|---|---|
| TCP | lwIP 的 TCP | 端口号、序号、确认号、窗口 |
| IP | lwIP 的 IP | 源 / 目标 IP 地址、协议号（6 = TCP，17 = UDP） |
| 以太网 | lwIP 的 netif | 源 / 目标 MAC 地址、类型（0x0800 = IPv4） |

所以：

- 一帧最多装 **1460 字节应用数据**（1500 − 20 − 20），这就是 TCP 的 **MSS**。应用一次 `send()` 16 KB，会被 lwIP 拆成十几帧；
- USB 网卡只认以太网帧，**不知道里面是 TCP 还是 UDP**。TCP 的重传、确认、流控都由两端的 lwIP 完成，确认（ACK）也是一帧帧以太网帧，走反方向的批量端点；
- 满载时有效数据只占帧长的 1460 / 1514 ≈ 96%，再加上 RNDIS 头或 NTB 头，所以 TCP 吞吐总比 USB 裸速率低。

三种协议的区别只在帧外面包了什么：

```usbfields
ECM: 以太网头 14 字节 | IP数据 46~1500 字节
RNDIS: RNDIS头 44 字节 | 以太网头 14 字节 | IP数据 46~1500 字节
NCM: NTH16 12 字节 | NDP16 帧索引表 | 以太网帧1 | 以太网帧2 | …
```

| 协议 | 一次批量传输里是什么 | 标准 | 典型主机 |
|---|---|---|---|
| ECM | 一帧裸以太网帧 | CDC 子类 0x06 | Linux、macOS |
| RNDIS | 一帧以太网帧，前面加 44 字节的 `RNDIS_PACKET_MSG` 头 | 微软私有 | Windows、Linux |
| NCM | 一个 NTB：NTH 头 + NDP 索引表（记录每帧的偏移和长度）+ 多帧以太网帧 | CDC 子类 0x0D | Linux、macOS、Windows 10 2004+ |

以太网帧通常不带末尾的 4 字节 FCS 校验（NCM 可选带），数据完整性由 USB 数据包自身的 CRC16 保证。

## Q: CDC、ECM、NCM 是什么关系？

**CDC**（Communications Device Class，接口类 0x02）是一大类通信设备，靠**子类**区分具体模型：

| 子类 | 名称 | 主机看到的 | 传输内容 |
|---|---|---|---|
| 0x02 | ACM | 串口 | 字节流 |
| 0x06 | ECM（Ethernet Control Model） | 网卡 | 以太网帧，一次传输一帧 |
| 0x0D | NCM（Network Control Model） | 网卡 | 以太网帧，多帧打包成一个 NTB |

ECM 和 NCM 都是"USB 网卡"，USB 上传的都是**以太网帧**。区别在于 NCM 把多帧打包后再传，减少传输次数，吞吐更高。

注意不是"ECM/NCM 通过 CDC 传输"：**ECM、NCM 本身就是 CDC 的子类**。CDC 只规定描述符和请求的格式，以太网帧实际走的是 CDC 数据接口里的两个批量端点。

## Q: TinyUSB 里 ECM 的描述符是怎么定义的？

TinyUSB 在 `src/device/usbd.h` 中提供了模板宏 `TUD_CDC_ECM_DESCRIPTOR`（已加注释）：

```c
#define TUD_CDC_ECM_DESCRIPTOR(_itfnum, _desc_stridx, _mac_stridx, _ep_notif, _ep_notif_size, _epout, _epin, _epsize, _maxsegmentsize) \
  /* IAD：把下面两个接口打包成一个功能 */
  8, TUSB_DESC_INTERFACE_ASSOCIATION, _itfnum, 2, TUSB_CLASS_CDC, CDC_COMM_SUBCLASS_ETHERNET_CONTROL_MODEL, 0, 0,
  /* ① 控制接口：类 = CDC(0x02)，子类 = ECM(0x06) */
  9, TUSB_DESC_INTERFACE, _itfnum, 0, 1, TUSB_CLASS_CDC, CDC_COMM_SUBCLASS_ETHERNET_CONTROL_MODEL, 0, _desc_stridx,
  5, TUSB_DESC_CS_INTERFACE, CDC_FUNC_DESC_HEADER, U16_TO_U8S_LE(0x0120),            // Header
  5, TUSB_DESC_CS_INTERFACE, CDC_FUNC_DESC_UNION, _itfnum, _itfnum + 1,               // Union：控制接口 ↔ 数据接口
  13, TUSB_DESC_CS_INTERFACE, CDC_FUNC_DESC_ETHERNET_NETWORKING, _mac_stridx, ...,
      U16_TO_U8S_LE(_maxsegmentsize), ...,                                            // 以太网功能描述符：MAC 字符串索引、最大帧长
  7, TUSB_DESC_ENDPOINT, _ep_notif, TUSB_XFER_INTERRUPT, ...,                         // 中断端点：通知连接状态、速率
  /* ② 数据接口：类 = CDC Data(0x0A) */
  9, TUSB_DESC_INTERFACE, _itfnum + 1, 0, 0, TUSB_CLASS_CDC_DATA, 0, 0, 0,            // 备用设置 0：没有端点（未激活）
  9, TUSB_DESC_INTERFACE, _itfnum + 1, 1, 2, TUSB_CLASS_CDC_DATA, 0, 0, 0,            // 备用设置 1：两个端点（激活）
  7, TUSB_DESC_ENDPOINT, _epin,  TUSB_XFER_BULK, ...,                                 // 批量 IN：设备 → 主机，以太网帧
  7, TUSB_DESC_ENDPOINT, _epout, TUSB_XFER_BULK, ...                                  // 批量 OUT：主机 → 设备，以太网帧
```

一个 USB 网卡功能由两个接口组成：

| 接口 | 类 | 端点 | 作用 |
|---|---|---|---|
| 控制接口 | CDC 0x02，子类 ECM 0x06 / NCM 0x0D | 中断 IN | 声明"我是网卡"，给出 MAC 和最大帧长，上报连接状态 |
| 数据接口 | CDC Data 0x0A | 批量 IN / OUT | 真正传输以太网帧 |

数据接口的备用设置 0 没有端点，主机选中备用设置 1 后才开始传数据。主机看控制接口的"类 + 子类"加载驱动：Linux 看到 0x02/0x06 加载 `cdc_ether`，看到 0x02/0x0D 加载 `cdc_ncm`。

## Q: NCM 的描述符和 ECM 有什么不同？

NCM 的模板宏 `TUD_CDC_NCM_DESCRIPTOR` 参数和结构与 ECM 几乎一样，只有四处不同：

- 子类换成 `CDC_COMM_SUBCLASS_NETWORK_CONTROL_MODEL`（0x0D）；
- 多一个 6 字节的 **NCM 功能描述符**（`CDC_FUNC_DESC_NCM`）；
- 数据接口的协议字段为 `NCM_DATA_PROTOCOL_NETWORK_TRANSFER_BLOCK`，表示批量端点上传的不是裸以太网帧，而是 **NTB**（多帧打包，带 NTH / NDP 头）；
- Header 里的 CDC 版本号是 0x0110，ECM 是 0x0120。

## Q: 设备端的网络协议栈怎么接到 USB 上？

<div class="netlayers">
<svg viewBox="0 0 760 390" role="img" aria-label="USB 网卡协议栈：设备端 lwIP 通过 CDC-ECM 或 NCM 类驱动和主机的 cdc_ether 或 cdc_ncm 驱动交换以太网帧">
<defs>
<marker id="cdc-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="nl-arrow" d="M0 0 L10 5 L0 10 z"/></marker>
</defs>
<text class="nl-title" x="165" y="28" text-anchor="middle">设备（MCU）</text>
<rect class="nl-frame" x="20" y="40" width="290" height="290" rx="10"/>
<rect class="nl-p4" x="30" y="50" width="270" height="50" rx="6"/>
<text class="nl-name" x="44" y="80">应用</text><text class="nl-detail" x="140" y="80">HTTP、MQTT 等</text>
<rect class="nl-p4" x="30" y="105" width="270" height="50" rx="6"/>
<text class="nl-name" x="44" y="135">lwIP</text><text class="nl-detail" x="140" y="135">TCP / UDP / IP</text>
<rect class="nl-p4" x="30" y="160" width="270" height="50" rx="6"/>
<text class="nl-name" x="44" y="190">netif</text><text class="nl-detail" x="140" y="190">收发以太网帧</text>
<rect class="nl-c6" x="30" y="215" width="270" height="50" rx="6"/>
<text class="nl-name" x="44" y="245">CDC 类</text><text class="nl-detail" x="140" y="245">ECM / NCM</text>
<rect class="nl-p4" x="30" y="270" width="270" height="50" rx="6"/>
<text class="nl-name" x="44" y="300">USB 栈</text><text class="nl-detail" x="140" y="300">TinyUSB + 控制器</text>
<text class="nl-title" x="595" y="28" text-anchor="middle">主机（PC）</text>
<rect class="nl-frame" x="450" y="40" width="290" height="290" rx="10"/>
<rect class="nl-p4" x="460" y="50" width="270" height="50" rx="6"/>
<text class="nl-name" x="474" y="80">应用</text><text class="nl-detail" x="570" y="80">浏览器、ping 等</text>
<rect class="nl-p4" x="460" y="105" width="270" height="50" rx="6"/>
<text class="nl-name" x="474" y="135">协议栈</text><text class="nl-detail" x="570" y="135">TCP / UDP / IP</text>
<rect class="nl-p4" x="460" y="160" width="270" height="50" rx="6"/>
<text class="nl-name" x="474" y="190">网卡</text><text class="nl-detail" x="570" y="190">usb0 / enx…</text>
<rect class="nl-c6" x="460" y="215" width="270" height="50" rx="6"/>
<text class="nl-name" x="474" y="245">驱动</text><text class="nl-detail" x="570" y="245">cdc_ether / cdc_ncm</text>
<rect class="nl-p4" x="460" y="270" width="270" height="50" rx="6"/>
<text class="nl-name" x="474" y="300">USB 栈</text><text class="nl-detail" x="570" y="300">主机控制器</text>
<path class="nl-link" d="M302 295 H458" marker-start="url(#cdc-arr)" marker-end="url(#cdc-arr)"/>
<text class="nl-small" x="380" y="285" text-anchor="middle">批量端点</text>
<text class="nl-key" x="380" y="318" text-anchor="middle">以太网帧</text>
<text class="nl-small" x="380" y="365" text-anchor="middle">ECM：一次批量传输 = 一帧　　NCM：多帧打包成 NTB 再传输</text>
</svg>
</div>

- **CDC 类驱动只搬以太网帧**，不解析 IP。设备端收到帧后交给 lwIP 的 netif，lwIP 要发的帧再交回 CDC 类驱动（TinyUSB 中是 `tud_network_recv_cb()` / `tud_network_xmit()`）；
- 主机把设备识别成一块普通网卡，所以设备上通常要跑一个 **DHCP 服务器**，给主机分配 IP。

## Q: RNDIS 和 ECM / NCM 是什么关系？

**RNDIS 不属于 CDC 标准，是微软的私有协议。** 它借用了 CDC 的接口结构（控制接口 + 数据接口），里面跑的是微软自己的消息格式。

TinyUSB 中的模板宏是 `TUD_RNDIS_DESCRIPTOR`，接口类按 Windows 版本二选一：

```c
#if 0
/* Windows XP */
#define TUD_RNDIS_ITF_CLASS    TUSB_CLASS_CDC                             // 0x02
#define TUD_RNDIS_ITF_SUBCLASS CDC_COMM_SUBCLASS_ABSTRACT_CONTROL_MODEL   // 0x02，伪装成 ACM
#define TUD_RNDIS_ITF_PROTOCOL 0xFF                                       // 微软 RNDIS
#else
/* Windows 7+ */
#define TUD_RNDIS_ITF_CLASS    TUSB_CLASS_WIRELESS_CONTROLLER             // 0xE0
#define TUD_RNDIS_ITF_SUBCLASS 0x01
#define TUD_RNDIS_ITF_PROTOCOL 0x03                                       // Windows 靠这组值自动匹配驱动
#endif
```

后面的结构和 ECM 类似：IAD、控制接口（Header、Call Management、ACM、Union 功能描述符 + 中断端点）、CDC Data 接口（两个批量端点）。主要区别：

| | ECM / NCM | RNDIS |
|---|---|---|
| 标准 | USB-IF 的 CDC 子类 | 微软私有 |
| 控制方式 | CDC 类请求 | 在 EP0 上用 `SEND_ENCAPSULATED_COMMAND` / `GET_ENCAPSULATED_RESPONSE` 收发 RNDIS 消息（初始化、查询或设置 OID） |
| MAC 地址 | `iMACAddress` 字符串描述符 | 主机通过 OID 查询 |
| 数据格式 | ECM：裸以太网帧；NCM：NTB | 每帧前加 44 字节的 `RNDIS_PACKET_MSG` 头 |
| 数据接口备用设置 | 有，备用设置 1 才激活 | 没有，端点直接可用 |

## Q: 选 ECM、NCM 还是 RNDIS？

| | ECM | NCM | RNDIS |
|---|---|---|---|
| Linux | 自带（cdc_ether） | 自带（cdc_ncm） | 自带（rndis_host） |
| macOS | 自带 | 自带 | **无**，需第三方 HoRNDIS |
| Windows | **无** | Windows 10 2004 起自带 | 自带（XP 起） |
| 吞吐 | 较低 | 较高 | 较低 |

- 只需支持新系统时选 **NCM**，一种就够；
- 还要兼容老 Windows 时，可以像 TinyUSB 例程 `net_lwip_webserver` 那样放**两个配置**：配置 1 为 RNDIS，配置 2 为 ECM。例程说明是 Windows 只能用 RNDIS，macOS 只能用 ECM，Linux 两种都能用；
- RNDIS 是私有协议，安全性也较差，新设计尽量不要只依赖它。
