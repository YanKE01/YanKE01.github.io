# 如何使用NCNN

```cmake
cmake_minimum_required(VERSION 3.2.0)
project(ncnn_test)

FIND_PACKAGE(OpenMP REQUIRED)  
if(OPENMP_FOUND)  
    message("OPENMP FOUND")  
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${OpenMP_C_FLAGS}")  
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${OpenMP_CXX_FLAGS}")  
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${OpenMP_EXE_LINKER_FLAGS}")  
endif()

include_directories(/home/pi/ncnn/build/install/include/ncnn)
link_directories(/home/pi/ncnn/build/install/lib)

add_executable(ncnn_test main.cpp)

target_link_libraries(ncnn_test ncnn /home/pi/ncnn/build/install/lib/libncnn.a)
```


### 将install的bin拷贝到系统中
```shell
pi@raspberrypi:~/tfam1dcnn $ sudo cp /home/pi/ncnn/build/install/bin/ncnn2mem /usr/local/bin/
pi@raspberrypi:~/tfam1dcnn $ source ~/.bashrc 

pi@raspberrypi:~/tfam1dcnn/ncnn $ onnx2ncnn model.onnx model.parm model.bin
```