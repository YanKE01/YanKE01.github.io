# esp-iot-solution文档编译

## doxygen报错提示

```shell
en/generic: Extension error (esp_docs.esp_extensions.run_doxygen):
en/generic: <function generate_doxygen at 0x7f9a15a08820> Handler 对事件 'defines-generated' 抛出了异常 (exception: [Errno 2] 没有那个文件或目录: 'doxygen')

en/generic: Build failed due to new/different warnings (/home/yanke/project/esp-iot-solution/docs/_build/en/generic/sphinx-warning-log.txt):

en/generic: Extension error (esp_docs.esp_extensions.run_doxygen):
en/generic: <function generate_doxygen at 0x7f9a15a08820> Handler 对事件 'defines-generated' 抛出了异常 (exception: [Errno 2] 没有那个文件或目录: 'doxygen')

en/generic: (Check files sphinx-known-warnings.txt and /home/yanke/project/esp-iot-solution/docs/_build/en/generic/sphinx-warning-log.txt for full details.)
```

需要apt-get install doxygen即可

```shell
(.pyenv3.10) ➜  docs git:(docs/add_bldc_debugging_docs) ✗ sudo apt-get install doxygen
```