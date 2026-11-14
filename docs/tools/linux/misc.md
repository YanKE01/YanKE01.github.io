---
title: Linux 杂项
date: 2026-11-14
order: 3
---

# Linux 杂项

## Q: BusyBox 是什么，为什么嵌入式 Linux 常用它？

BusyBox 把 `ls`、`cp`、`grep`、`mount` 和 `sh` 等常用工具打包进一个可执行文件。每个内置命令叫做一个 **applet**。这些命令可以共用代码，编译时也可以按需启用，因此 BusyBox 经常用在路由器固件、嵌入式 Linux 的根文件系统和启动时的救援环境里。

可以用 `busybox ls` 显式调用内置的 `ls`。系统也可以让 `/bin/ls` 指向 `/bin/busybox`，这样直接执行 `ls` 时，BusyBox 会根据调用时的命令名选择对应的 applet。

```bash
busybox          # 列出当前版本编入的命令
busybox ls -l    # 用 BusyBox 自带的 ls 列出当前目录
busybox ls --help
```

同名工具的选项也可能不同。例如，把 Ubuntu 上的脚本搬到路由器后，如果某条命令报选项无效，可以用 `busybox 命令名 --help` 查看设备上的实现支持哪些参数。

## 参考资料

- [BusyBox 官方介绍](https://busybox.net/about.html)
- [BusyBox 命令手册](https://busybox.net/downloads/BusyBox.html)
