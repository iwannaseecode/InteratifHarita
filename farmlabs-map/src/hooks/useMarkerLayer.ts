import { useEffect, useRef } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import { fromLonLat } from 'ol/proj';

export function useMarkerLayer(markerCoord: [number, number] | null) {
  const markerSourceRef = useRef<VectorSource>(new VectorSource());
  const markerLayerRef = useRef<VectorLayer>(
    new VectorLayer({
      source: markerSourceRef.current,
      style: new Style({
        image: new CircleStyle({
          radius: 4,
          fill: new Fill({ color: 'red' }),
        }),
      }),
    })
  );

  useEffect(() => {
    const markerSource = markerSourceRef.current;
    markerSource.clear();
    if (markerCoord) {
      markerSource.addFeature(
        new Feature({
          geometry: new Point(fromLonLat(markerCoord)),
        })
      );
    }
  }, [markerCoord]);

  return { markerLayer: markerLayerRef.current, markerSource: markerSourceRef.current };
}