# 01 TINA SDK环境安装

解压SDK
```shell
tar -zxvf Tina-Linux-20220815.tar.gz
cd Tina-Linux
```

安装补丁：
```shell
$ wget http://dl.mangopi.org/tina/prebuilt.tar.gz .
$ tar xzvf prebuilt.tar.gz
$ wget http://dl.mangopi.org/tina/dl.tar .
$ tar xvf dl.tar
```

安装依赖
```shell
sudo apt-get install build-essential subversion git-core libncurses5-dev zlib1g-dev gawk flex quilt libssl-dev xsltproc libxml-parser-perl mercurial bzr ecj cvs unzip lib32z1 lib32z1-dev lib32stdc++6 libstdc++6 libmpc-dev libgmp-dev -y
```

编译
```shell
source build/envsetup.sh
lunch 
make  #编译linux
mboot #编译uboot
pack #打包
```

## mbr failed

![](./src/update_mbr_failed.png)

修改分区，错误提示是boot分区

![](./src/update_mbr_failed_1.png)

![](./src/update_mbr_failed_2.png)

