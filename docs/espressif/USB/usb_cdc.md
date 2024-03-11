# USB CDC

## 基本概念
1. CDC: 通讯设备类
2. ACM：抽象控制模型
3. NCM：网络控制模型

USB CDC ACM需要的描述符：
* 标准设备描述符
* 标准配置描述符
* 接口关联描述符
* CDC头功能描述符
* CDC 联合功能描述符
* 呼叫管理功能描述符
* 抽象控制管理功能描述符
* CDC 类通信接口的标准接口描述符
* 中断 IN 端点的标准端点描述符
* CDC 类数据接口的标准接口描述符
* Bulk IN 和 Bulk OUT 端点的标准端点描述符

需要完成两个接口描述符 cdc_control与cdc_data，以及接口关联描述符iad
* cdc_control
  * class: 0x02
  * subclass:
    * Abstract Control Model：0x02
  * 目录：usbcdc11的4.4章节
* cdc_data
  * class：0x0a

解释一下，因为我们这里有两个接口描述符，如果将他们合并的话，需要用接口关联描述符IAD

接口关联描述符的定义可以看：https://www.usbzh.com/article/detail-712.html
```c
typedef struct _USBInterfaceAssociationDescriptor {
    BYTE  bLength:                  0x08        //描述符大小
    BYTE  bDescriptorType:          0x0B        //IAD描述符类型
    BYTE  bFirstInterface:          0x00        //起始接口
    BYTE  bInterfaceCount:          0x02        //接口数
    BYTE  bFunctionClass:           0x0E        //类型代码
    BYTE  bFunctionSubClass:        0x03        //子类型代码
    BYTE  bFunctionProtocol:        0x00        //协议代码
    BYTE  iFunction:                0x04        //描述字符串索引
}
```

对于tinyusb，他的一些描述符都存放在
```c
#define TUD_CDC_DESCRIPTOR(_itfnum, _stridx, _ep_notif, _ep_notif_size, _epout, _epin, _epsize) \
```


### 描述符解析
