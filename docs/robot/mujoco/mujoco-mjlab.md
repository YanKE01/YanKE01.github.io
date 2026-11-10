---
title: MuJoCo 与 mjlab 强化学习训练框架
date: 2026-11-10
order: 1
---

# MuJoCo 与 mjlab 强化学习训练框架

用强化学习训练足式机器人时，通常会用到几个库：物理引擎 **MuJoCo**、它的 GPU 版本 **MuJoCo Warp**、训练框架 **mjlab**，以及强化学习算法库 **rsl_rl**。本文简要介绍它们各自是什么、彼此之间的关系，并以开源项目 [microduck_rl](https://github.com/pollen-robotics/microduck_rl)（一款小型双足机器人的训练环境）为例说明它们如何组织在一起。

## 概述

```
具体项目（如 microduck_rl）   机器人模型 + 任务配置（要学什么、怎么打分）
          │
          ▼
mjlab                         训练框架：把仿真封装成强化学习环境
          │
          ├── 仿真：MuJoCo Warp（GPU 并行） ← MuJoCo（物理引擎）
          │
          └── 学习：rsl_rl（PPO 算法） ← PyTorch
```

| 库 | 一句话说明 |
|---|---|
| **MuJoCo** | 物理引擎，计算机器人在力、关节、接触作用下如何运动 |
| **MuJoCo Warp** | MuJoCo 的 GPU 实现，可同时仿真数千个环境 |
| **mjlab** | 训练框架，把仿真变成可以训练的强化学习环境 |
| **rsl_rl** | 强化学习算法库，提供 PPO 算法和训练循环 |

## Q: MuJoCo 是什么？

**MuJoCo**（Multi-Joint dynamics with Contact）是一款**物理仿真引擎**，专门用于计算多关节系统与接触的动力学，广泛用于机器人学和强化学习研究。它最初由 Emo Todorov 开发，2021 年被 DeepMind 收购，并于 2022 年以 Apache 2.0 协议开源。

它的主要特点：

- **速度快、计算稳定**：适合需要大量仿真的强化学习训练；
- **接触处理好**：机器人行走时的脚与地面接触、摔倒时的身体碰撞都能较准确地模拟；
- **用 XML 描述模型**：机器人的结构、关节、电机、传感器都写在 **MJCF** 格式的 XML 文件中，可以从 CAD 软件导出；
- **工具完善**：提供 Python 接口和可视化查看器。

使用 MuJoCo 时最常接触的两个对象：

| 对象 | 含义 |
|---|---|
| **MjModel** | 模型：质量、关节、几何形状等，仿真过程中不变 |
| **MjData** | 状态：关节角度、速度、接触力、传感器读数等，每一步都会更新 |

```python
import mujoco

model = mujoco.MjModel.from_xml_path("robot.xml")  # 读取模型
data = mujoco.MjData(model)                        # 创建状态
mujoco.mj_step(model, data)                        # 仿真前进一步
```

## Q: MuJoCo Warp 是什么？为什么训练需要 GPU 仿真？

**MuJoCo Warp** 是 MuJoCo 的 **GPU 版本**，由 Google DeepMind 与 NVIDIA 合作开发，使用 NVIDIA 的 GPU 编程框架 **Warp** 编写。它沿用 MuJoCo 的模型格式和物理算法，但可以在一张显卡上**同时仿真成千上万个相互独立的环境**。

强化学习需要海量的试错数据。CPU 一次只能仿真少数几个机器人，而 GPU 可以同时让几千个机器人各自练习。例如 microduck_rl 训练行走时同时运行 4096 个环境，一两个小时就能学会基本步态。

两者的关系可以理解为：

- **MuJoCo**：负责读取和编译模型，也可以在 CPU 上仿真、可视化，适合调试和验证；
- **MuJoCo Warp**：把编译好的模型复制成很多份放到 GPU 上，负责大规模训练。

::: tip MJX
MuJoCo 官方此前还提供了基于 JAX 的 GPU 版本 MJX。mjlab 选用的是 MuJoCo Warp。
:::

## Q: mjlab 是什么？和 MuJoCo、MuJoCo Warp 是什么关系？

**mjlab** 是一个开源的机器人强化学习**训练框架**。它的接口借鉴了 NVIDIA Isaac Lab，物理仿真使用 MuJoCo Warp。

三者的分工：

- **MuJoCo**：物理引擎本体；
- **MuJoCo Warp**：MuJoCo 的 GPU 后端；
- **mjlab**：构建在两者之上，把"仿真"包装成"可以训练的环境"，并对接强化学习库。

mjlab 把一个训练环境拆成若干个可配置的模块，每个模块回答一个问题：

| 模块 | 回答的问题 |
|---|---|
| 场景（Scene） | 环境里有什么：机器人、地形、传感器 |
| 观测（Observations） | 机器人能"看到"什么：姿态、关节角度、速度指令等 |
| 动作（Actions） | 机器人能做什么：例如设定各关节的目标角度 |
| 奖励（Rewards） | 什么行为是好的：例如按指令速度行走得分，摔倒扣分 |
| 终止（Terminations） | 什么时候结束一次尝试：例如摔倒或超时 |
| 事件（Events） | 训练中要施加哪些变化：例如随机推一下机器人、随机修改质量和摩擦 |

有了 mjlab，具体项目不需要自己编写仿真循环和训练循环，只需要提供机器人模型并配置以上模块。

## Q: 什么是强化学习？

**强化学习**（Reinforcement Learning，RL）是让智能体**通过反复试错、根据奖励信号学习行为策略**的一类机器学习方法。与需要标注数据的监督学习不同，强化学习只需要告诉智能体"做得好不好"，由它自己摸索"该怎么做"。

| 概念 | 含义 | 以机器人行走为例 |
|---|---|---|
| 智能体（Agent） | 做决策的主体 | 控制机器人的神经网络 |
| 环境（Environment） | 智能体交互的对象 | 仿真中的机器人和地面 |
| 观测（Observation） | 智能体感知到的信息 | 身体姿态、关节角度、目标速度 |
| 动作（Action） | 智能体的输出 | 各关节的目标角度 |
| 奖励（Reward） | 对行为的评分 | 走得稳、走得准得分，摔倒扣分 |
| 策略（Policy） | 从观测到动作的映射 | 训练得到的神经网络 |
| 回合（Episode） | 一次完整的尝试 | 从站立开始，直到摔倒或时间用完 |

训练的过程就是：机器人不断尝试，得到奖励或惩罚，逐步调整策略，使**长期累计的奖励**尽可能高。

## Q: rsl_rl 是什么？PPO 算法是什么？

**rsl_rl** 是由苏黎世联邦理工学院（ETH Zurich）机器人系统实验室开发的**强化学习算法库**，基于 PyTorch，专为机器人的大规模并行训练设计。mjlab 使用它作为默认的强化学习库，它主要提供：

- **PPO** 算法；
- 策略网络与价值网络；
- 训练循环：采集数据、更新网络、保存模型、记录日志。

**PPO**（Proximal Policy Optimization，近端策略优化）是机器人强化学习中最常用的算法。它的基本流程是：

1. 用当前策略让所有并行环境各运行一小段时间，收集数据；
2. 根据奖励评估每个动作比平均水平好还是差；
3. 朝着"多做好动作、少做差动作"的方向更新策略，但**限制每次更新的幅度**，避免一次把策略改坏；
4. 丢弃旧数据，用新策略重新采集，循环往复。

PPO 实现简单、训练稳定，又能充分利用 GPU 上的大量并行环境，因此成为足式机器人训练的主流选择。

## Q: 这些库在项目中是如何组织在一起的？

以 microduck_rl 为例，项目本身只负责"机器人"和"任务"两部分：

- **机器人模型**：从 CAD 导出的 MJCF 文件，由 MuJoCo 读取；
- **任务配置**：按 mjlab 的模块编写观测、动作、奖励、终止和随机化，并注册一个任务名，例如 `Mjlab-Velocity-Flat-MicroDuck`（按速度指令在平地上行走）。

执行训练命令后，各个库依次接手：

```bash
uv run train Mjlab-Velocity-Flat-MicroDuck --env.scene.num-envs 4096
```

1. **mjlab** 根据任务名找到项目注册的配置，创建训练环境；
2. **MuJoCo** 读取并编译机器人模型，**MuJoCo Warp** 将其复制为 4096 份放到 GPU 上并行仿真；
3. **rsl_rl** 用 PPO 算法驱动训练：采集数据、计算奖励、更新神经网络；
4. 训练完成后，将策略导出为 **ONNX** 格式，部署到真实机器人上运行。

## Q: 仿真里训练出的策略为什么能用在真实机器人上？

仿真与真实世界总有差异，例如零件质量有误差、摩擦力不同、电机响应不完全一样、传感器存在噪声和安装误差。这种差异称为 **sim2real gap**。如果策略只在一个"完美"的仿真模型中训练，到了实机上很可能站都站不稳。

常用的解决方法是**域随机化**（Domain Randomization）：训练时让每个并行环境的物理参数都**随机一些**，例如质量、摩擦、电机特性，并随机推一推机器人、给传感器加噪声。策略在各种"不完美"的条件下都能完成任务，到了实机上自然也能适应。

此外，**准确的电机模型**也很重要。对于由小型舵机驱动的轻量机器人，电机特性往往是仿真与实机差异的主要来源，microduck_rl 为此专门使用了更贴近真实舵机行为的电机模型。

## 参考资料

- [MuJoCo](https://github.com/google-deepmind/mujoco) 与 [MuJoCo 文档](https://mujoco.readthedocs.io/)
- [MuJoCo Warp](https://github.com/google-deepmind/mujoco_warp)
- [mjlab](https://github.com/mujocolab/mjlab)
- [rsl_rl](https://github.com/leggedrobotics/rsl_rl)
- [microduck_rl](https://github.com/pollen-robotics/microduck_rl)
- J. Schulman et al., *Proximal Policy Optimization Algorithms*, 2017
