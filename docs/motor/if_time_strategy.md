# 基于时间的开环强托策略


### IF启动中的theta角度
为了满足park与anti-park的角度需求，我们这里是人为造了一个角度。在实际的IF启动中，我们会对常数进行积分，得到omega，然后在积分一次，得到theta角度。做两次积分主要是保障升速用的。对于一些低转速的电机，这个常数c不要超过100

### 转子预定位及启动
1. $i_{d}$=0，设定$i_{q}$=$i_{q}^{*}$
2. 另$i_{q}$=$i_{q}^{*}$的同时，保持一段时间
3. 设定常数c,让常数c积分得到omega，在积分得到$\theta$

### 基于时间的切换补偿
升速的过程由常量C控制，电机在IF工况下速度达到15%~20%，此时切换带来的负面影响最小。在IF运行至观测器收敛后，一般2s到3s就足够了。同时，在切换前0.1s内的任意时刻，记录dq轴的q轴电流值：
$$
q_{real} = iq \times cos(\hat{\theta _{e}} -\theta _{e}^{*} )
$$
其中$\hat{\theta _{e}}$是观测器的值，$\theta _{e}^{*}$是IF的值


当达到切换时间时，IF输出的$\theta^{*}$到观测器输出的$\hat{\theta}$在切换的时候，我们使用惯性环节去做：$\frac{1}{Tc*s+1}$

假设这里我们的关系环节是 $\frac{1}{0.01*s+1} (\hat{\theta}-\theta_{e}^{*})$，我们可以使用matlab进行离散化
```matlab
sys=tf(1,[0.01 1])
zh = c2d(sys,0.0001,'zoh') %我们系统是10k
[num,den]=tfdata(zh,'v')
```
如果出现tf未定义，安装control system 工具箱即可
解释一下下面这个代码：
```matlab
theta_comp = 0.009950166250832*last_error + 0.990049833749168*last_comp; 
```
首先根据公式
$$
\theta_{comp} = \frac{1}{Tc*s+1} (\hat{\theta}-\theta_{e}^{*})
$$
在角度切换的IF，TC选为0.01
运行如下代码在matlab中
```matlab
>> sys=tf(1,[0.01 1])
zh = c2d(sys,0.0001,'zoh') %我们系统是10k
[num,den]=tfdata(zh,'v')

sys =
 
      1
  ----------
  0.01 s + 1
 
连续时间传递函数。
模型属性

zh =
 
  0.00995
  --------
  z - 0.99
 
采样时间: 0.0001 seconds
离散时间传递函数。
模型属性
```

我们定义$\theta_{err}=(\hat{\theta}-\theta_{e}^{*})$，根据惯性环境的公式
$$
\frac{\theta_{comp}}{\theta_{err}} = \frac{0.00995}{z-0.99}
$$

$$
\frac{\theta_{comp}}{\theta_{err}} = \frac{0.00995*z^{-1}}{1-0.99* z^{-1}}
$$

$$
\theta_{comp} - 0.99*z^{-1}*\theta_{comp} = 0.00995* z^{-1}*\theta_{err}
$$

$$
\theta_{comp}(k) - 0.99*\theta_{comp}(k-1)=0.00995*\theta_{err}(k-1)
$$

$$
\theta_{comp}(k)=0.00995*\theta_{err}(k-1)+0.99*\theta_{comp}
$$

在电流环节IF切换的惯性环节，要合理考虑TC，让切换在下半部
![](./src/if_current_switch.png)


此外，在电流切换依旧有惯性环节
```matlab
Iq = 0.059411936635658*real_iq + 0.940588063364342*last_iq; %  0.01/6.125Tc

```

使用终端计算：
```matlab
>> sys=tf(1,[0.01/6.125 1])
zh = c2d(sys,0.0001,'zoh') %我们系统是10k
[num,den]=tfdata(zh,'v')
```