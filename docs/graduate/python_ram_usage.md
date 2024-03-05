# 使用python获取程序ram使用情况

## 1.环境配置
```shell
pip install memory_profiler
```

## 2.基本使用

### 2.1 修饰使用
```shell
from memory_profiler import profile

@profile()
def single_predict(x,model):
    result = model.predict(x)
    print(result)

if __name__ == '__main__':
    feature, label = DataGenerateOnehotShuffle("data/mzp_data_c10_stride1000.csv", num_class=10)
    pid = os.getpid()
    process = psutil.Process(pid)
    model = tf.keras.models.load_model("log/2048_model/weights-improvement-606-0.9876.h5")

    x,y = feature[0],label[0]
    x = np.expand_dims(x, axis=0)
    single_predict(x,model)
```

### 2.2 命令行
```shell
mprof run predict.py
mprof plot mprofile_20240305162813.dat
```

在dat文件中，第一列为RAM，第二列为时间戳