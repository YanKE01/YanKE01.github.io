---
title: AMP 自动混合精度
date: 2026-11-25
order: 3
---

# AMP 自动混合精度

AMP（Automatic Mixed Precision，自动混合精度）是一种训练加速方法：**一部分计算用 16 位浮点数（FP16 或 BF16），一部分仍用 32 位浮点数（FP32）**，由框架自动决定每个算子用哪种精度。它通常能让训练快 1.5～3 倍、激活显存减半，而精度基本不受影响。

## 三种浮点格式

浮点数由符号、指数、尾数三部分组成。指数位数决定**能表示多大、多小的数**（范围），尾数位数决定**相邻两个数之间有多密**（精度）。

```usbfields
FP32: 符号 1 | 指数 8 | 尾数 23
FP16: 符号 1 | 指数 5 | 尾数 10
BF16: 符号 1 | 指数 8 | 尾数 7
```

| 格式 | 位数 | 最大值 | 最小正规数 | 有效十进制位 | 特点 |
|---|---|---|---|---|---|
| FP32 | 32 | ≈ 3.4×10³⁸ | ≈ 1.2×10⁻³⁸ | 约 7 位 | 默认精度 |
| FP16 | 16 | 65504 | ≈ 6.1×10⁻⁵ | 约 3 位 | 范围很窄，小梯度容易变成 0 |
| BF16 | 16 | ≈ 3.4×10³⁸ | ≈ 1.2×10⁻³⁸ | 约 2 位 | 范围和 FP32 一样，精度更低 |

BF16 就是把 FP32 的尾数截掉 16 位，所以范围不变，转换也很简单。它需要较新的硬件（NVIDIA Ampere 架构及以后，如 A100、RTX 30 系列）。

## 为什么 16 位更快

- **算力**：GPU 的 Tensor Core 对 FP16 / BF16 矩阵乘法的吞吐量是 FP32 的数倍；
- **带宽**：每个数只占一半字节，从显存搬运数据的时间减半。很多算子（逐元素运算、归一化）的瓶颈其实是带宽而不是计算；
- **显存**：前向时保存给反向用的激活值减半，可以用更大的 batch。

## "混合"：哪些用 16 位，哪些用 32 位

全部换成 16 位会出问题：累加很多数时误差会积累，指数、对数这类运算容易溢出。所以 AMP 按算子分类：

| 精度 | 典型算子 | 原因 |
|---|---|---|
| 16 位 | 矩阵乘法、卷积、Linear | 计算量大，收益最高；内部累加由硬件用 FP32 完成 |
| 32 位 | softmax、log、exp、求和/均值、各种 loss、LayerNorm / BatchNorm | 需要大范围或高精度，16 位容易溢出或丢精度 |
| 跟随输入 | 加法、拼接、ReLU 等 | 输入是什么精度就用什么精度 |

此外，**模型权重本身仍以 FP32 保存**（称为 master weights）。前向时临时转成 16 位参与计算，优化器更新也在 FP32 上进行。原因是一次更新量（学习率 × 梯度）往往远小于权重本身，例如 1.0 + 0.0001：在 FP16 里 1.0 附近相邻两个数的间隔约是 0.001，这次更新会被直接舍掉。

"自动"指的就是这张表由框架维护，用户不需要手动给每一层改类型。

## 损失缩放（Loss Scaling）

FP16 能表示的最小正规数约是 6×10⁻⁵，很多梯度比这还小，反向传播时会**下溢成 0**，相应的参数就不再更新。

解决办法是在反向传播前把 loss 乘以一个较大的系数 S（如 65536），梯度也就跟着放大 S 倍，落在 FP16 能表示的范围内；更新权重前再除以 S 还原：

1. `loss × S` 后反向传播，得到放大的梯度；
2. 检查梯度里有没有 inf / NaN：
   - 有：说明 S 太大导致上溢，**跳过这一步更新**，把 S 减半；
   - 没有：梯度除以 S，正常更新权重。连续很多步都没有溢出时，把 S 加倍。

S 是动态调整的，所以训练刚开始时出现几次"跳过更新"是正常现象。

**BF16 的范围和 FP32 一样，不会下溢，所以不需要损失缩放。**

## PyTorch 写法

```python
import torch

model = model.cuda()
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
scaler = torch.amp.GradScaler("cuda")          # 仅 FP16 需要

for x, y in loader:
    x, y = x.cuda(), y.cuda()
    optimizer.zero_grad()

    with torch.autocast("cuda", dtype=torch.float16):   # 前向和 loss 放在 autocast 里
        out = model(x)
        loss = loss_fn(out, y)

    scaler.scale(loss).backward()   # loss × S 后反向
    scaler.step(optimizer)          # 检查 inf/NaN，还原梯度后更新
    scaler.update()                 # 调整 S
```

- `autocast` 只包住前向和 loss 计算，`backward()` 放在外面，反向时会自动沿用前向的精度；
- 用 BF16 时把 `dtype` 改成 `torch.bfloat16`，并去掉 `GradScaler`，直接 `loss.backward()`、`optimizer.step()`；
- 如果要做梯度裁剪，先调用 `scaler.unscale_(optimizer)` 还原梯度，再 `clip_grad_norm_`，否则裁剪的是放大后的梯度；
- 推理时也可以用 `autocast` 加速，此时不需要 `GradScaler`。

其他框架类似：PyTorch Lightning 里设置 `precision="16-mixed"` 或 `"bf16-mixed"`，Hugging Face Trainer 里设置 `fp16=True` 或 `bf16=True`。

## FP16 还是 BF16

| | FP16 | BF16 |
|---|---|---|
| 硬件要求 | Volta（V100）及以后都支持 | Ampere（A100、RTX 30）及以后 |
| 损失缩放 | 需要 | 不需要 |
| 溢出风险 | 有，大模型训练中容易出现 NaN | 基本没有 |
| 精度 | 尾数多 3 位，略高 | 略低，但对训练影响不大 |

硬件支持时优先用 BF16，更省心；老显卡只能用 FP16 + GradScaler。

## 和 INT8 量化的区别

两者都是"用更少的位数表示数"，但目的不同：

- **AMP** 用于**训练**（也可用于 GPU 推理），16 位浮点，权重仍保留 FP32 副本，不需要校准；
- **INT8 量化** 用于**部署推理**，例如 ESP-DL 把模型转成 `real = q × 2^exp` 的整数格式（见 [全卷积网络改输入分辨率](/nn/fcn-input-resolution)），需要用样本校准每个 tensor 的范围。

用 AMP 训练出来的模型保存下来仍然是 FP32 权重，后续可以照常导出和量化。
