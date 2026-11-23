---
title: .pt 文件里有什么
date: 2026-11-23
order: 1
---

# .pt 文件里有什么

## .pt 文件里存的是什么？

`.pt`（或 `.pth`）是 PyTorch 保存模型的文件，里面存的是 **参数名 → 参数值** 的字典，例如：

```text
fc1.weight  (3, 4)
fc1.bias    (3,)
fc2.weight  (2, 3)
fc2.bias    (2,)
```

- 值就是训练得到的权重、偏置等张量；
- **不包含网络结构**，加载时要先用代码建好同样的模型，再 `model.load_state_dict(torch.load("model.pt"))`；
- 文件本身是一个 ZIP 包：`data.pkl` 记录参数名和形状，`data/0`、`data/1`…… 存原始数值。
