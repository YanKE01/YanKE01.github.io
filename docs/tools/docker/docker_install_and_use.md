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

### 2.docker使用
docker进行可以从docker hub寻找。
这里以espressif的docker镜像为例
```
docker pull espressif/idf:release-v5.2
```

查看已安装的docker镜像
```shell
docker images
```

查看运行的容器
```shell
docker ps -a
```

关闭容器
```shll
docker stop <容器ID>
```

启动
```shell
docker start <停掉的容器ID>
```



### 其他

#### 1.权限报错
```shell
permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Post "http://%2Fvar%2Frun%2Fdocker.sock/v1.24/images/create?fromImage=espressif%2Fidf&tag=release-v5.2": dial unix /var/run/docker.sock: connect: permission denied
```

```shell
sudo chmod 666 /var/run/docker.sock
```