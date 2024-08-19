# 控件学习

## radioButton

```python
def load_img_process(self):
    if self.wbccm_online_radioButton.isChecked():
        print("wb_ccm select online capture")
    elif self.wbccm_local_radioButton.isChecked():
        print("wb_ccm select local capture")
```


## QTableWidget

### 1.怎么让表格缩放到和窗口一样？

```python
self.custom_lab_tableWidget.horizontalHeader().setSectionResizeMode(QtWidgets.QHeaderView.Stretch)
self.custom_lab_tableWidget.verticalHeader().setSectionResizeMode(QtWidgets.QHeaderView.Stretch)
```


### 2.怎么让所有元素保持居中？

```python
# 让所有元素保持居中
for row in range(self.custom_lab_tableWidget.rowCount()):
    for col in range(self.custom_lab_tableWidget.columnCount()):
        item = self.custom_lab_tableWidget.item(row, col)
        if item:  # 确保单元格中有项目
            item.setTextAlignment(QtCore.Qt.AlignCenter)
```

## QTabWidget

### 1.如果TabWidget中有graphicsView，如果操作的不是当前tab的graphicsView，那显示的图片会变小，怎么处理

绑定table切换的信号槽，并且在槽函数中强制渲染

```python
self.calibrationCCMTabWidget.currentChanged.connect(self.ccmOnTabChanged)


def ccmOnTabChanged(self, index):
    """
    为了避免第二页显示图片很小，强制在切换页面的时候再次渲染，保证拉伸正常
    :param index:
    :return:
    """
    if index == 1:  # Assuming the second tab is at index 1
        self.calibrationCCMOutGraphicsView.fitInView(self.ccmOutputScene.sceneRect(), Qt.KeepAspectRatio)
        self.calibrationCCMOutGraphicsView.update()

```