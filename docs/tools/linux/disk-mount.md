---
title: 磁盘挂载与空间清理
date: 2026-11-12
order: 1
---

# 磁盘挂载与空间清理

Linux 没有 C 盘、D 盘的概念，所有磁盘都挂在同一棵目录树 `/` 下。本文介绍如何查看某个目录在哪块磁盘上，以及磁盘满了怎么处理。

## Q: 如何查看 /home 挂载在哪块磁盘上？

用 `df -h` 加上目录名：

```bash
df -h ~
```

```text
文件系统        大小  已用  可用 已用% 挂载点
/dev/nvme0n1p2  938G  826G   65G   93% /
```

- **文件系统**：所在的磁盘分区，`nvme0n1p2` 表示第 1 块 NVMe 硬盘的第 2 个分区；
- **挂载点**：这里是 `/`，说明 `/home` 没有单独分区，和系统放在同一个分区上。如果显示 `/home`，说明它是一个独立的分区。

查看所有磁盘及其挂载位置：

```bash
lsblk -e7 -o NAME,SIZE,TYPE,MOUNTPOINTS   # -e7 隐藏 snap 产生的 loop 设备
```

## Q: 磁盘满了怎么找到占空间的目录？

先看哪个分区满了，再逐层查找大目录：

```bash
df -h                                   # 查看各分区使用率
du -h --max-depth=1 ~ | sort -h         # 查看家目录下各目录的大小
```

对大的目录继续执行 `du -h --max-depth=1 <目录> | sort -h`，一层层往下找。也可以安装 `ncdu`（`sudo apt install ncdu`），在终端里交互式浏览各目录大小。

## Q: 磁盘满了一般可以清理哪些内容？

| 内容 | 清理命令 |
|---|---|
| apt 软件包缓存 | `sudo apt clean` |
| 不再需要的依赖包 | `sudo apt autoremove` |
| 系统日志 | `sudo journalctl --vacuum-size=200M` |
| 旧版本的 snap | `snap list --all` 中标记为 disabled 的版本，用 `sudo snap remove <名称> --revision=<版本号>` 删除 |
| Docker 镜像和缓存 | `docker system prune` |
| pip / conda 缓存 | `pip cache purge`、`conda clean --all` |
| 编译产物 | 各工程的 `build/` 目录，如 ESP-IDF 工程执行 `idf.py fullclean` |

清理后如果空间仍然不够，可以加一块硬盘，见下一节。

## Q: 家目录满了，能迁移到另一块硬盘吗？

可以。Linux 的任意目录都可以挂载到另一块硬盘上，常见有两种做法：

- **新硬盘挂到 `/data`，只搬大目录**：把数据集、模型等大目录移到新硬盘，在原位置留一个软链接，原来的路径不变。不动系统，风险小。
- **把整个 `/home` 挂到新硬盘**：把家目录完整复制到新硬盘，再把新硬盘挂载到 `/home`。效果最彻底，但需要在未登录图形界面的情况下操作。

两种做法都要修改 `/etc/fstab` 让硬盘开机自动挂载，修改前要先备份，写错可能导致系统无法正常启动。
