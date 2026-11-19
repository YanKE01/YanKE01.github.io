---
title: MIPI DSI 屏幕参数与驱动配置
date: 2026-11-19
order: 1
---

# MIPI DSI 屏幕参数与驱动配置

拿到一块新的 MIPI DSI 屏，主要工作就是：从屏幕规格书里找出几组参数，再填进驱动的初始化结构体。本文以 ESP-IDF 的 `esp_lcd` 驱动和 ILI9881C 屏（800 × 1280）为例，代码来自 ESP-IDF 示例 `examples/peripherals/lcd/mipi_dsi`。

## Q: 规格书里要看哪些参数？

| 参数 | 例子 | 说明 |
|---|---|---|
| **分辨率** | 800 × 1280 | 水平像素数 × 垂直行数 |
| **Lane 数** | 2 | 数据通道（lane）的数量，常见 1、2、4 |
| **像素格式** | RGB888 | 决定每个像素的位数：RGB888 为 24 bit，RGB565 为 16 bit |
| **时序参数** | HSYNC、HBP、HFP、VSYNC、VBP、VFP | 每行、每帧前后的空白，见下一节 |
| **像素时钟 / 刷新率** | 80 MHz / 约 60 Hz | 两者可以互相换算 |
| **驱动 IC 和初始化序列** | ILI9881C | 屏厂提供的一串寄存器配置，上电后要先发给屏 |
| **复位、背光** | 复位低有效，背光高有效 | 引脚电平，按原理图填 |

这些参数通常在屏幕规格书的 "Timing" 或 "AC Characteristics" 表里，初始化序列一般要单独找屏厂要。

## Q: HSYNC、HBP、HFP 这些时序参数是什么意思？

屏幕是一行一行、一帧一帧扫描的。每一行除了有效像素，前后还要留一段空白；每一帧除了有效行，前后也要留几行空白：

```text
一行：| HSYNC | HBP |    有效像素 (H)    | HFP |
一帧：| VSYNC | VBP |    有效行   (V)    | VFP |
```

| 参数 | 全称 | 单位（规格书中的写法） | 含义 |
|---|---|---|---|
| HSYNC | Horizontal Sync Pulse Width | 像素时钟周期数（CLK、DCLK） | 行同步脉冲宽度 |
| HBP | Horizontal Back Porch | 像素时钟周期数（CLK、DCLK） | 行同步之后、有效像素之前的空白 |
| HFP | Horizontal Front Porch | 像素时钟周期数（CLK、DCLK） | 有效像素之后、下一个行同步之前的空白 |
| VSYNC | Vertical Sync Pulse Width | 行数（H、Line） | 帧同步脉冲宽度 |
| VBP | Vertical Back Porch | 行数（H、Line） | 帧同步之后、有效行之前的空白 |
| VFP | Vertical Front Porch | 行数（H、Line） | 有效行之后、下一个帧同步之前的空白 |

这些值由屏的驱动 IC 决定，**按规格书填写，不要随意改**。填错会导致画面偏移、花屏或者不亮。

## Q: 像素时钟和刷新率怎么换算？

一帧的总时钟数等于"每行总像素 × 每帧总行数"：

$$
f_{\text{pixel}} = (H + \text{HSYNC} + \text{HBP} + \text{HFP}) \times (V + \text{VSYNC} + \text{VBP} + \text{VFP}) \times \text{刷新率}
$$

以 ILI9881C 为例：

- 每行总像素 = 800 + 40 + 140 + 40 = 1020；
- 每帧总行数 = 1280 + 4 + 16 + 16 = 1316；
- 像素时钟 80 MHz 时，刷新率 = 80 MHz ÷ (1020 × 1316) ≈ 59.6 Hz。

规格书一般给出像素时钟的范围，或者给出刷新率，用上面的公式换算出另一个。

## Q: Lane 速率怎么确定？

像素数据要通过几条 lane 传给屏，所以每条 lane 的速率至少要满足：

$$
\text{Lane 速率} \ge \frac{f_{\text{pixel}} \times \text{每像素位数}}{\text{Lane 数}}
$$

ILI9881C：像素时钟 80 MHz，即每秒 80 M 个像素，每个像素 24 bit，分到 2 条 lane 上：

$$
\frac{80\ \text{MHz} \times 24\ \text{bit}}{2} = 960\ \text{Mbit/s}
$$

这是**每条 lane** 的最低速率，示例中取 **1000 Mbit/s**，留一点余量。

Lane 速率不能超过屏幕和主控各自支持的上限（规格书中会给出）。如果算出来超了，可以降低刷新率，或改用 RGB565 减少每像素位数。

## Q: 这些参数怎么填进驱动？

`esp_lcd` 中初始化分三步：创建 DSI 总线、创建发命令用的 DBI 接口、创建传图像用的 DPI 面板。

```c
// 1. DSI 总线：lane 数和 lane 速率
esp_lcd_dsi_bus_config_t bus_config = {
    .bus_id = 0,
    .num_data_lanes = 2,               // Lane 数
    .lane_bit_rate_mbps = 1000,        // Lane 速率
};
esp_lcd_new_dsi_bus(&bus_config, &mipi_dsi_bus);

// 2. DBI 接口：用来发送初始化命令
esp_lcd_dbi_io_config_t dbi_config = {
    .virtual_channel = 0,
    .lcd_cmd_bits = 8,                 // 命令和参数的位宽，按规格书
    .lcd_param_bits = 8,
};
esp_lcd_new_panel_io_dbi(mipi_dsi_bus, &dbi_config, &mipi_dbi_io);

// 3. DPI 面板：像素时钟、像素格式和时序
esp_lcd_dpi_panel_config_t dpi_config = {
    .virtual_channel = 0,
    .dpi_clk_src = MIPI_DSI_DPI_CLK_SRC_DEFAULT,
    .dpi_clock_freq_mhz = 80,          // 像素时钟
    .in_color_format = LCD_COLOR_FMT_RGB888,
    .video_timing = {
        .h_size = 800,                 // H
        .v_size = 1280,                // V
        .hsync_pulse_width = 40,       // HSYNC
        .hsync_back_porch = 140,       // HBP
        .hsync_front_porch = 40,       // HFP
        .vsync_pulse_width = 4,        // VSYNC
        .vsync_back_porch = 16,        // VBP
        .vsync_front_porch = 16,       // VFP
    },
};

// 4. 屏幕驱动 IC：把以上配置交给具体型号的驱动
ili9881c_vendor_config_t vendor_config = {
    .init_cmds = lcd_init_cmds,        // 屏厂初始化序列，NULL 表示用驱动自带的
    .init_cmds_size = sizeof(lcd_init_cmds) / sizeof(lcd_init_cmds[0]),
    .mipi_config = {
        .dsi_bus = mipi_dsi_bus,
        .dpi_config = &dpi_config,
        .lane_num = 2,                 // 驱动会把 lane 数写进屏的寄存器
    },
};
esp_lcd_panel_dev_config_t lcd_dev_config = {
    .reset_gpio_num = PIN_LCD_RST,     // 复位引脚
    .rgb_ele_order = LCD_RGB_ELEMENT_ORDER_RGB,
    .bits_per_pixel = 24,
    .vendor_config = &vendor_config,
};
esp_lcd_new_panel_ili9881c(mipi_dbi_io, &lcd_dev_config, &panel);

esp_lcd_panel_reset(panel);            // 拉复位脚
esp_lcd_panel_init(panel);             // 发送初始化序列
// 最后打开背光
```

## Q: 初始化序列是什么？

初始化序列是屏厂给出的一串"命令 + 参数"，用来配置驱动 IC 的电源、Gamma、扫描方向、lane 数等。它通过 DSI 的命令模式（低速）发送，发完后屏才开始接收图像数据（视频模式，高速）。

在 `esp_lcd` 里写成一个数组，每一项是 `{命令, 参数, 参数长度, 发送后延时}`：

```c
static const ili9881c_lcd_init_cmd_t lcd_init_cmds[] = {
    // {cmd, { data }, data_size, delay_ms}
    {0xFF, (uint8_t []){0x98, 0x81, 0x03}, 3, 0},  // ILI9881C 的切页命令：切到第 3 页
    {0x01, (uint8_t []){0x00}, 1, 0},
    {0x02, (uint8_t []){0x00}, 1, 0},
    // ... 屏厂提供的几十到几百条 ...
    {0xFF, (uint8_t []){0x98, 0x81, 0x00}, 3, 0},  // 切回第 0 页
    {0x29, NULL, 0, 0},                           // Display On
};
```

- 中间的寄存器配置**照抄屏厂给的**，不用逐条理解；
- `0x11`（Sleep Out，退出睡眠）和 `0x29`（Display On，打开显示）是 MIPI 标准命令，几乎所有屏都有，Sleep Out 之后一般要等 120 ms。ILI9881C 驱动会在发送序列前自己发 `0x11` 并延时，所以上面的数组里只有 `0x29`；其他屏的序列常把这两条放在最后，以屏厂资料和驱动代码为准。

屏厂给的格式各不相同（常见的是一行一条 `REGW 0xFF 0x98 0x81 0x03` 或 `{0xFF, 3, {0x98, 0x81, 0x03}}`），需要转换成驱动要求的数组格式。

## Q: 屏不亮或显示不对，先查什么？

| 现象 | 先检查 |
|---|---|
| 完全不亮 | 背光是否打开；复位电平；DSI PHY 是否上电 |
| 背光亮但黑屏 | 初始化序列是否正确；lane 数是否和初始化序列中配置的一致 |
| 画面偏移、错位、花屏 | 时序参数（HBP、HFP 等）和分辨率 |
| 颜色不对（红蓝互换） | `rgb_ele_order` 设为 RGB 还是 BGR；像素格式 |
| 闪烁、撕裂、底部花屏 | 像素时钟或 lane 速率是否过高；帧缓冲带宽是否足够 |

## 参考资料

- ESP-IDF 示例：`examples/peripherals/lcd/mipi_dsi`
- ESP-BSP 组件：`components/lcd/esp_lcd_ili9881c`
