# 树莓派安装docker

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


4.docker容器换源

```shell
sudo nano /etc/docker/daemon.json
```

添加如下内容：

```shell
{
  "registry-mirrors": ["https://registry.docker-cn.com"]
}
```

## docker图形化工具安装

```shell
docker pull portainer/portainer:latest

docker run -d -p 9000:9000 --name portainer --restart=always -e TZ="Asia/Shanghai" -v /var/run/docker.sock:/var/run/docker.sock portainer/portainer
```
