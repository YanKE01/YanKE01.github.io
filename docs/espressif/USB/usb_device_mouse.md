# USB HID 鼠标实战


### 报告描述符解析
```c
HID_USAGE_PAGE ( HID_USAGE_PAGE_DESKTOP      )
```
我们展开,其中 HID_USAGE_PAGE_DESKTOP= 0x01
```c
#define HID_USAGE_PAGE(x)         HID_REPORT_ITEM(x, RI_GLOBAL_USAGE_PAGE, RI_TYPE_GLOBAL, 1)
```
其中 RI_GLOBAL_USAGE_PAGE=0，RI_TYPE_GLOBAL=1
```c
#define HID_REPORT_DATA_1(data) , data
#define HID_REPORT_ITEM(data, tag, type, size) \
  (((tag) << 4) | ((type) << 2) | (size)) HID_REPORT_DATA_##size(data)
```

```C
(((0) << 4) | ((1) << 2) | (1)) HID_REPORT_DATA_##size(0X01)
```
这个结果起始就是 0x05,0x01，对应Global Generic Desktop


### ref
[鼠标报告描述符](https://www.usbzh.com/article/detail-327.html)




