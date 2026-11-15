---
title: SUPERMIMIC VIDEO TO ROBOT
date: 2026-11-12
order: 2
---

# 完整技术路线

## 1. GVHMR 从视频还原动作

**GVHMR 的输出是世界坐标系下的三维人体动作，供下一步重定向使用。**

GVHMR 的作用是将单目视频中恢复人的动作，并重建在世界坐标系，其中包含的模型如下

* Yolo: 人物追踪，找到每一帧里面的人。
* ViTpose: 人体维关键点检测，找出肩、肘、膝等关节在画面中的二维位置。
* HMR2: 体征提取器，提取姿态、体型等视觉线索。
* GVHMR：结合二维关键点、图像特征和相机运动信息，推断每一帧的三维姿态，以及人物在空间中的移动轨迹。
* SMPL-X：三维人体模型，通过 GVHMR 输出的姿态、体型、位置等信息，转换为三维人体与网格，重建人体运动

## 2. GMR 重定向到宇树 G1

**GMR 的输出是经过逆运动学求解的 G1 参考轨迹，可以用来初始化仿真和设置追踪目标。整段动作能否靠电机和地面接触做出来，还需在动力学仿真里验证。**

- **GVHMR 从视频重建人体动作。** 它用重力方向建立坐标系，并估计脚跟、脚尖等关键点何时应保持静止，用这些信息修正轨迹、减少脚滑。这一步得到的是人体姿态和位移，地面反力及 G1 所需的电机力矩并未在这里求解。[GVHMR 论文，§3.2](https://arxiv.org/html/2409.06662#S3.SS2)
- **GMR 把人体姿态映射到 G1。** 它按人体和机器人不同的尺寸调整目标，用逆运动学求出 G1 的根部位姿和关节角，让对应连杆尽量匹配人体的位置和朝向。求解时使用机器人模型的关节位置限位，还可启用速度限制。这里用 MuJoCo 提供机器人模型和运动学计算，求出来的是参考姿态序列。[GMR 论文](https://arxiv.org/abs/2510.02252) · [GMR 求解代码](https://github.com/YanjieZe/GMR/blob/master/general_motion_retargeting/motion_retarget.py)

例如，人向前迈步时，GMR 可以求出膝关节没有超限、脚也落到合适位置的一组姿态。但 G1 如果要在很短时间内重现这一步，可能需要超过电机能力的力矩，或者支撑脚所需的摩擦力太大而打滑。把参考轨迹里的每一帧姿态依次写给 MuJoCo 看动画，只能看出姿态和接地是否合理。让策略通过执行器驱动 G1，并让 MuJoCo 求解重力、接触和摩擦，才是在检验这条轨迹的动力学可追踪性。[MuJoCo · 正向动力学](https://mujoco.readthedocs.io/en/stable/computation/index.html#forward-dynamics)

SuperMimic 论文对已重定向的 BONES-SEED 参考动作还做了平地筛选，用正向运动学和脚底碰撞几何识别长时间踩在高处、严重穿地、站立时双脚悬空等片段。跳跃也会双脚离地，所以悬空规则还检查机器人是否接近静止。通过筛选的动作可作为后续追踪目标，其跟踪效果再通过动力学仿真评估。[SuperMimic 论文，附录 E](https://arxiv.org/pdf/2610.28480v2#page=17)

## 世界模型

**世界模型的输入里有 Actor 发出的动作，训练标签是 MuJoCo 执行这个动作后的状态。视频重建出的走路轨迹用来给 Actor 提供目标。**

### 仿真器的数据从哪里来

**参考轨迹给出起点和目标，MuJoCo 计算机器人实际怎么走。**

从重定向后的 G1 走路轨迹取一帧初始化仿真，后续参考帧用来告诉 Actor 要追踪什么。机器人质量、地面等物理条件来自仿真配置，脚底摩擦等参数可以随机化。[mjlab · 参考状态初始化](https://github.com/mujocolab/mjlab/blob/main/src/mjlab/tasks/tracking/mdp/commands.py) · [SuperMimic · 仿真条件](https://github.com/HybridRobotics/supermimic/blob/abc124c1bd5976341034668af3d12c087f2f1f55/src/supermimic/sim_context.py)

### 一步仿真怎样变成训练样本

**Actor 发关节指令，MuJoCo 算执行结果，两者连同当前状态和仿真条件一起记下来。**

从头训练时，刚初始化的 Actor 就能根据当前观测和走路目标给出指令。比如它让 G1 屈膝，MuJoCo 算出屈膝后脚滑了。这一步的标签就是打滑后的姿态和速度，哪怕参考轨迹里的脚已经踩稳。[SuperMimic · 仿真采集](https://github.com/HybridRobotics/supermimic/blob/abc124c1bd5976341034668af3d12c087f2f1f55/src/supermimic/runners/supermimic_runner.py#L598-L629)

### 世界模型学什么

**更新世界模型时，把预测状态和 MuJoCo 的状态对照。**

从一段仿真记录的第一帧出发，世界模型用记录下来的关节指令和仿真条件连续预测几步，按预测与仿真结果的误差更新权重。[SuperMimic · 世界模型训练](https://github.com/HybridRobotics/supermimic/blob/abc124c1bd5976341034668af3d12c087f2f1f55/src/supermimic/learners/wm_learner.py#L108-L167)

### 世界模型怎样帮策略学会控制 G1

**更新 Actor 时，把它在世界模型里走出的轨迹和参考动作对照。**

![SuperMimic 训练循环。MuJoCo 提供世界模型的训练数据，参考动作给 Actor 的预测轨迹提供追踪目标。](/images/robot/supermimic/gvhmr-use/training-loop.svg)

**训练初期，Actor 可能让 G1 走不稳甚至摔倒。打滑、失衡等状态变化也能训练世界模型，取样时会避开回合重置的边界。更新 Actor 时，固定世界模型，让 Actor 在里面试走几步，对照参考动作计算追踪回报，再把梯度穿过这几步预测传回 Actor。更新后的 Actor 回到 MuJoCo 采样，循环往复。** [SuperMimic 论文，图 2 与 §3.3](https://arxiv.org/pdf/2610.28480v2#page=4) · [回放缓冲区](https://github.com/HybridRobotics/supermimic/blob/abc124c1bd5976341034668af3d12c087f2f1f55/src/supermimic/replay_buffer.py)

## 部署到 G1

**上真机需要训练好的 Actor、运行时目标和 G1 控制程序。世界模型、Critic 和 MuJoCo 留在训练或仿真验证环节。**

- **Actor 模型。** 播放指定的走路动作时用动作追踪模型 `policy_motion.onnx`。如果训练了速度控制任务，可以用 `policy_velocity.onnx` 接收前进、侧移和转向速度指令。[SuperMimic · ONNX 导出](https://github.com/HybridRobotics/supermimic/blob/abc124c1bd5976341034668af3d12c087f2f1f55/src/supermimic/runners/exporter.py#L262-L318)
- **目标和真机观测。** 动作追踪版 ONNX 内带参考轨迹数据。控制程序仍要按时间步准备追踪目标，和 G1 的 IMU、关节位置与速度等观测一起送入模型。用走路视频训练的例子里，部署端直接使用重定向好的参考动作。[SuperMimic · 动作追踪接口](https://github.com/HybridRobotics/supermimic/blob/abc124c1bd5976341034668af3d12c087f2f1f55/src/supermimic/runners/exporter.py#L121-L188)
- **真机控制循环。** 控制程序按模型要求排列观测和关节，用训练时对应的缩放和偏置把 Actor 输出换算成关节位置目标，再交给 G1 的低层控制器。下一步用真机传感器反馈继续推理。[SuperMimic 论文，附录 A](https://arxiv.org/pdf/2610.28480v2#page=13)

当前代码只会为使用 `proprio` 观测且参考序列不超过 15,000 帧的训练运行自动导出 ONNX。如果只看到 `actor.pt`，可以先检查这两个条件。[SuperMimic · 保存与导出条件](https://github.com/HybridRobotics/supermimic/blob/abc124c1bd5976341034668af3d12c087f2f1f55/src/supermimic/runners/supermimic_runner.py#L724-L750)
