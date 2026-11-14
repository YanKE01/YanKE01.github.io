---
title: VS Code 远程开发与 SSH 免密登录
date: 2026-11-10
order: 1
---

# VS Code 远程开发与 SSH 免密登录

代码和编译环境放在远端 Linux 服务器上、在本地 Linux 电脑上用 VS Code 编辑，是很常见的开发方式。VS Code 的 **Remote - SSH** 扩展通过 SSH 连接远端，默认每次连接都要输入密码。把本地的 SSH 公钥放到远端之后，就可以免密直连。本文整理这一套配置流程，本地和远端均以 Linux 为例。

## 概述

整个配置分为三步：

1. **在本地生成密钥对**：一把私钥留在本地，一把公钥发给远端；
2. **把公钥发送到远端**：追加到远端的 `~/.ssh/authorized_keys` 文件中；
3. **在本地写 SSH 配置**：给远端起一个别名，VS Code 直接选择这个别名连接。

| 文件 | 位置 | 作用 |
|---|---|---|
| `id_ed25519` | 本地 `~/.ssh/` | **私钥**，相当于钥匙，绝不能泄露 |
| `id_ed25519.pub` | 本地 `~/.ssh/` | **公钥**，相当于锁，可以放心地发给任何服务器 |
| `authorized_keys` | 远端 `~/.ssh/` | 远端信任的公钥列表，一行一个 |
| `config` | 本地 `~/.ssh/` | SSH 连接配置：主机别名、地址、用户名、密钥 |

## Q: SSH 免密登录的原理是什么？

SSH 支持多种认证方式，最常用的是**密码认证**和**公钥认证**。

公钥认证使用一对**非对称密钥**：

- **公钥**放在远端服务器的 `~/.ssh/authorized_keys` 中；
- **私钥**只保存在本地电脑上。

登录时，服务器用公钥出一道"题"，只有持有对应私钥的客户端才能答对。私钥本身从不在网络上传输，因此即使连接被监听，也无法得到私钥。服务器验证通过后直接放行，不再需要输入密码。

可以把公钥理解为一把锁，私钥是唯一能打开它的钥匙：把锁装到服务器上，以后用钥匙开门即可。同一把公钥可以装到任意多台服务器上。

## Q: 如何在本地生成 SSH 密钥对？

在本地终端执行：

```bash
ssh-keygen -t ed25519 -C "my-laptop"
```

- `-t ed25519`：密钥类型。Ed25519 密钥短、速度快、安全性高，是目前推荐的类型；若远端系统非常老旧不支持，可改用 `-t rsa -b 4096`；
- `-C`：注释，只用于区分是哪台电脑的密钥，可以随意填写。

执行后会依次询问：

1. **保存位置**：直接回车，使用默认的 `~/.ssh/id_ed25519`；
2. **密码短语**（passphrase）：用于加密私钥文件。直接回车表示不设置。设置后更安全，即使私钥文件被拷走也无法直接使用，但每次使用私钥都需要输入，可以配合 `ssh-agent` 只输入一次。

生成后查看公钥内容：

```bash
cat ~/.ssh/id_ed25519.pub
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... my-laptop
```

::: warning
如果 `~/.ssh/id_ed25519` 已经存在，说明之前生成过密钥，直接使用即可。不要覆盖，否则已经配置过这把密钥的服务器都会失效。
:::

## Q: 如何把公钥发送到远端服务器？

本质操作只有一个：**把本地 `id_ed25519.pub` 的内容追加到远端 `~/.ssh/authorized_keys` 文件的末尾**。

使用 `ssh-copy-id`，它会自动完成追加和权限设置：

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@192.168.1.10
# 远端 SSH 端口不是 22 时：
ssh-copy-id -i ~/.ssh/id_ed25519.pub -p 2222 user@192.168.1.10
```

执行时需要**最后输入一次远端密码**。完成后验证：

```bash
ssh user@192.168.1.10
```

不再提示输入密码，直接进入远端终端，说明配置成功。

::: tip 手动添加
也可以登录远端后，手动把公钥那一行粘贴到 `~/.ssh/authorized_keys` 的末尾。注意是**追加**，不要覆盖文件中已有的其他公钥。
:::

## Q: 如何给远端主机起一个别名？

每次输入 `user@192.168.1.10 -p 2222` 很繁琐。在**本地**的 `~/.ssh/config` 文件（不存在就新建）中添加：

```ssh-config
Host devbox
    HostName 192.168.1.10
    User user
    Port 22
    IdentityFile ~/.ssh/id_ed25519
```

| 字段 | 含义 |
|---|---|
| `Host` | 自己起的别名，之后用它代替地址 |
| `HostName` | 远端的 IP 或域名 |
| `User` | 登录用户名 |
| `Port` | SSH 端口，默认 22 时可以省略 |
| `IdentityFile` | 使用哪把私钥，使用默认密钥时可以省略 |

之后只需：

```bash
ssh devbox
```

这个文件同时也是 VS Code Remote - SSH 读取的配置，写在这里的主机会直接出现在 VS Code 的远程主机列表中。多台服务器就写多个 `Host` 段。

## Q: 如何在 VS Code 中通过 SSH 连接远端？

1. 在扩展市场安装 **Remote - SSH**（发布者为 Microsoft）；
2. 按 `F1`（或 `Ctrl+Shift+P`）打开命令面板，执行 **Remote-SSH: Connect to Host...**；
3. 选择 `~/.ssh/config` 中配置的别名，例如 `devbox`；
4. 首次连接时选择远端的操作系统（通常是 Linux），VS Code 会自动在远端安装 **VS Code Server**，存放在远端的 `~/.vscode-server/` 中；
5. 连接成功后左下角显示 `SSH: devbox`，通过 **文件 → 打开文件夹** 打开远端的项目目录。

此后编辑、终端、调试、搜索都在远端执行，本地只负责界面显示。远端主机也可以在左侧活动栏的 **远程资源管理器** 中一键连接。

::: tip 扩展装在哪里
连接远端后，语言支持类的扩展（如 C/C++、Python）需要**在远端再安装一次**，扩展页面会显示"在 SSH: devbox 中安装"按钮。主题、快捷键类的扩展只在本地生效。
:::

## 参考资料

- [VS Code 文档：Remote Development using SSH](https://code.visualstudio.com/docs/remote/ssh)
- [OpenSSH 手册：ssh-keygen(1)](https://man.openbsd.org/ssh-keygen)、[ssh_config(5)](https://man.openbsd.org/ssh_config)
