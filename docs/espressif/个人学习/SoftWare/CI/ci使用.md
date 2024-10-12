# CI使用

## 1.代码不想被格式化

在PATCH补丁场景下，如果PATCH被格式化，将导致补丁失效。

对于IOT-SOLUTION而言：

```shell
tools/ci/astyle-rules.yml
```

![](./src/patch不格式化.png)