# USB HOST HID



### 注意事项：
1. usb_hid_host和tinyusb两个组件是不能一起用的
2. 对于ESP USB OTG这个板子，要启用UBS OTG，要设置以下引脚：
   1. 限流引脚 IDEV_LIMIT_EN(GPIO_NUM_17),需要设置为高电平
   2. 供电选择 DEV_VBUS_EN(GPIO_NUM_12)，需要设置为高电平
   3. Host/Device切换 USB_SEL(GPIO_NUM_18)，需要设置为高电平