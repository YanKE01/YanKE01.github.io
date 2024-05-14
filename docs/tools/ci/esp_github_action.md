# github action for esp

如何使用github action编译esp项目：

### 编译所有项目

```yml
name: Build with ESP-IDF v5.1

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        idf_ver: ["release-v5.1"]
    container: espressif/idf:${{matrix.idf_ver}}
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: 'true'
      - name: build esp demos
        shell: bash
        run: |
          . ${IDF_PATH}/export.sh
          pip install idf-component-manager==1.5.2 idf-build-apps --upgrade
          idf-build-apps find -p . --recursive --target esp32s3 -vvvv
          idf-build-apps build -p . --recursive --target esp32s3 -vvvv
```