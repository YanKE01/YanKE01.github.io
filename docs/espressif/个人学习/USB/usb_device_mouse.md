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
   HID_USAGE_PAGE(HID_USAGE_PAGE_DESKTOP),            /*!< 选择通用桌面控制 */
    HID_USAGE(HID_USAGE_DESKTOP_MOUSE),                /*!< 选择鼠标 */
    HID_COLLECTION(HID_COLLECTION_APPLICATION),        /*!< 创建一个功能集合 */
    HID_REPORT_ID(HID_ITF_PROTOCOL_MOUSE)
    HID_USAGE(HID_USAGE_DESKTOP_POINTER),              /*!< 选择指针*/
    HID_COLLECTION(HID_COLLECTION_PHYSICAL),           /*!< 创建数据集合 */
    // 设置按键
    HID_USAGE_PAGE(HID_USAGE_PAGE_BUTTON),             /*!< 开始设置鼠标上的按键 */
    HID_USAGE_MIN(1),
    HID_USAGE_MAX(3),                                  /*!< 一共设置了三个按键，分别是左右中 */
    HID_LOGICAL_MIN(0),
    HID_LOGICAL_MAX(1),                                /*!< 按键的数据范围只有0和1 */
    HID_REPORT_COUNT(3),                               /*!< 这里一共三个usage，就是之前对应和三个按键 */
    HID_REPORT_SIZE(1),                                /*!< 这里指的是每一个usage的大小，因为只有0和1，所以只占1位 */
    HID_INPUT(HID_DATA | HID_VARIABLE | HID_ABSOLUTE), /*!< 数据类型 */
    HID_REPORT_COUNT(1),
    HID_REPORT_SIZE(5),                                /*!< 前面三个按键一共三个bit，我们要凑一个字节 */
    HID_INPUT(HID_CONSTANT),                           /*!< 这里的数据类型随便 */
    // 设置x和y轴
    HID_USAGE_PAGE(HID_USAGE_PAGE_DESKTOP),
    HID_USAGE(HID_USAGE_DESKTOP_X),
    HID_USAGE(HID_USAGE_DESKTOP_Y),                    /*!< 一共设置了x和y轴 */
    HID_LOGICAL_MIN(0x81),
    HID_LOGICAL_MAX(0x7f),                             /*!< 这里设置了x轴和y轴的范围：-127到128 */
    HID_REPORT_COUNT(2),                               /*!< 只有两个usage */
    HID_REPORT_SIZE(8),                                /*!< 每一个usage的大小为一个字节 */
    HID_INPUT(HID_DATA | HID_VARIABLE | HID_RELATIVE), /*!< 鼠标移动是相对的 */
    HID_COLLECTION_END,
    HID_COLLECTION_END
```
这个报告ID一定要加HID_REPORT_ID(HID_ITF_PROTOCOL_MOUSE)，不然底层不能区分
其次，我们这里只是上报了三个数据：按键、X轴与Y轴，所以在最后的数据上传时，上报的数组为三个
```c
bool tud_mouse_report(int8_t x,int8_t y)
{
    int8_t data[3] = {0X00, x, y};
    return tud_hid_report(HID_ITF_PROTOCOL_MOUSE,data,sizeof(data));
}
```


### 完整的配置描述符
```c
static const uint8_t hid_configuration_descriptor[] = {

    //配置描述符
    0x09,                                         /*!< config:blength */
    0x02,                                         /*!< config:bdescriptorType */
    U16_TO_U8S_LE(9 + 1 * (9 + 9 + 7)),           /*!< config:wTotalLength, 所有描述符大小和=配置描述符大小+hid接口数*(接口描述符+HID描述符+端点描述符) */
    1,                                            /*!< config:bNumInterfaces,只有一个接口描述符 */
    1,                                            /*!< config:bConfigurationValue,只有一个配置描述符 */
    0,                                            /*!< config:iConfiguration,只有1个配置描述符，所以索引为0 */
    0xA0,                                         /*!< config:bmAttributes,供电模式，10100000,支持远程唤醒 */
    0x32,                                         /*!< config:maxpower,设置的为需要100ma，所以填的50 */

    //接口描述符
    0x09,                                         /*!< interface:blength 描述符长度*/
    0x04,                                         /*!< interface:bDescriptorType 描述符类型*/
    0x00,                                         /*!< interface:bInterfaceNumber 接口编号,从0开始递增*/
    0x00,                                         /*!< interface:bAlternateSetting 备用接口编号，很少用，设置为0*/
    0x01,                                         /*!< interface:bNumEndpoints 端点数 */
    0x03,                                         /*!< interface:bInterfaceClass 接口类型，HID为3 */
    0x00,                                         /*!< interface:bInterfaceSubClass 子类型 0表示为未定义 */
    0x00,                                         /*!< interface:bInterfaceProtocol */
    0x00,                                         /*!< interface:iInterface 接口字符串索引值，0表示无字符串 */

    //HID描述符
    0x09,                                         /*!< HID描述符长度 */
    0X21,                                         /*!< 描述符类型: HID */
    U16_TO_U8S_LE(0x0110),                        /*!< HID描述符规范码  */
    0x00,                                         /*!< HID描述符：硬件国家码，0表示不说明 */
    0x01,                                         /*!< HID描述符：类别描述符个数，至少一个 */
    0x22,                                         /*!< HID描述符：描述符类型，这里是报表 */
    U16_TO_U8S_LE(sizeof(hid_report_descriptor)), /*!< HID描述符：报表描述符总长度 */

    //端点描述符
    0x07,                                         /*!< 端点描述符：长度 */
    0x05,                                         /*!< 端点描述符：描述符类型为0x05 */
    0x81,                                         /*!< 端点描述符：端点地址，0x81=10000001,第7位为1表示输入，一个端点，多以d0-d3为1 */
    0x03,                                         /*!< 端点描述符：端点属性，中断传输，00000011 */
    U16_TO_U8S_LE(16),                            /*!< 端点描述符：最大包长度 */
    10,                                           /*!< 端点描述符：端点查询时间 */

};
```


### 工程源代码
```c
/*
 * SPDX-FileCopyrightText: 2022-2023 Espressif Systems (Shanghai) CO LTD
 *
 * SPDX-License-Identifier: Unlicense OR CC0-1.0
 */

#include <stdlib.h>
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "tinyusb.h"
#include "class/hid/hid_device.h"
#include "driver/gpio.h"

#define APP_BUTTON (GPIO_NUM_0) // Use BOOT signal by default
static const char *TAG = "example";

/**
 * @brief 设置鼠标的报告描述符
 *
 */
const uint8_t hid_report_descriptor[] = {
    HID_USAGE_PAGE(HID_USAGE_PAGE_DESKTOP),            /*!< 选择通用桌面控制 */
    HID_USAGE(HID_USAGE_DESKTOP_MOUSE),                /*!< 选择鼠标 */
    HID_COLLECTION(HID_COLLECTION_APPLICATION),        /*!< 创建一个功能集合 */
    HID_REPORT_ID(HID_ITF_PROTOCOL_MOUSE)
    HID_USAGE(HID_USAGE_DESKTOP_POINTER),              /*!< 选择指针*/
    HID_COLLECTION(HID_COLLECTION_PHYSICAL),           /*!< 创建数据集合 */
    // 设置按键
    HID_USAGE_PAGE(HID_USAGE_PAGE_BUTTON),             /*!< 开始设置鼠标上的按键 */
    HID_USAGE_MIN(1),
    HID_USAGE_MAX(3),                                  /*!< 一共设置了三个按键，分别是左右中 */
    HID_LOGICAL_MIN(0),
    HID_LOGICAL_MAX(1),                                /*!< 按键的数据范围只有0和1 */
    HID_REPORT_COUNT(3),                               /*!< 这里一共三个usage，就是之前对应和三个按键 */
    HID_REPORT_SIZE(1),                                /*!< 这里指的是每一个usage的大小，因为只有0和1，所以只占1位 */
    HID_INPUT(HID_DATA | HID_VARIABLE | HID_ABSOLUTE), /*!< 数据类型 */
    HID_REPORT_COUNT(1),
    HID_REPORT_SIZE(5),                                /*!< 前面三个按键一共三个bit，我们要凑一个字节 */
    HID_INPUT(HID_CONSTANT),                           /*!< 这里的数据类型随便 */
    // 设置x和y轴
    HID_USAGE_PAGE(HID_USAGE_PAGE_DESKTOP),
    HID_USAGE(HID_USAGE_DESKTOP_X),
    HID_USAGE(HID_USAGE_DESKTOP_Y),                    /*!< 一共设置了x和y轴 */
    HID_LOGICAL_MIN(0x81),
    HID_LOGICAL_MAX(0x7f),                             /*!< 这里设置了x轴和y轴的范围：-127到128 */
    HID_REPORT_COUNT(2),                               /*!< 只有两个usage */
    HID_REPORT_SIZE(8),                                /*!< 每一个usage的大小为一个字节 */
    HID_INPUT(HID_DATA | HID_VARIABLE | HID_RELATIVE), /*!< 鼠标移动是相对的 */
    HID_COLLECTION_END,
    HID_COLLECTION_END
   // TUD_HID_REPORT_DESC_MOUSE(HID_REPORT_ID(HID_ITF_PROTOCOL_MOUSE)),
};

/**
 * @brief String descriptor
 */
const char *hid_string_descriptor[5] = {
    // array of pointer to string descriptors
    (char[]){0x09, 0x04},   /*!< support language is english */
    "TinyUSB",              /*!< manufacturer */  
    "TinyUSB Device",       /*!< product */ 
    "123456",               /*!< chip id */  
    "Example HID interface",
};

static const uint8_t hid_configuration_descriptor[] = {

    //配置描述符
    0x09,                                         /*!< config:blength */
    0x02,                                         /*!< config:bdescriptorType */
    U16_TO_U8S_LE(9 + 1 * (9 + 9 + 7)),           /*!< config:wTotalLength, 所有描述符大小和=配置描述符大小+hid接口数*(接口描述符+HID描述符+端点描述符) */
    1,                                            /*!< config:bNumInterfaces,只有一个接口描述符 */
    1,                                            /*!< config:bConfigurationValue,只有一个配置描述符 */
    0,                                            /*!< config:iConfiguration,只有1个配置描述符，所以索引为0 */
    0xA0,                                         /*!< config:bmAttributes,供电模式，10100000,支持远程唤醒 */
    0x32,                                         /*!< config:maxpower,设置的为需要100ma，所以填的50 */

    //接口描述符
    0x09,                                         /*!< interface:blength 描述符长度*/
    0x04,                                         /*!< interface:bDescriptorType 描述符类型*/
    0x00,                                         /*!< interface:bInterfaceNumber 接口编号,从0开始递增*/
    0x00,                                         /*!< interface:bAlternateSetting 备用接口编号，很少用，设置为0*/
    0x01,                                         /*!< interface:bNumEndpoints 端点数 */
    0x03,                                         /*!< interface:bInterfaceClass 接口类型，HID为3 */
    0x00,                                         /*!< interface:bInterfaceSubClass 子类型 0表示为未定义 */
    0x00,                                         /*!< interface:bInterfaceProtocol */
    0x00,                                         /*!< interface:iInterface 接口字符串索引值，0表示无字符串 */

    //HID描述符
    0x09,                                         /*!< HID描述符长度 */
    0X21,                                         /*!< 描述符类型: HID */
    U16_TO_U8S_LE(0x0110),                        /*!< HID描述符规范码  */
    0x00,                                         /*!< HID描述符：硬件国家码，0表示不说明 */
    0x01,                                         /*!< HID描述符：类别描述符个数，至少一个 */
    0x22,                                         /*!< HID描述符：描述符类型，这里是报表 */
    U16_TO_U8S_LE(sizeof(hid_report_descriptor)), /*!< HID描述符：报表描述符总长度 */

    //端点描述符
    0x07,                                         /*!< 端点描述符：长度 */
    0x05,                                         /*!< 端点描述符：描述符类型为0x05 */
    0x81,                                         /*!< 端点描述符：端点地址，0x81=10000001,第7位为1表示输入，一个端点，多以d0-d3为1 */
    0x03,                                         /*!< 端点描述符：端点属性，中断传输，00000011 */
    U16_TO_U8S_LE(16),                            /*!< 端点描述符：最大包长度 */
    10,                                           /*!< 端点描述符：端点查询时间 */

};

uint8_t const *tud_hid_descriptor_report_cb(uint8_t instance)
{
    return hid_report_descriptor;
}

uint16_t tud_hid_get_report_cb(uint8_t instance, uint8_t report_id, hid_report_type_t report_type, uint8_t *buffer, uint16_t reqlen)
{
    (void)instance;
    (void)report_id;
    (void)report_type;
    (void)buffer;
    (void)reqlen;

    return 0;
}

void tud_hid_set_report_cb(uint8_t instance, uint8_t report_id, hid_report_type_t report_type, uint8_t const *buffer, uint16_t bufsize)
{
}


typedef enum
{
    MOUSE_DIR_RIGHT,
    MOUSE_DIR_DOWN,
    MOUSE_DIR_LEFT,
    MOUSE_DIR_UP,
    MOUSE_DIR_MAX,
} mouse_dir_t;

#define DISTANCE_MAX 125
#define DELTA_SCALAR 5

static void mouse_draw_square_next_delta(int8_t *delta_x_ret, int8_t *delta_y_ret)
{
    static mouse_dir_t cur_dir = MOUSE_DIR_RIGHT;
    static uint32_t distance = 0;

    // Calculate next delta
    if (cur_dir == MOUSE_DIR_RIGHT)
    {
        *delta_x_ret = DELTA_SCALAR;
        *delta_y_ret = 0;
    }
    else if (cur_dir == MOUSE_DIR_DOWN)
    {
        *delta_x_ret = 0;
        *delta_y_ret = DELTA_SCALAR;
    }
    else if (cur_dir == MOUSE_DIR_LEFT)
    {
        *delta_x_ret = -DELTA_SCALAR;
        *delta_y_ret = 0;
    }
    else if (cur_dir == MOUSE_DIR_UP)
    {
        *delta_x_ret = 0;
        *delta_y_ret = -DELTA_SCALAR;
    }

    // Update cumulative distance for current direction
    distance += DELTA_SCALAR;
    // Check if we need to change direction
    if (distance >= DISTANCE_MAX)
    {
        distance = 0;
        cur_dir++;
        if (cur_dir == MOUSE_DIR_MAX)
        {
            cur_dir = 0;
        }
    }
}

bool tud_mouse_report(int8_t x,int8_t y)
{
    int8_t data[3] = {0X00, x, y};
    return tud_hid_report(HID_ITF_PROTOCOL_MOUSE,data,sizeof(data));
}
static void app_send_hid_demo(void)
{
    // Mouse output: Move mouse cursor in square trajectory
    ESP_LOGI(TAG, "Sending Mouse report");
    int8_t delta_x;
    int8_t delta_y;
    for (int i = 0; i < (DISTANCE_MAX / DELTA_SCALAR) * 4; i++)
    {
        mouse_draw_square_next_delta(&delta_x, &delta_y);
        tud_mouse_report(delta_x, delta_y);
        vTaskDelay(pdMS_TO_TICKS(20));
    }
}

void app_main(void)
{
    // Initialize button that will trigger HID reports
    const gpio_config_t boot_button_config = {
        .pin_bit_mask = BIT64(APP_BUTTON),
        .mode = GPIO_MODE_INPUT,
        .intr_type = GPIO_INTR_DISABLE,
        .pull_up_en = true,
        .pull_down_en = false,
    };
    ESP_ERROR_CHECK(gpio_config(&boot_button_config));

    ESP_LOGI(TAG, "USB initialization");
    const tinyusb_config_t tusb_cfg = {
        .device_descriptor = NULL,
        .string_descriptor = hid_string_descriptor,
        .string_descriptor_count = sizeof(hid_string_descriptor) / sizeof(hid_string_descriptor[0]),
        .external_phy = false,
        .configuration_descriptor = hid_configuration_descriptor,
    };

    ESP_ERROR_CHECK(tinyusb_driver_install(&tusb_cfg));
    ESP_LOGI(TAG, "USB initialization DONE");

    while (1)
    {
        if (tud_mounted())
        {
            static bool send_hid_data = true;
            if (send_hid_data)
            {
                app_send_hid_demo();
            }
            send_hid_data = !gpio_get_level(APP_BUTTON);
        }
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
```

### ref
[鼠标报告描述符](https://www.usbzh.com/article/detail-327.html)




