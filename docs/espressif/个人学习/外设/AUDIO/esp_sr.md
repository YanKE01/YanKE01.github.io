# ESP_SR使用

### 1.添加组件
```shell
idf.py add-dependency "espressif/esp-sr^1.6.1"
```

需要给sr_model添加一个分区，参考如下：

[https://github.com/espressif/esp-sr/blob/master/docs/zh_CN/flash_model/README.rst#id7](https://github.com/espressif/esp-sr/blob/master/docs/zh_CN/flash_model/README.rst#id7)

```csv
# Espressif ESP32 Partition Table
# Name,  Type, SubType, Offset,  Size
factory, app,  factory, 0x010000, 2500k
model,  data, spiffs,         , 5168K,
```

记得写sdkconfig.defaults
```shell
CONFIG_ESPTOOLPY_FLASHMODE_QIO=y
CONFIG_ESPTOOLPY_FLASHSIZE_16MB=y
CONFIG_PARTITION_TABLE_CUSTOM=y
CONFIG_PARTITION_TABLE_CUSTOM_FILENAME="partitions.csv"
CONFIG_PARTITION_TABLE_FILENAME="partitions.csv"
CONFIG_PARTITION_TABLE_OFFSET=0x8000
CONFIG_ESP32S3_DEFAULT_CPU_FREQ_240=y
CONFIG_ESP32S3_INSTRUCTION_CACHE_32KB=y
CONFIG_ESP32S3_DATA_CACHE_64KB=y
CONFIG_ESP32S3_DATA_CACHE_LINE_64B=y
CONFIG_ESP32S3_SPIRAM_SUPPORT=y
CONFIG_SPIRAM_MODE_OCT=y
CONFIG_SPIRAM_SPEED_80M=y
# CONFIG_ESP_SYSTEM_PANIC_PRINT_HALT is not set
CONFIG_ESP_SYSTEM_PANIC_PRINT_REBOOT=y
# CONFIG_ESP_SYSTEM_PANIC_SILENT_REBOOT is not set
# CONFIG_ESP_SYSTEM_PANIC_GDBSTUB is not set
# CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME is not set
CONFIG_ESP_SYSTEM_RTC_FAST_MEM_AS_HEAP_DEPCHECK=y
CONFIG_ESP_SYSTEM_ALLOW_RTC_FAST_MEM_AS_HEAP=y
```

然后我们就可以看到生成了srmodel.bin
```shell
Project build complete. To flash, run:
 idf.py flash
or
 idf.py -p PORT flash
or
 python -m esptool --chip esp32s3 -b 460800 --before default_reset --after hard_reset write_flash --flash_mode dio --flash_size 8MB --flash_freq 80m 0x0 build/bootloader/bootloader.bin 0x8000 build/partition_table/partition-table.bin 0x10000 build/esp_voice_activated_light.bin 0x312000 build/srmodels/srmodels.bin
```

我们在程序中就没必要挂载spiffs中的model那个label了，直接使用这个代码就可以找到模型。如果写spiffs挂载的话，我一直没成功过
```c
models = esp_srmodel_init(model_partition_label);
char *wn_name = NULL;
if (models != NULL)
{
    for (int i = 0; i < models->num; i++)
    {
        if (strstr(models->model_name[i], ESP_WN_PREFIX) != NULL)
        {
            if (wn_name == NULL)
            {
                wn_name = models->model_name[i];
                ESP_LOGI(TAG, "The wakenet model: %s", wn_name);
            }
        }
    }
}
else
{
    ESP_LOGI(TAG, "Please enable wakenet model and select wake word by menuconfig!");
    return ESP_FAIL;
}
```

这里面的model_partition_label我们就写model，这一块是要和我们写的分区表保持一致，就是那个model