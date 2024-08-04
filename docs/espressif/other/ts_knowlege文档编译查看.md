# TS_Knowledge文档编译查看

首先需要编译ts_knowledge文档，参考：docs/build_example.sh

```shell
build-docs build
```

为了方便ssh主机查看，需要开启80端口

``` shell
(.pyenv3.10) ➜  docs git:(add/add_bldc_solution) ✗ python3 -m http.server 8000 --directory _build/zh_CN/generic/html 
```

这样，我们在主机访问linux主机地址即可查看：

```shell
http://localhost:8000/
```