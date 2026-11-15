---
title: MicroPython 的内部机制
date: 2026-11-14
---

# MicroPython 的内部机制

MicroPython 是面向微控制器的 Python 实现。以 ESP32 为例，板上固件包含解释器和硬件适配层，Python 应用在这个运行环境里执行。

## 从源码到字节码

默认情况下，MicroPython 读取 `.py` 源码，先做词法和语法分析，再生成字节码。虚拟机逐条执行字节码。启动时执行脚本、导入源码模块和在 REPL 输入代码，都可以走这条路径。读源码时，可以从 `py/lexer.c`、`py/parse.c`、`py/compile.c` 和 `py/vm.c` 分别看这几个阶段。[MicroPython · 编译器](https://docs.micropython.org/en/latest/develop/compiler.html)

## 启动脚本和 REPL

正常启动时，运行环境初始化后依次执行存在的 `boot.py` 和 `main.py`。`boot.py` 用于启动配置，`main.py` 是应用入口。找不到 `main.py` 或脚本退出后，串口通常会进入带 `>>>` 提示符的 REPL。

脚本运行期间，串口收到 Ctrl-C 可以让解释器抛出 `KeyboardInterrupt`。若异常一路传出 `main.py`，解释器回到 REPL。脚本在 `finally` 里可以释放自己打开的资源。在交互 REPL 的空行按 Ctrl-D 会软重启，清空 Python 解释器状态并重新初始化运行环境。[MicroPython · 启动与重启](https://docs.micropython.org/en/latest/reference/reset_boot.html)

## Python 堆与垃圾回收

运行时创建的列表、字典等对象通常存放在 Python 堆里。垃圾回收采用 **标记—清除**，先从解释器能找到的引用出发标记仍可达的对象，再回收未标记的堆块。变量被覆盖或删除后，如果还有其他地方引用原对象，它仍然存活。可以用 `gc.mem_free()` 看 Python 堆的剩余空间，用 `gc.collect()` 主动触发回收。[MicroPython · 内存管理](https://docs.micropython.org/en/latest/develop/memorymgt.html)

源码模块在板上编译时，解析过程和生成的字节码都要用到 RAM。提前用 `mpy-cross` 生成 `.mpy`，可以省掉板上的编译步骤。把模块以冻结字节码编进固件，在支持的平台上还能直接从 Flash 执行这些字节码。程序运行时创建的对象仍然会占用堆空间。[MicroPython · 微控制器上的内存使用](https://docs.micropython.org/en/latest/reference/constrained.html)

## 虚拟机实例与线程

**标准 ESP32 固件只运行一个 MicroPython 解释器实例。** 源码里的 `mp_state_ctx` 保存 VM 状态和内存管理状态。虽然虚拟机的执行代码能在不同线程中使用，但这些线程仍访问同一份 VM 状态、Python 堆和已加载模块表。[MicroPython 源码 · mpstate.h](https://github.com/micropython/micropython/blob/master/py/mpstate.h) · [runtime.c](https://github.com/micropython/micropython/blob/master/py/runtime.c)

- `asyncio` 在同一解释器的事件循环里调度协程。任务在等待可挂起的操作时让出执行机会。[MicroPython · asyncio](https://docs.micropython.org/en/latest/library/asyncio.html)
- `_thread` 在 ESP32 上会创建 FreeRTOS 任务。线程有自己的栈和线程状态，共用解释器和 GC 堆。ESP32 有两个核也不会自动创建第二个实例。[MicroPython 源码 · modthread.c](https://github.com/micropython/micropython/blob/master/py/modthread.c) · [ESP32 线程实现](https://github.com/micropython/micropython/blob/master/ports/esp32/mpthreadport.c)
- 软重启是在同一个运行位置清理并重新初始化解释器。在 ESP32 移植代码的软重启路径上，可以看到重新调用 `gc_init()` 和 `mp_init()`。[MicroPython 源码 · ESP32 启动流程](https://github.com/micropython/micropython/blob/master/ports/esp32/main.c)

在 Linux 上，可以用多个 MicroPython 进程各自持有一份运行时。要在同一块 ESP32 上同时运行多个独立实例，则需要定制移植，把全局运行时状态、GC 堆、模块表和回调归属改成按实例管理。文件系统、串口和 GPIO 等资源也需要明确归属，因为它们仍然由同一块硬件提供。标准固件没有创建第二个独立实例的 API。[MicroPython · 移植指南](https://docs.micropython.org/en/latest/develop/porting.html) · [MicroPython 源码 · mpstate.h](https://github.com/micropython/micropython/blob/master/py/mpstate.h)
