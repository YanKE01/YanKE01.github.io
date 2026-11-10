---
title: 从 Onshape 导出 MuJoCo 模型
date: 2026-11-10
order: 2
---

# 从 Onshape 导出 MuJoCo 模型

用 MuJoCo 仿真或训练机器人，需要一份描述机器人结构的 **MJCF**（MuJoCo XML）文件。机器人通常先在 CAD 软件中设计，再导出为仿真模型。本文记录使用 **onshape-to-robot** 把 Onshape 中的装配体导出为 MuJoCo XML 的流程，以一个现有的 Onshape 装配体 SelfRisingRobot 作为测试对象。

## 概述

```
Onshape 装配体（零件 + 配合关系）
        │  Onshape API
        ▼
onshape-to-robot（读取 config.json）
        │
        ▼
robot.xml（MJCF） + assets/（STL 网格）
        │
        ▼
MuJoCo 查看器检查 → mjlab 训练
```

| 步骤 | 内容 |
|---|---|
| 1 | 安装 Python 环境、onshape-to-robot 和 MuJoCo |
| 2 | 在 Onshape 中按约定建好装配体：关节、坐标系命名 |
| 3 | 申请并配置 Onshape API 密钥 |
| 4 | 编写 `config.json` |
| 5 | 执行导出，得到 XML 和网格文件 |
| 6 | 在 MuJoCo 中查看模型 |
| 7 | 检查模型，补充执行器、传感器等 |

## 工具简介

- 由 Rhoban 开源的 Python 工具，通过 Onshape API 读取装配体；
- 可以导出 URDF、SDF 和 MuJoCo（MJCF）格式；
- 自动计算各零件的质量、惯量，导出零件网格；
- 本文测试环境：Ubuntu 22.04，系统自带 Python 3.10，onshape-to-robot 1.8.3，mujoco 3.17.0。

## 1. 安装软件

整个流程需要的软件：

| 软件 | 用途 | 安装方式 |
|---|---|---|
| **Onshape** | 设计机器人装配体 | 浏览器中使用，无需安装，注册账号即可 |
| **Python 3** | 运行导出工具 | 使用 Ubuntu 自带的 `/usr/bin/python3` |
| **onshape-to-robot** | 把装配体导出为 MJCF | `pip install onshape-to-robot` |
| **MuJoCo** | 查看和仿真导出的模型 | `pip install mujoco` |

建议为导出工作单独建一个工程目录，并在其中创建虚拟环境，避免与系统或其他项目的 Python 包冲突：

```bash
# 创建工程目录和虚拟环境
mkdir -p ~/project/onshape_mj && cd ~/project/onshape_mj
/usr/bin/python3 -m venv .venv      # 用系统 Python 创建，不要用 Anaconda 的 Python
source .venv/bin/activate

# 安装导出工具和 MuJoCo
pip install -U onshape-to-robot mujoco

# 确认安装成功
pip show onshape-to-robot mujoco | grep -E "Name|Version"
```

之后每次使用前，先进入工程目录执行 `source .venv/bin/activate` 激活环境。

::: danger 不要用 Anaconda 的 Python 创建虚拟环境
装了 Anaconda 的机器上，`python3` 往往指向 Anaconda（可用 `which python3` 查看）。用它创建的虚拟环境会带上 Anaconda 自带的旧版 `libstdc++`，与系统显卡驱动不兼容，MuJoCo 查看器无法打开窗口（见文末问题记录）。因此这里显式使用 `/usr/bin/python3`。
:::

::: warning 注意版本
onshape-to-robot 从 **1.0.0** 起改用新的配置格式，并支持导出 MuJoCo 格式。如果环境里装的是 0.3.x 等旧版本（例如以前为别的项目安装过），需要用 `pip install -U onshape-to-robot` 升级。
:::

本次测试中，只用 pip 安装以上两个包即可完成导出和查看，没有用到额外的系统依赖。

## 2. 在 Onshape 中准备装配体

- **关节**：用配合（Mate）连接两个零件，并把**配合本身**命名为以 `dof_` 开头，例如 `dof_left_hip`，会被导出为关节。注意要改的是配合的名称，而不是配合连接器（Mate Connector）的名称；
- **关节类型**由配合类型决定：旋转（Revolute）或圆柱（Cylindrical）配合对应转动关节，滑动（Slider）配合对应移动关节，固定（Fastened）配合对应固定连接；
- **反转轴向**：名称以 `_inv` 结尾，例如 `dof_head_pitch_inv` 会导出名为 `head_pitch`、轴向反转的关节；
- **坐标系**：名称以 `frame_` 开头的配合，会被导出为一个坐标系（MuJoCo 中的 `site`），用于标记传感器、相机、足端等位置；
- **合并零件**：紧固配合（Fastened），以及名称以 `fix_` 开头的配合，会把两个零件合并为同一个刚体；配合组（Mate Group）中的零件也会被合并；
- **闭链机构**：名称以 `closing_` 开头的配合用于闭合运动链，MuJoCo 中导出为 `<equality>` 约束；
- **基座**：装配体列表中的**第一个实例**作为机器人的根；
- 除紧固配合外，其他未按约定命名的配合（例如未改名的旋转配合）会被忽略；装配体必须是顶层装配体，其中的实例就是机器人的各个刚体。

### 设置旋转关节与旋转轴

关节的旋转轴不在 `config.json` 中指定，而是由装配体（Assembly）中的**旋转配合**（Revolute Mate）决定：旋转配合总是绕其**配合连接器（Mate Connector）的 Z 轴**转动，onshape-to-robot 导出时直接使用这个轴。

在装配体标签页中操作：

1. 点击工具栏中的 **Revolute** 配合；
2. 依次选择两个零件上的配合连接器。把鼠标移到孔或轴的**圆形边**、**圆柱面**上，Onshape 会自动在圆心生成连接器，Z 轴沿孔或轴的方向，这是最常用也最准确的方式；
3. 在配合对话框中把名称改为 `dof_` 开头，例如 `dof_hip`；
4. 检查 Z 轴方向，不对时调整：
   - **Flip primary axis**：反转 Z 轴；
   - **Reorient secondary axis**：以 90° 为步长旋转 X 轴；
   - 圆心处没有可选的几何时，先用 **Mate connector** 特征单独创建一个连接器，通过平移、旋转把它放到需要的位置，再在配合中选择它；
5. 需要限制转动范围时，在配合对话框中勾选 **Limits**，设置最小和最大角度，导出后即为关节的转动范围；
6. 拖动零件，确认它只绕预期的轴转动。

转动的**正方向**按右手定则：拇指指向 Z 轴，四指弯曲的方向为正。需要反向时，可以翻转 Z 轴，也可以把配合名改为以 `_inv` 结尾。

导出后在 `robot.xml` 中找到对应的 `<joint>`，并在 `onshape-to-robot-mujoco` 的查看器中拖动该关节，确认转动方向与预期一致。

![在装配体中添加旋转配合](/images/robot/mujoco/onshape-to-mujoco/add_coordination.png)



## 3. 配置 Onshape API 密钥

- 登录 Onshape 后，在 **My Account → Developer**（<https://cad.onshape.com/user/developer/apiKeys>）中创建 API Key，得到 Access Key 和 Secret Key；
- 通过环境变量提供给 onshape-to-robot，可以写在 `~/.bashrc` 中，或写在项目根目录的 `.env` 文件中：

```bash
export ONSHAPE_API=https://cad.onshape.com
export ONSHAPE_ACCESS_KEY=你的_Access_Key
export ONSHAPE_SECRET_KEY=你的_Secret_Key
```

- 密钥不要提交到 Git 仓库，使用 `.env` 文件时要把它加入 `.gitignore`；

## 4. 编写 config.json

每个机器人在工程目录下占一个子目录，`config.json` 放在其中。以本次测试的 SelfRisingRobot 为例：

```
onshape_mj/
├── .venv/                    虚拟环境
├── .env                      Onshape API 密钥（不提交）
└── self_rising_robot/
    └── config.json           导出配置
```

`self_rising_robot/config.json`：

```json
{
    "url": "https://cad.onshape.com/documents/99318561859d14b7dfb1ec02/w/c5cc8e008effe8962e725f62/e/ddd41c4f5c23e49762d94715",
    "output_format": "mujoco",
    "robot_name": "self_rising_robot",
    "output_filename": "robot"
}
```

| 字段 | 作用 |
|---|---|
| `url` | Onshape 装配体的链接：打开文档，切换到**装配体标签页**后复制地址栏，末尾 `/e/...` 必须指向装配体而不是零件（Part Studio） |
| `output_format` | 输出格式，`urdf` 或 `mujoco`，必填 |
| `robot_name` | 模型名，即 XML 中 `<mujoco model="...">` 的名称，默认为目录名 |
| `output_filename` | 输出文件名，默认为 `robot`，扩展名自动添加 |

以上四项就足以完成第一次导出。模型复杂之后，常用的进阶字段如下：

| 字段 | 作用 |
|---|---|
| `simplify_stls` / `max_stl_size` | 简化网格，控制 STL 文件大小 |
| `ignore` | 哪些零件不生成碰撞体或不导出，支持 `*` 通配和 `!` 排除 |
| `additional_xml` | 拼接到输出中的额外 XML：关节参数、传感器等 |
| `joint_properties` | 关节的默认属性，例如使用哪个执行器类 |
| `post_import_commands` | 导出后执行的命令，用于对 XML 做后处理 |

::: tip 字段名写法
从 1.0.0 起配置项统一使用下划线写法（如 `output_format`），旧的驼峰写法（如 `outputFormat`）仍然兼容，新写的配置建议统一使用下划线写法。
:::

## 5. 执行导出

```bash
cd ~/project/onshape_mj
source .venv/bin/activate
onshape-to-robot self_rising_robot          # 导出，参数为 config.json 所在目录
onshape-to-robot-mujoco self_rising_robot   # 在 MuJoCo 中打开导出的模型进行检查
```

导出完成后，`self_rising_robot/` 下会生成：

| 文件 | 内容 |
|---|---|
| `robot.xml` | 机器人模型：`<default>` 类（visual / collision）、`<body>` 树、`<joint>`、`<geom>`、惯性参数 |
| `scene.xml` | 场景文件：通过 `<include file="robot.xml"/>` 引用机器人，并添加地面、灯光、天空盒，用于直接打开查看 |
| `assets/` | 每个零件一个 `.stl` 网格文件 |

## 6. 在 MuJoCo 中查看模型

MuJoCo 已在第 1 步与 onshape-to-robot 一起装进工程的虚拟环境（`pip install mujoco`），不需要另外安装，确认一下即可：

```bash
cd ~/project/onshape_mj
source .venv/bin/activate
python -c "import mujoco; print(mujoco.__version__)"
```

先在命令行里加载模型，确认 XML 没有错误，并看一下关节数量：

```bash
python -c "
import mujoco
m = mujoco.MjModel.from_xml_path('self_rising_robot/scene.xml')
print('刚体', m.nbody, '关节', m.njnt, '自由度', m.nv, '执行器', m.nu)
"
```

然后打开图形界面查看，有两种方式：

```bash
# 方式一：onshape-to-robot 自带的查看命令，打开目录下的 scene.xml，并开始仿真
onshape-to-robot-mujoco self_rising_robot

# 方式二：MuJoCo 自带的查看器，可以打开任意 XML
python -m mujoco.viewer --mjcf=self_rising_robot/scene.xml
```

查看器的常用操作：

| 操作 | 作用 |
|---|---|
| 鼠标左键拖动 | 旋转视角 |
| 鼠标右键拖动 | 平移视角 |
| 滚轮 | 缩放 |
| 空格 | 暂停 / 继续仿真（仅方式二有效，见下方说明） |
| 双击零件，再按住 Ctrl + 右键拖动 | 对该零件施加力，拖动它 |
| 右侧 Control 面板 | 拖动滑条控制执行器 |
| 左侧 Rendering 面板 | 显示关节轴、坐标系、接触点等 |

方式一（以及后文问题记录中的预览脚本）使用的是 MuJoCo 的**被动查看器**（`launch_passive`）：仿真循环由脚本自己执行，每次循环都会调用 `mj_step()`，查看器界面上的暂停对它不起作用。需要暂停查看时，使用方式二，或者在脚本中自行处理按键和暂停状态。

::: tip 需要图形界面
查看器会打开一个窗口，必须在有桌面的终端中运行。通过 SSH 远程登录时没有显示环境，窗口无法打开，此时只能用上面的命令行方式检查模型。
:::


### 直接 mujoco 预览模型会掉下来 ?

onshape-to-robot-mujoco 会默认把机器人放在 离地 0.5m出，所以会直接掉下来

![MJVIEW](/images/robot/mujoco/onshape-to-mujoco/mujoco_view.png)

## 7. 检查与补充模型

- **在查看器中检查**：确认关节轴向、关节范围、零件位置正确；
- **质量与惯量**：Onshape 中零件需要设置正确的材料或质量，否则导出的惯量不可信；
- **碰撞体**：网格碰撞体计算慢，训练时通常只保留足端等关键部位，或改用简单几何体；
- **执行器**：为关节添加 `<position>` 等执行器，设置增益、力矩限制；
- **关节参数**：阻尼、摩擦（`frictionloss`）、电机转子惯量（`armature`）。

## 问题记录

### 导出后没有关节，每个零件都是独立的 freejoint

第一次导出 SelfRisingRobot 时，`robot.xml` 中 4 个零件各自成为一个顶层 `<body>`，每个都带有 `<freejoint>`，没有任何 `<joint>`。用上面的命令加载，输出为 `关节 4 自由度 24`：4 个关节全部是自由关节，每个 6 个自由度。在仿真中这些零件的碰撞体相互穿透，被接触力推开，各自飞散。

原因：装配体中的配合没有按约定命名。onshape-to-robot 只把名称以 `dof_` 开头的配合导出为关节；紧固配合和 `fix_` 开头的配合会合并零件；其他未按约定命名的配合（例如默认名为 `Revolute 1` 的旋转配合）会被忽略，零件之间就没有连接关系。

解决：在装配体中把需要转动的配合改为旋转配合并命名为 `dof_xxx`；把需要固定在一起的零件之间的配合命名为 `fix_xxx`，然后重新导出。

修改后重新导出，模型变为一棵刚体树：只有根零件带 `<freejoint>`，其余零件嵌套在它下面，并生成了 `servo1`、`servo2` 两个转动关节及对应的位置执行器，加载输出为 `关节 3 自由度 8`（1 个自由关节 6 自由度，加 2 个转动关节）。

### 预览时机器人直接掉下来

`onshape-to-robot-mujoco` 会把带 `<freejoint>` 的根刚体放到离地 0.5 m 处，并立即开始仿真，所以机器人一打开就会掉到地面上。对于需要在地面上活动的机器人，这本身是正确的行为。

只想查看模型、拖动关节时，可以在工程目录中用一个小脚本预览：加载模型后删除根刚体的 `<freejoint>`，让底座固定在空中。

```python
# view.py：python view.py self_rising_robot
import sys, time
import mujoco, mujoco.viewer

spec = mujoco.MjSpec.from_file(f"{sys.argv[1]}/scene.xml")
for body in spec.worldbody.bodies:
    for j in [j for j in body.joints if j.type == mujoco.mjtJoint.mjJNT_FREE]:
        spec.delete(j)                    # 删除自由关节，底座固定
        body.pos = [0, 0, 0.2]            # 抬高 0.2 m，离开地面

model = spec.compile()
data = mujoco.MjData(model)
with mujoco.viewer.launch_passive(model, data) as viewer:
    while viewer.is_running():
        mujoco.mj_step(model, data)
        viewer.sync()
        time.sleep(model.opt.timestep)
```

打开后在右侧 **Control** 面板拖动滑条，即可控制 `servo1`、`servo2` 等执行器。

### 零件质量为 1e-09

导出的 `robot.xml` 中所有刚体都是 `mass="1e-09"`，说明 Onshape 中的零件**没有设置材料或质量**。质量几乎为零的模型在仿真中表现异常：落地后穿入地面、关节被接触力推着乱转。

解决：在 Onshape 的零件工作室（Part Studio）中，右键零件选择 **Assign material**，为每个零件指定材料（例如 3D 打印件选 PLA）；舵机等外购件可以在零件属性中直接填写实际质量。然后重新导出，`<inertial>` 中会出现真实的质量和惯量。

## 参考资料

- [onshape-to-robot](https://github.com/Rhoban/onshape-to-robot) 与 [文档](https://onshape-to-robot.readthedocs.io/)
- [MuJoCo 文档：MJCF 建模](https://mujoco.readthedocs.io/en/stable/XMLreference.html)
