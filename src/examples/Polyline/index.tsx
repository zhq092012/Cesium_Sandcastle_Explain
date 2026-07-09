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

    viewer.entities.add({
      name: "Red line on terrain",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([-75, 35, -125, 35]),
        width: 5,
        material: Cesium.Color.RED,
        clampToGround: true,
      },
    });

    viewer.entities.add({
      name: "Green rhumb line",
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([-75, 35, -125, 35]),
        width: 5,
        arcType: Cesium.ArcType.RHUMB,
        material: Cesium.Color.GREEN,
      },
    });

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
