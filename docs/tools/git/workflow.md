---
title: Git 日常操作
date: 2026-11-14
order: 1
---

# Git 日常操作

从把未提交的改动带到新分支，到同步主分支、挑选提交和找回旧提交，这篇笔记按实际操作场景整理常用命令。示例以 `main` 为主分支，远程仓库名为 `origin`。

## 分支与未提交改动

### 把未提交改动带到另一个分支

如果新分支从当前提交创建，直接运行 `git switch -c feature/c3`，工作区和暂存区的改动会随分支切换保留。

如果目标分支已存在，或者需要从另一个提交创建分支，可以先用 `stash` 保存改动，再切换过去。

```bash
git stash push -u -m "move work to feature/c3"
git stash list
git switch feature/c3
git stash pop --index 'stash@{0}'
```

`-u` 会一并保存未跟踪文件，`--index` 会尝试恢复原先的暂存状态。以 `git stash list` 的结果为准，确认 `stash@{0}` 对应刚保存的改动再恢复。发生冲突时，stash 会保留。处理完冲突后，用 `git status` 核对工作区，再决定是否删除该条目。

### 重命名分支

```bash
# 重命名当前分支
git branch -m feature/new-name

# 重命名另一个本地分支
git branch -m feature/old-name feature/new-name
```

如果旧分支已经推到远程，使用 `git push -u origin feature/new-name` 发布新名称并设置上游分支。旧远程分支和引用它的 PR 需要单独处理。

### 将主分支的更新同步到功能分支

可以在功能分支上把自己的提交重新应用到最新的 `origin/main` 之后。先确认工作区干净，再运行以下命令。

```bash
git switch feature/c3
git fetch origin
git rebase origin/main
```

遇到冲突时，用 `git status` 找到冲突文件，编辑并逐一 `git add`，再运行 `git rebase --continue`。如果想放弃这次操作，可以运行 `git rebase --abort`。

Rebase 会改写功能分支上的提交。如果其他人已经基于该分支开发，可以用 `git merge origin/main` 同步更新，保留现有提交历史。

## 提交与历史

### 挑选提交并应用到当前分支

切换到接收改动的分支，在干净的工作区中运行 `git cherry-pick`。把示例中的 `a2d76ad` 换成源提交的哈希。

```bash
git switch feature/c3
git cherry-pick a2d76ad
```

Git 会将该提交引入的改动应用到当前分支并创建新提交。遇到冲突时，解决冲突并暂存后运行 `git cherry-pick --continue`，或者用 `git cherry-pick --abort` 放弃本次操作。

### 切到旧提交检查代码

```bash
git switch --detach a2d76ad
git switch -
```

第一条命令进入游离 HEAD，可以在该提交上查看文件或运行测试。第二条命令切回之前的分支。如果想在旧提交上继续开发，可在切回之前运行 `git switch -c inspect/old-version` 创建分支。

### 查看历史并找回 reset 前的提交

`git log` 展示从指定引用可达的提交历史。`git reflog` 记录本地引用经过哪些位置，包括分支切换、reset 和 rebase 等操作。

```bash
# 查看本地所有引用可达的提交
git log --all --graph --oneline --decorate

# 查看本地 HEAD 的移动记录
git reflog
```

在 reflog 里找到想保留的提交后，用 `git branch rescue/old-head a2d76ad` 在该提交处建一个分支。示例哈希需要换成刚找到的实际值。Reflog 记录可能过期，也不会随 push 或 clone 同步。

## 停止跟踪已加入 .gitignore 的文件

`.gitignore` 只影响未跟踪文件。对于已经跟踪的文件，用 `git rm --cached` 将它从索引移除，保留工作区中的副本。以希望忽略整个 `build/` 目录为例，先在根目录的 `.gitignore` 中加入 `/build/`，然后执行以下命令。

```bash
git rm -r --cached -- build/
git add .gitignore
git diff --cached --stat
git commit -m "chore: stop tracking build output"
```

这次提交会从仓库中移除原先跟踪的构建产物。只处理单个文件时，去掉 `-r`，并将 `build/` 换成文件路径。检查忽略规则可用 `git check-ignore -v --no-index -- build/output.bin`。

## 合入改动时自动关闭 GitHub Issue

在提交消息正文或 PR 描述中使用 GitHub 的关闭关键词。

```text
fix: improve code block readability

Closes #3
```

跨仓库引用使用 `Closes OWNER/REPO#3`。写在提交消息里时，提交进入默认分支后对应 Issue 会关闭。写在 PR 描述里时，PR 需要以默认分支为目标并合入。引用多个 Issue 时，每个编号前都写一次关键词。

如果提交消息校验失败，按仓库要求调整消息，将 `Closes #3` 放在空行后的正文中。需要修改最近一次已有的本地提交消息时，可用 `git commit --amend`。

## 参考资料

- [Git 手册 · switch](https://git-scm.com/docs/git-switch)、[stash](https://git-scm.com/docs/git-stash)、[branch](https://git-scm.com/docs/git-branch)
- [Git 手册 · rebase](https://git-scm.com/docs/git-rebase)、[cherry-pick](https://git-scm.com/docs/git-cherry-pick)、[log](https://git-scm.com/docs/git-log)、[reflog](https://git-scm.com/docs/git-reflog)
- [Git 手册 · gitignore](https://git-scm.com/docs/gitignore)、[rm](https://git-scm.com/docs/git-rm)
- [GitHub 文档 · 将 PR 与 Issue 关联](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)
