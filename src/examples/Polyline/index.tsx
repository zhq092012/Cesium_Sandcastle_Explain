import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

export default function Polyline() {
  const containerRef = useRef < HTMLDivElement > (null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Use default access token or let user inject it
    const viewer = new Cesium.Viewer(containerRef.current, {
      terrainProvider: undefined,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      selectionIndicator: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      timeline: false,
      animation: false,
    });
    /**
     * 标题：贴地红线 (Red line on terrain)
     * 描述：线状要素贴合在地形表面。通过设置 clampToGround: true，线条会随着地形起伏而贴合地表，不需要（也不建议）指定高度。
     * Tips：适用于绘制地面上的道路、边界线、行驶轨迹等。需要开启地形或在贴地模式下才能实现完美的贴地效果。
     */
    viewer.entities.add({
      name: "Red line on terrain",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([-75, 35, -125, 35]),
        width: 5,
        material: Cesium.Color.RED,
        clampToGround: true,
      },
    });

    /**
     * 标题：等角绿线 (Green rhumb line)
     * 描述：在地球表面上与所有经线相交成相同角度的线（等角航线，Rhumb Line）。默认情况下 Cesium 的线是大圆航线（Geodesic，即两点间最短球面距离，表现为弧线），而等角航线在墨卡托投影上表现为直线。
     * Tips：适用于航海、航空等需要保持恒定罗盘航向的路线绘制。
     */
    viewer.entities.add({
      name: "Green rhumb line",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([-75, 35, -125, 35]),
        width: 5,
        arcType: Cesium.ArcType.RHUMB,
        material: Cesium.Color.GREEN,
      },
    });

    /**
     * 标题：发光蓝白线 (Glowing blue line on the surface)
     * 描述：带有霓虹发光特效的线条，使用 PolylineGlowMaterialProperty 材质，支持通过 glowPower 控制发光强度
     * taperPower 控制末端渐变渐细。
     * Tips：常用于科技感 UI、城市管网、交通流向或重点强调的路线。
     */
    viewer.entities.add({
      name: "Glowing blue line on the surface",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([-75, 37, -125, 37]),
        width: 10,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.2,
          taperPower: 0.5,
          color: Cesium.Color.CORNFLOWERBLUE,
        }),
      },
    });

    /**
     * 标题：带轮廓的橘色弯曲空间线 (Orange line with black outline at height and following the surface)
     * 描述：具有黑色外轮廓的橘色线条，使用 PolylineOutlineMaterialProperty 材质
     * 且由于指定了高度（250,000米）且未设置 clampToGround，它会在高空沿着地球表面弯曲（大圆航线）。
     * Tips：外轮廓能有效在复杂背景（如卫星影像）下提高线条的对比度与可读性。
     */
    viewer.entities.add({
      name: "Orange line with black outline at height and following the surface",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -75, 39, 250000, -125, 39, 250000,
        ]),
        width: 5,
        material: new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.ORANGE,
          outlineWidth: 2,
          outlineColor: Cesium.Color.BLACK,
        }),
      },
    });

    /**
     * 标题：带箭头的紫色空间直航线 (Purple straight arrow at height)
     * 描述：带方向箭头的线条，使用 PolylineArrowMaterialProperty 材质
     * 并通过设置 arcType: Cesium.ArcType.NONE 使其在三维空间中呈绝对的几何直线
     * （穿过地球内部的空间直航线，不随地球表面弯曲）。
     * Tips：非常适合用于表示流向、向量、航路、或者有明确方向指示的空间路径。
     */
    viewer.entities.add({
      name: "Purple straight arrow at height",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -75, 43, 500000, -125, 43, 500000,
        ]),
        width: 10,
        arcType: Cesium.ArcType.NONE,
        material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.PURPLE),
      },
    });

    /**
     * 标题：蓝色空间虚线 (Blue dashed line)
     * 描述：虚线样式的空间虚线，使用 PolylineDashMaterialProperty 材质。在高空中沿着地球表面弯曲。
     * Tips：通常用于非实体连接线、预测路径、行政区划线或辅助参考线。可通过 dashLength 等属性微调虚线的虚实段长度。
     */
    viewer.entities.add({
      name: "Blue dashed line",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -75, 45, 500000, -125, 45, 500000,
        ]),
        width: 4,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.CYAN,
        }),
      },
    });

    viewer.zoomTo(viewer.entities);

    return () => {
      viewer.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}
    />
  );
}
