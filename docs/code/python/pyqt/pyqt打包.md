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
