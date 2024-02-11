# USB HID Consumer
控制播放之类的，本文直接使用tinyusb的模版，自己写的不行。。。。


### 报告描述符
```c
const uint8_t hid_device_audio_report_descriptor[] = {
    TUD_HID_REPORT_DESC_CONSUMER(HID_REPORT_ID(2)),
};
```
里面有所有的consumer之类，包括实验用的


### 配置描述符
```c
const uint8_t hid_device_audio_configuration_descriptor[] = {
    TUD_CONFIG_DESCRIPTOR(1, 1, 0, TUSB_DESC_TOTAL_LEN, TUSB_DESC_CONFIG_ATT_REMOTE_WAKEUP, 100),
    TUD_HID_DESCRIPTOR(0, 0, false, sizeof(hid_device_audio_report_descriptor), 0x81, CFG_TUD_HID_EP_BUFSIZE, 5),
};
```


### 使用
```c
bool hid_device_audio_test()
{
    uint16_t data = HID_USAGE_CONSUMER_SCAN_NEXT;
    tud_hid_report(2, &data, 2);
    vTaskDelay(10 / portTICK_PERIOD_MS);
    data = 0;

    return tud_hid_report(2, &data, 2);
}
```