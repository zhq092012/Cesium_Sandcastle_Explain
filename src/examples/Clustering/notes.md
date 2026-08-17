# Clustering

学习笔记：
**只有kml数据源可以使用聚合吗？其他类型的数据源能不能使用聚合?**
不仅是 KML，Cesium 中所有基于 DataSource 架构加载实体的点数据都可以使用点聚合。
点聚合底层依赖的是 Cesium 的 EntityCluster 模块，以下常见数据源均原生支持该功能：
⚬ GeoJsonDataSource：用于加载 GeoJSON / TopoJSON 格式的数据点，用法与 KML 完全一致。
⚬ CzmlDataSource：用于加载 CZML 格式的时空矢量数据与标记点。
⚬ CustomDataSource：最通用的方案。如果你通过后端 API 请求普通的 JSON 数组（如包含经纬度、名称的列表），可以先创建一个 CustomDataSource，将生成的 Entity 放入其中，即可直接开启聚合。
代码示例（自定义数据聚合）：
``` javascript
const customSource = new Cesium.CustomDataSource("myCustomPoints");
viewer.dataSources.add(customSource);

// 批量添加点实体
pointsData.forEach(item => {
  customSource.entities.add({
    position: Cesium.Cartesian3.fromDegrees(item.lng, item.lat),
    billboard: { image: "/path/to/icon.png" }
  });
});

// 开启聚合
customSource.clustering.enabled = true;
customSource.clustering.pixelRange = 20;
customSource.clustering.minimumClusterSize = 3;
```
不支持原生 dataSource.clustering 的场景及替代方案
⚬ 直接挂载在 viewer.entities 上的点：viewer.entities 是基础实体集合，没有直接暴露 clustering 属性。建议统一改用 Cesium.CustomDataSource 管理。
⚬ 底层 Primitive API (BillboardCollection, PointPrimitiveCollection)：为了极致渲染性能直接走底层绘制的对象，无法直接使用此配置，需要自行编写屏幕空间距离判断或使用网格空间索引算法进行动态合并。
⚬ 3D Tiles / 点云模型：3D Tiles 依赖自身的层级细节（LOD）与瓦片加载机制来优化显示，不适用 2D 屏幕空间的 EntityCluster。
