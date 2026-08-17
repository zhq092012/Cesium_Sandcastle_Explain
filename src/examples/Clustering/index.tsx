import React, { useEffect, useRef } from "react";
import * as Cesium from "cesium";

export default function Clustering() {
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

    const options = {
      camera: viewer.scene.camera,
      canvas: viewer.scene.canvas,
    };
    const dataSourcePromise = viewer.dataSources.add(
      Cesium.KmlDataSource.load(
        "/SampleData/kml/facilities/facilities.kml",
        options,
      ),
    );
    dataSourcePromise.then(function (dataSource) {
      const pixelRange = 15;
      const minimumClusterSize = 3;
      const enabled = true;

      dataSource.clustering.enabled = enabled;
      dataSource.clustering.pixelRange = pixelRange;
      dataSource.clustering.minimumClusterSize = minimumClusterSize;


    });
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
