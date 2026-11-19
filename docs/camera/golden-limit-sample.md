---
title: Golden Sample 与 AWB Limit Sample
date: 2026-11-17
order: 2
---

# Golden Sample 与 AWB Limit Sample

同一型号的摄像头模组，由于传感器、镜头、滤光片的制造差异，每一颗拍出来的颜色都会略有不同。ISP 调试和模组量产时，用 **Golden Sample** 和 **Limit Sample** 来处理这种差异。

## Q: 什么是 Golden Sample？

**Golden Sample（金样）** 是从一批模组中挑出的、各项特性最接近这批模组**平均水平**的那一颗，作为标准参考。

- ISP 的效果调试（白平衡、颜色校正矩阵 CCM、镜头阴影校正 LSC 等）都在 Golden Sample 上完成；
- 量产时，其他模组都向 Golden Sample 看齐。

## Q: 什么是 AWB Limit Sample？

**AWB Limit Sample（白平衡限度样品）** 是一批模组中颜色响应偏差**最大的几颗**，代表允许的上限和下限，例如偏红最多的、偏蓝最多的。

白平衡偏差常用传感器拍摄灰卡时的通道比值来衡量：

$$
R/G = \frac{\text{R 通道均值}}{\text{G 通道均值}}, \qquad B/G = \frac{\text{B 通道均值}}{\text{G 通道均值}}
$$

以 Golden Sample 的 $R/G$、$B/G$ 为中心，Limit Sample 划出允许的范围：

| 样品 | 作用 |
|---|---|
| Golden Sample | 中心值，调试 ISP 参数 |
| Limit Sample（上限 / 下限） | 边界值，验证 ISP 在偏差最大的模组上效果仍可接受，也作为量产判定的界限 |

超出 Limit Sample 范围的模组判为不良。

<div class="awbplot">
<svg viewBox="0 0 760 370" role="img" aria-label="AWB 偏差示意图：横轴 R/G，纵轴 B/G；Golden Sample 在中心，四个 Limit Sample 围出合格范围，范围外的模组判为不良，范围内的模组通过 OTP 补偿拉回中心">
<defs>
<marker id="aw-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="aw-axis-head" d="M0 0 L10 5 L0 10 z"/></marker>
<marker id="aw-arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="aw-otp-head" d="M0 0 L10 5 L0 10 z"/></marker>
</defs>
<line class="aw-axis" x1="90" y1="330" x2="720" y2="330" marker-end="url(#aw-arr)"/>
<line class="aw-axis" x1="90" y1="330" x2="90" y2="20" marker-end="url(#aw-arr)"/>
<text class="aw-text" x="716" y="356" text-anchor="end">R/G（越大越偏红）</text>
<text class="aw-text" x="102" y="30">B/G</text>
<text class="aw-small" x="102" y="48">越大越偏蓝</text>
<rect class="aw-box" x="220" y="80" width="280" height="200" rx="6"/>
<text class="aw-small" x="230" y="100">合格范围</text>
<circle class="aw-mod" cx="320" cy="150" r="5"/><circle class="aw-mod" cx="300" cy="118" r="5"/><circle class="aw-mod" cx="280" cy="235" r="5"/><circle class="aw-mod" cx="340" cy="255" r="5"/><circle class="aw-mod" cx="420" cy="165" r="5"/><circle class="aw-mod" cx="430" cy="240" r="5"/>
<path class="aw-limit" d="M500 172 L508 180 L500 188 L492 180 z"/><text class="aw-text" x="512" y="185">Limit（偏红）</text>
<path class="aw-limit" d="M220 172 L228 180 L220 188 L212 180 z"/><text class="aw-text" x="206" y="185" text-anchor="end">Limit（偏绿）</text>
<path class="aw-limit" d="M360 72 L368 80 L360 88 L352 80 z"/><text class="aw-text" x="360" y="64" text-anchor="middle">Limit（偏蓝）</text>
<path class="aw-limit" d="M360 272 L368 280 L360 288 L352 280 z"/><text class="aw-text" x="360" y="306" text-anchor="middle">Limit（偏黄）</text>
<circle class="aw-golden" cx="360" cy="180" r="8"/>
<text class="aw-key" x="360" y="210" text-anchor="middle">Golden Sample</text>
<circle class="aw-mod-hl" cx="455" cy="118" r="6"/>
<path class="aw-otp" d="M449 122 L370 174" marker-end="url(#aw-arr2)"/>
<text class="aw-key" x="466" y="114">OTP 补偿，拉回中心</text>
<path class="aw-bad" d="M564 40 L576 52 M576 40 L564 52"/><text class="aw-bad-text" x="586" y="51">超出范围：不良</text>
<path class="aw-bad" d="M144 284 L156 296 M156 284 L144 296"/>
</svg>
</div>

- **中心**是 Golden Sample，ISP 参数在它上面调好；
- **四个 Limit Sample** 分别是偏红、偏绿、偏蓝、偏黄最多的模组，围出合格范围；
- 范围**内**的模组（灰点）合格，再用 OTP 补偿拉回中心；范围**外**的模组（红叉）判为不良。

## Q: 量产时怎样利用这两种样品？

常见做法是 **OTP 标定**：

1. 每颗模组在产线上，于标准光源下拍摄灰卡，测出自己的 $R/G$、$B/G$；
2. 判断是否在 Limit Sample 范围内，超出则剔除；
3. 把测得的值写入模组的 OTP（一次性可编程存储器）；
4. 使用时 ISP 读出 OTP，与 Golden Sample 的值比较，计算补偿增益，把这颗模组的颜色拉回到和 Golden Sample 一致：

$$
\text{R 增益补偿} = \frac{(R/G)_{\text{golden}}}{(R/G)_{\text{模组}}}, \qquad \text{B 增益补偿} = \frac{(B/G)_{\text{golden}}}{(B/G)_{\text{模组}}}
$$

这样 ISP 参数只需在 Golden Sample 上调一次，就能适用于整批模组。
