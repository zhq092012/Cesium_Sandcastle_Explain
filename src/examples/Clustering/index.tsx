import React, { useEffect, useRef } from "react";
import * as Cesium from "cesium";

/**
 * Clustering 示例：演示如何加载 KML 数据源并启用点聚合（Clustering）功能。
 *
 * 点聚合：当地图上有大量密集的点（如设施站点），缩小视角时会将邻近的点
 * 合并为一个聚合图标，避免视觉混乱，提升渲染性能和可读性。
 */
export default function Clustering() {
  // 用于挂载 Cesium Viewer 的 DOM 容器引用
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 创建 Cesium Viewer 实例
    // 关闭了大部分 UI 控件以获得干净的地图视图
    const viewer = new Cesium.Viewer(containerRef.current, {
      terrainProvider: undefined, // 不使用地形，使用默认椭球体
      baseLayerPicker: false, // 隐藏底图选择器
      geocoder: false, // 隐藏地理编码搜索框
      homeButton: false, // 隐藏 Home 按钮
      infoBox: false, // 隐藏信息框（点击实体后弹出的面板）
      selectionIndicator: false, // 隐藏选中实体的绿色指示器
      navigationHelpButton: false, // 隐藏导航帮助按钮
      sceneModePicker: false, // 隐藏 2D/3D/哥伦布视图切换按钮
      timeline: false, // 隐藏底部时间轴
      animation: false, // 隐藏左下角动画控件（播放/暂停）
    });

    // KmlDataSource.load() 需要 camera 和 canvas 参数
    // 用于根据当前视角来解析 KML 中的视角相关样式（如 LOD）
    const options = {
      camera: viewer.scene.camera,
      canvas: viewer.scene.canvas,
    };

    // 加载 KML 数据源并添加到 viewer 的 dataSources 集合中
    // KML 文件包含全球各地的设施站点（地面站、雷达站、发射场等）
    // viewer.dataSources.add() 接受一个 Promise<DataSource>，返回加载完成后的 Promise
    const dataSourcePromise = viewer.dataSources.add(
      Cesium.KmlDataSource.load(
        "/SampleData/kml/facilities/facilities.kml",
        options,
      ),
    );

    // 数据加载完成后，配置点聚合参数
    dataSourcePromise.then(function (dataSource) {
      // pixelRange: 聚合半径（像素）。在此范围内的点会被合并为一个聚合点。
      // 值越大 → 聚合越激进，聚合点越少；值越小 → 聚合越松散，聚合点越多。
      const pixelRange = 15;

      // minimumClusterSize: 触发聚合的最小点数。
      // 至少需要 3 个点在 pixelRange 范围内才会形成聚合，否则各自独立显示。
      const minimumClusterSize = 3;

      const enabled = true;

      // 启用聚合功能并应用配置
      dataSource.clustering.enabled = enabled;
      dataSource.clustering.pixelRange = pixelRange;
      dataSource.clustering.minimumClusterSize = minimumClusterSize;
    });

    // 组件卸载时销毁 Viewer，释放 WebGL 上下文和所有资源
    return () => {
      viewer.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    />
  );
}
