---
title: AI 绘图
date: 2026-11-16
order: 1
---

# EDA AGENT

## 工作原理

Claude Code 和 Python 版 `eda-agent` 跑在 Linux，嘉立创 EDA Pro 和桥接扩展跑在 Windows。本例把 Windows 本机的 `49625` 通过 VS Code 或 SSH 转发到 Linux 上的同一端口。

```text
Claude Code (Linux) <-- stdio / MCP --> eda-agent (Linux)
EDA 扩展 (Windows) --> 127.0.0.1:49625 (Windows) -- SSH 转发 --> 127.0.0.1:49625 (Linux)
```

- **Claude Code** 按 `claude mcp add` 的注册配置启动和管理 `eda-agent` 子进程，通过标准输入输出调用 MCP 工具。本例用 `EDA_AGENT_BACKEND=easyeda` 选择 EasyEDA 后端。
- **`eda-agent`** 把工具调用转换为发给扩展的命令，在 Python 侧换算原理图坐标，并对删除、清空布线等操作检查 `confirm`。设计计划和模板等计算也可以在 Python 侧完成。
- **EDA 扩展** 在编辑器内运行。开启「允许外部交互」后，扩展扫描 Windows 本机的 `49620–49629`，并通过 `/health` 识别 `eda-agent-bridge` 服务，随后主动建立 WebSocket。读取元件、画线、运行 DRC 和导出 Gerber 等操作由扩展调用 EDA API 执行，结果沿同一条连接返回。

Altium 后端通过目录中的请求和响应文件通信，由 Altium 内部的脚本轮询处理。 [项目后端说明](https://github.com/salitronic/eda-agent/blob/main/docs/BACKENDS.md)

### 新会话为什么要先调用一次工具

Linux 侧的 WebSocket 监听按需启动。新开 Claude Code 会话后，先让它调用 `easyeda_ping`，这会触发 `eda-agent` 绑定 `127.0.0.1:49625`。随后扩展会在下一轮扫描时连接，重试间隔约 5 秒。如果第一次 ping 早于插件连上，稍等再调用一次。也可以切到原理图或 PCB 标签页，点 `eda-agent → Connect` 手动重连。 [桥接启动代码](https://github.com/salitronic/eda-agent/blob/main/src/eda_agent/bridge/easyeda_bridge.py) · [扩展连接说明](https://github.com/salitronic/eda-agent/blob/main/extensions/easyeda/README.md#connecting)

## 1. 安装与测试

### 1. 下载仓库与编译

```shell
git clone git@github.com:salitronic/eda-agent.git

python -m pip install eda-agent
python -m eda_agent easyeda-extension build
```

```shell
PS D:\project\github\eda-agent>
PS D:\project\github\eda-agent> python -m eda_agent easyeda-extension build
Wrote C:\Users\yanke\EDA Agent\easyeda-extension\dist\index.js (191547 bytes)
Wrote C:\Users\yanke\EDA Agent\easyeda-extension\eda-agent-bridge.eext (55085 bytes)

Install in EasyEDA Pro: Settings > Extensions, then import
  C:\Users\yanke\EDA Agent\easyeda-extension\eda-agent-bridge.eext
PS D:\project\github\eda-agent> 
```

### 2. 安装插件

专业版 V3 走「高级 → 扩展管理器 → 导入」，V2 走「设置 → 扩展 → 扩展管理器 → 导入扩展」

![EDA 安装插件](/images/hardware/ai-drawing/eda-install.png)

对于 **eda-agent failed to connect: 错误：未启用扩展和独立脚本的外部交互权限！**，按照如下开启建议

![EDA](/images/hardware/ai-drawing/allow-external.png)


### 3. 连接 agent

本项目采用 Windows 平台 EDA， MCP server开在 Linux端

1. Linux 安装 MCP server

```
cd /home/yanke/project/eda-agent
pipx install -e .        # 或者 python -m pip install -e .
claude mcp add -s user easyeda \
  -e EDA_AGENT_BACKEND=easyeda \
  -e EDA_AGENT_EASYEDA_PORT=49625 \
  -- eda-agent
```

2. Windows 连接

![VSCODE 端口转发](/images/hardware/ai-drawing/vscode-port.png)


3. 打开项目，尝试让 Agent 连接

![Agent 连接](/images/hardware/ai-drawing/agent-connect.png)


## 参考资料

