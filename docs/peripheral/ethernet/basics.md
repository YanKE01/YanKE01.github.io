---
title: ESP32 以太网基础：MAC、PHY、RMII 与 ESP-IDF 驱动
date: 2026-11-27
order: 1
---

# ESP32 以太网基础：MAC、PHY、RMII 与 ESP-IDF 驱动

ESP32、ESP32-P4 等芯片内置以太网 MAC（EMAC），外接一颗 PHY 就能用有线网口。本文结合 ESP-IDF [以太网编程指南](https://docs.espressif.com/projects/esp-idf/zh_CN/stable/esp32p4/api-reference/network/esp_eth.html)，介绍硬件分工、RMII 与参考时钟、驱动初始化，以及排查方法。代码以 ESP-IDF v5.5 为准，以太网帧格式见 [USB 网卡](/peripheral/usb/cdc-network)。

## 整体结构

<div class="netlayers">
<svg viewBox="0 0 760 320" role="img" aria-label="以太网硬件结构：MCU 内的 lwIP 和 MAC 通过 RMII 与 MDIO 连接 PHY，再经变压器、RJ45、网线到交换机；下方标出各种测试覆盖的范围">
<defs>
<marker id="eth-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="nl-arrow" d="M0 0 L10 5 L0 10 z"/></marker>
</defs>
<text class="nl-title" x="120" y="28" text-anchor="middle">MCU（如 ESP32-P4）</text>
<rect class="nl-frame" x="10" y="40" width="220" height="90" rx="8"/>
<rect class="nl-p4" x="20" y="60" width="90" height="50" rx="6"/>
<text class="nl-name" x="65" y="82" text-anchor="middle">lwIP</text><text class="nl-small" x="65" y="100" text-anchor="middle">esp_netif</text>
<rect class="nl-p4" x="130" y="60" width="90" height="50" rx="6"/>
<text class="nl-name" x="175" y="82" text-anchor="middle">MAC</text><text class="nl-small" x="175" y="100" text-anchor="middle">EMAC + DMA</text>
<rect class="nl-p4" x="330" y="60" width="100" height="50" rx="6"/>
<text class="nl-name" x="380" y="82" text-anchor="middle">PHY</text><text class="nl-small" x="380" y="100" text-anchor="middle">如 IP101</text>
<rect class="nl-p4" x="480" y="60" width="90" height="50" rx="6"/>
<text class="nl-name" x="525" y="90" text-anchor="middle">变压器</text>
<rect class="nl-p4" x="600" y="60" width="60" height="50" rx="6"/>
<text class="nl-name" x="630" y="90" text-anchor="middle">RJ45</text>
<rect class="nl-p4" x="690" y="60" width="64" height="50" rx="6"/>
<text class="nl-name" x="722" y="90" text-anchor="middle">交换机</text>
<path class="nl-link" d="M110 85 H130"/>
<path class="nl-link" d="M220 75 H330" marker-start="url(#eth-arr)" marker-end="url(#eth-arr)"/>
<text class="nl-small" x="275" y="68" text-anchor="middle">RMII 数据平面</text>
<path class="nl-link" d="M220 100 H330" style="stroke-dasharray:4 3"/>
<text class="nl-small" x="275" y="122" text-anchor="middle">MDIO 控制平面</text>
<path class="nl-link" d="M430 85 H480"/>
<path class="nl-link" d="M570 85 H600"/>
<path class="nl-link" d="M660 85 H690"/>
<text class="nl-small" x="675" y="128" text-anchor="middle">网线</text>
<rect class="nl-c6" x="130" y="160" width="90" height="22" rx="4"/>
<text class="nl-detail" x="232" y="176">MAC 内部环回：只测 MAC + DMA</text>
<rect class="nl-c6" x="130" y="200" width="300" height="22" rx="4"/>
<text class="nl-detail" x="442" y="216">PHY 环回：再加上 RMII 和 PHY</text>
<rect class="nl-c6" x="330" y="240" width="424" height="22" rx="4"/>
<text class="nl-detail" x="318" y="256" text-anchor="end">链路 UP：只说明 PHY ↔ 交换机正常</text>
<rect class="nl-c6" x="20" y="280" width="734" height="22" rx="4"/>
<text class="nl-name" x="387" y="296" text-anchor="middle">收到真实帧、DHCP 拿到 IP：整条链路都通</text>
</svg>
</div>

| 部分 | 作用 |
|---|---|
| **MAC** | 组帧拆帧、校验 FCS、通过 DMA 和内存交换数据。ESP 芯片内置的叫 EMAC |
| **PHY** | 把比特编码成线上的电平（100BASE-TX 用 4B5B + MLT-3），并和对端**自动协商**速率与双工 |
| **网络变压器** | 隔离直流电位、抑制共模干扰，常集成在 RJ45 座子里 |
| **RJ45 + 网线** | 百兆只用两对线，一对发、一对收 |

MAC 和 PHY 之间有两条独立的通路，ESP-IDF 文档称为：

- **数据平面**（RMII）：传输以太网帧；
- **控制平面**（MDIO / MDC，ESP-IDF 中叫 SMI）：读写 PHY 寄存器。

**能读到 PHY ID、链路 UP，都只说明控制平面正常，不能说明数据平面是通的。** 这是排查时最重要的一点。

## 控制平面：MDIO

- **MDC**：时钟，由 MAC 输出，通常 ≤ 2.5 MHz；
- **MDIO**：双向数据线，需要上拉。

一条总线可挂多个 PHY，用 0～31 的地址区分，地址由 PHY 的 strap 引脚决定。`eth_phy_config_t::phy_addr` 设为 `-1` 时驱动会自动扫描。MDC、MDIO 可经 GPIO 交换矩阵接到任意 GPIO。

IEEE 802.3 规定了前几个寄存器，所有 PHY 通用，ESP-IDF 的通用驱动 `esp_eth_phy_802_3.c` 就基于它们：

| 寄存器 | 名称 | 常用位 |
|---|---|---|
| 0 | BMCR（控制） | bit15 软复位、bit14 **环回**、bit13 速率、bit12 自动协商、bit8 双工 |
| 1 | BMSR（状态） | bit5 自动协商完成、bit2 **链路状态** |
| 2、3 | PHY ID | 例如 IP101 为 `0x0243:0x0c54` |
| 4、5 | 本端 / 对端协商能力 | 取双方都支持的最高模式 |

调试时可以直接读写任意寄存器：

```c
uint32_t val;
esp_eth_phy_reg_rw_data_t reg = { .reg_addr = 1, .reg_value_p = &val };  // 读 BMSR
esp_eth_ioctl(eth_handle, ETH_CMD_READ_PHY_REG, &reg);
```

## 数据平面：RMII

| 接口 | 数据线 | 时钟 | 信号数 | 速率 |
|---|---|---|---|---|
| MII | 收发各 4 位 | 25 MHz，PHY 提供 | 最多约 18 根 | 10 / 100M |
| **RMII** | 收发各 2 位 | **50 MHz，收发共用 REF_CLK** | 9 根 | 10 / 100M |
| RGMII | 收发各 4 位，双边沿 | 125 MHz | 约 12 根 | 10 / 100 / 1000M |

ESP-IDF 只支持 RMII（支持千兆的新芯片另有 RGMII）。RMII 信号：

| 信号 | 方向 | 作用 |
|---|---|---|
| REF_CLK | 共用 | 50 MHz，收发都在上升沿采样 |
| TX_EN、TXD0、TXD1 | MAC → PHY | 发送使能和数据，每时钟 2 位 |
| CRS_DV、RXD0、RXD1 | PHY → MAC | 载波/数据有效和接收数据 |
| RX_ER | PHY → MAC | 接收错误，可选 |

50 MHz × 2 位 = 100 Mbps；10M 时时钟不变，每 2 位保持 10 个周期。

### ESP32-P4 的 RMII 引脚

数据平面只能走 IO MUX，不能经过 GPIO 交换矩阵（见 [IO MUX 与 GPIO 交换矩阵](/chip/espressif/iomux-gpio-matrix)）。ESP32 的引脚固定；ESP32-P4 每个信号有几个可选引脚，在 `emac_dataif_gpio` 中指定（见编程指南[配置 MAC 和 PHY](https://docs.espressif.com/projects/esp-idf/zh_CN/stable/esp32p4/api-reference/network/esp_eth.html#mac-phy)）：

| 信号 | 可选 GPIO | 默认配置 |
|---|---|---|
| TX_EN | 33、40、49 | 49 |
| TXD0 / TXD1 | 34、41 / 35、42 | 34 / 35 |
| CRS_DV | 28、45、51 | 28 |
| RXD0 / RXD1 | 29、46、52 / 30、47、53 | 29 / 30 |
| REF_CLK 输入 | 32、44、50 | 50 |
| REF_CLK 输出 | 23、39 | — |
| MDC / MDIO | 任意 | 31 / 52 |

默认配置 `ETH_ESP32_EMAC_DEFAULT_CONFIG()` 假设 REF_CLK 由 PHY 提供、从 GPIO50 输入。

## REF_CLK：最容易出问题的地方

RMII 收发**只有一个时钟**，MAC 和 PHY 都用它采样，要求：

- 50 MHz，±50 ppm；
- MAC 和 PHY **必须用同一个时钟**，且访问期间一直稳定；
- 走线短，远离射频器件和电感。

时钟有三种来源，对应 ESP-IDF 文档中的选项 a、b、c：

<div class="netlayers">
<svg viewBox="0 0 760 230" role="img" aria-label="RMII 参考时钟的三种来源：PHY 用 25 MHz 晶振生成 50 MHz 给 MAC；外部 50 MHz 有源晶振同时给两者；MAC 输出 50 MHz 给 PHY，ESP32-P4 还要在板上回接到自己的时钟输入脚">
<defs>
<marker id="clk-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="nl-arrow" d="M0 0 L10 5 L0 10 z"/></marker>
</defs>
<text class="nl-name" x="130" y="24" text-anchor="middle">a. PHY 提供</text>
<rect class="nl-p4" x="20" y="50" width="80" height="44" rx="6"/><text class="nl-name" x="60" y="77" text-anchor="middle">MAC</text>
<rect class="nl-p4" x="160" y="50" width="80" height="44" rx="6"/><text class="nl-name" x="200" y="77" text-anchor="middle">PHY</text>
<rect class="nl-c6" x="160" y="140" width="80" height="36" rx="6"/><text class="nl-small" x="200" y="163" text-anchor="middle">25 MHz 晶振</text>
<path class="nl-link" d="M200 140 V94" marker-end="url(#clk-arr)"/>
<path class="nl-link" d="M160 72 H100" marker-end="url(#clk-arr)"/>
<text class="nl-small" x="130" y="64" text-anchor="middle">50 MHz</text>
<text class="nl-small" x="130" y="210" text-anchor="middle">PHY 用倍频生成 50 MHz</text>
<text class="nl-name" x="380" y="24" text-anchor="middle">b. 外部有源晶振</text>
<rect class="nl-p4" x="270" y="50" width="80" height="44" rx="6"/><text class="nl-name" x="310" y="77" text-anchor="middle">MAC</text>
<rect class="nl-p4" x="410" y="50" width="80" height="44" rx="6"/><text class="nl-name" x="450" y="77" text-anchor="middle">PHY</text>
<rect class="nl-c6" x="320" y="140" width="120" height="36" rx="6"/><text class="nl-small" x="380" y="163" text-anchor="middle">50 MHz 有源晶振</text>
<path class="nl-link" d="M340 140 V120 H310 V94" marker-end="url(#clk-arr)"/>
<path class="nl-link" d="M420 140 V120 H450 V94" marker-end="url(#clk-arr)"/>
<text class="nl-small" x="380" y="210" text-anchor="middle">同一个时钟分两路</text>
<text class="nl-name" x="630" y="24" text-anchor="middle">c. MAC 提供</text>
<rect class="nl-p4" x="520" y="50" width="80" height="44" rx="6"/><text class="nl-name" x="560" y="77" text-anchor="middle">MAC</text>
<rect class="nl-p4" x="660" y="50" width="80" height="44" rx="6"/><text class="nl-name" x="700" y="77" text-anchor="middle">PHY</text>
<path class="nl-link" d="M600 72 H660" marker-end="url(#clk-arr)"/>
<text class="nl-small" x="630" y="64" text-anchor="middle">50 MHz</text>
<path class="nl-link" d="M630 72 V125 H560 V94" marker-end="url(#clk-arr)"/>
<text class="nl-small" x="630" y="148" text-anchor="middle">P4：板上回接到</text>
<text class="nl-small" x="630" y="166" text-anchor="middle">时钟输入脚</text>
<text class="nl-small" x="630" y="210" text-anchor="middle">进 PHY 的时钟输入脚</text>
</svg>
</div>

| 方式 | 时钟从哪来 | `clock_config.rmii.clock_mode` |
|---|---|---|
| a. PHY 提供 | PHY 接 25 MHz 晶振，输出 50 MHz 给 MAC | `EMAC_CLK_EXT_IN` |
| b. 有源晶振 | 50 MHz 有源晶振同时给 MAC 和 PHY | `EMAC_CLK_EXT_IN` |
| c. MAC 提供 | ESP 用内部 PLL 分频出 50 MHz 给 PHY | `EMAC_CLK_OUT` |

a、b 最稳妥；c 省一颗晶振，但有芯片相关的限制。

### 方式 c 在 ESP32 上的限制

见 ESP32 版编程指南[配置 MAC 和 PHY](https://docs.espressif.com/projects/esp-idf/zh_CN/stable/esp32/api-reference/network/esp_eth.html#mac-phy)：

- 时钟来自 APLL，不能和 I2S 的 APLL 配置冲突；
- **要和 Wi-Fi / 蓝牙同时工作时，不要用 ESP32 输出 REF_CLK**，否则时钟不稳定；
- 输入时钟只能用 GPIO0，它是 strapping 引脚，启动阶段要能关掉时钟，否则可能进入下载模式。

### 方式 c 在 ESP32-P4 上的要求

见 P4 版编程指南[配置 MAC 和 PHY](https://docs.espressif.com/projects/esp-idf/zh_CN/stable/esp32p4/api-reference/network/esp_eth.html#mac-phy) 和[可选的运行时 MAC 时钟配置](https://docs.espressif.com/projects/esp-idf/zh_CN/stable/esp32p4/api-reference/network/esp_eth.html#id8)。

GPIO23 / 39 输出的 50 MHz **不会在芯片内部送给 EMAC**，必须在板上回接到一个 REF_CLK 输入脚（32、44、50），并配置两项：

```c
eth_esp32_emac_config_t cfg = ETH_ESP32_EMAC_DEFAULT_CONFIG();
cfg.clock_config.rmii.clock_mode = EMAC_CLK_OUT;           // GPIO23 输出
cfg.clock_config.rmii.clock_gpio = 23;
cfg.clock_config_out_in.rmii.clock_mode = EMAC_CLK_EXT_IN; // 从回接的输入脚采样
cfg.clock_config_out_in.rmii.clock_gpio = 50;
```

这个 50 MHz 由 MPLL 整数分频得到，MPLL 和 PSRAM 共用。如果 MPLL 被固定在分不出 50 MHz 的频率（如 320 MHz），初始化会失败。日志 `MPLL is occupied already, it is working at 500000000 Hz` 则没问题：500 ÷ 10 = 50。

### PHY 一侧要配对

PHY 输出还是输入 50 MHz，由它的 strap 引脚或寄存器决定，**ESP-IDF 的 PHY 驱动不会改**。很多 PHY 有一个 50 MHz 输出脚（方式 a）和一个输入脚（方式 b、c），常见错误：

- 时钟送到了 PHY 的输出脚，输入脚悬空；
- strap 设定的时钟模式和实际接法不一致；
- 方式 c 下 PHY 也在输出时钟，和 MCU 在同一根线上**对冲**；
- 原理图按一种方式画，装配按另一种贴（晶振、0 Ω 电阻没贴或多贴）。

对照 PHY 数据手册的时钟章节和 strap 说明确认接法。

## ESP-IDF 驱动初始化

```c
// 1. MAC 实例：SMI 引脚、RMII 引脚、时钟
eth_mac_config_t mac_config = ETH_MAC_DEFAULT_CONFIG();
eth_esp32_emac_config_t emac_config = ETH_ESP32_EMAC_DEFAULT_CONFIG();
esp_eth_mac_t *mac = esp_eth_mac_new_esp32(&emac_config, &mac_config);

// 2. PHY 实例：地址、复位脚
eth_phy_config_t phy_config = ETH_PHY_DEFAULT_CONFIG();
phy_config.phy_addr = 1;
phy_config.reset_gpio_num = 51;
esp_eth_phy_t *phy = esp_eth_phy_new_ip101(&phy_config);

// 3. 安装驱动
esp_eth_config_t config = ETH_DEFAULT_CONFIG(mac, phy);
esp_eth_handle_t eth_handle = NULL;
esp_eth_driver_install(&config, &eth_handle);

// 4. 接到 TCP/IP 协议栈（需先 esp_netif_init() 和创建默认事件循环）
esp_netif_config_t netif_cfg = ESP_NETIF_DEFAULT_ETH();
esp_netif_t *eth_netif = esp_netif_new(&netif_cfg);
esp_netif_attach(eth_netif, esp_eth_new_netif_glue(eth_handle));

// 5. 注册事件，启动
esp_event_handler_register(ETH_EVENT, ESP_EVENT_ANY_ID, &eth_event_handler, NULL);
esp_event_handler_register(IP_EVENT, IP_EVENT_ETH_GOT_IP, &got_ip_handler, NULL);
esp_eth_start(eth_handle);
```

详见编程指南[创建 MAC 和 PHY 实例](https://docs.espressif.com/projects/esp-idf/zh_CN/stable/esp32p4/api-reference/network/esp_eth.html#emac-phy)、[安装驱动程序](https://docs.espressif.com/projects/esp-idf/zh_CN/stable/esp32p4/api-reference/network/esp_eth.html#id11)、[连接至 TCP/IP 协议栈](https://docs.espressif.com/projects/esp-idf/zh_CN/stable/esp32p4/api-reference/network/esp_eth.html#tcp-ip)。

PHY 驱动：`esp_eth_phy_new_generic()` 只用标准寄存器，多数 PHY 能用；v5.x 还自带 IP101、LAN87xx、RTL8201、DP83848、KSZ80xx 专用驱动，较新版本把它们移到了 [esp-eth-drivers](https://github.com/espressif/esp-eth-drivers)。

**MDIO 要能通，最少要接什么**（以 IP101 为例）：

- PHY 一侧：供电和地、RESET_N 释放（驱动释放后等 10 ms）、PHY 自己的时钟（25 MHz 晶振或 50 MHz 输入，按 strap 模式）、MDC 和 MDIO（MDIO 上拉）、地址 strap 电平确定；
- ESP 一侧：**MAC 的 REF_CLK 输入也必须有时钟。** `emac_esp32_init()` 第一步是 EMAC 软件复位，没有 RMII 时钟时复位完不成，报 `reset timeout`，之后才轮到 MDIO。所以即使只想读 PHY ID，也要先有 REF_CLK。想绕开 MAC 单独测 PHY，可以用两个 GPIO 软件模拟 MDIO。

各阶段需要哪部分正常：

| 阶段 | 依赖 | 需要数据平面吗 |
|---|---|---|
| `esp_eth_driver_install()` 成功 | MAC 端 REF_CLK、MDIO、PHY 供电和复位 | 否 |
| `ETHERNET_EVENT_CONNECTED`（链路 UP） | PHY 与交换机自动协商成功，驱动定期经 MDIO 读到 BMSR 链路位 | 否 |
| `IP_EVENT_ETH_GOT_IP` | DHCP 报文经 RMII 收发 | **是** |

## 排查

### 从现象推断

| 现象 | 说明 |
|---|---|
| `reset timeout` | MAC 的 REF_CLK 输入没有时钟 |
| 驱动安装成功 | MAC 端有 REF_CLK |
| 读到正确的 PHY ID | MDIO、地址、复位、供电正常 |
| 链路协商出 100M | **PHY 自己的时钟在正常运行**：100BASE-TX 要以 125 Mbaud 持续发送，PHY 没时钟不可能和交换机连上 |
| 链路 DOWN | 查网线、变压器、RJ45、PHY 供电和复位 |

所以"链路 100M UP，但收不到帧、拿不到 IP"时，问题不是 PHY 没时钟，而是 **PHY 和 MAC 用的不是同一个时钟，或时钟质量、相位有问题**，例如：

- PHY 用自己的时钟，MAC 用另一路 50 MHz，频率接近但不同源；
- PHY 时钟输入脚悬空，从相邻走线耦合到微弱时钟，勉强工作，RMII 采样时好时坏；
- MCU 和 PHY 在同一根时钟线上对冲。

### 用环回分段定位

| 测试 | 经过的部分 | ESP-IDF 中怎么做 |
|---|---|---|
| MAC 内部环回 | MAC、DMA，不出芯片 | 无公开 API，用 HAL 的 `emac_ll_loopback_enable()` |
| PHY 环回 | 再加 **RMII 走线、REF_CLK**、PHY 数字部分 | `esp_eth_ioctl(h, ETH_CMD_S_PHY_LOOPBACK, &enable)`，即 BMCR bit14 |
| 外部环回 | 再加变压器和 RJ45 | 插收发短接的环回头 |
| 真实网络 | 整条链路 | DHCP、ping、`ethernet/iperf` 示例 |

环回时发自定义帧，用 `esp_eth_update_input_path()` 注册的回调统计收到的帧数。

| MAC 环回 | PHY 环回 | 问题在 |
|---|---|---|
| 失败 | — | 芯片内部：驱动、DMA、EMAC 时钟 |
| 通过 | 失败 | **MAC 与 PHY 之间**：RMII 数据线、REF_CLK、PHY 时钟模式 |
| 通过 | 通过 | 往外查：变压器、RJ45，或 MAC 地址过滤、DHCP |

失败的形式也有区别：**每次全收到或全收不到**，多半是时钟没对上；**零星丢帧、CRC 错误多**，多半是信号完整性问题，可以调驱动强度、查走线和串联电阻。

PHY 环回时 PHY 会断开网线一侧，日志里出现一次 Link DOWN 再 UP 是正常的。

### 用示波器测什么

| 测点 | 看什么 |
|---|---|
| REF_CLK（MAC 端和 PHY 每个时钟相关引脚） | 是否 50 MHz、幅度和边沿是否正常、是否同源同相；对冲时波形变形 |
| TX_EN、TXD0、TXD1 | 发帧时 MAC 有没有输出 |
| CRS_DV、RXD0、RXD1 | PHY 有没有送回数据 |
| PHY 复位脚、电源 | 复位是否释放、电压是否正常 |

测 50 MHz 至少用 200 MHz 带宽的示波器和短地线探头。

## 其他配置

- **DMA 缓冲区**：默认 `CONFIG_ETH_DMA_BUFFER_SIZE` = 512 字节。小帧多时吞吐上不去、发送返回 `ENOMEM`，可增加 `CONFIG_ETH_DMA_RX_BUFFER_NUM` / `TX_BUFFER_NUM`（见[内存注意事项](https://docs.espressif.com/projects/esp-idf/zh_CN/stable/esp32p4/api-reference/network/esp_eth.html#mac)）；
- **流量控制**：默认关闭，`ETH_CMD_S_FLOW_CTRL` 打开后接收跟不上时发 802.3x 暂停帧，需双方协商时都支持（见[数据流量控制](https://docs.espressif.com/projects/esp-idf/zh_CN/stable/esp32p4/api-reference/network/esp_eth.html#id14)）；
- **示例**：`examples/ethernet/basic`（DHCP、ping）、`examples/ethernet/iperf`（测吞吐）。
