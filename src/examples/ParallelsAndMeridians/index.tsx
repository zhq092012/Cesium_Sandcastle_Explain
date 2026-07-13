import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";
let viewer: Cesium.Viewer;
const toDegrees = Cesium.Math.toDegrees;
export default function ParallelsAndMeridians() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    viewer = new Cesium.Viewer(containerRef.current, {
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
     * 标题：绘制纬线（Parallel）
     * 功能：在 Cesium 地球上绘制一条指定纬度的纬线（等纬度线）。
     *       通过在东西方向上选取 5 个关键经度点（-180°, -90°, 0°, 90°, 180°），
     *       使用 Cesium 的 Polyline 实体连接成一条完整的纬线。
     *
     * 核心原理：
     *   - `arcType: Cesium.ArcType.RHUMB`：使用恒向线（Rhumb Line / Loxodrome）连接各点。
     *     恒向线在墨卡托投影中表现为直线，沿固定方位角航行，
     *     非常适合绘制纬线，因为纬线本身就是恒向线。
     *   - 如果使用 `ArcType.GEODESIC`（测地线/大圆弧），则除赤道外的纬线会弯曲偏离。
     *
     * 使用场景：
     *   1. 绘制赤道（latitude=0）、北回归线（23.5°）、南回归线（-23.5°）等特殊纬线
     *   2. 构建经纬网格系统中的水平线
     *   3. 地理教学中展示纬度概念
     *
     * 对比区别：
     *   - parallel vs meridian：parallel 绘制水平纬线（固定纬度，变化经度）；
     *     meridian 绘制垂直经线（固定经度，变化纬度）
     *   - ArcType.RHUMB vs ArcType.GEODESIC：
     *     RHUMB（恒向线）保持方位角恒定，适合绘制纬线/经线；
     *     GEODESIC（大圆弧）是两点间最短路径，适合航线规划
     *
     * tips：granularity 参数控制线段插值密度（弧度），值越小线越平滑但性能开销越大。
     *       默认值通常足够，放大查看时可传入更小值（如 0.001）提高精度。
     *
     * @param latitude 纬度值（单位：度），范围 -90 到 90。正值为北纬，负值为南纬
     * @param color 纬线的颜色，类型为 Cesium.Color
     * @param granularity 可选，线段的插值粒度（弧度）。值越小，曲线越平滑
     * @returns Cesium.Entity 实体对象，可用于后续控制显示/隐藏或移除
     */
    function parallel(
      latitude: number,
      color: Cesium.Color,
      granularity?: number,
    ) {
      const name = `Parallel ${latitude}`;
      return viewer.entities.add({
        name: name,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            -180,
            latitude,
            -90,
            latitude,
            0,
            latitude,
            90,
            latitude,
            180,
            latitude,
          ]),
          width: 2,
          arcType: Cesium.ArcType.RHUMB,
          material: color,
          granularity: granularity,
        },
      });
    }

    /**
     * 标题：绘制经线（Meridian）
     * 功能：在 Cesium 地球上绘制一条指定经度的经线（子午线）。
     *       通过在南北方向上选取 3 个关键纬度点（90°, 0°, -90°），
     *       使用 Cesium 的 Polyline 实体连接成一条从北极到南极的完整经线。
     *
     * 核心原理：
     *   - 经线连接北极（90°N）→ 赤道（0°）→ 南极（90°S），只需 3 个点
     *   - 同样使用 `ArcType.RHUMB` 恒向线类型，因为经线也是恒向线
     *   - 经线比纬线需要的点更少，因为所有经线都是大圆弧的一半，路径更简单
     *
     * 使用场景：
     *   1. 绘制本初子午线（longitude=0）、国际日期变更线（longitude=180）
     *   2. 构建经纬网格系统中的垂直线
     *   3. 标注某地经度位置的参考线
     *
     * 对比区别：
     *   - meridian vs parallel：meridian 只需 3 个点（北极→赤道→南极），
     *     而 parallel 需要 5 个点横跨全球，因为纬线更长且需要更多插值点
     *   - 经线的长度都相同（约 20000km），而纬线长度随纬度增大而缩短
     *
     * tips：经线在地球仪上是大圆弧的一半，所以所有经线的长度相等。
     *       本初子午线（0°经线）和 180°经线组成一个完整的大圆。
     *
     * @param longitude 经度值（单位：度），范围 -180 到 180。正值为东经，负值为西经
     * @param color 经线的颜色，类型为 Cesium.Color
     * @param granularity 可选，线段的插值粒度（弧度）。值越小，曲线越平滑
     * @returns Cesium.Entity 实体对象，可用于后续控制显示/隐藏或移除
     */
    function meridian(
      longitude: number,
      color: Cesium.Color,
      granularity?: number,
    ) {
      const name = `Meridian ${longitude}`;
      return viewer.entities.add({
        name: name,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            longitude,
            90,
            longitude,
            0,
            longitude,
            -90,
          ]),
          width: 2,
          arcType: Cesium.ArcType.RHUMB,
          material: color,
          granularity: granularity,
        },
      });
    }

    /**
     * 标题：标注坐标标签（Label Coordinates）
     * 功能：在地球上指定位置添加一个文本标签，显示该点的经纬度坐标。
     *       将 Cartographic（弧度制）坐标转换为度数，格式化为 4 位小数后显示。
     *
     * 核心原理：
     *   - `Cesium.Cartographic.toCartesian()`：将地理坐标（经纬度+高度）转换为笛卡尔坐标（XYZ），
     *     因为 Cesium 实体的 position 属性需要笛卡尔坐标
     *   - `toDegrees()`：Cesium 内部使用弧度制，需要转换为人类可读的度数
     *   - `toFixed(4)`：保留 4 位小数，精度约为 11 米级别
     *
     * 使用场景：
     *   1. 用户点击地球后，在点击位置显示经纬度信息
     *   2. 标注对跖点（antipodal point）的坐标
     *   3. 地理坐标学习和调试时的可视化辅助
     *
     * 对比区别：
     *   - Cartographic vs Cartesian3：
     *     Cartographic 使用（经度, 纬度, 高度）描述地理位置，更直观；
     *     Cartesian3 使用（x, y, z）描述空间位置，Cesium 内部计算使用
     *   - Label vs Billboard：Label 显示文本，Billboard 显示图片/图标，
     *     两者都可以附着在地球上某个位置
     *
     * tips：`showBackground: true` 为文本添加背景框，提升在不同地形上的可读性。
     *       使用等宽字体 "monospace" 使数字对齐更整齐。
     *
     * @param cartographic Cesium.Cartographic 地理坐标对象（经纬度为弧度制）
     * @returns Cesium.Entity 实体对象，包含标签信息
     */
    function labelCoordinates(cartographic: Cesium.Cartographic) {
      const position = Cesium.Cartographic.toCartesian(cartographic);
      const latitude = toDegrees(cartographic.latitude).toFixed(4); //将弧度转化成度
      const longitude = toDegrees(cartographic.longitude).toFixed(4);
      const label = `纬度: ${latitude}°\n经度: ${longitude}°`;

      return viewer.entities.add({
        position: position,
        label: {
          text: label,
          showBackground: true,
          font: "14px monospace",
        },
      });
    }

    /**
     * 标题：生成经纬网格（Make Grid）
     * 功能：生成一个完整的经纬度网格，包含递归细分的纬线和经线。
     *       网格通过递归方式将经纬度范围不断二分，生成均匀分布的网格线。
     *
     * 核心原理：
     *   - 纬线范围 [-90°, 90°] 和经线范围 [-180°, 180°] 分别递归细分
     *   - `numberOfDivisions` 控制递归深度：depth=2 产生 2^2-1=3 条线，
     *     depth=5 产生 2^5-1=31 条线（每个方向）
     *   - 需要额外添加 180° 经线，因为递归细分 [-180°, 180°] 不会生成边界值
     *   - 最终将所有线的可见性统一设置为 `show` 参数的值
     *
     * 使用场景：
     *   1. 快速创建低分辨率（depth=2）网格用于粗略定位
     *   2. 创建高分辨率（depth=5）网格用于精确定位
     *   3. 地图教学中展示不同精度的经纬网
     *
     * 对比区别：
     *   - 低分辨率网格（depth=2）：生成 3×3 条线，30°间隔，适合概览
     *   - 高分辨率网格（depth=5）：生成 31×31 条线，约 5.6°间隔，适合精确定位
     *   - 两种网格使用不同颜色区分（PALEGREEN / DARKORANGE），可独立开关
     *
     * tips：网格线数量随 depth 指数增长（2^n - 1），高 depth 值会影响性能。
     *       建议 depth 不超过 7（127 条线/方向）。
     *
     * @param numberOfDivisions 递归细分深度，决定网格密度。值越大网格越密
     * @param color 网格线的颜色，类型为 Cesium.Color
     * @param show 是否初始显示网格，true 显示，false 隐藏
     * @returns Cesium.Entity[] 所有网格线实体的数组
     */
    function makeGrid(
      numberOfDivisions: number,
      color: Cesium.Color,
      show: boolean,
    ) {
      // 生成纬线
      const parallels = makeParallelsRecursive(
        -90,
        90,
        numberOfDivisions,
        color,
      );
      const meridians = makeMeridiansRecursive(
        -180,
        180,
        numberOfDivisions,
        color,
      );
      meridians.push(meridian(180, color));

      const allLines = parallels.concat(meridians);
      allLines.forEach(function (line) {
        line.show = show;
      });

      return allLines;
    }

    /**
     * 标题：递归生成纬线（Make Parallels Recursive）
     * 功能：在给定的纬度范围内，通过递归二分法生成均匀分布的纬线。
     *       每次取中点画一条纬线，然后对上下两半分别递归，直到深度为 0。
     *
     * 核心原理（递归二分）：
     *   - 第 1 层：取 [-90°, 90°] 中点 → 0°（赤道）
     *   - 第 2 层：取 [-90°, 0°] 中点 → -45°，取 [0°, 90°] 中点 → 45°
     *   - 第 3 层：继续细分，产生 -67.5°, -22.5°, 22.5°, 67.5° 四条纬线
     *   - 每层产生 2^(层级-1) 条新纬线，总共 2^depth - 1 条
     *   - 结果数组按从南到北的顺序排列（通过 concat 顺序保证）
     *
     * 使用场景：
     *   1. 被 makeGrid 调用，生成网格中的所有纬线
     *   2. 需要均匀间距纬线时使用（而非手动指定每条纬线的度数）
     *
     * 对比区别：
     *   - 递归方式 vs 循环方式：递归二分天然产生均匀分布的线，
     *     且可以方便地控制精度层级；循环方式需要预先计算间距
     *   - makeParallelsRecursive vs makeMeridiansRecursive：
     *     结构完全相同，只是操作的坐标轴不同（纬度 vs 经度）
     *
     * tips：递归不会生成边界值（-90° 和 90°），只生成中间值。
     *       这是设计意图——极点处的纬线是一个点，没有绘制意义。
     *
     * @param minLatitude 纬度范围下界（度）
     * @param maxLatitude 纬度范围上界（度）
     * @param depth 递归深度，控制纬线密度
     * @param color 纬线颜色
     * @returns Cesium.Entity[] 按从南到北顺序排列的纬线实体数组
     */
    function makeParallelsRecursive(
      minLatitude: number,
      maxLatitude: number,
      depth: number,
      color: Cesium.Color,
    ) {
      let result = []; //每次递归都会创建属于自己的局部变量result
      const midpoint = (minLatitude + maxLatitude) / 2;
      result.push(parallel(midpoint, color)); //当前范围的中间纬线

      if (depth > 0) {
        // 获得南半部分纬线（递归调用）
        const southernLines = makeParallelsRecursive(
          minLatitude,
          midpoint,
          depth - 1,
          color,
        );

        // 获得北半部分纬线（递归调用）
        const northernLines = makeParallelsRecursive(
          midpoint,
          maxLatitude,
          depth - 1,
          color,
        );
        //但对当前的父调用来说，子递归产生的线在返回之前只存在于子函数的内部。
        // 父函数必须通过 southernLines.concat(result, northernLines)，才能把子函数返回出来的数组与自己持有的中点线拼
        result = southernLines.concat(result, northernLines);
      }

      return result;
    }

    /**
     * 标题：递归生成经线（Make Meridians Recursive）
     * 功能：在给定的经度范围内，通过递归二分法生成均匀分布的经线。
     *       逻辑与 makeParallelsRecursive 完全对称，只是操作经度而非纬度。
     *
     * 核心原理（递归二分）：
     *   - 第 1 层：取 [-180°, 180°] 中点 → 0°（本初子午线）
     *   - 第 2 层：取 [-180°, 0°] 中点 → -90°，取 [0°, 180°] 中点 → 90°
     *   - 依此类推，每层产生 2^(层级-1) 条新经线
     *   - 结果数组按从西到东的顺序排列
     *
     * 使用场景：
     *   1. 被 makeGrid 调用，生成网格中的所有经线
     *   2. 需要均匀间距经线时使用
     *
     * 对比区别：
     *   - 与 makeParallelsRecursive 的区别：
     *     经线范围 [-180°, 180°] vs 纬线范围 [-90°, 90°]，跨度不同但逻辑相同
     *   - 注意：此函数不会生成边界值 -180° 和 180°。
     *     但 -180° 和 180° 实际上是同一条经线（国际日期变更线），
     *     所以 makeGrid 中只额外添加了 180° 经线
     *
     * tips：经度范围是 360°，纬度范围是 180°，所以相同 depth 下，
     *       经线间距是纬线间距的 2 倍。
     *
     * @param minLongitude 经度范围下界（度）
     * @param maxLongitude 经度范围上界（度）
     * @param depth 递归深度，控制经线密度
     * @param color 经线颜色
     * @returns Cesium.Entity[] 按从西到东顺序排列的经线实体数组
     */
    function makeMeridiansRecursive(minLongitude, maxLongitude, depth, color) {
      let result = [];
      const midpoint = (minLongitude + maxLongitude) / 2;
      result.push(meridian(midpoint, color));

      if (depth > 0) {
        const westernLines = makeMeridiansRecursive(
          minLongitude,
          midpoint,
          depth - 1,
          color,
        );
        const easternLines = makeMeridiansRecursive(
          midpoint,
          maxLongitude,
          depth - 1,
          color,
        );
        result = westernLines.concat(result, easternLines);
      }

      return result;
    }

    // 是否显示对跖点
    let showAntipodalPoint = false;
    //定义网格、赤道、经线、十字准线等实体
    const primitives = {
      equator: parallel(0, Cesium.Color.BLUE), //赤道
      primeMeridian: meridian(0, Cesium.Color.BLUE), //本初子午线
      //选中的点（红色）
      selectedPoint: {
        meridian: undefined,
        parallel: undefined,
        label: undefined,
      },
      //对跖点（青色）
      antipodalPoint: {
        meridian: undefined,
        parallel: undefined,
        label: undefined,
      },
      lowResolutionGrid: makeGrid(2, Cesium.Color.PALEGREEN, false), //低分辨率网格
      higherResolutionGrid: makeGrid(5, Cesium.Color.DARKORANGE, false), //高分辨率网格
    };

    /**
     * 标题：更新十字准线（Update Crosshairs）
     * 功能：根据用户点击的地理坐标，更新或创建红色十字准线（经线+纬线+标签），
     *       并可选地显示该点的对跖点（antipodal point）的青色十字准线。
     *
     * 核心原理：
     *   1. 先清除上一次的十字准线（如果存在），避免残留
     *   2. 在点击位置绘制红色（RED）十字准线：
     *      - 过该点的纬线（水平线）
     *      - 过该点的经线（垂直线）
     *      - 坐标标签
     *   3. 计算并绘制青色（CYAN）对跖点十字准线：
     *      - 对跖点纬度 = -原纬度（南北对称）
     *      - 对跖点经度 = (原经度 + 180) % 360（东西对称）
     *   4. 使用更细的 granularity（0.001）以提高放大时的精度
     *
     * 对跖点（Antipodal Point）解释：
     *   - 地球上与某点完全相对的点，即穿过地心的直线与地表的另一个交点
     *   - 例如：北京（39.9°N, 116.4°E）的对跖点大约在阿根廷（39.9°S, 63.6°W）
     *
     * 使用场景：
     *   1. 用户左键点击地球时调用，在点击处显示定位十字线
     *   2. 地理教学：展示对跖点概念
     *   3. 坐标快速查阅
     *
     * 对比区别：
     *   - 十字准线 vs 网格：十字准线跟随用户点击动态更新，网格是静态预生成的
     *   - 红色准线 vs 青色准线：红色标注选中点，青色标注对跖点
     *   - finerGranularity（0.001）vs 默认 granularity：
     *     更小的值让线在放大时更平滑，但会增加顶点数量
     *
     * tips：对跖点经度计算使用 `(longitude + 180) % 360`，
     *       这在 Cesium 中有效，因为 Cesium 内部会归一化经度值。
     *       对跖点的显隐由全局变量 showAntipodalPoint 控制。
     *
     * @param cartographic Cesium.Cartographic 地理坐标对象（用户点击位置）
     * @returns void
     */
    function updateCrosshairs(cartographic: Cesium.Cartographic) {
      const selectedPoint = primitives.selectedPoint;
      const antipodalPoint = primitives.antipodalPoint;

      //1.先清除上一次的十字准线（如果存在），避免残留
      if (Cesium.defined(selectedPoint.parallel)) {
        viewer.entities.remove(selectedPoint.parallel);
        viewer.entities.remove(selectedPoint.meridian);
        viewer.entities.remove(selectedPoint.label);
        viewer.entities.remove(antipodalPoint.parallel);
        viewer.entities.remove(antipodalPoint.meridian);
        viewer.entities.remove(antipodalPoint.label);
      }

      const pointLatitude = toDegrees(cartographic.latitude);
      const antipodeLatitude = -pointLatitude; //对跖点纬度 = -原纬度（南北对称）

      const pointLongitude = toDegrees(cartographic.longitude);
      const antipodeLongitude = (pointLongitude + 180) % 360; //对跖点经度 = (原经度 + 180) % 360（东西对称）

      //2. 在点击位置绘制红色（RED）十字准线：
      //   - 过该点的纬线（水平线）
      //   - 过该点的经线（垂直线）
      //   - 坐标标签
      const finerGranularity = 0.001; // 插值密度
      const red = Cesium.Color.RED;
      selectedPoint.parallel = parallel(
        toDegrees(cartographic.latitude),
        red,
        finerGranularity,
      );
      selectedPoint.meridian = meridian(
        toDegrees(cartographic.longitude),
        red,
        finerGranularity,
      );
      selectedPoint.label = labelCoordinates(cartographic);

      const cyan = Cesium.Color.CYAN;
      const antipode = Cesium.Cartographic.fromDegrees(
        antipodeLongitude,
        antipodeLatitude,
        0,
      );
      //3. 计算并绘制青色（CYAN）对跖点十字准线：
      //   - 对跖点纬度 = -原纬度（南北对称）
      //   - 对跖点经度 = (原经度 + 180) % 360（东西对称）
      antipodalPoint.parallel = parallel(
        antipodeLatitude,
        cyan,
        finerGranularity,
      );
      antipodalPoint.meridian = meridian(
        antipodeLongitude,
        cyan,
        finerGranularity,
      );
      antipodalPoint.label = labelCoordinates(antipode);

      //控制对跖点十字准线的显示/隐藏
      antipodalPoint.parallel.show = showAntipodalPoint;
      antipodalPoint.meridian.show = showAntipodalPoint;
      antipodalPoint.label.show = showAntipodalPoint;
    }

    // 响应鼠标左键点击事件，更新十字准线
    viewer.screenSpaceEventHandler.setInputAction(function (mouse: {
      position: Cesium.Cartesian2;
    }) {
      viewer.scene.pick(mouse.position); // 在场景中拾取
      const ray = viewer.camera.getPickRay(mouse.position); // 获取从相机到鼠标位置的射线
      const globe = viewer.scene.globe; //地球
      const cartesian = globe.pick(ray, viewer.scene); // 拾取射线与地球的交点

      if (!Cesium.defined(cartesian)) {
        return;
      }

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian); // 笛卡尔坐标转换为地理坐标
      updateCrosshairs(cartographic); // 更新十字准线
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    Sandcastle.addToggleButton("显示赤道", true, function (checked) {
      primitives.equator.show = checked;
    });

    Sandcastle.addToggleButton("显示本初子午线", true, function (checked) {
      primitives.primeMeridian.show = checked;
    });

    Sandcastle.addToggleButton("显示低分辨率网格", false, function (checked) {
      primitives.lowResolutionGrid.forEach(function (line) {
        line.show = checked;
      });
    });

    Sandcastle.addToggleButton("显示高分辨率网格", false, function (checked) {
      primitives.higherResolutionGrid.forEach(function (line) {
        line.show = checked;
      });
    });

    Sandcastle.addToggleButton("显示对跖点", false, function (checked) {
      showAntipodalPoint = checked;
      const antipodalPoint = primitives.antipodalPoint;

      if (Cesium.defined(antipodalPoint.parallel)) {
        antipodalPoint.parallel.show = showAntipodalPoint;
        antipodalPoint.meridian.show = showAntipodalPoint;
        antipodalPoint.label.show = showAntipodalPoint;
      }
    });

    return () => {
      Sandcastle.reset();
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
