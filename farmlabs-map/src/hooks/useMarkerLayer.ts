import { useEffect, useRef } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import { fromLonLat } from 'ol/proj';

export function useMarkerLayer(
  markerCoord: [number, number] | null,
  importedFeatures: Feature[] = []
) {
  const markerSourceRef = useRef<VectorSource>(new VectorSource());
  const markerLayerRef = useRef<VectorLayer>(
    new VectorLayer({
      source: markerSourceRef.current,
      style: undefined, // We'll set styles per feature
    })
  );

  useEffect(() => {
    const markerSource = markerSourceRef.current;
    markerSource.clear();

    // Add marker for clicked coordinate
    if (markerCoord) {
      markerSource.addFeature(
        new Feature({
          geometry: new Point(fromLonLat(markerCoord)),
        })
      );
    }

    if (importedFeatures.length > 0) {
      // Add yellow dots for each vertex of polygons and lines
      importedFeatures.forEach((f) => {
        const geom = f.getGeometry();
        // Style the feature itself
        f.setStyle(
          new Style({
            stroke: new Stroke({ color: 'yellow', width: 3 }),
            fill: new Fill({ color: 'rgba(255,255,0,0.2)' }),
            image: new CircleStyle({
              radius: 7,
              fill: new Fill({ color: 'yellow' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
            }),
          })
        );
        if (geom instanceof Polygon) {
          // For each ring in the polygon
          geom.getCoordinates().forEach((ring) => {
            ring.forEach((coord) => {
              const pt = new Feature(new Point(coord));
              pt.setStyle(
                new Style({
                  image: new CircleStyle({
                    radius: 7,
                    fill: new Fill({ color: 'yellow' }),
                    stroke: new Stroke({ color: '#fff', width: 2 }),
                  }),
                })
              );
              markerSource.addFeature(pt);
            });
          });
        } else if (geom instanceof LineString) {
          geom.getCoordinates().forEach((coord) => {
            const pt = new Feature(new Point(coord));
            pt.setStyle(
              new Style({
                image: new CircleStyle({
                  radius: 7,
                  fill: new Fill({ color: 'yellow' }),
                  stroke: new Stroke({ color: '#fff', width: 2 }),
                }),
              })
            );
            markerSource.addFeature(pt);
          });
        } else if (geom instanceof Point) {
          // Already styled above, just add the feature
        }
      });
      // Add the original features last so they don't overwrite the dots
      markerSource.addFeatures(importedFeatures);
    }
  }, [markerCoord, importedFeatures]);

  return { markerLayer: markerLayerRef.current, markerSource: markerSourceRef.current };
}