---
title: Git 代理与 VS Code 编辑器配置
date: 2026-11-14
order: 3
---

# Git 代理与 VS Code 编辑器配置

在 Windows 的 Git Bash 中，可以为使用 HTTPS 远程地址的 Git 操作配置本地代理。使用 SSH 远程地址时，可以单独检查 GitHub SSH 的连接。提交消息编辑器则由 `core.editor` 设置。

## Windows Git Bash 的 HTTPS 代理

在 v2ray 客户端中查看本地监听的代理协议和端口。下方沿用原笔记的示例端口，按实际配置选一条命令执行。

```bash
# SOCKS5 代理，由代理解析域名
git config --global http.proxy socks5h://127.0.0.1:10808

# HTTP 代理
git config --global http.proxy http://127.0.0.1:10809
```

`http.proxy` 同时适用于 Git 的 HTTP 和 HTTPS 远程地址。全局设置会应用到本机当前用户的 Git 仓库。只想给当前仓库设置时，在该仓库中把 `--global` 换成 `--local`。

```bash
# 查看全局设置来自哪个配置文件
git config --global --show-origin --get http.proxy

# 用 HTTPS 地址验证 Git 能否读取远程引用
git ls-remote https://github.com/git/git.git HEAD

# 移除全局代理
git config --global --unset http.proxy
```

`git ls-remote` 成功代表 HTTPS 访问可用。取消全局设置后，如果代理仍在生效，可以检查仓库自己的配置和终端中的代理环境变量。

## 通过 443 端口连接 GitHub SSH

先测试 GitHub 提供的 SSH 443 端口。

```bash
ssh -T -p 443 git@ssh.github.com
```

看到包含 `successfully authenticated` 的消息即表示 SSH 认证通过。若想让现有的 `git@github.com:OWNER/REPO.git` 地址使用 443，在 `~/.ssh/config` 中添加或更新下面这一段。

```ssh-config
Host github.com
    HostName ssh.github.com
    Port 443
    User git
```

保存后用 `ssh -T git@github.com` 验证。SSH 使用自己的连接配置，Git 的 `http.proxy` 不会影响这条连接。

## 用 VS Code 编辑提交消息

先在 Git Bash 中用 `code --version` 确认 VS Code 的命令行程序可用，然后设置 Git 编辑器。

```bash
git config --global core.editor "code --wait"
```

暂存改动后执行不带 `-m` 的 `git commit`，Git 会打开提交消息文件。写完并关闭该文件后，`code --wait` 才会把控制权交还给 Git。

## 参考资料

- [Git 手册 · git-config](https://git-scm.com/docs/git-config)
- [GitHub 文档 · 通过 443 端口使用 SSH](https://docs.github.com/en/authentication/troubleshooting-ssh/using-ssh-over-the-https-port)
- [VS Code 文档 · 命令行选项](https://code.visualstudio.com/docs/configure/command-line)
