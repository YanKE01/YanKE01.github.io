# TFLite Micro Regression
使用tflite进行回归模型推理
参考tflite_micro官网例子：[hello world](https://github.com/tensorflow/tflite-micro/tree/main/tensorflow/lite/micro/examples/hello_world)
在原有例子的基础上，省去了输入与输出的int8处理，直接支持浮点

### 1.模型搭建
```python

import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Flatten
import matplotlib.pyplot as plt
import math
from sklearn.model_selection import train_test_split

#生成数据集
x_values = np.arange(0,2*math.pi,0.001)
np.random.shuffle(x_values)
y_values = np.sin(x_values)
y_values += 0.1 * np.random.randn(*y_values.shape)
x_train,x_test,y_train,y_test = train_test_split(x_values,y_values,test_size=0.3)
plt.plot(x_values, y_values, 'b.')
plt.show()

#创建模型
model = tf.keras.Sequential()
model.add(Dense(32, activation='relu', input_shape=(1,)))
model.add(Dense(16, activation='relu'))
model.add(Dense(1,activation='linear'))

print(model.summary())

#模型训练
model.compile(optimizer='adam', loss='mse', metrics=['mae'])
model.fit(x_train, y_train, epochs=100, batch_size=128, validation_data=(x_test, y_test))

#模型预测
x_test = np.array(0.5*math.pi).astype('float32').reshape(1,1)
print(model.predict(x_test))

#模型量化
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
tflite_model = converter.convert()
open("sine_model_quantized.tflite", "wb").write(tflite_model)

#使用tflite推理
x = np.array(0.5*math.pi).astype('float32').reshape(1,1)

interpreter = tf.lite.Interpreter(model_path="sine_model_quantized.tflite")
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()


interpreter.resize_tensor_input(input_details[0]['index'], x.shape)
interpreter.allocate_tensors()

interpreter.set_tensor(input_details[0]['index'], x)
interpreter.invoke()
output_data = interpreter.get_tensor(output_details[0]['index'])

print(output_data)
```

模型转换
```shell
!apt-get -qq install xxd
!xxd -i sine_model_quantized.tflite > sine_model_quantized.cc
```

### 2.ESP32部署
https://github.com/espressif/esp-tflite-micro

#### 添加组件
```shell
idf.py add-dependency "esp-tflite-micro"
```


#### 添加模型文件
将mnist.cc文件的数组添加到工程中，这里文件名就不改了，内部数组的值需要改动
```shell
main
├── CMakeLists.txt
├── idf_component.yml
├── include
│   └── mnist.h
├── main.cc
└── mnist.cc
```

修改主函数
```c++
#include <stdio.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include "esp_log.h"
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/system_setup.h"
#include "tensorflow/lite/schema/schema_generated.h"
#include "mnist.h"

static const char *TAG = "TFLITE";
constexpr int kTensorArenaSize = 10240;
uint8_t tensor_arena[kTensorArenaSize];

extern "C" void app_main(void)
{
    tflite::MicroInterpreter *interpreter = nullptr;
    TfLiteTensor *input = nullptr;
    TfLiteTensor *output = nullptr;

    const tflite::Model *model = tflite::GetModel(mnist_tflite);
    if (model->version() != TFLITE_SCHEMA_VERSION)
    {
        MicroPrintf("Model provided is schema version %d not equal to supported "
                    "version %d.",
                    model->version(), TFLITE_SCHEMA_VERSION);
        return;
    }

    static tflite::MicroMutableOpResolver<1> resolver;
    //只需要加入一个全连接层就可以了
    if (resolver.AddFullyConnected() != kTfLiteOk)
    {
        ESP_LOGI(TAG, "Add reshape failed");
        return;
    }

    // Create interpreter
    static tflite::MicroInterpreter static_interpreter(model, resolver, tensor_arena, kTensorArenaSize);
    interpreter = &static_interpreter;

    // Allocate memory for model tensor
    TfLiteStatus allocate_status = interpreter->AllocateTensors();
    if (allocate_status != kTfLiteOk)
    {
        MicroPrintf("AllocateTensors() failed");
        return;
    }

    input = interpreter->input(0);
    output = interpreter->output(0);

    while (1)
    {

        input->data.f[0] = 1.570f; //推理0.5*pi
        TfLiteStatus invoke_status = interpreter->Invoke();
        if (invoke_status != kTfLiteOk)
        {
            MicroPrintf("Invoke failed on");
            return;
        }
        printf("result:%.2f\n", output->data.f[0]);

        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }
}
```

### 项目代码
[regression](src/idf_regression.ipynb)
