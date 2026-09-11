import React, { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

/**
 * DataSourceOrdering（数据源排序）示例组件
 *
 * 本示例演示 Cesium 中 `viewer.dataSources`（数据源集合）的**层级顺序**概念：
 * - 通过两份 CZML 数据分别加载两组矩形（每组 2 个矩形，共 4 个）
 * - 两组矩形在纬度方向上有 5° 的重叠区域，因此会出现相互遮挡
 * - 数据源集合是有序的：**索引越大的数据源绘制在越上层**（后绘制 → 压住先绘制的）
 * - 点击 "Swap" 按钮调用 `raise()` / `lower()` 调整数据源顺序，
 *   即可观察到重叠区域的遮挡关系发生反转
 *
 * 注意：这里调整的是"数据源之间"的整体层级，而不是单个实体（Entity）的层级。
 */
export default function DataSourceOrdering() {
  /**
   * containerRef: 用于引用挂载 Cesium Viewer 的 DOM 容器元素
   * 类型: React.RefObject<HTMLDivElement>，初始值为 null
   * Cesium.Viewer 构造时需要一个真实存在的 DOM 元素作为渲染目标
   */
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * useEffect: 组件挂载时初始化 Cesium 场景与工具栏，卸载时销毁资源
   * 依赖数组为空 []，表示仅在组件首次挂载时执行一次
   */
  useEffect(() => {
    // 如果 DOM 容器尚未就绪（首次渲染前 ref 为 null），则直接返回不执行初始化
    if (!containerRef.current) return;

    /**
     * viewer: Cesium 三维地球查看器实例
     * 类型: Cesium.Viewer
     * 此处不传第二个配置参数，使用 Cesium 的默认小部件配置
     * （默认会启用底图选择器、时间轴、动画控件等）
     */
    // Use default access token or let user inject it
    const viewer = new Cesium.Viewer(containerRef.current);

    /**
     * czml1: 第一份 CZML 数据包数组（红色 + 蓝色矩形）
     * 类型: object[]（CZML 是一种描述时序地理场景的 JSON 格式）
     *
     * 数组结构说明：
     * - 第 0 项必须是 `document` 包，声明 CZML 版本等元信息
     * - 其余每一项代表一个实体（此处为两个 `rectangle` 矩形）
     *
     * 矩形字段说明：
     * - coordinates.wsenDegrees: 矩形范围，按 [西, 南, 东, 北] 顺序给出经纬度（单位：度）
     * - fill: 是否填充矩形内部
     * - material.solidColor.color.rgba: 纯色材质，颜色为 [红, 绿, 蓝, 透明度]，取值 0~255
     */
    const czml1 = [
      {
        /** id: 固定为 "document"，标识这是 CZML 的文档头包 */
        id: "document",
        /** name: 文档名称，仅用于描述，不影响渲染 */
        name: "CZML Geometries: Rectangle",
        /** version: CZML 规范版本号，必填字段 */
        version: "1.0",
      },
      {
        // 矩形 A：覆盖经度 -120°~-110°、纬度 40°~50°，不透明红色
        rectangle: {
          coordinates: {
            wsenDegrees: [-120, 40, -110, 50],
          },
          fill: true,
          material: {
            solidColor: {
              color: {
                // rgba: 红色（R=255, G=0, B=0），A=255 表示完全不透明
                rgba: [255, 0, 0, 255],
              },
            },
          },
        },
      },
      {
        // 矩形 B：覆盖经度 -110°~-100°、纬度 40°~50°，不透明蓝色
        rectangle: {
          coordinates: {
            wsenDegrees: [-110, 40, -100, 50],
          },
          fill: true,
          material: {
            solidColor: {
              color: {
                // rgba: 蓝色（R=0, G=0, B=255），A=255 表示完全不透明
                rgba: [0, 0, 255, 255],
              },
            },
          },
        },
      },
    ];

    /**
     * czml2: 第二份 CZML 数据包数组（黄色 + 青色矩形）
     * 类型: object[]
     *
     * 与 czml1 的区别：纬度范围整体北移 5°（45°~55°），
     * 因此与 czml1 的矩形在纬度 45°~50° 区间产生重叠，
     * 重叠部分的显示效果取决于两个数据源在集合中的先后顺序。
     */
    const czml2 = [
      {
        /** id: 固定为 "document"，标识这是 CZML 的文档头包 */
        id: "document",
        /** name: 文档名称，仅用于描述，不影响渲染 */
        name: "CZML Geometries: Rectangle",
        /** version: CZML 规范版本号，必填字段 */
        version: "1.0",
      },
      {
        // 矩形 C：覆盖经度 -120°~-110°、纬度 45°~55°，不透明黄色
        rectangle: {
          coordinates: {
            wsenDegrees: [-120, 45, -110, 55],
          },
          fill: true,
          material: {
            solidColor: {
              color: {
                // rgba: 黄色（R=255, G=255, B=0），A=255 表示完全不透明
                rgba: [255, 255, 0, 255],
              },
            },
          },
        },
      },
      {
        // 矩形 D：覆盖经度 -110°~-100°、纬度 45°~55°，不透明青色
        rectangle: {
          coordinates: {
            wsenDegrees: [-110, 45, -100, 55],
          },
          fill: true,
          material: {
            solidColor: {
              color: {
                // rgba: 青色（R=0, G=255, B=255），A=255 表示完全不透明
                rgba: [0, 255, 255, 255],
              },
            },
          },
        },
      },
    ];

    /**
     * promise1: 加载 czml1 得到的数据源 Promise
     * 类型: Promise<Cesium.CzmlDataSource>
     * CzmlDataSource.load() 是异步的，返回解析完成后的数据源对象
     */
    const promise1 = Cesium.CzmlDataSource.load(czml1);
    // dataSources.add() 可直接接收 Promise，Cesium 会在其解析完成后自动加入集合
    // 先加入的数据源索引为 0（位于下层）
    viewer.dataSources.add(promise1);

    /**
     * promise2: 加载 czml2 得到的数据源 Promise
     * 类型: Promise<Cesium.CzmlDataSource>
     */
    const promise2 = Cesium.CzmlDataSource.load(czml2);
    // 后加入的数据源索引为 1（位于上层），因此黄色/青色矩形初始压在红色/蓝色矩形之上
    viewer.dataSources.add(promise2);

    /**
     * "Swap" 按钮：交换两个数据源的绘制顺序
     *
     * 由于 load() 是异步的，必须等两个 Promise 都完成后才能拿到真实的数据源对象，
     * 因此使用 Promise.all 等待后再进行顺序调整。
     *
     * 顺序调整逻辑：
     * - 若 ds1（czml1 对应的数据源）当前处于索引 0（最底层），则调用 raise() 上移一层
     * - 否则调用 lower() 下移一层
     * 两个数据源的情形下，该逻辑等价于"每次点击都反转两者的上下关系"。
     */
    Sandcastle.addToolbarButton("Swap", function () {
      Promise.all([promise1, promise2]).then(function (results) {
        /**
         * ds1: czml1 对应的已加载数据源实例
         * 类型: Cesium.CzmlDataSource
         * results 数组的顺序与传入 Promise.all 的顺序一致，故索引 0 即 promise1 的结果
         */
        const ds1 = results[0];

        // indexOf() 返回该数据源在集合中的索引，0 表示位于最底层
        if (viewer.dataSources.indexOf(ds1) === 0) {
          // raise(): 将该数据源在集合中上移一层（绘制顺序变为更靠上）
          viewer.dataSources.raise(ds1);
        } else {
          // lower(): 将该数据源在集合中下移一层（绘制顺序变为更靠下）
          viewer.dataSources.lower(ds1);
        }
      });
    });

    /**
     * useEffect 清理函数：组件卸载时执行
     * 1. Sandcastle.reset() - 清除工具栏中的所有按钮和菜单，防止 React StrictMode 下重复渲染出现重复按钮
     * 2. viewer.destroy()   - 销毁 Cesium Viewer 实例，释放 WebGL 上下文与内存资源
     */
    return () => {
      Sandcastle.reset();
      viewer.destroy();
    };
  }, []);

  /**
   * 渲染部分：返回一个全屏的 div 容器，用于挂载 Cesium Viewer
   * - ref={containerRef}: 将 DOM 元素引用绑定到 containerRef，供 useEffect 中使用
   * - style: 使用绝对定位铺满整个视口，无外边距和内边距，并隐藏溢出内容
   */
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
