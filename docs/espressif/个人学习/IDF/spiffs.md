# SPIFFS Filesystem

### 1.工程构建
#### 1.1 添加分区表 partitions.csv
```csv
# Name,   Type, SubType, Offset,  Size, Flags
# Note: if you have increased the bootloader size, make sure to update the offsets to avoid overlap
nvs,      data, nvs,     0x9000,  0x6000,
phy_init, data, phy,     0xf000,  0x1000,
factory,  app,  factory, 0x10000, 1M,
storage,  data, spiffs,  ,        0xF0000,
```
其中storge分区就是我们存储数据的地方

#### 1.2 添加sdkconfig.defaults
```
CONFIG_PARTITION_TABLE_CUSTOM=y
CONFIG_PARTITION_TABLE_CUSTOM_FILENAME="partitions.csv"
CONFIG_PARTITION_TABLE_FILENAME="partitions.csv"
```
使用idf.py set-target xxx让默认配置生效

#### 1.3 在project的cmakelist添加
```cmake
cmake_minimum_required(VERSION 3.5)

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(esp_usb_otg)

spiffs_create_partition_image(storage src FLASH_IN_PROJECT)
```

其中src就是我们存放的目录

### 2.读写文件工程

关键函数：
```c
//注册spiffs
esp_err_t esp_vfs_spiffs_register(const esp_vfs_spiffs_conf_t * conf);
//注销spiffs
esp_err_t esp_vfs_spiffs_unregister(const char* partition_label);
//spiffs检查
esp_err_t esp_spiffs_check(const char* partition_label); 
//获取使用情况
esp_err_t esp_spiffs_info(const char* partition_label, size_t *total_bytes, size_t *used_bytes)；
```

完整工程
```c
#include <stdio.h>
#include <string.h>
#include <sys/unistd.h>
#include <sys/stat.h>
#include "esp_err.h"
#include "esp_log.h"
#include "esp_spiffs.h"

static const char *TAG = "USB_OTG";

void app_main(void)
{
    esp_err_t ret;
    esp_vfs_spiffs_conf_t conf = {
        .base_path = "/spiffs",
        .partition_label = NULL,
        .max_files = 5,
        .format_if_mount_failed = true, // 如果挂载失败，将格式化文件系统
    };

    ESP_ERROR_CHECK(esp_vfs_spiffs_register(&conf));

    // 检查spiffs
    ret = esp_spiffs_check(conf.partition_label);
    if (ret != ESP_OK)
    {
        ESP_LOGI(TAG, "SPIFFS Check failed:%s", esp_err_to_name(ret));
    }
    else
    {
        ESP_LOGI(TAG, "SPIFFS Check success");
    }

    // 获取spiffs的信息
    size_t total = 0, used = 0;
    ret = esp_spiffs_info(conf.partition_label, &total, &used);
    if (ret != ESP_OK)
    {
        ESP_LOGI(TAG, "Failed to get spiffs partition info:%s", esp_err_to_name(ret));
    }
    else
    {
        ESP_LOGI(TAG, "Partition size: total:%d,used:%d ", total, used);
    }

    // 如果used > total，再次检查
    if (used > total)
    {
        ESP_LOGW(TAG, "Number of used bytes cannot be larger than total. Performing SPIFFS_check().");
        ret = esp_spiffs_check(conf.partition_label);
        if (ret != ESP_OK)
        {
            ESP_LOGE(TAG, "SPIFFS_check() failed (%s)", esp_err_to_name(ret));
            return;
        }
        else
        {
            ESP_LOGI(TAG, "SPIFFS_check() successful");
        }
    }

    // 写文件 我希望在原有的文件后面追加，所以用a
    FILE *f = fopen("/spiffs/hello.txt", "a");
    if (f == NULL)
    {
        ESP_LOGE(TAG, "Open file failed");
        return;
    }
    const char *content = " yanke";
    fputs(content, f);
    fclose(f);

    // 读取文件
    f = fopen("/spiffs/hello.txt", "r");
    if (f == NULL)
    {
        ESP_LOGE(TAG, "Open file failed");
        return;
    }

    char buf[256];
    fread(buf, 1, sizeof(buf), f);
    ESP_LOGI(TAG, "%s", buf);
    fclose(f);

    esp_vfs_spiffs_unregister(conf.partition_label);
}
```

## Ref
