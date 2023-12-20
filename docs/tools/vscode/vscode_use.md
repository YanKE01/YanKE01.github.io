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
