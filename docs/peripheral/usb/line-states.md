---
title: 6. USB 线路状态
date: 2026-11-17
order: 6
---

# 6. USB 线路状态

USB 2.0 平时用 D+、D− 差分传输数据，但复位、包结束、挂起、唤醒这些控制动作，是靠两根线上的**特殊电平组合和持续时间**来表示的。本文整理低速 / 全速下的线路状态，以及 SE0 等特殊信号分别在什么时候出现。速率识别和 Chirp 握手的背景见 [USB 基础概念](/peripheral/usb/basics)。

## 线路状态

| 状态 | D+ | D− | 含义 |
|---|---|---|---|
| **J** | 高 | 低 | 差分 1；全速的空闲状态就是 J |
| **K** | 低 | 高 | 差分 0 |
| **SE0** | 低 | 低 | 单端零（Single-Ended Zero），用于包结束、复位等 |
| **SE1** | 高 | 高 | 非法状态，正常不会出现 |

上表是**全速**的定义。**低速**的 J、K 正好相反（J 是 D− 高），与低速设备的上拉电阻接在 D− 上、空闲时 D− 为高相对应。

数据本身用 NRZI 编码：比特 0 翻转一次（J↔K），比特 1 保持不变。下图是全速下一个数据包在线上的样子：

<div class="usbline">
<svg viewBox="0 0 760 250" role="img" aria-label="全速 USB 一个数据包的波形：空闲为 J，SYNC 为 KJKJKJKK，数据之后是 EOP，即两个比特时间的 SE0 加一个 J，然后回到空闲">
<rect class="ul-se0" x="500" y="36" width="60" height="152"/>
<path class="ul-bracket" d="M82 26 V20 H138 V26"/><text class="ul-text" x="110.0" y="14" text-anchor="middle">Idle（J）</text>
<path class="ul-bracket" d="M142 26 V20 H378 V26"/><text class="ul-text" x="260.0" y="14" text-anchor="middle">SYNC</text>
<path class="ul-bracket" d="M382 26 V20 H498 V26"/><text class="ul-text" x="440.0" y="14" text-anchor="middle">数据</text>
<path class="ul-bracket" d="M502 26 V20 H588 V26"/><text class="ul-text" x="545.0" y="14" text-anchor="middle">EOP</text>
<path class="ul-bracket" d="M592 26 V20 H708 V26"/><text class="ul-text" x="650.0" y="14" text-anchor="middle">Idle（J）</text>
<text class="ul-name" x="10" y="74">D+</text><text class="ul-name" x="10" y="159">D−</text>
<path class="ul-wave" d="M80 50 L110 50 L110 50 L140 50 L140 90 L170 90 L170 50 L200 50 L200 90 L230 90 L230 50 L260 50 L260 90 L290 90 L290 50 L320 50 L320 90 L350 90 L350 90 L380 90 L380 50 L410 50 L410 90 L440 90 L440 90 L470 90 L470 50 L500 50 L500 90 L530 90 L530 90 L560 90 L560 50 L590 50 L590 50 L620 50 L620 50 L650 50 L650 50 L680 50 L680 50 L710 50"/>
<path class="ul-wave" d="M80 175 L110 175 L110 175 L140 175 L140 135 L170 135 L170 175 L200 175 L200 135 L230 135 L230 175 L260 175 L260 135 L290 135 L290 175 L320 175 L320 135 L350 135 L350 135 L380 135 L380 175 L410 175 L410 135 L440 135 L440 135 L470 135 L470 175 L500 175 L500 175 L530 175 L530 175 L560 175 L560 175 L590 175 L590 175 L620 175 L620 175 L650 175 L650 175 L680 175 L680 175 L710 175"/>
<text class="ul-small" x="95.0" y="206" text-anchor="middle">J</text>
<text class="ul-small" x="125.0" y="206" text-anchor="middle">J</text>
<text class="ul-small" x="155.0" y="206" text-anchor="middle">K</text>
<text class="ul-small" x="185.0" y="206" text-anchor="middle">J</text>
<text class="ul-small" x="215.0" y="206" text-anchor="middle">K</text>
<text class="ul-small" x="245.0" y="206" text-anchor="middle">J</text>
<text class="ul-small" x="275.0" y="206" text-anchor="middle">K</text>
<text class="ul-small" x="305.0" y="206" text-anchor="middle">J</text>
<text class="ul-small" x="335.0" y="206" text-anchor="middle">K</text>
<text class="ul-small" x="365.0" y="206" text-anchor="middle">K</text>
<text class="ul-small" x="395.0" y="206" text-anchor="middle">J</text>
<text class="ul-small" x="425.0" y="206" text-anchor="middle">K</text>
<text class="ul-small" x="455.0" y="206" text-anchor="middle">K</text>
<text class="ul-small" x="485.0" y="206" text-anchor="middle">J</text>
<text class="ul-small" x="575.0" y="206" text-anchor="middle">J</text>
<text class="ul-small" x="605.0" y="206" text-anchor="middle">J</text>
<text class="ul-small" x="635.0" y="206" text-anchor="middle">J</text>
<text class="ul-small" x="665.0" y="206" text-anchor="middle">J</text>
<text class="ul-small" x="695.0" y="206" text-anchor="middle">J</text>
<text class="ul-key" x="530" y="206" text-anchor="middle">SE0</text>
<text class="ul-key" x="530" y="232" text-anchor="middle">两根线都为低</text>
</svg>
</div>

- 空闲时线上保持 **J**；
- 包以 **SYNC**（`KJKJKJKK`）开头，用于接收方同步时钟；
- 包以 **EOP** 结尾：约 2 个比特时间的 **SE0**，再加 1 个比特时间的 **J**，然后回到空闲。

## SE0 出现的场景

| 场景 | 谁发出 | 持续时间 | 说明 |
|---|---|---|---|
| **包结束（EOP）** | 发包的一方 | 约 2 个比特时间 | 每个包末尾都有，抓波形最常见 |
| **低速 Keep-alive** | Hub（含主机的根集线器） | 一个低速 EOP | 低速设备收不到 SOF 包，Hub 在每个有 SOF 的帧（1 ms）里给低速端口发一个 EOP 代替，防止设备进入挂起 |
| **总线复位（Reset）** | 主机 | ≥ 10 ms | 设备检测到 SE0 超过约 2.5 µs 就认为在复位，复位后地址回到 0，重新枚举；高速 Chirp 握手也在复位期间进行 |
| **设备断开** | 没人主动发 | 持续 | 设备拔掉后上拉电阻消失，主机端的 15 kΩ 下拉把两根线都拉低；下行端口看到 SE0 持续 ≥ 2.5 µs 就判定断开 |

区分这几种情况主要看**持续时间**：

- 几十到几百纳秒的 SE0：包结束；
- 长时间的 SE0：主机主动发出的是复位，没人驱动、由下拉电阻形成的是断开。

## 其他特殊信号

| 信号 | 线路状态 | 谁发出 | 用途 |
|---|---|---|---|
| **Idle** | 持续 J | — | 总线空闲 |
| **SYNC** | `KJKJKJKK` | 发包的一方 | 每个包开头，同步时钟 |
| **Suspend（挂起）** | 持续 Idle 超过 3 ms | — | 总线上 3 ms 没有任何活动（正常时主机每帧都发 SOF），设备进入挂起，USB 2.0 规定挂起电流不超过 2.5 mA |
| **Resume（恢复）** | K 持续 ≥ 20 ms，再接一个低速 EOP | 主机 | 把挂起的设备唤醒；如果挂起前是高速，结尾直接回到高速空闲 |
| **Remote Wakeup（远程唤醒）** | 总线空闲 ≥ 5 ms 后，K 持续 1 ~ 15 ms | 设备 | 设备主动唤醒主机；配置描述符中声明支持，且主机用 `SET_FEATURE` 打开后才能使用 |
| **Chirp K / Chirp J** | 用高速驱动电流发出的 K / J | 设备 / Hub | 复位期间的高速握手：设备先发 ≥ 1 ms 的 Chirp K，Hub 再回复交替的 Chirp K、J（每个 40 ~ 60 µs） |
| **SE1** | D+、D− 都高 | — | 非法状态，出现说明硬件有问题 |

高速（480 Mbit/s）下的区别：

- **空闲**时两根线都接近 0 V，电平上和 SE0 一样；
- 复位仍然用 SE0。高速设备看到持续 3 ms 的空闲后，要切回全速再采样，看到 SE0 是复位，看到 J 是挂起；
- 包结束不再用 SE0，而是发一段关闭位填充的 `01111111`（NRZ）作为 EOP，SOF 包的 EOP 更长，为 40 个符号；
- 断开不再看 SE0，而是由 Hub 在发 SOF 时检测差分幅度：设备拔掉后没有了设备端的终端电阻，幅度约翻倍，超过阈值就判定断开。

## 参考资料

- *Universal Serial Bus Specification Revision 2.0*：Table 7-2（低速 / 全速信号电平）、7.1.7（信号时序：复位、挂起、恢复）、7.1.8（NRZI）、7.1.10（SYNC）、11.8.4.1（Keep-alive）
