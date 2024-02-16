# const与static

* rust中，const变量的值会直接嵌入到生成的机器代码中
* 常量和静态变量都是大写开头，单词之间用下划线隔开
* const的生命周期只在他自己的代码块里面

定义常量与静态变量：
```rust
static MY_STATIC: i32 = 200;

fn main() {
    //定义常量
    const SECOND_HOUR: usize = 3600; //1小时3600s
    const SECOND_DAY: usize = SECOND_HOUR * 24;
    println!("{},{}", SECOND_DAY, MY_STATIC);
}

```

静态变量一般是不可以修改的
```rust
static MY_STATIC: i32 = 200;

fn main() {
    //定义常量
    const SECOND_HOUR: usize = 3600; //1小时3600s
    const SECOND_DAY: usize = SECOND_HOUR * 24;
    println!("{},{}", SECOND_DAY, MY_STATIC);

    MY_STATIC = 100; //尝试修改
    
}
```

```shell
(base) ➜  project_01_learn git:(master) ✗ cargo build && cargo run
   Compiling project_01_learn v0.1.0 (/Users/yanke/project/rust/learn/project_01_learn)
error[E0594]: cannot assign to immutable static item `MY_STATIC`
 --> src/main.rs:9:5
  |
9 |     MY_STATIC = 100;
  |     ^^^^^^^^^^^^^^^ cannot assign

For more information about this error, try `rustc --explain E0594`.
error: could not compile `project_01_learn` (bin "project_01_learn") due to 1 previous error
```

如果要修改的话，只能放到unsafe代码里面

```rust

static MY_STATIC: i32 = 200;
static mut MY_MUT_STATIC: i32 = 1000;
fn main() {
    //定义常量
    const SECOND_HOUR: usize = 3600; //1小时3600s
    const SECOND_DAY: usize = SECOND_HOUR * 24;
    println!("{},{}", SECOND_DAY, MY_STATIC);

    unsafe {
        MY_MUT_STATIC = 100;
        println!("mut static:{}", MY_MUT_STATIC);
    }

}
```
这里要知道，如果给static加上mut，那他对变量只能放到unsafe块里面使用，如果你想正常在main的块里面用，会报错

```shell
error[E0133]: use of mutable static is unsafe and requires unsafe function or block
 --> src/main.rs:9:31
  |
9 |     println!("mut static:{}", MY_MUT_STATIC);
  |                               ^^^^^^^^^^^^^ use of mutable static
```