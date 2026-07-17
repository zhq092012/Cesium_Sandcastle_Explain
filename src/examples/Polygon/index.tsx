import React, { useEffect, useRef } from "react";
import * as Cesium from "cesium";
// @ts-ignore
import lu from "../../assets/lu.jpg";
export default function Polygon() {
  const containerRef = useRef<HTMLDivElement>(null);

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
     * 标题：红色地表多边形（Red Polygon on Surface）
     * 功能：在地球表面绘制一个贴地的红色不规则多边形。
     *       这是最基础的多边形用法——只指定顶点坐标和颜色，多边形将自动贴合地表。
     *
     * 核心原理（贴地多边形）：
     *   - hierarchy 接受 Cartesian3[] 数组，定义多边形的顶点位置
     *   - fromDegreesArray 将 [经度, 纬度, 经度, 纬度, ...] 平铺数组转为 Cartesian3[]
     *   - 未设置 height / perPositionHeight，默认 height=0，多边形贴合地表（或地形）
     *   - 顶点按顺序连接，最后一个顶点自动闭合到第一个
     *
     * 关键属性：
     *   - hierarchy: 多边形的顶点层级结构（此处直接传入 Cartesian3[] 等价于无孔洞的简单多边形）
     *   - material: Cesium.Color.RED — 纯色填充
     *
     * 使用场景：
     *   1. 标记地理区域边界（如行政区划、禁飞区）
     *   2. 最简单的多边形入门示例
     *
     * 对比区别：
     *   - 与 greenPolygon 的区别：此处无 extrudedHeight，不会拉伸成立体；green 有拉伸高度
     *   - 与 orangePolygon 的区别：此处无 perPositionHeight，所有顶点高度相同（均为 0）
     *
     * tips：fromDegreesArray 的参数是 [lon1, lat1, lon2, lat2, ...] 的平铺格式，
     *       而非 [[lon1, lat1], [lon2, lat2], ...] 的嵌套格式。
     *       5 个顶点 = 10 个数值（5 对经纬度）。
     */
    const redPolygon = viewer.entities.add({
      name: "球面上的红色多边形",
      polygon: {
        //hierarchy 层级结构
        hierarchy: Cesium.Cartesian3.fromDegreesArray([
          -115.0, 37.0, -115.0, 32.0, -107.0, 33.0, -102.0, 31.0, -102.0, 35.0,
        ]),
        material: Cesium.Color.RED,
      },
    });

    /**
     * 标题：绿色拉伸多边形（Green Extruded Polygon）
     * 功能：创建一个从地表向上拉伸的绿色三角形"柱体"，
     *       且顶面和底面都不封闭（只保留侧壁），形成一个开放的管状结构。
     *
     * 核心原理（拉伸多边形 Extruded Polygon）：
     *   - extrudedHeight: 500000.0 — 从多边形基础面（默认 height=0）向上拉伸到 500km 高度
     *   - 拉伸会在基础面和拉伸面之间生成侧壁（side walls）
     *   - closeTop: false — 不渲染顶面（拉伸面）
     *   - closeBottom: false — 不渲染底面（基础面）
     *   - 效果类似于一个没有盖子和底的"筒"或"管"
     *
     * 关键属性：
     *   - extrudedHeight: 拉伸的目标高度（米），与 height 配合决定拉伸范围
     *   - closeTop / closeBottom: 控制是否渲染顶面/底面，默认均为 true
     *   - 当两者均为 false 时，只剩侧壁，适合做"围墙"效果
     *
     * 使用场景：
     *   1. 可视化空域范围（如管制空域的三维柱体表示）
     *   2. 围墙、栅栏等只需要侧面的结构
     *   3. 配合 closeTop=true 可做实心立柱（如建筑物简化模型）
     *
     * 对比区别：
     *   - 与 redPolygon 的区别：red 无拉伸，贴地；green 有 extrudedHeight 形成立体
     *   - 与 orangePolygon 的区别：green 所有顶点等高（统一 height=0），orange 每个顶点独立高度
     *   - closeTop/closeBottom 只在 extrudedHeight 存在时有意义
     *
     * tips：拉伸范围 = [height, extrudedHeight]，此处 height 默认为 0，
     *       所以拉伸范围是 [0m, 500000m]。若设 height=100000，
     *       则侧壁只出现在 100km~500km 之间。
     */
    const greenPolygon = viewer.entities.add({
      name: "Green extruded polygon",
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray([
          -108.0, 42.0, -100.0, 42.0, -104.0, 40.0,
        ]),
        extrudedHeight: 500000.0,
        material: Cesium.Color.GREEN,
        closeTop: false,
        closeBottom: false,
      },
    });

    /**
     * 标题：带纹理坐标的拉伸多边形（Extruded Textured Polygon with Per-Position Heights）
     * 功能：创建一个每个顶点有独立高度的多边形，并使用自定义纹理坐标（UV）
     *       将图片材质精确映射到多边形表面，同时向下拉伸到地面。
     *
     * 核心原理（纹理坐标映射 Texture Coordinates）：
     *   - fromDegreesArrayHeights 接受 [lon, lat, height, ...] 三元组，每个顶点有独立海拔
     *   - perPositionHeight: true — 启用逐顶点高度，每个顶点使用自己的 height 值
     *   - extrudedHeight: 0 — 从各顶点高度向下拉伸到 0 米（地面），生成侧壁
     *   - textureCoordinates 通过 PolygonHierarchy 包装 Cartesian2[] 来定义 UV 映射：
     *     * Cartesian2(u, v) 中 u 和 v 的范围均为 [0, 1]
     *     * (0,0) 代表纹理图片的左下角，(1,1) 代表右上角
     *     * 每个 Cartesian2 与 hierarchy 中对应索引的 Cartesian3 顶点一一对应
     *
     * 关键属性：
     *   - textureCoordinates: 自定义纹理映射坐标，类型为 PolygonHierarchy<Cartesian2>
     *     （注意：Cesium 类型定义中 PolygonHierarchy 要求 Cartesian3，需用 as any 绕过）
     *   - perPositionHeight: true — 逐顶点高度模式
     *   - material: ImageMaterialProperty — 使用图片作为多边形表面材质
     *
     * 使用场景：
     *   1. 在三维多边形表面贴图（如建筑外墙贴纹理、地形叠加影像）
     *   2. 需要精确控制图片在多边形上的拉伸/裁剪方式
     *
     * 对比区别：
     *   - 与 texturedPolygonWithHoles 的区别：此处无孔洞；后者带孔洞且孔洞也有独立的纹理坐标
     *   - 与 redPolygon 的区别：red 使用纯色 material；此处使用图片 ImageMaterialProperty
     *   - 若不设 textureCoordinates，Cesium 会自动用 stRotation 进行默认纹理旋转映射
     *
     * tips：textureCoordinates 的数组长度必须与 hierarchy 的顶点数量完全一致，
     *       否则会出现运行时错误（如 "Cannot read property 'x' of undefined"）。
     *       此处 5 个顶点对应 5 个 UV 坐标。
     */
    const texturedPolygon = viewer.entities.add({
      name: "Extruded textured polygon with per-position heights and custom texture coordinates",
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights([
          -118.4, 40.4, 50000, -118.4, 37, 30000, -114.2, 38.0, 35000, -108.0,
          37, 30000, -108.0, 40.4, 50000,
        ]),
        textureCoordinates: new Cesium.PolygonHierarchy([
          new Cesium.Cartesian2(0, 1),
          new Cesium.Cartesian2(0, 0),
          new Cesium.Cartesian2(0.5, 0),
          new Cesium.Cartesian2(1, 0),
          new Cesium.Cartesian2(1, 1),
        ] as any) as any,
        perPositionHeight: true,
        extrudedHeight: 0,
        material: new Cesium.ImageMaterialProperty({
          image: lu,
        }),
      },
    });

    /**
     * 标题：带孔洞和纹理坐标的多边形（Textured Polygon with Holes and Custom Texture Coordinates）
     * 功能：创建一个带有孔洞的五边形，每个顶点具有独立海拔高度，
     *       并对外环和孔洞分别指定纹理坐标，实现图片材质的精确映射。
     *
     * 核心原理（PolygonHierarchy 孔洞 + 纹理坐标）：
     *   - hierarchy 使用 new PolygonHierarchy(positions, holes) 构造：
     *     * 第一个参数 positions: 外环的 Cartesian3[] 顶点
     *     * 第二个参数 holes: PolygonHierarchy[] 孔洞数组，每个孔洞也是一个 PolygonHierarchy
     *   - textureCoordinates 的结构必须与 hierarchy 完全镜像：
     *     * 外环 5 个顶点 -> textureCoordinates 外环 5 个 Cartesian2
     *     * 孔洞 4 个顶点 -> textureCoordinates.holes[0] 也有 4 个 Cartesian2
     *   - 孔洞区域不会被渲染，纹理图片上对应的区域会被"挖空"
     *
     * 关键属性：
     *   - hierarchy: PolygonHierarchy(外环顶点, [PolygonHierarchy(孔洞顶点)])
     *   - textureCoordinates: PolygonHierarchy(外环UV, [PolygonHierarchy(孔洞UV)])
     *   - 孔洞 UV 坐标 (0.2,0.8) ~ (0.4,0.6) 表示纹理图片中间偏左上的一块矩形区域
     *   - perPositionHeight: true — 逐顶点高度
     *
     * 使用场景：
     *   1. 带有镂空区域的贴图多边形（如窗户、门洞）
     *   2. 复杂地理区域的表示（如带有湖泊的省份地图贴图）
     *
     * 对比区别：
     *   - 与 texturedPolygon 的区别：此处增加了 holes 孔洞定义及其对应的纹理坐标
     *   - 与 bluePolygon 的区别：blue 有多层嵌套孔洞但使用纯色；此处只有一层孔洞但使用图片纹理
     *   - holes 中的 PolygonHierarchy 如果不需要孔洞中的孔洞，第二个参数可省略
     *
     * tips：textureCoordinates 中 as any 类型断言是因为 Cesium TypeScript 类型定义
     *       中 PolygonHierarchy.positions 声明为 Cartesian3[]，但纹理坐标实际需要 Cartesian2[]。
     *       这是 Cesium 类型定义的局限性，运行时功能完全正常。
     */
    const texturedPolygonWithHoles = viewer.entities.add({
      name: "Textured polygon with per-position heights, holes and custom texture coordinates",
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArrayHeights([
            -130, 40.0, 50000, -130, 36.0, 30000, -125, 37, 35000, -120, 36.0,
            30000, -120, 40.0, 50000,
          ]),
          [
            new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArrayHeights([
                -128, 39.2, 46000, -128, 38.6, 42000, -127, 38.6, 42000, -127,
                39.2, 46000,
              ]),
            ),
          ],
        ),
        textureCoordinates: new Cesium.PolygonHierarchy(
          [
            new Cesium.Cartesian2(0, 1),
            new Cesium.Cartesian2(0, 0),
            new Cesium.Cartesian2(0.5, 0),
            new Cesium.Cartesian2(1, 0),
            new Cesium.Cartesian2(1, 1),
          ] as any,
          [
            new Cesium.PolygonHierarchy([
              new Cesium.Cartesian2(0.2, 0.8),
              new Cesium.Cartesian2(0.2, 0.6),
              new Cesium.Cartesian2(0.4, 0.6),
              new Cesium.Cartesian2(0.4, 0.8),
            ] as any),
          ] as any,
        ) as any,
        perPositionHeight: true,
        material: new Cesium.ImageMaterialProperty({
          image: "../images/Cesium_Logo_Color.jpg",
        }),
      },
    });

    /**
     * 标题：橙色逐顶点高度多边形（Orange Polygon with Per-Position Heights and Outline）
     * 功能：创建一个四边形多边形，其中每个顶点有不同的海拔高度，
     *       从各顶点高度向下拉伸到地面（extrudedHeight=0），形成不规则的立体形状，
     *       并显示黑色轮廓线。
     *
     * 核心原理（逐顶点高度 Per-Position Height）：
     *   - fromDegreesArrayHeights 的三元组 [lon, lat, height]：
     *     * 前 3 个顶点高度均为 100000m（100km）
     *     * 第 4 个顶点高度为 300000m（300km）——形成一个顶角翘起的倾斜面
     *   - perPositionHeight: true — 告诉 Cesium 使用每个顶点自带的高度值
     *   - extrudedHeight: 0 — 从各顶点高度向下拉伸到 0 米，生成连接地面的侧壁
     *   - 最终效果：顶面是一个倾斜的四边形，侧壁从倾斜面延伸到地面
     *
     * 关键属性：
     *   - perPositionHeight: true — 若为 false，所有顶点将使用统一的 height 值
     *   - material: withAlpha(0.5) — 半透明橙色，可以透过表面看到地表
     *   - outline: true + outlineColor — 显示多边形边缘轮廓线
     *
     * 使用场景：
     *   1. 可视化不规则高度的空域（如机场进近区域的阶梯状限高面）
     *   2. 地形剖面的三维展示
     *   3. 需要展示高度差异的区域标注
     *
     * 对比区别：
     *   - 与 greenPolygon 的区别：green 所有顶点等高（无 perPositionHeight）；orange 逐顶点独立高度
     *   - 与 cyanPolygon 的区别：cyan 形成垂直面（所有顶点同纬度）；orange 是倾斜的面
     *   - outline 只在设置了 height 或 extrudedHeight 时才会显示
     *
     * tips：perPositionHeight 和 height 属性互斥——设置 perPositionHeight: true 后，
     *       全局的 height 属性会被忽略，每个顶点使用 fromDegreesArrayHeights 中的高度值。
     */
    const orangePolygon = viewer.entities.add({
      name: "Orange polygon with per-position heights and outline",
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights([
          -108.0, 25.0, 100000, -100.0, 25.0, 100000, -100.0, 30.0, 100000,
          -108.0, 30.0, 300000,
        ]),
        extrudedHeight: 0,
        perPositionHeight: true,
        material: Cesium.Color.ORANGE.withAlpha(0.5),
        outline: true,
        outlineColor: Cesium.Color.BLACK,
      },
    });

    /**
     * 标题：蓝色多层嵌套孔洞多边形（Blue Polygon with Nested Holes）
     * 功能：创建一个带有三层嵌套孔洞的蓝色矩形多边形，展示 PolygonHierarchy 的
     *       递归孔洞能力——"孔洞中的孔洞"会被重新填充，形成同心嵌套的"回"字效果。
     *
     * 核心原理（递归孔洞 Nested Holes）：
     *   - PolygonHierarchy 的嵌套结构实现"挖空->填充->再挖空"的递归效果：
     *     * 第 1 层（外环）：大矩形 [-99,30] ~ [-85,40]（蓝色填充）
     *     * 第 2 层（孔洞1）：稍小的矩形 [-97,31] ~ [-87,39]（挖空，透明）
     *     * 第 3 层（孔洞的孔洞 = 岛）：更小的矩形 [-95,33] ~ [-89,37]（重新填充蓝色）
     *     * 第 4 层（岛中的孔洞）：最小的矩形 [-93,34] ~ [-91,36]（再次挖空）
     *   - 规律：奇数层渲染（填充），偶数层挖空（透明），交替进行
     *   - 最终效果：蓝色"回"字形，类似同心矩形嵌套
     *
     * 关键属性：
     *   - hierarchy: PolygonHierarchy 递归嵌套结构
     *     * 构造函数第二个参数 holes: PolygonHierarchy[] 中的每个元素
     *       又可以有自己的 holes，形成无限层级的嵌套
     *   - height: 0 — 贴地显示（height 是 outline 显示的前提条件）
     *   - outline: true — 显示每一层边界的轮廓线
     *
     * 使用场景：
     *   1. 展示"环形"或"回字形"区域（如环形保护区、缓冲带）
     *   2. 在地图上标注"排除区中的包含区"（嵌套管辖区域）
     *   3. PolygonHierarchy 递归能力的教学/演示
     *
     * 对比区别：
     *   - 与 texturedPolygonWithHoles 的区别：textured 只有一层孔洞；blue 有三层嵌套
     *   - 与 redPolygon 的区别：red 无孔洞（直接传 Cartesian3[]）；blue 使用 PolygonHierarchy 构造器
     *   - 传入 Cartesian3[] vs new PolygonHierarchy(...)：
     *     * 简单多边形可直接传 Cartesian3[]，Cesium 内部会自动包装为 PolygonHierarchy
     *     * 需要孔洞时必须使用 new PolygonHierarchy(positions, holes)
     *
     * tips：outline: true 需要设置 height（或 extrudedHeight）才能生效。
     *       若不设 height，多边形会贴地但轮廓线不会显示。
     */
    const bluePolygon = viewer.entities.add({
      name: "Blue polygon with holes",
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray([
            -99.0, 30.0, -85.0, 30.0, -85.0, 40.0, -99.0, 40.0,
          ]),
          [
            new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArray([
                -97.0, 31.0, -97.0, 39.0, -87.0, 39.0, -87.0, 31.0,
              ]),
              [
                new Cesium.PolygonHierarchy(
                  Cesium.Cartesian3.fromDegreesArray([
                    -95.0, 33.0, -89.0, 33.0, -89.0, 37.0, -95.0, 37.0,
                  ]),
                  [
                    new Cesium.PolygonHierarchy(
                      Cesium.Cartesian3.fromDegreesArray([
                        -93.0, 34.0, -91.0, 34.0, -91.0, 36.0, -93.0, 36.0,
                      ]),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        material: Cesium.Color.BLUE.withAlpha(0.5),
        height: 0,
        outline: true, // height is required for outline to display
      },
    });

    /**
     * 标题：青色垂直多边形（Cyan Vertical Polygon with Per-Position Heights）
     * 功能：创建一个"竖立"在地面上的三角形面片，类似一面旗帜或墙壁。
     *       三个顶点都在同一纬度线上（41 N），但高度不同：
     *       两端在地面（0m），中间点在 500km 高空，形成一个等腰三角形。
     *
     * 核心原理（垂直面 Vertical Polygon）：
     *   - 关键技巧：所有顶点共享同一纬度（41 N），只有经度和高度不同
     *   - 这使得多边形不是"铺在地面上"，而是"竖立在空中"
     *   - 三个顶点的空间位置：
     *     * (-90, 41, 0m)     — 左下角，地面
     *     * (-85, 41, 500km)  — 顶点，高空
     *     * (-80, 41, 0m)     — 右下角，地面
     *   - perPositionHeight: true — 使用每个顶点的独立高度
     *   - 无 extrudedHeight — 不拉伸，只渲染三角形面片本身
     *
     * 关键属性：
     *   - 所有顶点同纬度 + perPositionHeight 是创建垂直面的关键组合
     *   - material: withAlpha(0.5) — 半透明，可以从两面观察
     *   - outline: true — 三角形的三条边都会显示轮廓线
     *
     * 使用场景：
     *   1. 垂直剖面的可视化（如大气层分层剖面、地质断层面）
     *   2. 虚拟墙壁/屏障的表示（如电子围栏）
     *   3. 需要"竖立"在地面上的标识面
     *
     * 对比区别：
     *   - 与 orangePolygon 的区别：orange 的顶点分布在不同纬度，形成倾斜面；
     *     cyan 所有顶点同纬度，形成纯垂直面
     *   - 与 greenPolygon 的区别：green 通过 extrudedHeight 拉伸形成立体；
     *     cyan 直接通过顶点高度差异形成平面
     *   - 垂直多边形没有"顶面"和"底面"的概念，closeTop/closeBottom 对其无意义
     *
     * tips：Cesium 的多边形是双面渲染的（默认），所以从正面和背面都能看到这个三角形。
     *       若需要单面渲染，需使用 Primitive API 并设置 CullFace。
     */
    const cyanPolygon = viewer.entities.add({
      name: "Cyan vertical polygon with per-position heights and outline",
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights([
          -90.0, 41.0, 0.0, -85.0, 41.0, 500000.0, -80.0, 41.0, 0.0,
        ]),
        perPositionHeight: true,
        material: Cesium.Color.CYAN.withAlpha(0.5),
        outline: true,
        outlineColor: Cesium.Color.BLACK,
      },
    });

    /**
     * 标题：紫色恒向线多边形（Purple Polygon Using Rhumb Lines）
     * 功能：创建一个使用恒向线（Rhumb Line / Loxodrome）连接顶点的紫色矩形多边形，
     *       并向上拉伸 50km，带有品红色轮廓线。
     *
     * 核心原理（恒向线 Rhumb Line vs 大圆弧 Geodesic）：
     *   - arcType: ArcType.RHUMB — 顶点之间用恒向线连接
     *   - 恒向线（Rhumb Line）：在墨卡托投影上显示为直线的航线
     *     * 与所有经线保持恒定夹角（等角航线）
     *     * 在高纬度区域，恒向线与大圆弧差异显著
     *   - 大圆弧（Geodesic，默认）：地球表面两点间的最短路径
     *     * ArcType.GEODESIC — 默认值，沿大圆弧连接顶点
     *     * 在墨卡托投影上显示为弯曲的弧线
     *   - 此多边形在纬度 45~55 之间，恒向线的边在三维地球上看起来
     *     比大圆弧更"直"（更符合地图投影上的矩形外观）
     *
     * 关键属性：
     *   - arcType: Cesium.ArcType.RHUMB — 三种可选值：
     *     * ArcType.GEODESIC: 大圆弧（默认），最短路径
     *     * ArcType.RHUMB: 恒向线，等角航线
     *     * ArcType.NONE: 直线（在 3D 笛卡尔空间中的直线，穿过地球内部）
     *   - extrudedHeight: 50000 — 从 height（默认 0）拉伸到 50km
     *   - outlineColor: MAGENTA — 品红色轮廓线，与紫色填充形成对比
     *
     * 使用场景：
     *   1. 航海/航空中使用恒向线航路时的可视化
     *   2. 需要在高纬度地区绘制"矩形"区域时（大圆弧的边界会弯曲，恒向线更"方正"）
     *   3. 对比展示不同连线方式的视觉差异
     *
     * 对比区别：
     *   - 与其他多边形的区别：其他多边形默认使用 ArcType.GEODESIC（大圆弧）
     *   - 在低纬度地区 RHUMB 和 GEODESIC 视觉差异很小；在高纬度差异显著
     *   - ArcType.NONE 会产生穿过地球内部的直线，一般只用于空间场景
     *
     * tips：在赤道附近，三种 arcType 的视觉效果几乎一致。
     *       此示例选择 45~55 N 的高纬度区域，正是为了让差异更明显。
     *       可以尝试将 arcType 改为 GEODESIC 对比观察边界弯曲程度。
     */
    const purplePolygonUsingRhumbLines = viewer.entities.add({
      name: "Purple polygon using rhumb lines with outline",
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray([
          -120.0, 45.0, -80.0, 45.0, -80.0, 55.0, -120.0, 55.0,
        ]),
        extrudedHeight: 50000,
        material: Cesium.Color.PURPLE,
        outline: true,
        outlineColor: Cesium.Color.MAGENTA,
        arcType: Cesium.ArcType.RHUMB,
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
