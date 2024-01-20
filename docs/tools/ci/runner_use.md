# Runner安装与初步使用

## 1.如何安装runner
打开项目，设置-CICD就可以找到Runner相关介绍
![](./src/install_runner.png)

接下来，按照提示，注册runner
```shell
gitlab-runner register  --url https://gitlab.com  --token glrt-Yyz8m6Lwz8iKy9CmoATr
```

执行如下命令即可看到runner
```shell
gitlab-runner run
```

runner出意外执行步骤：
```shell
gitlab-runner stop
gtilab-runner start
gitlab-runner run
```

## 2.基本使用

### 1.runner配置文件目录
```shell
sudo vim /etc/gitlab-runner/config.toml
```
### 2.项目指定运行的容器
查看查看项目中.gitlab-ci.yml
* tags: 指定项目用到的runner是哪一个
* image: 指定用到的容器是哪一个
注意，记得查看config.toml中是否存在你制定的runner和镜像
这里以魔百盒和idf5.1为例，我的toml配置如下:
```shell
concurrent = 1
check_interval = 0
shutdown_timeout = 0

[session_server]
  session_timeout = 1800

[[runners]]
  name = "mobaihe"
  url = "https://gitlab.com/"
  id = 31742189
  token = "glrt-TiztsxcAnXpQ_iP1sicV"
  token_obtained_at = 2024-01-19T16:07:30Z
  token_expires_at = 0001-01-01T00:00:00Z
  executor = "docker"
  [runners.cache]
    MaxUploadedArchiveSize = 0
  [runners.docker]
    tls_verify = false
    image = "espressif/idf:release-v5.1"
    privileged = false
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    disable_cache = false
    volumes = ["/cache"]
    shm_size = 0
    network_mtu = 0
```
可以看到我的这个runner叫mobaihe，用的是docker的执行器，并且指定来espressif/idf:release-v5.1镜像

我的项目中的gitlab-ci.yml文件如下：
```yml
stages:
  - build

build_job:
  stage: build
  script:
    - gcc hello.c -o hello
    - ./hello
    - rm hello
    - idf.py --help
  tags:
    - mobaihe
  image: espressif/idf:release-v5.1
```
正好与之对应。


## 常见的gitlab-runner命令
```
gitlab-runner restart 
```