---
title: 生成与应用 Git 补丁
date: 2026-11-14
order: 2
---

# 生成与应用 Git 补丁

Git 可以把未提交的差异导出成补丁，也可以从已有提交中导出带作者信息和提交消息的补丁。生成和应用时要使用配套命令。

## 导出与应用未提交的改动

按需要选一条命令生成补丁。

| 要导出的内容 | 命令 |
| --- | --- |
| 已跟踪文件的未暂存改动 | `git diff --binary > unstaged.patch` |
| 已暂存的改动 | `git diff --cached --binary > staged.patch` |
| 工作区相对 `HEAD` 的全部已跟踪改动 | `git diff HEAD --binary > changes.patch` |

`--binary` 会让补丁携带应用二进制改动所需的数据。未跟踪文件需先用 `git add -N -- 路径` 标记为待添加，再导出未暂存的改动或与 `HEAD` 的差异。

以 `changes.patch` 为例，在目标仓库先检查能否应用，然后应用到工作区。用 `git status` 查看新增文件和修改，再用 `git diff` 检查已跟踪文件的差异。

```bash
git apply --check changes.patch
git apply changes.patch
```

## 导出与还原带提交消息的补丁

使用 `git format-patch` 导出已有提交。下面是导出最近一个普通提交和一段提交范围的两种方式。范围示例将两个提交哈希分别放到 `from` 和 `to`，包含 `to`，排除 `from` 及其祖先。导出时会跳过合并提交。

```bash
git format-patch -1 HEAD --stdout > latest.patch

from=a2d76ad
to=b7c931e
git format-patch --stdout "${from}..${to}" > series.patch
```

在目标分支上用 `git am` 应用。Git 会根据补丁中的作者信息、提交消息和改动创建提交。

```bash
git am series.patch
```

如果项目要求由应用者补充 `Signed-off-by`，可在应用时使用 `git am --signoff series.patch`。应用中断后，可以解决冲突、暂存修复并运行 `git am --continue`，也可以用 `git am --abort` 回到应用前的状态。

## 参考资料

- [Git 手册 · diff](https://git-scm.com/docs/git-diff)、[apply](https://git-scm.com/docs/git-apply)
- [Git 手册 · format-patch](https://git-scm.com/docs/git-format-patch)、[am](https://git-scm.com/docs/git-am)
