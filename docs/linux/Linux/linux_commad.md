# Linux指令

### 1.chmod
文件用户：
* u：user用户
* g：group 组，一个组有多个用户
* o：other 其他

文件权限：
* 读：r，4
* 写：w，2
* 执行：x，1
这里的数字是可以叠加的，比如读+写=4+2=6

我们可以用ll命令来看
```shell
(base) ➜  my-website git:(master) ✗ ll a.txt      
-rw-r--r--  1 yanke  staff     0B  3 13 00:20 a.txt
```
第一个-代表是一个普通文件
* 对于user而言：是rw-
* 对于group而言是 r--
* 对于other而言是 r--

我们可以用下面的指令给user执行的权限

```shell
(base) ➜  my-website git:(master) ✗ chmod u+rwx a.txt 
(base) ➜  my-website git:(master) ✗ ll a.txt
-rwxr--r--  1 yanke  staff     0B  3 13 00:20 a.txt
```

当然，我们之前看到的chmod 777 a.txt，就是赋给u、g和o为rwx权限