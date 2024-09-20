# TAWI例程学习

## 配置波特率 TWAI_TIMING_CONFIG_100KBITS

XTAL是40M的。

```c
#define TWAI_TIMING_CONFIG_100KBITS()   {.clk_src = TWAI_CLK_SRC_DEFAULT, .quanta_resolution_hz = 2000000, .brp = 0, .tseg_1 = 15, .tseg_2 = 4, .sjw = 3, .triple_sampling = false}


typedef struct {
    twai_clock_source_t clk_src;    /**< Clock source, set to 0 or TWAI_CLK_SRC_DEFAULT if you want a default clock source */
    uint32_t quanta_resolution_hz;  /**< The resolution of one timing quanta, in Hz.
                                         Note: the value of `brp` will reflected by this field if it's non-zero, otherwise, `brp` needs to be set manually */
    uint32_t brp;                   /**< Baudrate prescale (i.e., clock divider). Any even number from 2 to 128 for ESP32, 2 to 32768 for non-ESP32 chip.
                                         Note: For ESP32 ECO 2 or later, multiples of 4 from 132 to 256 are also supported */
    uint8_t tseg_1;                 /**< Timing segment 1 (Number of time quanta, between 1 to 16) */
    uint8_t tseg_2;                 /**< Timing segment 2 (Number of time quanta, 1 to 8) */
    uint8_t sjw;                    /**< Synchronization Jump Width (Max time quanta jump for synchronize from 1 to 4) */
    bool triple_sampling;           /**< Enables triple sampling when the TWAI controller samples a bit */
} twai_timing_config_t;
```

我们可以分析一下波特率的计算公式：

$$
baud \ rate = \frac{quanta \ resolution \ hz}{TQ All number} = \frac{quanta \ resolution \ hz}{1+tseg_1+tseg2}
$$

对于我们的100K的波特率而言，2000000/(1+15+4) = 100 * 1000

SJW: 同步跳转宽度，当CAN控制器接收到的信号与自己的始终频率不同的时候，最大容忍调整 SJW 时间量子。
通常，SJW 的设置不应大于 tseg_2，以确保同步调整不会超出第二段时间量子（Phase Segment 2）的限制。在你的配置中，tseg_2 = 4，而 sjw = 3，这是一个合理的设置，因为 SJW 小于 tseg_2。