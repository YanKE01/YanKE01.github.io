---
title: 目标检测指标：mAP50、mAP50-95 与 MACs
date: 2026-11-26
order: 4
---

# 目标检测指标：mAP50、mAP50-95 与 MACs

训练检测模型（如 YOLO）时，日志和模型对比表里常见这几列：

| 指标 | 衡量什么 | 越大越好？ |
|---|---|---|
| mAP50 | 检测准不准，框的位置要求宽松 | 是 |
| mAP50-95 | 检测准不准，框的位置要求从宽松到严格取平均 | 是 |
| MACs / MMACs | 跑一次推理要做多少次乘加，即计算量 | 否，越小越快 |
| Params | 参数量，影响模型文件大小 | 否 |

它们不是训练时要设置的参数，而是**评估结果**：mAP 衡量精度，MACs 衡量速度成本。下面先介绍 mAP 依赖的几个概念。

## IoU：预测框和真实框重叠多少

IoU（Intersection over Union，交并比）= 两个框的交集面积 ÷ 并集面积，取值 0～1：

<div class="netlayers">
<svg viewBox="0 0 640 220" role="img" aria-label="预测框和真实框部分重叠，IoU 等于交集面积除以并集面积">
<rect x="60" y="40" width="200" height="130" style="fill:none;stroke:var(--vp-c-text-2);stroke-width:2"/>
<rect x="130" y="70" width="200" height="130" style="fill:none;stroke:var(--vp-c-text-2);stroke-width:2;stroke-dasharray:6 4"/>
<rect class="nl-c6" x="130" y="70" width="130" height="100" style="opacity:.8"/>
<text class="nl-small" x="65" y="32">真实框（实线）</text>
<text class="nl-small" x="250" y="216">预测框（虚线）</text>
<text class="nl-name" x="195" y="125" text-anchor="middle">交集</text>
<text class="nl-key" x="380" y="105">IoU = 交集 ÷ 并集</text>
<text class="nl-small" x="380" y="135">完全重合：IoU = 1</text>
<text class="nl-small" x="380" y="158">完全不重叠：IoU = 0</text>
<text class="nl-small" x="380" y="181">本例约 0.33</text>
</svg>
</div>

评估时要给一个 **IoU 阈值**：预测框和某个真实框的 IoU ≥ 阈值，并且类别正确，才算检测对了。

## Precision 与 Recall

每个预测框会被判为三类之一：

- **TP**（真正例）：检测对了；
- **FP**（假正例）：框错了位置、类别错了，或者同一个目标被重复检测；
- **FN**（假负例）：真实目标没有被任何预测框检出。

由此得到两个指标：

$$
\text{Precision} = \frac{TP}{TP + FP} \qquad \text{Recall} = \frac{TP}{TP + FN}
$$

- **Precision（精确率）**：报出来的框里，有多少是对的。低说明误检多；
- **Recall（召回率）**：图里所有目标中，找到了多少。低说明漏检多。

两者此消彼长，由**置信度阈值**控制：阈值调高，只保留很有把握的框，Precision 上升、Recall 下降；阈值调低则相反。YOLO 训练日志里的 `P`、`R` 两列就是这两个值（在某个置信度阈值下）。

## AP：一条 PR 曲线下的面积

只看某一个置信度阈值不全面。AP（Average Precision）的做法是：

1. 把某一类的所有预测框按置信度从高到低排序；
2. 逐个降低阈值，每多纳入一个框就算一次 Precision 和 Recall，得到一条 **PR 曲线**（横轴 Recall，纵轴 Precision）；
3. AP = 这条曲线下的面积，取值 0～1。

AP 高意味着在各种阈值下都能做到既少误检、又少漏检。实际计算时会对曲线做插值，例如 COCO 在 Recall = 0, 0.01, …, 1 共 101 个点上取 Precision 的平均。

## mAP、mAP50 与 mAP50-95

**mAP**（mean AP）= 所有类别 AP 的平均值。例如有猫、狗、人三类，就是三个 AP 的平均。

后面的数字表示用的 IoU 阈值：

- **mAP50**（也写作 mAP@0.5）：IoU 阈值取 0.5。框和真实框重叠一半就算对，**只要找到了目标、位置大致对就行**。PASCAL VOC 数据集用的是这个指标；
- **mAP50-95**（也写作 mAP@0.5:0.95）：IoU 阈值从 0.50 到 0.95，每隔 0.05 取一个，共 10 个，分别算 mAP 再取平均。**阈值越高，框要画得越准**，所以它同时衡量"找得到"和"框得准"。COCO 数据集的主指标就是它，论文里直接写的 "AP" 一般也指它。

同一个模型，mAP50-95 总是明显低于 mAP50，例如 mAP50 = 0.65、mAP50-95 = 0.45 很常见。

怎么看：

| 情况 | 说明 |
|---|---|
| 两者都高 | 找得到，也框得准 |
| mAP50 高、mAP50-95 低 | 目标基本都能找到，但框的边界不够精确 |
| 两者都低 | 漏检或误检多，先查数据和标注 |

只关心有没有检出（如计数、报警）时看 mAP50 就够了；需要精确定位（如抓取、测量、OCR 裁剪）时更该看 mAP50-95。训练时 YOLO 默认按 `0.1 × mAP50 + 0.9 × mAP50-95` 选出 `best.pt`。

## MACs 与 MMACs：计算量

**MAC**（Multiply-Accumulate）是一次乘加：`a = a + x × w`。神经网络里绝大部分计算是卷积和矩阵乘法，都由乘加构成，所以用 MAC 次数表示模型的计算量。

**MMACs** 就是百万（Mega）次乘加，GMACs 是十亿次。

一层卷积的 MACs：

$$
\text{MACs} = H_{out} \times W_{out} \times C_{out} \times k \times k \times C_{in}
$$

例如 80×80 的特征图上做 3×3 卷积，输入输出都是 64 通道：80 × 80 × 64 × 3 × 3 × 64 ≈ **236 MMACs**。整个模型的 MACs 就是各层相加。

几个注意点：

- **MACs 和 FLOPs 差 2 倍**：一次乘加算 2 次浮点运算（一次乘、一次加），所以 FLOPs ≈ 2 × MACs。有些论文写 FLOPs 实际指的是 MACs，对比时要确认口径。Ultralytics YOLO 打印的 `GFLOPs` 是 MACs × 2；
- **MACs 和输入分辨率成正比**：卷积层的 MACs 正比于 H × W，同一个模型输入从 640×640 改成 320×320，MACs 约降为 1/4（见 [全卷积网络改输入分辨率](/nn/fcn-input-resolution)）。所以给出 MACs 时要注明输入尺寸；
- **MACs 不等于实际速度**：同样的 MACs，深度可分离卷积往往比普通卷积慢，因为瓶颈在内存访问；硬件对某些算子有加速也会改变结果。MACs 适合做粗略对比，最终要在目标设备上实测延迟。

**Params（参数量）** 是权重的总个数，决定模型文件大小（INT8 下每个参数 1 字节）。它和分辨率无关，和 MACs 也不成正比：浅层特征图大，参数少但 MACs 多；深层正好相反。

## 选模型时怎么权衡

模型对比表通常同时列出 mAP、MACs、Params 和延迟。在嵌入式设备上，一般先按设备的内存和可接受的延迟确定 MACs、Params 的上限，再在这个范围内选 mAP50-95（或 mAP50，看业务需求）最高的模型。
