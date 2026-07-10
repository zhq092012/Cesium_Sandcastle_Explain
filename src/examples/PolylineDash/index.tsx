import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

export default function PolylineDash() {
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
     * 标题：基础红色虚线
     * 描述：使用 PolylineDashMaterialProperty 的默认属性绘制的最基础的虚线
     * 间隔部分默认是完全透明的。
     * Tips：适用于一般性边界、导引线等不需要复杂视觉特征的场景。
     */
    const redLine = viewer.entities.add({
      name: "Red dashed line",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -75, 38, 250000, -125, 38, 250000,
        ]),
        width: 5,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.RED,
        }),
      },
    });

    /**
     * 标题：带背景填充色的宽蓝黄虚线
     * 描述：设置 gapColor 为黄色，使虚线原本透明的空白间隙处被填充为指定的颜色。
     * Tips：当背景地形或图层颜色复杂、全透明间隙导致虚线难以辨识时，
     * 或者需要绘制特定的警示条纹（如斑马线/双色边界线）时非常适用。
     */
    const blueLine = viewer.entities.add({
      name: "Wide blue dashed line with a gap color",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -75, 40, 250000, -125, 40, 250000,
        ]),
        width: 30,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.BLUE,
          gapColor: Cesium.Color.YELLOW,
        }),
      },
    });

    /**
     * 标题：细密橙色虚线
     * 描述：通过将 dashLength 设置为较小的值（8.0，默认是 16.0）,
     * 从而缩短了虚线单个花纹周期的像素长度。
     * Tips：适用于短线段，或者需要虚线看起来更细密、更连续的场景，
     * 可避免因周期过长而在短距离内显示不全虚线特征。
     */
    const orangeLine = viewer.entities.add({
      name: "Orange dashed line with a short dash length",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -75, 42, 250000, -125, 42, 250000,
        ]),
        width: 5,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.ORANGE,
          dashLength: 8.0,
        }),
      },
    });

    /**
     * 标题：自定义花纹的青色虚线
     * 描述：通过 dashPattern（一个 16 位二进制数）自定义虚线的通断模式。"110000001111" 即定义了特定长度的实线与空白交替。
     * Tips：适合用于需要特殊点划线、双点划线（如我国图例中的国界、省界等特定线型）的场景，可以通过定制二进制数实现各种创意的线型。
     */
    const cyanLine = viewer.entities.add({
      name: "Cyan dashed line with a dash pattern.",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -75, 44, 250000, -125, 44, 250000,
        ]),
        width: 10,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.CYAN,
          dashPattern: parseInt("110000001111", 2),
        }),
      },
    });

    /**
     * 标题：均匀交替的点状黄色虚线
     * 描述：利用二进制模式 "1010101010101010"（交替的 1 和 0）来构建极细、均匀交替的点状虚线。
     * Tips：常用于表示投影线、施工规划线、行政区划等需要以密集虚点表示的路径或辅助边界。
     */
    const yellowLine = viewer.entities.add({
      name: "Yellow dashed line with a dash pattern.",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -75, 46, 250000, -125, 46, 250000,
        ]),
        width: 10,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.YELLOW,
          dashPattern: parseInt("1010101010101010", 2),
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
