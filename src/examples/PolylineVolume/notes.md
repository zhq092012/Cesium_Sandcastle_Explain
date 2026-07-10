# PolylineVolume

学习笔记：

- 这是一个新创建的 Cesium Sandcastle 示例。
- 在此处记录您的学习心得、关键 API 或参数配置。

## 折线几何体

### 角点类型（CornerType）

- BEVELED：斜角
- MITERED：斜接
- ROUNDED：圆角


在 Cesium 中，`CornerType` 是一个用来控制**折线（Polyline Volume）或管道、墙体等带有厚度/宽度的三维几何体在“拐弯处”（Corners）如何进行衔接和过渡**的枚举类型 。

当你绘制一条有宽度的折线，或者使用 `PolylineVolumeGraphics` 沿着路径生成一个多边形截面时，拐角处的几何形状需要被计算和填充。Cesium 为此提供了三种主要的衔接模式 ：

---

### ## CornerType 的三种类型

### ### 1. `CornerType.ROUNDED` (圆角) — **默认值**

* **表现形式**：拐弯处会被平滑地切分成一个**圆弧**进行过渡。
* **特点**：视觉效果最为平滑、自然。但在底层渲染时，由于需要计算并插入多个密集的采样点来生成圆弧，它的顶点数量最多，计算开销相比其他两种稍大。
* **适用场景**：管道、电缆、跑道等需要圆润、逼真外观的平滑三维管道线。

### ### 2. `CornerType.MITERED` (尖角 / 尖头衔接)

* **表现形式**：拐弯处的外侧边缘会沿原方向各自延伸，直到**相交成一个尖锐的锋利拐角**（类似于相框或踢脚线在墙角的 45 度拼接）。
* **特点**：非常适合展现硬朗的工业或建筑线条。需要注意的是，如果两条线段之间的夹角非常锐利（如小于 30 度），外侧的尖角会被拉得极长，在视觉上可能会出现“刺破屏幕”的突兀感。
* **适用场景**：建筑物边界、城墙、工业管道、围栏等规则的几何边缘。

### ### 3. `CornerType.BEVELED` (平角 / 斜切)

* **表现形式**：拐弯处的外侧尖角会被“一刀切平”，直接用一条**平直的斜线段**连接两个拐角的边缘。
* **特点**：它是 `MITERED`（尖角）和 `ROUNDED`（圆角）之间的折中方案。既避免了圆角带来的高额顶点计算，又防止了尖角在锐角时过度拉伸。视觉上呈现为规则的倒角。
* **适用场景**：大数据量下的有宽度的轨迹线，或者对性能要求高、不需要极端精细圆角的场景。

---

### ## 在代码中的配置示例

在 CesiumJS 开发中，通常在定义 `PolylineVolume` 或是特定几何体更新器（如 `CorridorGeometry`）时会用到这个属性 ：

```javascript
// 示例：使用 PolylineVolume 绘制带有特定拐角类型的立体管道
viewer.entities.add({
    name: '立体圆角管道',
    polylineVolume: {
        positions: Cesium.Cartesian3.fromDegreesArray([
            116.39, 39.90,
            116.40, 39.91,
            116.42, 39.90
        ]),
        // 定义截面形状（这里是一个正方形截面）
        shape: [
            new Cesium.Cartesian2(-50, -50),
            new Cesium.Cartesian2(50, -50),
            new Cesium.Cartesian2(50, 50),
            new Cesium.Cartesian2(-50, 50)
        ],
        // 控制拐角的核心属性
        cornerType: Cesium.CornerType.ROUNDED, // 可选 MITERED, BEVELED
        material: Cesium.Color.BLUE.withAlpha(0.8)
    }
});

```

### ## 总结与选型建议

| 拐角类型 (`CornerType`) | 视觉效果 | 计算开销 | 极端锐角表现 |
| --- | --- | --- | --- |
| <br>**`ROUNDED`** (默认) 

 | 极好（平滑圆弧） | 较高（顶点多） | 完美过渡 |
| <br>**`MITERED`** 

 | 良好（硬朗尖角） | 较低 | 尖角会拉得极长，可能失真 |
| <br>**`BEVELED`** 

 | 一般（机械倒角） | 较低 | 比较稳健，边缘会被直接切平 |
