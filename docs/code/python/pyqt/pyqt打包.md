# 打包PYQT程序

安装pyinstaller

```shell
pip install pyinstaller 
```

对于pyqt而言，我执行的py文件是 main.py

![](./src/pyqt打包.png)


```shell
pyinstaller main.py
```

执行成功后，会生成三个文件夹和一个.spec文件，.exe在dist文件夹中。


## 如何指定输出路径和图标呢

```shell
(pyqt5) PS D:\project\isp\esp-isp-tool> pyinstaller.exe --onefile --distpath D:\project\isp\esp-isp-tool-output\output --workpath D:\project\isp\esp-isp-tool-output\build --icon D:\project\isp\esp-isp-tool-output\esp.ico --name esp_isp_tool --noconsole .\main.py
```