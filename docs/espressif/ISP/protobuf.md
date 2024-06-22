# protobuf


## 安装

```shell
brew install protobuf
brew install protobuf-c

protoc --version
```

## 初步使用

### 1.先写一个proto文件

```proto
syntax = "proto2";

message Person {
  required string name = 1;
  required int32 id = 2;
  required bytes portrait = 3;
  optional string email = 4;
}
```

其中第三个部分是存放了一个数组，上面的syntax是必要的，指定protobuf的版本

```shell
(base) ➜  protobuf protoc --c_out=. person.proto
```

### 2.写cmakelist
```cmake
cmake_minimum_required(VERSION 3.25)
project(protobuf C)

set(CMAKE_C_STANDARD 11)
set(INC_DIRS "protobuf/include")
file(GLOB SOURCES "protobuf/*.c")

find_package(PkgConfig REQUIRED)
pkg_check_modules(PROTOBUF_C REQUIRED libprotobuf-c>=1.0.0)

add_executable(protobuf main.c ${SOURCES})
include_directories(${INC_DIRS} ${PROTOBUF_C_INCLUDE_DIRS})

target_compile_options(protobuf PRIVATE ${PROTOBUF_C_CFLAGS})
target_link_libraries(protobuf PRIVATE ${PROTOBUF_C_LDFLAGS})
```

### 3.编码与解码
```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "person.pb-c.h"


int main() {
    uint8_t test_image[] = {1,2,3};

    Person p = PERSON__INIT;
    p.name = "yanke";
    p.id = 12345;
    p.email = "yanke@zjut.edu.cn";
    p.portrait.data = test_image;
    p.portrait.len = sizeof(test_image);

    // 序列化消息
    size_t len;
    uint8_t *buffer;
    len = person__get_packed_size(&p);
    buffer = malloc(len);
    person__pack(&p, buffer);

    printf("Serialized data length: %zu\n", len);

    // 反序列化消息
    Person *unpacked_person;
    unpacked_person = person__unpack(NULL, len, buffer);

    if (unpacked_person == NULL) {
        fprintf(stderr, "Error unpacking message\n");
        free(buffer);
        return 1;
    }

    printf("Name: %s\n", unpacked_person->name);
    printf("ID: %d\n", unpacked_person->id);
    if (unpacked_person->email != NULL) {
        printf("Email: %s\n", unpacked_person->email);
    } else {
        printf("Email: not set\n");
    }

    // 打印图像数据大小和内容
    printf("Image data size: %zu\n", unpacked_person->portrait.len);
    printf("Image data: ");
    for (size_t i = 0; i < unpacked_person->portrait.len; i++) {
        printf("%u ", unpacked_person->portrait.data[i]);
    }
    printf("\n");

    // 释放内存
    person__free_unpacked(unpacked_person, NULL);
    free(buffer);
    return 0;
}

```