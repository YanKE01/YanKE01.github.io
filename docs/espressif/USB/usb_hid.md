# USB_HID

### 配置描述符

```c
TUD_CONFIG_DESCRIPTOR(1, 1, 0, TUSB_DESC_TOTAL_LEN, TUSB_DESC_CONFIG_ATT_REMOTE_WAKEUP, 100)

#define TUD_CONFIG_DESCRIPTOR(config_num, _itfcount, _stridx, _total_len, _attribute, _power_ma) \
  9, TUSB_DESC_CONFIGURATION, U16_TO_U8S_LE(_total_len), _itfcount, config_num, _stridx, TU_BIT(7) | _attribute, (_power_ma)/2
```
* bLength: 字节数大小为9，默认
* wTotalLength：配置描述符+(接口描述符+HID描述符+端点描述符)*接口数。其中端点描述符的大小为7,接口描述符的大小为9,HID描述符的大小为9
* bmAttributes： 在协议栈里面第7位一直是1,所以TU_BIT(7),此外TUSB_DESC_CONFIG_ATT_REMOTE_WAKEUP为TU_BIT(5),表示支持唤醒。TU_BIT表示把哪一个位置起来

其中一个配置描述符可以有多个接口描述符，一个接口描述符又可以有多个端点描述符.
![](src/usb_descriptor.png)

所以我们看到在配置描述符后面又加了其他描述符。我们也可以参考[stm32配置](https://www.iotword.com/12954.html)
```c
static const uint8_t hid_configuration_descriptor[] = {
    // Configuration number, interface count, string index, total length, attribute, power in mA
    //配置描述符
    TUD_CONFIG_DESCRIPTOR(1, 1, 0, TUSB_DESC_TOTAL_LEN, TUSB_DESC_CONFIG_ATT_REMOTE_WAKEUP, 100),

    // Interface number, string index, boot protocol, report descriptor len, EP In address, size & polling interval
    TUD_HID_DESCRIPTOR(0, 4, false, sizeof(hid_report_descriptor), 0x81, 16, 10),
};
```
### 字符串描述符

hid example中的例子是
```c
const char* hid_string_descriptor[5] = {
    // array of pointer to string descriptors
    (char[]){0x09, 0x04},  // 0: is supported language is English (0x0409)
    "TinyUSB",             // 1: Manufacturer
    "TinyUSB Device",      // 2: Product
    "123456",              // 3: Serials, should use chip ID
    "Example HID interface",  // 4: HID
};
```
为什么要这么写，可以参考esp_tinyusb源代码
```c
const char *descriptor_str_kconfig[] = {
    // array of pointer to string descriptors
    (char[]){0x09, 0x04},                // 0: is supported language is English (0x0409)
    CONFIG_TINYUSB_DESC_MANUFACTURER_STRING, // 1: Manufacturer
    CONFIG_TINYUSB_DESC_PRODUCT_STRING,      // 2: Product
    CONFIG_TINYUSB_DESC_SERIAL_STRING,       // 3: Serials, should use chip ID

#if CONFIG_TINYUSB_CDC_ENABLED
    CONFIG_TINYUSB_DESC_CDC_STRING,          // 4: CDC Interface
#else
    "",
#endif

#if CONFIG_TINYUSB_MSC_ENABLED
    CONFIG_TINYUSB_DESC_MSC_STRING,          // 5: MSC Interface
#else
    "",
#endif

#if CONFIG_TINYUSB_NET_MODE_ECM_RNDIS || CONFIG_TINYUSB_NET_MODE_NCM
    "USB net",                               // 6. NET Interface
    "",                                      // 7. MAC
#endif
    NULL                                     // NULL: Must be last. Indicates end of array
};
```


### HID描述符



## Ref
https://www.cnblogs.com/AlwaysOnLines/p/3848461.html