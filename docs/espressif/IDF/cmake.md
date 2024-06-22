# ESP常用CMAKE

## 1.获取某个目录下的所有.c文件到一个变量里面
```cmake
file(GLOB LV_SRCS "app_lvgl/*.c")
```