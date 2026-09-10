import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import Sandcastle from 'Sandcastle';

/**
 * Interpolation（插值）示例组件
 *
 * 本示例演示了 Cesium 中实体位置的插值功能：
 * - 在大峡谷上空生成一条随机环形飞行路径（带有不同高度的采样点）
 * - 使用 SampledPositionProperty 记录离散时间点的位置
 * - Cesium 会自动在采样点之间进行插值，计算中间时刻的位置
 * - 支持切换三种插值算法：线性逼近、拉格朗日多项式、埃尔米特多项式
 * - 提供俯视、侧视、跟踪飞机等多种观察视角
 */
export default function Interpolation() {
  /**
   * containerRef: 用于引用挂载 Cesium Viewer 的 DOM 容器元素
   * 类型为 React.RefObject<HTMLDivElement>，初始值为 null
   * Cesium.Viewer 需要一个真实的 DOM 元素作为渲染目标
   */
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * useEffect: 组件挂载时初始化 Cesium 场景，卸载时销毁资源
   * 依赖数组为空 []，表示仅在组件首次挂载时执行一次
   */
  useEffect(() => {
    // 如果 DOM 容器尚未就绪，则直接返回不执行初始化
    if (!containerRef.current) return;

    /**
     * viewer: Cesium 三维地球查看器实例
     * 类型: Cesium.Viewer
     * 配置说明：
     * - infoBox: false          → 禁用信息框小部件（点击实体时不弹出详情窗口）
     * - selectionIndicator: false → 禁用选择指示器（点击实体时不显示绿色选中框）
     * - shouldAnimate: true     → 启用动画播放（时钟自动前进）
     * - terrain                 → 使用 Cesium 全球地形数据（可显示山脉、峡谷等地形起伏）
     */
    const viewer = new Cesium.Viewer(containerRef.current, {
      infoBox: false,
      selectionIndicator: false,
      shouldAnimate: true,
      terrain: Cesium.Terrain.fromWorldTerrain(),
    });

    // 启用基于太阳位置的光照效果，使地球表面有昼夜明暗变化
    viewer.scene.globe.enableLighting = true;

    // 启用地形深度测试，使被地形遮挡的物体不可见（例如山后面的实体会被隐藏）
    viewer.scene.globe.depthTestAgainstTerrain = true;

    // 设置随机数种子为固定值 3，确保每次运行生成的随机飞行路径完全一致（便于调试和演示）
    Cesium.Math.setRandomNumberSeed(3);

    /**
     * start: 模拟的起始时间（儒略日期格式）
     * 类型: Cesium.JulianDate
     * 对应公历时间: 2015年3月25日 16:00（注意月份从0开始，2代表3月）
     */
    const start = Cesium.JulianDate.fromDate(new Date(2015, 2, 25, 16));

    /**
     * stop: 模拟的结束时间，起始时间 + 360秒（即6分钟后）
     * 类型: Cesium.JulianDate
     * 第三个参数 new Cesium.JulianDate() 是用于存储结果的目标对象（避免重复创建对象）
     */
    const stop = Cesium.JulianDate.addSeconds(start, 360, new Cesium.JulianDate());

    // ========== 配置查看器时钟 ==========
    // 设置时钟的起始时间（克隆一份，避免引用同一对象导致意外修改）
    viewer.clock.startTime = start.clone();
    // 设置时钟的结束时间
    viewer.clock.stopTime = stop.clone();
    // 设置时钟的当前时间为起始时间（从头开始播放）
    viewer.clock.currentTime = start.clone();
    // 设置时钟到达终止时间后的行为：LOOP_STOP 表示循环播放（到结尾后自动回到开头）
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    // 设置时钟倍速为 10，即动画以 10 倍速播放
    viewer.clock.multiplier = 10;

    // 设置时间轴控件的显示范围，使其与模拟时间段对齐
    viewer.timeline.zoomTo(start, stop);

    /**
     * computeCirclularFlight: 计算环形飞行路径的采样位置
     *
     * 该函数在指定的经纬度中心点周围生成一条椭圆形飞行轨迹，
     * 每隔 45° 采样一个位置点（共 9 个点，含起点和终点重合），
     * 每个采样点的高度是随机的（1750m ~ 2250m之间）。
     *
     * @param lon    - 中心点经度（单位：度）
     * @param lat    - 中心点纬度（单位：度）
     * @param radius - 飞行轨迹的半径（单位：度，注意是经纬度偏移量而非米）
     * @returns {Cesium.SampledPositionProperty} - 包含所有采样点的位置属性，
     *          Cesium 会根据选定的插值算法在采样点之间自动计算中间时刻的位置
     */
    function computeCirclularFlight(lon: number, lat: number, radius: number): Cesium.SampledPositionProperty {
      /**
       * property: 采样位置属性
       * 类型: Cesium.SampledPositionProperty
       * 用于存储一系列 "时间 → 位置" 的采样数据对，
       * Cesium 会在这些离散采样点之间进行插值，实现平滑运动
       */
      const property = new Cesium.SampledPositionProperty();

      // 从 0° 到 360° 每隔 45° 生成一个采样点
      for (let i = 0; i <= 360; i += 45) {
        /**
         * radians: 当前角度转换为弧度值
         * 类型: number
         * Cesium.Math.toRadians() 将角度值转换为弧度值，用于三角函数计算
         */
        const radians = Cesium.Math.toRadians(i);

        /**
         * time: 当前采样点对应的时间
         * 类型: Cesium.JulianDate
         * 从 start 开始每隔 i 秒取一个时间点（i = 0, 45, 90, ... 360）
         * 这意味着飞行总共 360 秒 = 6 分钟
         */
        const time = Cesium.JulianDate.addSeconds(
          start,
          i,
          new Cesium.JulianDate(),
        );

        /**
         * position: 当前采样点的三维位置（笛卡尔坐标）
         * 类型: Cesium.Cartesian3
         * 计算方式：以 (lon, lat) 为中心，用三角函数计算偏移量：
         * - 经度方向偏移: radius * 1.5 * cos(角度)（1.5 系数使轨迹在经度方向更宽，形成椭圆）
         * - 纬度方向偏移: radius * sin(角度)
         * - 高度: 1750m + 随机值(0~500m)，模拟飞行中的高度变化
         */
        const position = Cesium.Cartesian3.fromDegrees(
          lon + radius * 1.5 * Math.cos(radians),
          lat + radius * Math.sin(radians),
          Cesium.Math.nextRandomNumber() * 500 + 1750,
        );

        // 将 "时间-位置" 数据对添加到采样属性中
        property.addSample(time, position);

        // 在每个采样点的位置上添加一个可视化的点实体，便于观察采样点分布
        viewer.entities.add({
          position: position,
          point: {
            pixelSize: 8,                        // 点的像素大小
            color: Cesium.Color.TRANSPARENT,     // 填充色为透明
            outlineColor: Cesium.Color.YELLOW,   // 黄色轮廓线
            outlineWidth: 3,                     // 轮廓线宽度
          },
        });
      }
      return property;
    }

    /**
     * position: 飞行实体的位置属性（包含完整飞行路径的采样数据）
     * 类型: Cesium.SampledPositionProperty
     * 参数说明：中心点在美国大峡谷附近（经度 -112.110693°, 纬度 36.0994841°），半径 0.03°
     */
    const position = computeCirclularFlight(-112.110693, 36.0994841, 0.03);

    /**
     * entity: 飞行实体（飞机模型）
     * 类型: Cesium.Entity
     * 该实体绑定了位置属性、朝向属性、3D 模型和飞行路径线，
     * 是本示例中的核心实体对象
     */
    const entity = viewer.entities.add({
      /**
       * availability: 实体的有效时间范围
       * 类型: Cesium.TimeIntervalCollection
       * 只有在 start ~ stop 这段时间内，实体才会被渲染显示
       */
      availability: new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({
          start: start,
          stop: stop,
        }),
      ]),

      /**
       * position: 实体位置属性
       * 类型: Cesium.SampledPositionProperty
       * 绑定前面计算好的环形飞行路径采样数据，
       * Cesium 会根据当前时钟时间自动插值计算实体的实时位置
       */
      position: position,

      /**
       * orientation: 实体朝向属性
       * 类型: Cesium.VelocityOrientationProperty
       * 根据位置的变化方向（速度矢量）自动计算实体的朝向，
       * 使飞机模型始终面向飞行方向
       */
      orientation: new Cesium.VelocityOrientationProperty(position),

      /**
       * model: 加载 3D 模型（glTF/glb 格式）
       * - uri: 模型文件路径（Cesium 自带的飞机模型）
       * - minimumPixelSize: 模型的最小像素尺寸（64px），
       *   即使飞机距离很远也不会小于 64 像素，保证可见性
       */
      model: {
        uri: "../../SampleData/models/CesiumAir/Cesium_Air.glb",
        minimumPixelSize: 64,
      },

      /**
       * path: 飞行路径线的可视化配置
       * - resolution: 路径线的采样间隔（1 秒），值越小路径线越平滑
       * - material: 路径线材质，使用发光（Glow）效果，黄色，发光强度 0.1
       * - width: 路径线宽度（10 像素）
       */
      path: {
        resolution: 1,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.1,
          color: Cesium.Color.YELLOW,
        }),
        width: 10,
      },
    });

    // ========== 工具栏按钮：视角控制 ==========

    /**
     * viewTopDown: 俯视视角函数
     * 取消实体跟踪，然后将相机缩放到所有实体的范围，
     * 使用 HeadingPitchRange 设置相机朝向：
     * - heading: 0（正北方向）
     * - pitch: -90°（垂直向下俯视）
     * - range: 自动计算（由 zoomTo 根据实体范围决定）
     */
    function viewTopDown() {
      viewer.trackedEntity = undefined;
      viewer.zoomTo(
        viewer.entities,
        new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90)),
      );
    }
    // 页面加载完成后自动执行俯视视角（模拟原版 addDefaultToolbarButton 的自动触发行为）
    viewTopDown();

    // 添加"俯视"按钮到工具栏
    Sandcastle.addToolbarButton("View Top Down", viewTopDown);


    /**
     * "侧视"按钮：从侧面观察飞行路径
     * HeadingPitchRange 参数说明：
     * - heading: -90°（朝向西方）
     * - pitch: -15°（略微向下倾斜）
     * - range: 7500 米（相机距目标中心的距离）
     */
    Sandcastle.addToolbarButton("View Side", function () {
      viewer.trackedEntity = undefined;
      viewer.zoomTo(
        viewer.entities,
        new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(-90),
          Cesium.Math.toRadians(-15),
          7500,
        ),
      );
    });

    /**
     * "跟踪飞机"按钮：设置 viewer.trackedEntity 为飞机实体
     * 相机会自动跟随飞机移动，始终保持飞机在视野中心
     */
    Sandcastle.addToolbarButton("View Aircraft", function () {
      viewer.trackedEntity = entity;
    });

    // ========== 工具栏下拉菜单：跟踪参考系选择 ==========
    /**
     * 跟踪参考系菜单：控制相机跟踪实体时使用的坐标参考系
     * - ENU（East-North-Up，东-北-天）：相机方向相对于地面固定，
     *   跟踪时地球不会跟着旋转，适合观察实体相对地面的运动
     * - INERTIAL（惯性系）：相机方向相对于惯性空间固定，
     *   跟踪时能感受到地球自转的效果
     */
    Sandcastle.addToolbarMenu([
      {
        text: "Tracking reference frame: East-North-Up",
        onselect: function () {
          entity.trackingReferenceFrame = Cesium.TrackingReferenceFrame.ENU;
        },
      },
      {
        text: "Tracking reference frame: Inertial",
        onselect: function () {
          entity.trackingReferenceFrame = Cesium.TrackingReferenceFrame.INERTIAL;
        },
      },
    ]);

    // ========== 工具栏下拉菜单：插值算法选择 ==========
    /**
     * 插值算法菜单：切换不同的位置插值算法
     *
     * 插值的核心概念：我们只在离散的时间点记录了位置（每 45 秒一个采样点），
     * 但动画需要知道每一帧的位置。插值算法负责根据已知采样点推算中间时刻的位置。
     *
     * 三种插值算法对比：
     * 1. Linear Approximation（线性逼近）：
     *    - 插值阶数: 1（一次多项式）
     *    - 原理: 在相邻两个采样点之间做简单的线性连接（直线段）
     *    - 效果: 路径呈折线状，转弯处有明显拐角
     *
     * 2. Lagrange Polynomial Approximation（拉格朗日多项式逼近）：
     *    - 插值阶数: 5（五次多项式）
     *    - 原理: 使用拉格朗日多项式拟合，同时考虑多个相邻采样点
     *    - 效果: 路径非常平滑，但可能在极端情况下出现振荡（龙格现象）
     *
     * 3. Hermite Polynomial Approximation（埃尔米特多项式逼近）：
     *    - 插值阶数: 2（二次多项式）
     *    - 原理: 不仅考虑位置还考虑速度（导数）信息，确保路径在采样点处连续且光滑
     *    - 效果: 平滑度介于线性和拉格朗日之间，物理意义更合理
     */
    Sandcastle.addToolbarMenu(
      [
        {
          text: "Interpolation: Linear Approximation",
          onselect: function () {
            // 将 entity.position 断言为 SampledPositionProperty 类型以调用 setInterpolationOptions
            (entity.position as Cesium.SampledPositionProperty).setInterpolationOptions({
              interpolationDegree: 1,        // 插值阶数：1（线性）
              interpolationAlgorithm: Cesium.LinearApproximation as any,  // 线性逼近算法
            });
          },
        },
        {
          text: "Interpolation: Lagrange Polynomial Approximation",
          onselect: function () {
            (entity.position as Cesium.SampledPositionProperty).setInterpolationOptions({
              interpolationDegree: 5,        // 插值阶数：5（五次多项式，使用更多采样点拟合）
              interpolationAlgorithm: Cesium.LagrangePolynomialApproximation as any,  // 拉格朗日多项式算法
            });
          },
        },
        {
          text: "Interpolation: Hermite Polynomial Approximation",
          onselect: function () {
            (entity.position as Cesium.SampledPositionProperty).setInterpolationOptions({
              interpolationDegree: 2,        // 插值阶数：2（二次多项式）
              interpolationAlgorithm: Cesium.HermitePolynomialApproximation as any,  // 埃尔米特多项式算法
            });
          },
        },
      ],
      "interpolationMenu",  // 菜单标识/标题
    );

    /**
     * useEffect 清理函数：组件卸载时执行
     * 1. Sandcastle.reset() - 清除工具栏中的所有按钮和菜单，防止 React StrictMode 下重复渲染
     * 2. viewer.destroy()   - 销毁 Cesium Viewer 实例，释放 WebGL 上下文和内存资源
     */
    return () => {
      Sandcastle.reset();
      viewer.destroy();
    };
  }, []);

  /**
   * 渲染部分：返回一个全屏的 div 容器，用于挂载 Cesium Viewer
   * - ref={containerRef}: 将 DOM 元素引用绑定到 containerRef，供 useEffect 中使用
   * - style: 使用绝对定位铺满整个视口，无外边距和内边距
   */
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
