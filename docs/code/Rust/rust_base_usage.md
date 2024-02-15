# RUST基本配置及使用


## 基本命令

```shell
rustup update #更新rust
rustup self uninstall #卸载
rustup --version #查看版本
```

#### 工程创建及编译
```shell
cargo new project_name #创建工程
cargo build #构建项目
cargo check #检测
cargo run / cargo test #运行与测试
```

#### 加载第三方库，和idf的组件管理器很相似
https://crates.io/

以rand为例
```shell
cargo add rand
```

```rust
use rand::prelude::*;

fn main() {
    let test_var: u8 = random();
    println!("Hello, world {}", test_var);
}

```