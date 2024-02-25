# Docker安装与使用


### 安装docker
基于ubuntu20.04版本安装

ref [docker](https://docs.docker.com/engine/install/ubuntu/)

```shell

# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

```

##### 树莓派安装docker
安装步骤和官网的debian系统保持一致
https://docs.docker.com/engine/install/debian/

1.卸载冲突
```shell
 for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do sudo apt-get remove $pkg; done
```

2.添加docker的源
```shell
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```

3.安装docker
```shell
 sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```


### 2.docker基本使用
docker进行可以从docker hub寻找。
这里以espressif的docker镜像为例
```
docker pull espressif/idf:release-v5.2
```

运行images
```shell
docker run [OPTIONS] IMAGE[:TAG|@DIGEST] [COMMAND] [ARG...]

//如果我们想要交互的话
docker run -it ubuntu /bin/bash
```

当我们通过it进入终端后，想要退出，让容器在后台执行，先按下ctrl+p,在按下ctrl+q

查看已安装的docker镜像
```shell
docker images
```

查看运行的容器
```shell
docker ps -a
```

关闭容器
```shell
docker stop <容器ID>
```

启动
```shell
docker start <停掉的容器ID>
```

### 3.docker换源
```shell
cd /etc/docker
vim daemon.json
```
添加如下内容，有可能会不存在这个json，但是没关系
```txt
{
  "registry-mirrors": [
    "https://hub-mirror.c.163.com",
    "https://ustc-edu-cn.mirror.aliyuncs.com",
    "https://ghcr.io",
    "https://mirror.baidubce.com"
  ]
}
```
重启docker服务
```shell
service docker restart
```

执行指令就可以看到是否添加源
```shell
docker info
```


### 其他

#### 1.权限报错
```shell
permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Post "http://%2Fvar%2Frun%2Fdocker.sock/v1.24/images/create?fromImage=espressif%2Fidf&tag=release-v5.2": dial unix /var/run/docker.sock: connect: permission denied
```

```shell
sudo chmod 777 /var/run/docker.sock
```