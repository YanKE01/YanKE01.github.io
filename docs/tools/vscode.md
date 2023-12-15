<!--
 * @Author: yanke yanke2@espressif.com
 * @Date: 2023-12-15 17:00:07
 * @LastEditors: yanke yanke2@espressif.com
 * @LastEditTime: 2023-12-15 18:02:37
 * @FilePath: /YanKE01.github.io/docs/tools/vscode.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
# Vscode


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
