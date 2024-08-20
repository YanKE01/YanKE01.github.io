
isp一开始要有一开始选择版本。

只考虑raw8，考虑能够raw10 raw16



# blc

标定：PC上算还是板子上算。 

矫正：每一个通道-标定值

# DPC
不考虑，现在自带DPC。 主频不行。 
可能存在坏点风险


# BAYER Denoise

涉及标定，先不考虑。
有能力的话就实现下，没时间的话就把结果导出来看下。

# lsc
拍一张灰度卡，让P4算矫正参数，然后再次看效果。

# demoasic

open isp 插值算法。 malvaer，朴素插值

# Color Denoise

不需要了

# AE

自动曝光 ，搞一个5x5的子框。
每一个子窗的亮度。 考虑RGB域的直方图。

每一个子框都可以显示亮度和直方图。总的RGB可以显示，当个也可以。



# CCM
矩阵是否要转置，改成左乘。
D65 CIE 76要支持可以选择，主要是对应的LAB值.

这里的gamma可以测试。

这里要乘2次，第一个是AWB，第二次此是CCM

我们的AWB没有把结果乘上去。


可视化RGB三通道。 open_isp在左边


ME_CCM的计算最佳曝光是否正确。

# GAMMA
不要标定
但是要可视化，gamma前后的结果可以看见。
gamma后的数据可视化

https://github.com/cruxopen/openISP/blob/master/isp_pipeline.py#L255

```
maxval = pow(2,bw)
ind = range(0, maxval)
val = [round(pow(float(i)/maxval, gamma) * maxval) for i in ind]
lut = dict(zip(ind, val))
#print(ind, val, lut)
gc = GC(rgbimg_ccm, lut, mode)
rgbimg_gc = gc.execute()
print(50*'-' + '\nGamma Correction Done......')
#plt.imshow(rgbimg_gc)
#plt.show()
```

gac.py模块 拿出来

# AWB

yuv 如何显示

PC剬可视化