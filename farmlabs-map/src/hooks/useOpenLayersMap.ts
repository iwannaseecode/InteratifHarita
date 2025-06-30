import { useEffect, RefObject } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import TileWMS from 'ol/source/TileWMS';
import { fromLonLat, toLonLat, transform } from 'ol/proj';
import type { Coordinate } from 'ol/coordinate';

interface UseOpenLayersMapProps {
  mapRef: RefObject<HTMLDivElement | null>;
  center: [number, number] | null;
  zoom: number | null;
  layers: any;
  selectedLayerKey: string | null;
  sentinelLayer: string;
  markerLayer: any;
  epsg: '4326' | '3857';
  onMapReady?: (map: Map) => void;
  onCoordinateClick: (coord: [number, number], epsg: string) => void;
  setMarkerCoord: (coord: [number, number]) => void;
  setCenter: (coord: [number, number]) => void;
  setGotoLon: (lon: string) => void;
  setGotoLat: (lat: string) => void;
}

function toTuple(coord: Coordinate): [number, number] {
  // Defensive: Only use first two numbers, fallback to 0 if missing
  return [Number(coord[0] ?? 0), Number(coord[1] ?? 0)];
}

export function useOpenLayersMap({
  mapRef,
  center,
  zoom,
  layers,
  selectedLayerKey,
  sentinelLayer,
  markerLayer,
  epsg,
  onMapReady,
  onCoordinateClick,
  setMarkerCoord,
  setCenter,
  setGotoLon,
  setGotoLat,
}: UseOpenLayersMapProps) {
  useEffect(() => {
    if (!mapRef.current || !center || zoom === null || !selectedLayerKey) return;

    const getTileSource = () => {
      const layer = layers[selectedLayerKey];
      if (selectedLayerKey === 'SentinelWms' && layer && layer.url && sentinelLayer) {
        return new TileWMS({
          url: layer.url,
          params: {
            'LAYERS': sentinelLayer,
            'TILED': true,
            'FORMAT': 'image/png'
          },
          serverType: 'geoserver',
          crossOrigin: 'anonymous'
        });
      } else if (typeof layer === 'string') {
        return new XYZ({
          url: layer,
          crossOrigin: 'anonymous'
        });
      }
      return undefined;
    };

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: getTileSource()
        }),
        markerLayer
      ],
      view: new View({
        center: fromLonLat(center),
        zoom: zoom
      })
    });

    if (onMapReady) onMapReady(map);

    const handleClick = (event: any) => {
      const lonLat = toTuple(toLonLat(event.coordinate as Coordinate));
      const displayCoord = epsg === '4326'
        ? lonLat
        : toTuple(transform(lonLat, 'EPSG:4326', 'EPSG:3857'));
      onCoordinateClick(displayCoord, epsg);
      setMarkerCoord(lonLat);
      setCenter(lonLat);
      setGotoLon(displayCoord[0].toString());
      setGotoLat(displayCoord[1].toString());
    };
    map.on('click', handleClick);

    return () => {
      map.un('click', handleClick);
      map.setTarget(undefined);
    };
  }, [center, zoom, layers, selectedLayerKey, sentinelLayer, markerLayer, epsg, mapRef, onMapReady, onCoordinateClick, setMarkerCoord, setCenter, setGotoLon, setGotoLat]);
}