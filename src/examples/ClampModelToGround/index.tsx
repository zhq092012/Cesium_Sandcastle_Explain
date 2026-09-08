import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import Sandcastle from 'Sandcastle';

/** Official Sandcastle gallery ion id (AGI HQ photogrammetry, Exton PA). */
const SANDCASTLE_TILESET_ASSET_ID = 40866;

/**
 * This account’s My Assets copy of the same AGI HQ tileset.
 * Used only when 40866 404s; the tileset is already georeferenced — do not apply modelMatrix.
 */
const ACCOUNT_AGI_HQ_ASSET_ID = 355558;

/** Public URL for the CZML path the milk-truck entity follows. */
const CZML_URL = '/SampleData/ClampToGround.czml';

/** Public URL for the milk-truck glTF used by clamp / terrain modes. */
const MILK_TRUCK_MODEL_URL =
  '/SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb';

/** Public URL for the Cesium Air glTF used by relative-height modes. */
const AIR_MODEL_URL = '/SampleData/models/CesiumAir/Cesium_Air.glb';

/** Public URL for the drone glTF used when clamping is disabled. */
const DRONE_MODEL_URL = '/SampleData/models/CesiumDrone/CesiumDrone.glb';

/**
 * Clamp Model to Ground — same sequence as the official Cesium Sandcastle gallery:
 * Viewer + world terrain, street camera, fromIonAssetId, add primitive, CZML truck.
 * No modelMatrix / ENU relocation (that shears an ECEF tileset into a “mountain”).
 */
export default function Clamp_Model_to_Ground() {
  /** DOM node that hosts the Cesium Viewer canvas. */
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const storedIonToken = localStorage.getItem('cesium_ion_token');
    if (storedIonToken && storedIonToken.trim().length > 0) {
      Cesium.Ion.defaultAccessToken = storedIonToken.trim();
    }

    const viewer = new Cesium.Viewer(containerRef.current, {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      shadows: true,
    });

    const scene = viewer.scene;
    const clock = viewer.clock;

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromRadians(
        -1.3193669086512454,
        0.698810888305128,
        220,
      ),
      orientation: {
        heading: -1.3,
        pitch: -0.6,
        roll: 0,
      },
      endTransform: Cesium.Matrix4.IDENTITY,
    });

    /** Set true in cleanup so in-flight Ion / CZML loads do not touch a destroyed viewer. */
    let isDisposed = false;

    /**
     * Loads the gallery tileset (40866), then this account’s AGI_HQ (355558).
     * Official Sandcastle never transforms the tileset after load.
     *
     * @returns The photogrammetry tileset, or `undefined` if both ion ids fail.
     */
    const loadTileset = async (): Promise<Cesium.Cesium3DTileset | undefined> => {
      const assetIds = [SANDCASTLE_TILESET_ASSET_ID, ACCOUNT_AGI_HQ_ASSET_ID];
      for (const assetId of assetIds) {
        try {
          return await Cesium.Cesium3DTileset.fromIonAssetId(assetId, {
            enableCollision: true,
          });
        } catch (error) {
          console.log(`Error loading tileset ${assetId}: ${error}`);
        }
      }
      return undefined;
    };

    /**
     * Mirrors official Sandcastle `initialize` (top-level await) inside useEffect.
     */
    const initializeScene = async (): Promise<void> => {
      let tileset: Cesium.Cesium3DTileset | undefined;
      try {
        tileset = await loadTileset();
        if (isDisposed) {
          return;
        }
        if (tileset) {
          viewer.scene.primitives.add(tileset);
        }
      } catch (error) {
        console.log(`Error loading tileset: ${error}`);
      }

      let entity: Cesium.Entity | undefined;
      try {
        const dataSource = await Cesium.CzmlDataSource.load(CZML_URL);
        if (isDisposed) {
          return;
        }
        viewer.dataSources.add(dataSource);
        entity = dataSource.entities.getById('CesiumMilkTruck');
        if (entity) {
          entity.orientation = new Cesium.VelocityOrientationProperty(entity.position);
        }
      } catch (error) {
        console.log(`Error loading CZML: ${error}`);
      }

      if (isDisposed) {
        return;
      }

      clock.shouldAnimate = true;

      /**
       * Applies model URI / scale / heightReference like official Sandcastle
       * (raw values, not ConstantProperty wrappers).
       *
       * @param uri - glTF / glb URL.
       * @param scale - Uniform model scale.
       * @param heightReference - Clamping mode.
       */
      const applyClampingMode = (
        uri: string,
        scale: number,
        heightReference: Cesium.HeightReference,
      ): void => {
        if (!entity?.model) {
          return;
        }
        const model = entity.model as unknown as {
          uri: string;
          scale: number;
          heightReference: Cesium.HeightReference;
        };
        model.uri = uri;
        model.scale = scale;
        model.heightReference = heightReference;
      };

      const clampingOptions = [
        {
          text: 'Clamp to ground',
          onselect: () => {
            applyClampingMode(
              MILK_TRUCK_MODEL_URL,
              2.5,
              Cesium.HeightReference.CLAMP_TO_GROUND,
            );
          },
        },
        {
          text: 'Relative to ground',
          onselect: () => {
            applyClampingMode(
              AIR_MODEL_URL,
              1.0,
              Cesium.HeightReference.RELATIVE_TO_GROUND,
            );
          },
        },
        {
          text: 'Clamp to terrain only',
          onselect: () => {
            applyClampingMode(
              MILK_TRUCK_MODEL_URL,
              2.5,
              Cesium.HeightReference.CLAMP_TO_TERRAIN,
            );
          },
        },
        {
          text: 'Relative to terrain only',
          onselect: () => {
            applyClampingMode(
              AIR_MODEL_URL,
              1.0,
              Cesium.HeightReference.RELATIVE_TO_TERRAIN,
            );
          },
        },
        {
          text: 'Clamp to 3D Tiles only',
          onselect: () => {
            applyClampingMode(
              MILK_TRUCK_MODEL_URL,
              1.0,
              Cesium.HeightReference.CLAMP_TO_3D_TILE,
            );
          },
        },
        {
          text: 'Relative to 3D Tiles only',
          onselect: () => {
            applyClampingMode(
              AIR_MODEL_URL,
              1.0,
              Cesium.HeightReference.RELATIVE_TO_3D_TILE,
            );
          },
        },
        {
          text: 'No clamping',
          onselect: () => {
            applyClampingMode(
              DRONE_MODEL_URL,
              2.5,
              Cesium.HeightReference.NONE,
            );
          },
        },
      ];

      Sandcastle.addToolbarMenu(clampingOptions);
      clampingOptions[0]?.onselect();

      if (tileset) {
        Sandcastle.addToggleButton('Show 3D tileset', tileset.show, (checked) => {
          tileset.show = checked;
        });
      }
      Sandcastle.addToggleButton('Show globe', scene.globe.show, (checked) => {
        scene.globe.show = checked;
      });
      Sandcastle.addToggleButton(
        'Track entity',
        Cesium.defined(viewer.trackedEntity),
        (checked) => {
          viewer.trackedEntity = checked ? entity : undefined;
        },
      );
    };

    void initializeScene();

    return () => {
      isDisposed = true;
      Sandcastle.reset();
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
        overflow: 'hidden',
      }}
    />
  );
}
