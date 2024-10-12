# AUDIO PDM NS4150
驱动NS4150实现音频播放，设计的package:

* espressif/esp_codec_dev
* chmorgan/esp-audio-player
 
### codec_dev底层驱动对接

#### 1.初始化I2S的PDM
```c
const audio_codec_data_if_t *audio_i2s_init(i2s_port_t i2s_port, gpio_num_t i2s_dout, i2s_chan_handle_t *tx_channel, uint16_t sample_rate)
{
    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(i2s_port, I2S_ROLE_MASTER);
    chan_cfg.auto_clear = true;
    ESP_ERROR_CHECK(i2s_new_channel(&chan_cfg, tx_channel, NULL));

    i2s_pdm_tx_config_t pdm_cfg = {
        .clk_cfg = I2S_PDM_TX_CLK_DEFAULT_CONFIG(sample_rate),
        .slot_cfg = I2S_PDM_TX_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO),
        .gpio_cfg.clk = GPIO_NUM_NC,
        .gpio_cfg.dout = i2s_dout,
        .gpio_cfg.invert_flags.clk_inv = false,
    };

    // i2s通道初始化:PDM模式
    ESP_ERROR_CHECK(i2s_channel_init_pdm_tx_mode(*tx_channel, &pdm_cfg));
    // i2s通道使能
    ESP_ERROR_CHECK(i2s_channel_enable(*tx_channel));

    // 初始化codec解码
    audio_codec_i2s_cfg_t i2s_cfg = {
        .port = i2s_port,
        .rx_handle = NULL,
        .tx_handle = i2s_tx_chan,
    };
    return audio_codec_new_i2s_data(&i2s_cfg);
}
```

#### 2.对接codec解码
```c
esp_codec_dev_handle_t audio_codec_init(const audio_codec_data_if_t *data_if)
{
    assert(data_if);

    esp_codec_dev_cfg_t codec_dev_cfg = {
        .dev_type = ESP_CODEC_DEV_TYPE_OUT,
        .codec_if = NULL,
        .data_if = data_if,
    };

    return esp_codec_dev_new(&codec_dev_cfg);
}
```

#### 3.基于codec的音频播放
```c
esp_err_t aduio_write(void *audio_buffer, size_t len, size_t *bytes_written, uint32_t timeout_ms)
{
    esp_err_t ret = ESP_OK;
    ret = esp_codec_dev_write(play_dev_handle, audio_buffer, len);
    *bytes_written = len;
    return ret;
}
```


### audio_player上层应用
```c
static esp_err_t aduio_app_mute_function(AUDIO_PLAYER_MUTE_SETTING setting)
{
    return ESP_OK;
}

esp_err_t aduio_app_write(void *audio_buffer, size_t len, size_t *bytes_written, uint32_t timeout_ms)
{
    esp_err_t ret = ESP_OK;

    if (aduio_write(audio_buffer, len, bytes_written, 1000) != ESP_OK)
    {
        ret = ESP_FAIL;
    }

    return ret;
}

esp_err_t audio_app_reconfig_clk(uint32_t rate, uint32_t bits_cfg, i2s_slot_mode_t ch)
{
    esp_err_t ret = ESP_OK;

    esp_codec_dev_sample_info_t fs = {
        .sample_rate = rate,
        .channel = ch,
        .bits_per_sample = bits_cfg,
    };
    ret = esp_codec_dev_close(play_dev_handle);
    ret = esp_codec_dev_open(play_dev_handle, &fs);
    return ret;
}

esp_err_t audio_app_player_music(char *file_path)
{
    FILE *fp = fopen(file_path, "r");
    return audio_player_play(fp);
}
```

完整调用流程：
```c
esp_err_t audio_player_init(i2s_port_t i2s_port, gpio_num_t i2s_dout, uint16_t sample_rate)
{
    i2s_data_if = audio_i2s_init(i2s_port, i2s_dout, &i2s_tx_chan, sample_rate);
    if (i2s_data_if == NULL)
    {
        return ESP_FAIL;
    }

    play_dev_handle = audio_codec_init(i2s_data_if);
    if (play_dev_handle == NULL)
    {
        return ESP_FAIL;
    }
    audio_player_config_t config = {
        .mute_fn = aduio_app_mute_function,
        .write_fn = aduio_app_write,
        .clk_set_fn = audio_app_reconfig_clk,
        .priority = 5,
    };
    ESP_ERROR_CHECK(audio_player_new(config));
    audio_player_callback_register(audio_app_callback, NULL);
    return ESP_OK;
}
```


### 完整代码：
```c
#include "pdm.h"
#include "esp_codec_dev_defaults.h"
#include "audio_player.h"
#include "esp_log.h"

static const char *TAG = "ADUIO";

const audio_codec_data_if_t *i2s_data_if;
i2s_chan_handle_t i2s_tx_chan;
esp_codec_dev_handle_t play_dev_handle;

const audio_codec_data_if_t *audio_i2s_init(i2s_port_t i2s_port, gpio_num_t i2s_dout, i2s_chan_handle_t *tx_channel, uint16_t sample_rate)
{
    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(i2s_port, I2S_ROLE_MASTER);
    chan_cfg.auto_clear = true;
    ESP_ERROR_CHECK(i2s_new_channel(&chan_cfg, tx_channel, NULL));

    i2s_pdm_tx_config_t pdm_cfg = {
        .clk_cfg = I2S_PDM_TX_CLK_DEFAULT_CONFIG(sample_rate),
        .slot_cfg = I2S_PDM_TX_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO),
        .gpio_cfg.clk = GPIO_NUM_NC,
        .gpio_cfg.dout = i2s_dout,
        .gpio_cfg.invert_flags.clk_inv = false,
    };

    // i2s通道初始化:PDM模式
    ESP_ERROR_CHECK(i2s_channel_init_pdm_tx_mode(*tx_channel, &pdm_cfg));
    // i2s通道使能
    ESP_ERROR_CHECK(i2s_channel_enable(*tx_channel));

    // 初始化codec解码
    audio_codec_i2s_cfg_t i2s_cfg = {
        .port = i2s_port,
        .rx_handle = NULL,
        .tx_handle = i2s_tx_chan,
    };
    return audio_codec_new_i2s_data(&i2s_cfg);
}

esp_codec_dev_handle_t audio_codec_init(const audio_codec_data_if_t *data_if)
{
    assert(data_if);

    esp_codec_dev_cfg_t codec_dev_cfg = {
        .dev_type = ESP_CODEC_DEV_TYPE_OUT,
        .codec_if = NULL,
        .data_if = data_if,
    };

    return esp_codec_dev_new(&codec_dev_cfg);
}

esp_err_t aduio_write(void *audio_buffer, size_t len, size_t *bytes_written, uint32_t timeout_ms)
{
    esp_err_t ret = ESP_OK;
    ret = esp_codec_dev_write(play_dev_handle, audio_buffer, len);
    *bytes_written = len;
    return ret;
}

static esp_err_t aduio_app_mute_function(AUDIO_PLAYER_MUTE_SETTING setting)
{
    return ESP_OK;
}

esp_err_t aduio_app_write(void *audio_buffer, size_t len, size_t *bytes_written, uint32_t timeout_ms)
{
    esp_err_t ret = ESP_OK;

    if (aduio_write(audio_buffer, len, bytes_written, 1000) != ESP_OK)
    {
        ret = ESP_FAIL;
    }

    return ret;
}

esp_err_t audio_app_reconfig_clk(uint32_t rate, uint32_t bits_cfg, i2s_slot_mode_t ch)
{
    esp_err_t ret = ESP_OK;

    esp_codec_dev_sample_info_t fs = {
        .sample_rate = rate,
        .channel = ch,
        .bits_per_sample = bits_cfg,
    };
    ret = esp_codec_dev_close(play_dev_handle);
    ret = esp_codec_dev_open(play_dev_handle, &fs);
    return ret;
}

esp_err_t audio_app_player_music(char *file_path)
{
    FILE *fp = fopen(file_path, "r");
    return audio_player_play(fp);
}

static void audio_app_callback(audio_player_cb_ctx_t *ctx)
{
    switch (ctx->audio_event)
    {
    case 0: /**< Player is idle, not playing audio */
        ESP_LOGI(TAG, "IDLE");
        break;
    case 1:
        ESP_LOGI(TAG, "NEXT");
        break;
    case 2:
        ESP_LOGI(TAG, "PLAYING");
        break;
    case 3:
        ESP_LOGI(TAG, "PAUSE");
        break;
    case 4:
        ESP_LOGI(TAG, "SHUTDOWN");
        break;
    case 5:
        ESP_LOGI(TAG, "UNKNOWN FILE");
        break;
    case 6:
        ESP_LOGI(TAG, "UNKNOWN");
        break;
    }
}

esp_err_t audio_player_init(i2s_port_t i2s_port, gpio_num_t i2s_dout, uint16_t sample_rate)
{
    i2s_data_if = audio_i2s_init(i2s_port, i2s_dout, &i2s_tx_chan, sample_rate);
    if (i2s_data_if == NULL)
    {
        return ESP_FAIL;
    }

    play_dev_handle = audio_codec_init(i2s_data_if);
    if (play_dev_handle == NULL)
    {
        return ESP_FAIL;
    }
    audio_player_config_t config = {
        .mute_fn = aduio_app_mute_function,
        .write_fn = aduio_app_write,
        .clk_set_fn = audio_app_reconfig_clk,
        .priority = 5,
    };
    ESP_ERROR_CHECK(audio_player_new(config));
    audio_player_callback_register(audio_app_callback, NULL);
    return ESP_OK;
}
```

```c
#pragma once

#include "esp_err.h"
#include "driver/gpio.h"
#include "driver/i2s_pdm.h"
#include "esp_codec_dev.h"

/**
 * @brief audio init
 * 
 * @param i2s_port 
 * @param i2s_dout 
 * @param sample_rate 
 * @return esp_err_t 
 */
esp_err_t audio_player_init(i2s_port_t i2s_port, gpio_num_t i2s_dout, uint16_t sample_rate);

/**
 * @brief audio player music
 * 
 * @param file_path 
 * @return esp_err_t 
 */
esp_err_t audio_app_player_music(char *file_path);

```