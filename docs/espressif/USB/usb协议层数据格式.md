# USB协议层数据格式（事务、包、域）

## 1.Host想要读写设备时，如何知道该访问哪一个device呢？
![](./src/usb数据传输格式.png)

* SOP:起始信号，属于域
* SYNC:同步信号，属于域
* PID:包的ID，用于指定传输数据包的类型（含有方向、包的类型）

PID的组成如下：
![](./src/usb数据传输_pid格式.png)

![](./src/usb数据传输_pid类型.png)