# ESP-IDF

## 1.常用指令

### 1.分析flash 占用
```shell
idf.py size
idf.py size-files
idf.py size-components
```

### 2.bin打包
```shell
esptool.py --chip esp32s3 merge_bin -o mpys3-n8.bin --flash_mode dio --flash_size 8MB --flash_freq 80m 0x0 build-ESP32_GENERIC_S3/bootloader/bootloader.bin 0x8000 build-ESP32_GENERIC_S3/partition_table/partition-table.bin 0x10000 build-ESP32_GENERIC_S3/micropython.bin
```

```shell
esptool.py -p /dev/ttyUSB0 write_flash 0  mpys3-n8.bin
```

### 3.如何分析汇编代码：

```shell
➜  lvgl_demo_v8 git:(feature/add_p4_2d_physics) ✗ riscv32-esp-elf-objdump -d build/esp-idf/main/CMakeFiles/__idf_main.dir/lv_demo_physics.c.obj > lv_demo_physics.s
```

## 2.常见问题：

### 1.编译报错：KeyError: 'idfSelectedId'


```shell
➜  esp-idf git:(v4.4) ✗ rm ~/.espressif/idf-env.json
```