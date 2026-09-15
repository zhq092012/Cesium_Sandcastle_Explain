import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import Sandcastle from 'Sandcastle';
import { applyCesiumIonToken } from '../../cesiumIon';



/**
 * 当前账号 My Assets 中 AGI 总部倾斜摄影瓦片集的 Ion Asset ID。
 * 仅在公共资产 40866 加载失败时作为备用；
 * 该瓦片集已完成地理配准，加载后不要再叠加 modelMatrix 变换。
 */
const ACCOUNT_AGI_HQ_ASSET_ID = 355558;

/** 牛奶车实体所跟随路径的 CZML 文件公共 URL。 */
const CZML_URL = '/SampleData/ClampToGround.czml';

/** 贴地 / 地形模式下使用的牛奶车 glTF 模型公共 URL。 */
const MILK_TRUCK_MODEL_URL =
  '/SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb';

/** 相对高度模式下使用的 Cesium 飞机 glTF 模型公共 URL。 */
const AIR_MODEL_URL = '/SampleData/models/CesiumAir/Cesium_Air.glb';

/** 禁用贴地时使用的无人机 glTF 模型公共 URL。 */
const DRONE_MODEL_URL = '/SampleData/models/CesiumDrone/CesiumDrone.glb';

/**
 * 模型贴地 (Clamp Model to Ground) 示例组件。
 *
 * 与官方 Cesium Sandcastle 画廊保持一致：
 * 创建带世界地形的 Viewer、设置街景相机、
 * 通过 fromIonAssetId 加载瓦片集、添加图元、加载 CZML 牛奶车实体。
 * 不对已完成地理配准的 ECEF 瓦片集叠加 modelMatrix / ENU 变换
 * （否则会将其"剪切"成一座"山峰"）。
 */
export default function Clamp_Model_to_Ground() {
  /** 承载 Cesium Viewer 画布的 DOM 节点引用。 */
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 应用 Ion token（localStorage > .env），与 Preview 握手逻辑保持一致
    applyCesiumIonToken();

    // 初始化 Cesium Viewer，开启世界地形与阴影
    const viewer = new Cesium.Viewer(containerRef.current, {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      shadows: true,
    });

    /** 当前 Viewer 对应的场景对象，用于操控图元和地球显示。 */
    const scene = viewer.scene;

    /** 当前 Viewer 的时钟对象，用于控制动画播放。 */
    const clock = viewer.clock;

    // 设置初始相机视角（AGI 总部街景）
    viewer.camera.setView({
      // 目标位置：弧度制经纬度 + 海拔高度（米）
      destination: Cesium.Cartesian3.fromRadians(
        -1.3193669086512454,
        0.698810888305128,
        220,
      ),
      orientation: {
        heading: -1.3,  // 航向角（弧度），负值表示偏西
        pitch: -0.6,    // 俯仰角（弧度），负值表示向下看
        roll: 0,        // 翻滚角（弧度）
      },
      endTransform: Cesium.Matrix4.IDENTITY, // 使用世界坐标系（无附加变换）
    });

    /**
     * 组件卸载标志。
     * 在 cleanup 函数中置为 true，防止异步的 Ion / CZML 加载回调
     * 在 Viewer 销毁后继续操作已释放的对象。
     */
    let isDisposed = false;

    /**
     * 异步加载 AGI 总部倾斜摄影瓦片集。
     * 先尝试公共画廊资产 40866（与官方 Sandcastle 一致），
     * 失败后回退到当前账号的个人资产 355558。
     * 官方 Sandcastle 在加载完成后不对瓦片集做任何矩阵变换。
     *
     * @returns 加载成功的瓦片集实例；若两个 Ion ID 均失败则返回 `undefined`。
     */
    const loadTileset = async (): Promise<Cesium.Cesium3DTileset | undefined> => {
      // 先尝试官方公共资产 40866（AGI 总部倾斜摄影，无需特殊权限）
      try {
        return await Cesium.Cesium3DTileset.fromIonAssetId(40866, {
          enableCollision: true, // 开启碰撞检测，使贴地计算更精确
        });
      } catch (error) {
        console.warn(
          'Error loading public tileset 40866. If you see net::ERR_CONNECTION_CLOSED, api.cesium.com may be unreachable (check VPN/proxy).',
          error,
        );
      }
      // 回退到当前账号的个人资产 355558
      try {
        return await Cesium.Cesium3DTileset.fromIonAssetId(ACCOUNT_AGI_HQ_ASSET_ID, {
          enableCollision: true,
        });
      } catch (error) {
        console.warn(
          `Error loading account tileset ${ACCOUNT_AGI_HQ_ASSET_ID}. Verify your Ion token and network access to api.cesium.com.`,
          error,
        );
      }
      return undefined;
    };

    /**
     * 场景初始化主函数，对应官方 Sandcastle 的顶层 await 逻辑，
     * 在 React useEffect 内部以 async 函数的形式实现。
     *
     * 执行顺序：
     * 1. 加载并添加倾斜摄影瓦片集到场景图元列表
     * 2. 加载 CZML 数据源，获取牛奶车实体并设置速度朝向
     * 3. 启动时钟动画
     * 4. 注册 Sandcastle 工具栏按钮（贴地模式选择、图层切换等）
     */
    const initializeScene = async (): Promise<void> => {
      /** 倾斜摄影瓦片集实例，加载失败时为 undefined。 */
      let tileset: Cesium.Cesium3DTileset | undefined;
      try {
        tileset = await loadTileset();
        if (isDisposed) {
          return; // 组件已卸载，提前退出，防止操作已销毁的 Viewer
        }
        if (tileset) {
          viewer.scene.primitives.add(tileset); // 将瓦片集添加到场景图元集合
        }
      } catch (error) {
        console.log(`Error loading tileset: ${error}`);
      }

      /** 从 CZML 数据源中获取的牛奶车实体，用于动态切换贴地模式。 */
      let entity: Cesium.Entity | undefined;
      try {
        // 异步加载 CZML 数据源（包含牛奶车实体的路径及属性定义）
        const dataSource = await Cesium.CzmlDataSource.load(CZML_URL);
        if (isDisposed) {
          return;
        }
        viewer.dataSources.add(dataSource);
        entity = dataSource.entities.getById('CesiumMilkTruck');
        if (entity) {
          // 使用速度方向属性自动计算实体朝向，使模型沿路径方向行驶
          entity.orientation = new Cesium.VelocityOrientationProperty(entity.position);
        }
      } catch (error) {
        console.log(`Error loading CZML: ${error}`);
      }

      if (isDisposed) {
        return;
      }

      // 启动时钟动画，使牛奶车实体沿 CZML 路径运动
      clock.shouldAnimate = true;

      /**
       * 统一修改实体模型的 URI、缩放比例和高度参考，
       * 与官方 Sandcastle 保持一致（直接赋值原始值，不使用 ConstantProperty 包装）。
       *
       * @param uri            - 要切换的 glTF / glb 模型文件 URL。
       * @param scale          - 模型的等比缩放系数。
       * @param heightReference - 模型的高度参考模式（贴地 / 相对高度 / 无）。
       */
      const applyClampingMode = (
        uri: string,
        scale: number,
        heightReference: Cesium.HeightReference,
      ): void => {
        if (!entity?.model) {
          return; // 实体或模型未就绪时直接返回
        }
        /**
         * 将 entity.model 强制转换为包含可写字段的对象。
         * Cesium 的 ModelGraphics 属性在运行时支持直接赋值原始类型，
         * 但 TypeScript 类型定义要求 Property 类型，故使用 unknown 中转。
         */
        const model = entity.model as unknown as {
          /** 模型文件的 URL 地址。 */
          uri: string;
          /** 模型的等比缩放系数。 */
          scale: number;
          /** 模型相对于地球表面的高度参考模式。 */
          heightReference: Cesium.HeightReference;
        };
        model.uri = uri;
        model.scale = scale;
        model.heightReference = heightReference;
      };

      /**
       * 工具栏下拉菜单选项列表。
       * 每个选项对应一种贴地模式，点击后调用 applyClampingMode 切换模型。
       *
       * 选项结构：
       * - text      - 显示在下拉菜单中的文字标签。
       * - onselect  - 选中该选项时触发的回调函数。
       */
      const clampingOptions = [
        {
          text: 'Clamp to ground',        // 贴地（地形 + 3D Tiles 均贴）
          onselect: () => {
            applyClampingMode(
              MILK_TRUCK_MODEL_URL,
              2.5,
              Cesium.HeightReference.CLAMP_TO_GROUND,
            );
          },
        },
        {
          text: 'Relative to ground',     // 相对地面高度（地形 + 3D Tiles）
          onselect: () => {
            applyClampingMode(
              AIR_MODEL_URL,
              1.0,
              Cesium.HeightReference.RELATIVE_TO_GROUND,
            );
          },
        },
        {
          text: 'Clamp to terrain only',  // 仅贴地形（忽略 3D Tiles）
          onselect: () => {
            applyClampingMode(
              MILK_TRUCK_MODEL_URL,
              2.5,
              Cesium.HeightReference.CLAMP_TO_TERRAIN,
            );
          },
        },
        {
          text: 'Relative to terrain only', // 仅相对地形高度（忽略 3D Tiles）
          onselect: () => {
            applyClampingMode(
              AIR_MODEL_URL,
              1.0,
              Cesium.HeightReference.RELATIVE_TO_TERRAIN,
            );
          },
        },
        {
          text: 'Clamp to 3D Tiles only', // 仅贴 3D Tiles（忽略地形）
          onselect: () => {
            applyClampingMode(
              MILK_TRUCK_MODEL_URL,
              1.0,
              Cesium.HeightReference.CLAMP_TO_3D_TILE,
            );
          },
        },
        {
          text: 'Relative to 3D Tiles only', // 仅相对 3D Tiles 高度（忽略地形）
          onselect: () => {
            applyClampingMode(
              AIR_MODEL_URL,
              1.0,
              Cesium.HeightReference.RELATIVE_TO_3D_TILE,
            );
          },
        },
        {
          text: 'No clamping',            // 不贴地，模型浮空（使用无人机模型）绝对高度
          onselect: () => {
            applyClampingMode(
              DRONE_MODEL_URL,
              2.5,
              Cesium.HeightReference.NONE,
            );
          },
        },
      ];

      // 向 Sandcastle 工具栏注册贴地模式下拉菜单，并默认选中第一项
      Sandcastle.addToolbarMenu(clampingOptions);
      clampingOptions[0]?.onselect();

      // 若瓦片集加载成功，添加"显示/隐藏 3D 瓦片集"切换按钮
      if (tileset) {
        Sandcastle.addToggleButton('Show 3D tileset', tileset.show, (checked) => {
          tileset.show = checked;
        });
      }
      // 添加"显示/隐藏地球"切换按钮
      Sandcastle.addToggleButton('Show globe', scene.globe.show, (checked) => {
        scene.globe.show = checked;
      });
      // 添加"跟踪实体"切换按钮，开启后相机将锁定跟随牛奶车实体
      Sandcastle.addToggleButton(
        'Track entity',
        Cesium.defined(viewer.trackedEntity),
        (checked) => {
          viewer.trackedEntity = checked ? entity : undefined;
        },
      );
    };

    // 触发场景初始化（void 用于明确丢弃 Promise，避免 ESLint 警告）
    void initializeScene();

    // cleanup：组件卸载时设置标志位、重置 Sandcastle 工具栏、销毁 Viewer
    return () => {
      isDisposed = true;    // 阻止异步回调继续操作已销毁的 Viewer
      Sandcastle.reset();   // 清空 Sandcastle 工具栏上注册的所有按钮
      viewer.destroy();     // 释放 Cesium Viewer 及其持有的 WebGL 资源
    };
  }, []); // 空依赖数组：仅在组件挂载时执行一次

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',       // 撑满父容器宽度
        height: '100%',      // 撑满父容器高度
        position: 'absolute',
        top: 0,
        left: 0,
        margin: 0,
        padding: 0,
        overflow: 'hidden',  // 防止画布溢出产生滚动条
      }}
    />
  );
}
