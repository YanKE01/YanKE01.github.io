---
title: 网络分层：以 ESP-Hosted 为例
date: 2026-11-16
order: 1
---

# 网络分层：以 ESP-Hosted 为例

ESP32-P4 本身没有 Wi-Fi，常见做法是外接一颗 ESP32-C6 之类的芯片作为**协处理器**（slave），两者通过 SPI / SDIO 连接，这套方案就是 [ESP-Hosted](https://github.com/espressif/esp-hosted-mcu)。本文以它为例，说明网络分层模型中每一层由谁负责。

## Q: 网络分层模型有哪几层？

常用的是 TCP/IP 五层模型（OSI 七层模型把应用层再细分为应用层、表示层、会话层）：

| 层 | 名称 | 作用 | 例子 |
|---|---|---|---|
| 5 | 应用层 | 具体业务的数据格式 | HTTP、MQTT、DNS |
| 4 | 传输层 | 端到端传输，用**端口**区分不同程序 | TCP、UDP |
| 3 | 网络层 | 跨网络寻址和路由，用 **IP 地址**找到目标主机 | IP、ICMP（ping） |
| 2 | 数据链路层 | 同一局域网内传输，用 **MAC 地址**找到下一跳设备 | 以太网帧（802.3）、Wi-Fi 帧（802.11） |
| 1 | 物理层 | 把比特变成电信号或无线电波 | 网线、Wi-Fi 射频 |

发送时数据从上往下逐层**加包头**，接收时从下往上逐层**拆包头**：

```text
应用数据                                  [ MQTT 数据 ]
传输层加 TCP 头                    [ TCP | MQTT 数据 ]
网络层加 IP 头                [ IP | TCP | MQTT 数据 ]
链路层加以太网头       [ ETH | IP | TCP | MQTT 数据 ]
```

## Q: ESP-Hosted 中，slave 和 P4 分别负责哪几层？

<div class="netlayers">
<svg viewBox="0 0 760 410" role="img" aria-label="ESP-Hosted 网络分层：P4 负责第 3 到 5 层，C6 负责第 1、2 层，两者通过 SPI 或 SDIO 传递以太网帧">
<defs>
<marker id="nl-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="nl-arrow" d="M0 0 L10 5 L0 10 z"/></marker>
</defs>
<text class="nl-title" x="190" y="28" text-anchor="middle">ESP32-P4（host）· 第 3 ~ 5 层</text>
<rect class="nl-frame" x="30" y="40" width="320" height="180" rx="10"/>
<rect class="nl-p4" x="40" y="50" width="300" height="50" rx="6"/>
<text class="nl-name" x="56" y="80">5 应用层</text><text class="nl-detail" x="160" y="80">HTTP、MQTT 等</text>
<rect class="nl-p4" x="40" y="105" width="300" height="50" rx="6"/>
<text class="nl-name" x="56" y="135">4 传输层</text><text class="nl-detail" x="160" y="135">TCP / UDP（lwIP）</text>
<rect class="nl-p4" x="40" y="160" width="300" height="50" rx="6"/>
<text class="nl-name" x="56" y="190">3 网络层</text><text class="nl-detail" x="160" y="190">IP（lwIP）</text>
<text class="nl-title" x="570" y="218" text-anchor="middle">ESP32-C6（slave）· 第 1、2 层</text>
<rect class="nl-frame" x="410" y="230" width="320" height="125" rx="10"/>
<rect class="nl-c6" x="420" y="240" width="300" height="50" rx="6"/>
<text class="nl-name" x="436" y="270">2 数据链路层</text><text class="nl-detail" x="560" y="270">Wi-Fi MAC、帧转换</text>
<rect class="nl-c6" x="420" y="295" width="300" height="50" rx="6"/>
<text class="nl-name" x="436" y="325">1 物理层</text><text class="nl-detail" x="560" y="325">Wi-Fi 射频</text>
<path class="nl-link" d="M190 222 V265 H408" marker-start="url(#nl-arr)" marker-end="url(#nl-arr)"/>
<text class="nl-small" x="300" y="255" text-anchor="middle">SPI / SDIO</text>
<text class="nl-key" x="300" y="287" text-anchor="middle">以太网帧（802.3）</text>
<path class="nl-link" d="M570 357 V392" marker-end="url(#nl-arr)"/>
<text class="nl-key" x="584" y="388">Wi-Fi 无线信号 ⇄ 路由器</text>
</svg>
</div>

- **slave（C6）负责第 1、2 层**：运行 Wi-Fi 驱动，完成射频收发、连接路由器、加密、重传等，并把 Wi-Fi 帧（802.11）和以太网帧（802.3）互相转换；
- **P4 负责第 3 ~ 5 层**：P4 上运行 lwIP 协议栈，处理 IP、TCP/UDP，应用程序在上面跑 HTTP、MQTT 等；
- **两者之间通过 SPI / SDIO 传递以太网帧**：P4 的 lwIP 把 IP 包加上以太网头（目标 MAC 地址等）交给 C6，C6 **不解析里面的 IP 和 TCP**，直接转成 **Wi-Fi 帧**发出去；接收方向相反。外面还有一个 ESP-Hosted 自己的传输包头，标明是哪个接口的数据。

所以对 P4 来说，**C6 就像一块 Wi-Fi 网卡**：网卡负责第 1、2 层，P4 只要收发**以太网帧**，和接一块有线网卡几乎一样。

## Q: Wi-Fi 的连接、扫描这些命令走的是哪条路径？

ESP-Hosted 有两条通道：

| 通道 | 内容 | 说明 |
|---|---|---|
| 数据通道 | 以太网帧 | 上一节所说的网络数据 |
| 控制通道 | RPC 命令 | P4 调用 `esp_wifi_connect()`、`esp_wifi_scan_start()` 等接口时，被转换成 RPC 命令发给 slave 执行，结果和事件再传回 P4 |

在 P4 上写代码时，调用的还是熟悉的 `esp_wifi_*` 接口，由 `esp_wifi_remote` 组件把它们转发到 slave。

## Q: slave 只能做第 1、2 层吗？

默认如此，但 ESP-Hosted 有一个可选功能 **Network Split**：slave 上也运行一个 lwIP，两边**共用一个 IP 地址**，slave 按端口决定每个数据包交给哪一边处理。这样 P4 休眠时，slave 可以自己维持 MQTT 等连接，需要时再唤醒 P4。

## 参考资料

- [ESP-Hosted MCU](https://github.com/espressif/esp-hosted-mcu)：`docs/architecture.md`、`docs/features/network-split.md`
