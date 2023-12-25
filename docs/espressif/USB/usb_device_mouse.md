# USB HID 鼠标实战

### 报告描述符格式
首先，一个报告描述符内部的优先级应该是Global item -> Local item -> Main item
* Usage Page:指定设备功能，在USH_HID中文的189页，选择0x01，通用桌面控制
* Usage: 指定个别报表的功能，是Usage Page的下一级，我们上面选择的是0x01，我们的用途是鼠标，参考P190，选择mouse，为0x02
* Collection and End Collection: 相当于集合的意思
  * Application Collection: 1，就是包含共同用途的项目或者单一功能的项目。举个例子，键盘的开机是按键和led灯的共同用途
  * Physical Collection: 0，一个单一几何点上的数据项目
  * Logical Collection: 2，以后了解
* LogicalMax and LogicalMin：定义报表变量的数据范围，在我们这个鼠标按键里，只有0和1
* ReportCount：指定local uage的个数 https://www.usbzh.com/article/detail-966.html
* ReportSize：指定每一个usage的数据大小

### TinyUsb报告描述符解析
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


### 鼠标报告描述符
```c
#define TUD_HID_REPORT_DESC_MOUSE(...) \
  HID_USAGE_PAGE ( HID_USAGE_PAGE_DESKTOP      )                   ,\
  HID_USAGE      ( HID_USAGE_DESKTOP_MOUSE     )                   ,\
  HID_COLLECTION ( HID_COLLECTION_APPLICATION  )                   ,\
    /* Report ID if any */\
    __VA_ARGS__ \
    HID_USAGE      ( HID_USAGE_DESKTOP_POINTER )                   ,\
    HID_COLLECTION ( HID_COLLECTION_PHYSICAL   )                   ,\
      HID_USAGE_PAGE  ( HID_USAGE_PAGE_BUTTON  )                   ,\
        HID_USAGE_MIN   ( 1                                      ) ,\
        HID_USAGE_MAX   ( 5                                      ) ,\ //这里描述了5个按键
        HID_LOGICAL_MIN ( 0                                      ) ,\ 
        HID_LOGICAL_MAX ( 1                                      ) ,\ //限定了数据范围，按键的结果只有0和1
        /* Left, Right, Middle, Backward, Forward buttons */ \
        HID_REPORT_COUNT( 5                                      ) ,\ //这是使用了5个usage，所有count为5
        HID_REPORT_SIZE ( 1                                      ) ,\ //这里是每一个usage的大小，都是1
        HID_INPUT       ( HID_DATA | HID_VARIABLE | HID_ABSOLUTE ) ,\
        /* 3 bit padding */ \
        HID_REPORT_COUNT( 1                                      ) ,\
        HID_REPORT_SIZE ( 3                                      ) ,\ //这里主要是凑一个字节，所以扩充了三个位
        HID_INPUT       ( HID_CONSTANT                           ) ,\
      HID_USAGE_PAGE  ( HID_USAGE_PAGE_DESKTOP )                   ,\
        /* X, Y position [-127, 127] */ \
        HID_USAGE       ( HID_USAGE_DESKTOP_X                    ) ,\
        HID_USAGE       ( HID_USAGE_DESKTOP_Y                    ) ,\
        HID_LOGICAL_MIN ( 0x81                                   ) ,\ 
        HID_LOGICAL_MAX ( 0x7f                                   ) ,\ //这里限定了鼠标x和y的移动范围在-127到128
        HID_REPORT_COUNT( 2                                      ) ,\
        HID_REPORT_SIZE ( 8                                      ) ,\
        HID_INPUT       ( HID_DATA | HID_VARIABLE | HID_RELATIVE ) ,\
        /* Verital wheel scroll [-127, 127] */ \
        HID_USAGE       ( HID_USAGE_DESKTOP_WHEEL                )  ,\
        HID_LOGICAL_MIN ( 0x81                                   )  ,\
        HID_LOGICAL_MAX ( 0x7f                                   )  ,\
        HID_REPORT_COUNT( 1                                      )  ,\ //滚轮的范围也是-127到128
        HID_REPORT_SIZE ( 8                                      )  ,\
        HID_INPUT       ( HID_DATA | HID_VARIABLE | HID_RELATIVE )  ,\
      HID_USAGE_PAGE  ( HID_USAGE_PAGE_CONSUMER ), \
       /* Horizontal wheel scroll [-127, 127] */ \
        HID_USAGE_N     ( HID_USAGE_CONSUMER_AC_PAN, 2           ), \
        HID_LOGICAL_MIN ( 0x81                                   ), \
        HID_LOGICAL_MAX ( 0x7f                                   ), \
        HID_REPORT_COUNT( 1                                      ), \
        HID_REPORT_SIZE ( 8                                      ), \
        HID_INPUT       ( HID_DATA | HID_VARIABLE | HID_RELATIVE ), \
    HID_COLLECTION_END                                            , \
  HID_COLLECTION_END \
```

### ref
[鼠标报告描述符](https://www.usbzh.com/article/detail-327.html)




