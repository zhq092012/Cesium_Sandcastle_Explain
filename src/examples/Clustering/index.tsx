import React, { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import { Card, InputNumber, Slider, Switch, Typography } from "antd";
import "antd/dist/reset.css";

/**
 * Clustering 示例：演示如何加载 KML 数据源并启用点聚合（Clustering）功能。
 *
 * 点聚合：当地图上有大量密集的点（如设施站点），缩小视角时会将邻近的点
 * 合并为一个聚合图标，避免视觉混乱，提升渲染性能和可读性。
 */
export default function Clustering() {
  // 用于挂载 Cesium Viewer 的 DOM 容器引用
  const containerRef = useRef<HTMLDivElement>(null);
  const dataSourceRef = useRef<Cesium.KmlDataSource | null>(null);
  const clickHandlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);
  const removeListenerRef = useRef<(() => void) | undefined>(undefined);
  const customStyleEnabledRef = useRef<boolean>(true);

  const [pixelRange, setPixelRange] = useState(15);
  const [minimumClusterSize, setMinimumClusterSize] = useState(3);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [customStylingEnabled, setCustomStylingEnabled] = useState(true);

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

    // React 开发模式下 effect 可能触发两次，使用该标记避免卸载后继续操作 DOM/Viewer。
    let isDisposed = false;
    let clickHandler: Cesium.ScreenSpaceEventHandler | undefined;
    let removeListener: (() => void) | undefined;

    // 数据加载完成后，配置点聚合参数
    dataSourcePromise.then(function (dataSource) {
      if (isDisposed) {
        return;
      }

      dataSourceRef.current = dataSource as Cesium.KmlDataSource;

      // pixelRange: 聚合半径（像素）。在此范围内的点会被合并为一个聚合点。
      // 值越大 → 聚合越激进，聚合点越少；值越小 → 聚合越松散，聚合点越多。
      const pixelRange = 15;

      // minimumClusterSize: 触发聚合的最小点数。
      // 至少需要 3 个点在 pixelRange 范围内才会形成聚合，否则各自独立显示。
      const minimumClusterSize = 3;

      // 启用聚合功能并应用配置
      dataSource.clustering.enabled = clusteringEnabled;
      dataSource.clustering.pixelRange = pixelRange;
      dataSource.clustering.minimumClusterSize = minimumClusterSize;

      const pinBuilder = new Cesium.PinBuilder();
      // 不同聚合数量区间对应的图钉贴图。
      const pin50 = pinBuilder.fromText("50+", Cesium.Color.RED, 48).toDataURL();
      const pin40 = pinBuilder.fromText("40+", Cesium.Color.ORANGE, 48).toDataURL();
      const pin30 = pinBuilder.fromText("30+", Cesium.Color.YELLOW, 48).toDataURL();
      const pin20 = pinBuilder.fromText("20+", Cesium.Color.GREEN, 48).toDataURL();
      const pin10 = pinBuilder.fromText("10+", Cesium.Color.BLUE, 48).toDataURL();

      // 2~9 个点的聚合图标缓存。
      // 这里预先生成 8 张图："2" 到 "9"，避免每次聚合事件触发时重复创建 DataURL。
      // 下标与数量的映射关系为：
      // index 0 -> "2"，index 1 -> "3"，...，index 7 -> "9"。
      // 因此后续可通过 (聚合数量 - 2) 直接定位到对应贴图。
      const singleDigitPins = new Array(8);
      for (let i = 0; i < singleDigitPins.length; ++i) {
        singleDigitPins[i] = pinBuilder
          .fromText(`${i + 2}`, Cesium.Color.VIOLET, 48)
          .toDataURL();
      }

      // 强制触发一次聚合重算，让样式开关立刻生效。
      function recluster() {
        const currentPixelRange = dataSource.clustering.pixelRange;
        dataSource.clustering.pixelRange = 0;
        dataSource.clustering.pixelRange = currentPixelRange;
      }

      // 启用自定义聚合样式（仅在未注册监听时注册一次）。
      function enableCustomStyle() {
        if (!Cesium.defined(removeListener)) {
          removeListener = dataSource.clustering.clusterEvent.addEventListener(
            function (clusteredEntities, cluster) {
              cluster.label.show = false;
              cluster.billboard.show = true;
              cluster.billboard.id = cluster.label.id;
              cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;

              if (clusteredEntities.length >= 50) {
                cluster.billboard.image = pin50;
              } else if (clusteredEntities.length >= 40) {
                cluster.billboard.image = pin40;
              } else if (clusteredEntities.length >= 30) {
                cluster.billboard.image = pin30;
              } else if (clusteredEntities.length >= 20) {
                cluster.billboard.image = pin20;
              } else if (clusteredEntities.length >= 10) {
                cluster.billboard.image = pin10;
              } else {
                // 走到这里说明聚合数量在 [2, 9] 区间：
                // - 小于 2 不会形成聚合（minimumClusterSize = 3 时更不会出现）；
                // - 大于等于 10 会被前面的 10+/20+/... 分支拦截。
                // 所以使用 (length - 2) 可将数量 2..9 映射到下标 0..7。
                cluster.billboard.image =
                  singleDigitPins[clusteredEntities.length - 2];
              }
            },
          );
        }

        recluster();
      }

      // 关闭自定义聚合样式（移除监听，恢复 Cesium 默认聚合展示）。
      function disableCustomStyle() {
        if (Cesium.defined(removeListener)) {
          removeListener();
          removeListener = undefined;
        }

        recluster();
      }

      function setCustomStylingEnabled(enabled: boolean) {
        customStyleEnabledRef.current = enabled;
        if (enabled) {
          enableCustomStyle();
        } else {
          disableCustomStyle();
        }
      }

      // 初始样式状态与 UI 开关保持一致。
      setCustomStylingEnabled(customStylingEnabled);

      // 监听点击聚合点，将其包含实体的 billboard 染红，便于观察聚合成员。
      clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      clickHandlerRef.current = clickHandler;
      removeListenerRef.current = removeListener;

      clickHandler.setInputAction(function (movement) {
        const pickedLabel = viewer.scene.pick(movement.position);
        if (Cesium.defined(pickedLabel)) {
          const ids = pickedLabel.id;
          if (Array.isArray(ids)) {
            for (let i = 0; i < ids.length; ++i) {
              ids[i].billboard.color = Cesium.Color.RED;
            }
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      // 暴露样式开关控制函数给状态同步 effect 使用。
      (dataSource as Cesium.KmlDataSource & {
        __setCustomStylingEnabled?: (enabled: boolean) => void;
      }).__setCustomStylingEnabled = setCustomStylingEnabled;
    });

    dataSourcePromise.catch(function (error) {
      console.error("Failed to load clustering KML:", error);
    });

    // 组件卸载时销毁 Viewer，释放 WebGL 上下文和所有资源
    return () => {
      isDisposed = true;
      if (Cesium.defined(removeListener)) {
        removeListener();
        removeListener = undefined;
      }
      if (Cesium.defined(clickHandler)) {
        clickHandler.destroy();
        clickHandler = undefined;
      }

      dataSourceRef.current = null;
      clickHandlerRef.current = null;
      removeListenerRef.current = undefined;
      viewer.destroy();
    };
  }, []);

  useEffect(() => {
    const dataSource = dataSourceRef.current;
    if (!dataSource) {
      return;
    }

    dataSource.clustering.pixelRange = pixelRange;
    dataSource.clustering.minimumClusterSize = minimumClusterSize;
    dataSource.clustering.enabled = clusteringEnabled;

    const withSetter = dataSource as Cesium.KmlDataSource & {
      __setCustomStylingEnabled?: (enabled: boolean) => void;
    };
    withSetter.__setCustomStylingEnabled?.(customStylingEnabled);
  }, [pixelRange, minimumClusterSize, clusteringEnabled, customStylingEnabled]);

  return (
    <>
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

      <Card
        title="Clustering Controls"
        size="small"
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          width: 360,
          zIndex: 1000,
          background: "rgba(30, 32, 34, 0.92)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          color: "#e8eaed",
        }}
        styles={{
          header: {
            color: "#fff",
            borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          },
          body: { padding: 12 },
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Typography.Text style={{ color: "#e8eaed", minWidth: 150 }}>
            Pixel Range
          </Typography.Text>
          <Slider
            min={1}
            max={200}
            step={1}
            value={pixelRange}
            onChange={(value) => setPixelRange(Number(value))}
            style={{ flex: 1, margin: 0 }}
          />
          <InputNumber
            min={1}
            max={200}
            step={1}
            value={pixelRange}
            onChange={(value) => setPixelRange(Number(value ?? 1))}
            style={{ width: 72 }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Typography.Text style={{ color: "#e8eaed", minWidth: 150 }}>
            Minimum Cluster Size
          </Typography.Text>
          <Slider
            min={2}
            max={20}
            step={1}
            value={minimumClusterSize}
            onChange={(value) => setMinimumClusterSize(Number(value))}
            style={{ flex: 1, margin: 0 }}
          />
          <InputNumber
            min={2}
            max={20}
            step={1}
            value={minimumClusterSize}
            onChange={(value) => setMinimumClusterSize(Number(value ?? 2))}
            style={{ width: 72 }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Switch checked={clusteringEnabled} onChange={setClusteringEnabled} />
          <Typography.Text style={{ color: "#e8eaed" }}>Enabled</Typography.Text>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Switch checked={customStylingEnabled} onChange={setCustomStylingEnabled} />
          <Typography.Text style={{ color: "#e8eaed" }}>Custom Styling</Typography.Text>
        </div>
      </Card>
    </>
  );
}
