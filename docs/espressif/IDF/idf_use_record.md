# IDF命令使用记录

### 1.如何让sdkconfig.defaults生效
执行命令：
```
idf.py set-target xxx
```

### 2.如何单独对指定文件添加编译选项
```cmake
idf_component_register(SRCS ${SRC_FILES}
                    INCLUDE_DIRS ${INC_FILES}
                    REQUIRES esp_timer driver esp_rom
                    )

set_source_files_properties( "Arduino-FOC/src/sensors/Encoder.cpp"
    PROPERTIES COMPILE_FLAGS
    -Wno-volatile
)
```

### 3.全部擦除
```shell
idf.py erase-flash
```