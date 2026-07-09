# Hello Cesium 学习笔记

这是一个默认的 CesiumJS 示例，展示了如何在 React 中渲染三维地球并定位到特定位置（北京故宫）。

## 关键 API

- `Cesium.Viewer`: 初始化三维视窗的主要类。
- `viewer.camera.setView`: 控制相机的视图角度与高度。
- `viewer.entities.add`: 向场景中添加实体对象（如点、文字标签等）。

## 学习心得
1. 在 React 组件卸载时，一定要调用 `viewer.destroy()` 来销毁 WebGL 上下文，防止内存泄漏和页面崩溃。
2. 需要注意在容器元素上设置 `position: absolute` 或指定宽高以让 Cesium 占满空间。
