# Vscode使用


### 1.注释对齐
插件：cursor-align
选中后，ctrl+shift+p，选择align cursor自动对其


### 2.替换注释//
ctrl+shift+p,选择snippets configure user snipprts
选择c++，添加如下配置：
```json
"C_Cpp comment": {
"scope": "c, cpp",
"prefix": ["comment","//"],
"description": "Regulatory comment",
"body": [
                "/*!< ${0} */",
    ],
}
```


### 3. remote ssh免密登入

将本地电脑的 "C:\Users\yanke\.ssh\id_rsa.pub" 上传至服务器中任意位置，执行如下指令：

```shell
cat id_rsa.pub >> authorized_keys
```

配置remote ssh插件

```shell
# Read more about SSH config files: https://linux.die.net/man/5/ssh_config
Host 192.168.31.79
    HostName 192.168.31.79
    User yanke
    IdentityFile "C:\Users\yanke\.ssh\id_rsa"
```