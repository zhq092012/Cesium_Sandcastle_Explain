import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

export default function PolylineVolume() {
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
     * 标题：圆形管线（带圆角）
     * 描述：使用 computeCircle 函数生成圆形截面，创建了一个圆管。
     * Tips：这是最基础的 PolylineVolume 应用，展示了如何在三维空间中构建圆润的管道状几何体。
     * @param radius 半径
     * @returns 存储 Cartesian2 对象的数组，表示圆的顶点。
     */
    function computeCircle(radius) {
      const positions = [];
      for (let i = 0; i < 360; i++) {
        const radians = Cesium.Math.toRadians(i);
        positions.push(
          new Cesium.Cartesian2(
            radius * Math.cos(radians),
            radius * Math.sin(radians),
          ),
        );
      }
      return positions;
    }

    /**
     * 标题：星形管线（带斜角转角）
     * 描述：使用 computeStar 函数生成星形截面，创建了一个星形管道。
     * Tips：通过调整 arms (分支数)、rOuter (外径)、rInner (内径)，可以创建各种多边形或星形的管道，
     * 广泛用于电力线、特种管道等场景。
     * @param arms 星形分支数
     * @param rOuter 星形外径
     * @param rInner 星形内径
     * @returns 存储 Cartesian2 对象的数组，表示星形的顶点。
     */
    function computeStar(arms, rOuter, rInner) {
      const angle = Math.PI / arms;
      const length = 2 * arms;
      const positions = new Array(length);
      for (let i = 0; i < length; i++) {
        const r = i % 2 === 0 ? rOuter : rInner;
        positions[i] = new Cesium.Cartesian2(
          Math.cos(i * angle) * r,
          Math.sin(i * angle) * r,
        );
      }
      return positions;
    }
    /**
     * 标题：红色圆角管道
     * 描述：使用 computeCircle 生成圆形截面，创建了一个圆管。
     * Tips：这是最基础的 PolylineVolume 应用，展示了如何在三维空间中构建圆润的管道状几何体。
     */
    const redTube = viewer.entities.add({
      name: "Red tube with rounded corners",
      polylineVolume: {
        positions: Cesium.Cartesian3.fromDegreesArray([
          -85.0, 32.0, -85.0, 36.0, -89.0, 36.0,
        ]),
        shape: computeCircle(60000.0),
        material: Cesium.Color.RED,
      },
    });
    /**
     * 标题：带斜角转角的绿色矩形管线
     * 描述：使用定义的矩形数组作为截面，并设置 cornerType 为 BEVELED，创建了一个带有斜角（倒角）转角的矩形管道。
     * Tips：CornerType.BEVELED 适用于需要直角或斜角连接的建筑结构、管道布局等场景。
     * 
     * CornerType:转角类型
     * - BEVELED:斜角
     * - MITERED:斜接 
     * - ROUNDED:圆角
     */
    const greenBox = viewer.entities.add({
      name: "Green box with beveled corners and outline",
      polylineVolume: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -90.0, 32.0, 0.0, -90.0, 36.0, 100000.0, -94.0, 36.0, 0.0,
        ]),// [经度，维度，高度, 经度，维度，高度...]
        shape: [
          new Cesium.Cartesian2(-50000, -50000),//左下
          new Cesium.Cartesian2(50000, -50000),//右下
          new Cesium.Cartesian2(50000, 50000),//右上
          new Cesium.Cartesian2(-50000, 50000),//左上
        ],  
        cornerType: Cesium.CornerType.BEVELED,
        material: Cesium.Color.GREEN.withAlpha(0.5),
        outline: true,
        outlineColor: Cesium.Color.BLACK,
      },
    });

    /**
     * 标题：带斜接转角的蓝色星形管线
     * 描述：使用 computeStar 生成星形截面，并设置 cornerType 为 MITERED，创建了一个带有斜接（尖角）转角的星形管道。
     * Tips：CornerType.MITERED 适用于需要锐利尖角连接的建筑结构、管道布局等场景。
     */
    const blueStar = viewer.entities.add({
      name: "Blue star with mitered corners and outline",
      polylineVolume: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -95.0, 32.0, 0.0, -95.0, 36.0, 100000.0, -99.0, 36.0, 200000.0,
        ]),
        shape: computeStar(7, 70000, 50000),
        cornerType: Cesium.CornerType.MITERED,
        material: Cesium.Color.BLUE,
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
