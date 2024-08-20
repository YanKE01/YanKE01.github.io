# USB HOST MSC

做host_msc有一个组件
```
espressif/usb_host_msc
```

### 1.组件做host msc的流程

#### 1.初始化usb host
1. 配置phy
```c
usb_phy_config_t phy_config = {
    .controller = USB_PHY_CTRL_OTG,
    .target = USB_PHY_TARGET_INT, // 内部Phy
    .otg_mode = USB_OTG_MODE_HOST,
    .otg_speed = USB_PHY_SPEED_UNDEFINED, // 取决于设备速度
};
ESP_ERROR_CHECK(usb_new_phy(&phy_config, &phy_hdl));
```
2. 安装驱动
```c
const usb_host_config_t host_config = {
    .skip_phy_setup = true,
    .intr_flags = ESP_INTR_FLAG_LEVEL1,
};
ESP_ERROR_CHECK(usb_host_install(&host_config));
```
其中，我们上面手动配置了phy，所以skip_phy_setup要设置为true

3. 开启回调任务
```c
void usb_host_handle_events(void *args)
{
    uint32_t end_flags = 0;
    while (1)
    {
        uint32_t event_flags = 0;
        usb_host_lib_handle_events(portMAX_DELAY, &event_flags); // 等待事件
        if (event_flags & USB_HOST_LIB_EVENT_FLAGS_NO_CLIENTS)
        {
            // 所有客户端均被注销
            ESP_LOGI(TAG, "USB_HOST_LIB_EVENT_FLAGS_NO_CLIENTS");
            usb_host_device_free_all();
            end_flags |= 1;
        }

        if (event_flags & USB_HOST_LIB_EVENT_FLAGS_ALL_FREE)
        {
            //事件释放
            ESP_LOGI(TAG, "USB_HOST_LIB_EVENT_FLAGS_ALL_FREE");
            end_flags |= 2;
        }

        if (end_flags == 3)
        {
            xSemaphoreGive(ready_to_deinit_usb);
            break;
        }
    }
    vTaskDelete(NULL);
}
```

这里有一个好玩的操作，只有客户端被注销以及USB事件被释放后，end_flags会到3，此时直接deinit usb

### 2.msc配置

```c
const msc_host_driver_config_t msc_config = {
    .create_backround_task = true,
    .callback = usb_host_msc_event_cb,
    .stack_size = 4096,
    .task_priority = 5,
};
ESP_ERROR_CHECK(msc_host_install(&msc_config));
```

其中需要注意的就是msc的event回调，主要是通过将队列将event发送出去
```c
void usb_host_msc_event_cb(const msc_host_event_t *event, void *arg)
{
    if (event->event == MSC_DEVICE_CONNECTED)
    {
        ESP_LOGI(TAG, "MSC Device Connected"); // 设备连接
    }
    else
    {
        ESP_LOGI(TAG, "MSC Device Disconnected"); // 设备无连接
    }

    // 队列发送事件
    xQueueSend(app_queue, event, 10);
}
```


### 3.顶层task
```c
void msc_task(void *args)
{
    while (1)
    {
        // 等待设备连接
        msc_host_event_t msc_event;
        xQueueReceive(app_queue, &msc_event, portMAX_DELAY);
        if (msc_event.event == MSC_DEVICE_CONNECTED)
        {
            // 获取MSC设备地址
            uint8_t device_addr = msc_event.device.address;
            // 初始化MSC设备
            ESP_ERROR_CHECK(msc_host_install_device(device_addr, &device));
            // 挂载虚拟文件系统
            ESP_ERROR_CHECK(msc_host_vfs_register(device, "/usb", &mount_config, &vfs_handle));
            ESP_LOGI(TAG, "USB VFS Done");

            // 扫描所有文件
            DIR *dir = opendir("/usb");
            if (dir != NULL)
            {
                struct dirent *entry;
                while ((entry = readdir(dir)) != NULL)
                {
                    ESP_LOGI(TAG, "%s has file:%s", "/usb", entry->d_name);
                }
            }
            else
            {
                break;
            }
        }
        else
        {
            ESP_ERROR_CHECK(msc_host_vfs_unregister(vfs_handle));
            ESP_ERROR_CHECK(msc_host_uninstall_device(device));
        }
    }

    ESP_ERROR_CHECK(msc_host_vfs_unregister(vfs_handle));
    ESP_ERROR_CHECK(msc_host_uninstall_device(device));
    vTaskDelete(NULL);
}
```