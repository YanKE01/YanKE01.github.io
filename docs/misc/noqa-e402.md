---
title: "# noqa: E402"
date: 2026-11-23
order: 2
---

# `# noqa: E402` 注释

## Q: `# noqa: E402` 是什么意思？

- `noqa` 是让 linter（flake8、ruff 等）跳过这一行检查的注释；
- `E402` 是 PEP 8 规则 **module level import not at top of file**，即 import 没放在文件顶部。

合起来就是：这个 import 是故意放在后面的，别报错。

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from mypackage import foo  # noqa: E402
```

## Q: 为什么大模型爱写它？

模型生成的脚本常要求“单文件直接跑”，于是先改 `sys.path` 再 import，就会触发 E402；训练数据里这种写法很多，跑 lint 时加 `# noqa` 也是改动最小的“修复”。

更好的做法是 `pip install -e .` 或 `python -m` 运行，不去改 `sys.path`。
