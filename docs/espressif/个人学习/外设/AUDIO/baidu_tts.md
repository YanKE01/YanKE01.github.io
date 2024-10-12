# 百度语音合成

```python
import requests
import pygame
from io import BytesIO
from urllib.parse import quote

# 初始化pygame
pygame.init()

# 设置音频参数
BUFFER_SIZE = 1024
BIT_RATE = 16
CHANNELS = 1
FREQUENCY = 16000

# 创建音频输出
pygame.mixer.init(FREQUENCY, BIT_RATE, CHANNELS)

text = quote("天下第一，盲审必过")

# HTTP请求的相关信息
url = "https://tsn.baidu.com/text2audio"
payload = 'tex='+text+'&tok=24.d0bb79195bdcb0a12ef9b34b684a8822.2592000.1715321592.282335-60592936&cuid=v2xhnwFN6Mnmg6vN5TV1Qitp4RpyOaIk&ctp=1&lan=zh&spd=5&pit=5&vol=5&per=4&aue=3'

headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': '*/*'
}

# 发送HTTP请求获取音频数据
response = requests.request("POST", url, headers=headers, data=payload)

# 检查是否成功获取音频数据
if response.status_code == 200:
    # 创建音频对象
    sound = pygame.mixer.Sound(BytesIO(response.content))

    # 播放音频
    sound.play()

    # 等待音频播放完成
    while pygame.mixer.get_busy():
        pygame.time.Clock().tick(10)

else:
    print("Failed to get audio data:", response.status_code)
```