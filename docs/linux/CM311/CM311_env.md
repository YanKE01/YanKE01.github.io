# 魔百盒玩机

### 1.u盘安装镜像
我安装的是这个
```
Armbian_22.11.0_Aml_s905l3a_jammy_5.15.74_server_2022.10.21.img.gz
```

### 2.armbian环境

#### openssh安装
```shell
sudo apt-get install openssh-server
```

#### 安装docker
```shell
curl -sSL https://get.docker.com | sh
```
启动docker服务
```shell
sudo systemctl enable docker
sudo systemctl start docker
```


#### 根系统扩容
```shell
armbian-tf
```


### 3.内网穿透
可以使用[cpolar](https://dashboard.cpolar.com/get-started)

参考文档：
https://www.cpolar.com/blog/linux-system-installation-cpolar

添加token后启动服务
```shell
sudo systemctl enable cpolar
sudo systemctl start cpolar
```