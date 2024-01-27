# 如何使用onnx模型进行推理

### 1.安装
```shell
pip install onnxruntime
```

如果出现protobuf版本过低，从新安装
```shell
pip install protobuf==3.20.2
```


### 2.转换及推理
```python
import tflite2onnx
import keras2onnx
import onnx
import tensorflow as tf
import onnxruntime
from data.data_generate import *

if __name__ == '__main__':

    model = tf.keras.models.load_model("./log/weights-improvement-406-0.9826.h5")
    onnx_model = keras2onnx.convert_keras(model,model.name)
    onnx.save_model(onnx_model, "./log/model.onnx")

    providers = ['CPUExecutionProvider']
    test_model = onnxruntime.InferenceSession("./log/model.onnx",providers=providers)

    feature, label = DataGenerateOnehotShuffle("data/mzp_data_c10_stride1000.csv", num_class=10)
    x,y = feature[0],label[0]
    x = np.expand_dims(x, axis=0).astype("float32")
    print(x,y)

    onnx_input = {test_model.get_inputs()[0].name:x}
    outputs = test_model.run(None,onnx_input)

    print(outputs)
```