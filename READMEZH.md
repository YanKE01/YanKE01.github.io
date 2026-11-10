# 学习笔记

[English](README.md) | **简体中文**

基于 [VitePress](https://vitepress.dev) 的学习笔记站，支持按分类整理和 QA 随机抽题。

## 本地预览

```bash
npm install     # 首次运行
npm run dev     # 打开 http://localhost:5173 实时预览
```

## 怎么写笔记

所有笔记都放在 `docs/` 下：

```
docs/
└── peripheral/       ← 一个文件夹 = 一个分类
    ├── index.md      ← 可选：写 title 作为分类显示名（否则显示文件夹名）
    └── i2c.md        ← 一个 md = 一篇笔记
```

- **新分类**：新建一个文件夹。文件夹里还可以再建子文件夹作为子分类。
- **标题**：取 frontmatter 的 `title`，没有就取正文第一个 `# 标题`。
- **日期**：frontmatter 写 `date: 2026-11-10`，首页按日期从新到旧排列。
- **摘要**：首页显示文章第一段文字；也可在 frontmatter 写 `description` 指定。
- **排序**：frontmatter 写 `order: 1`，数字越小越靠前；不写则按名称排序。
- 新增、删除文章或修改标题、排序后，`npm run dev` 会自动重启以刷新侧边栏（几秒钟）；正文修改实时生效。

### QA 写法（会自动进入随机抽题）

```markdown
## Q: 这里写问题？

这里写答案，可以用任意 Markdown：列表、代码块、表格、图片……
直到下一个二级标题为止都算答案。
```

规则：**以 `Q:`（或 `Q：`）开头的二级标题 = 一道题**。其它标题照常写，不会进题库。

### 时序波形图（WaveDrom）

用 `wavedrom` 代码块描述波形，构建时自动转成图片：

````markdown
```wavedrom
{
  signal: [
    { name: 'SCL', wave: '1.0.1.' },
    { name: 'SDA', wave: '10...1' },
  ],
}
```
````

常用字符：`0`/`1` 低/高电平，`.` 保持上一状态，`p`/`n` 时钟，`3`~`9` 带文字的数据块（文字写在 `data` 中）。
语法说明与在线编辑器：<https://wavedrom.com/tutorial.html>、<https://wavedrom.com/editor.html>（可先在线调好再粘贴进来）。

注意事项：

- 不能用 `+` 拼接字符串，波形要写成完整的一串；
- 用于画箭头的辅助节点（`node`）请用**大写字母**，小写字母会直接显示在图上；
- 脉冲较多的图可加 `config: { skin: 'narrow' }` 缩小宽度。

写作依据的厂商规范、数据手册和应用笔记放在仓库根目录的 `references/` 下，随仓库一起提交，但不会发布到网站上。文章在参考资料中注明出处，同时尽量附上官方链接。

### 公式（LaTeX）

公式用 LaTeX 书写，构建时由 MathJax 渲染。行内公式用 `$...$`，独立成行的公式用 `$$...$$`：

```markdown
位时间为 $T_{bit} = (1 + \mathrm{TSEG1} + \mathrm{TSEG2}) \times T_q$。

$$
\text{采样点} = \frac{1 + \mathrm{TSEG1}}{1 + \mathrm{TSEG1} + \mathrm{TSEG2}}
$$
```

### USB 包交互图

用 `usbflow` 代码块画主机与设备之间的包交互，`usbfields` 画包的字段结构：

````markdown
```usbflow
# 分组标题
H IN 地址 5，端点 1        ← H = 主机发送，D = 设备发送；然后是 PID 和说明
D DATA1 设备发送数据
H ACK [lost] 在传输中丢失   ← [lost] 表示该包丢失（虚线）
```

```usbfields
令牌包: SYNC | PID 8 | ADDR 7 | ENDP 4 | CRC5 5 | EOP
```
````

PID 会自动着色：令牌蓝、数据黄、ACK 绿、NAK 橙、STALL 红、NYET 紫、PING 青。

图片放在 `docs/public/images/<分类>/<文章>/` 下，用绝对路径引用：

```
docs/public/images/robot/mujoco/onshape-to-mujoco/revolute-mate.png
→ ![旋转配合](/images/robot/mujoco/onshape-to-mujoco/revolute-mate.png)
```

目录结构与 `docs/` 下保持一致：分类、子分类用文件夹名，文章用 Markdown 文件名，例如 `docs/peripheral/usb/eye-diagram.md` 的图片放在 `images/peripheral/usb/eye-diagram/`。路径必须以 `/images/` 开头：相对路径在抽题页中无法正确显示。截图建议用 PNG，单张尽量控制在 500 KB 以内。

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库，把代码推上去（分支名为 `main`）。
   - 仓库名为 `用户名.github.io` → 网址是 `https://用户名.github.io/`
   - 其它仓库名（如 `blog`）→ 网址是 `https://用户名.github.io/blog/`
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 之后每次 `git push`，Actions 会自动构建并发布（约 1～2 分钟）。

## 改外观

- 站点名、简介与导航栏：`docs/.vitepress/config.mts` 中的 `title`、`description` 和 `nav`
- 主题色：`docs/.vitepress/theme/style.css`
- 首页封面图：把图片放进 `docs/public/`，在 `config.mts` 中取消 `cover` 一行的注释
