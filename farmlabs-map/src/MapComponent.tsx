import React, { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import { fromLonLat, toLonLat, transform } from 'ol/proj';
import XYZ from 'ol/source/XYZ';
import TileWMS from 'ol/source/TileWMS';
import 'ol/ol.css';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
// @ts-ignore
import * as shp from 'shpjs';

interface MapComponentProps {
  center: [number, number] | null;
  zoom: number | null;
  layers: any;
  onCoordinateClick: (coord: [number, number], epsg: string) => void;
  onMapReady?: (map: Map) => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  center,
  zoom,
  layers,
  onCoordinateClick,
  onMapReady,
  setCenter,
  setZoom,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerSourceRef = useRef<VectorSource | null>(null);
  const onCoordinateClickRef = useRef(onCoordinateClick);
  const [selectedLayerKey, setSelectedLayerKey] = useState<string | null>(null);
  const [sentinelLayer, setSentinelLayer] = useState<string>('1_TRUE_COLOR');
  const [sentinelLayers, setSentinelLayers] = useState<string[]>([]);
  const [gotoLon, setGotoLon] = useState<string>('');
  const [gotoLat, setGotoLat] = useState<string>('');
  const [markerCoord, setMarkerCoord] = useState<[number, number] | null>(null);
  const [epsg, setEpsg] = useState<'4326' | '3857'>('4326');
  const [showPanel] = useState(true);

  useEffect(() => {
    onCoordinateClickRef.current = onCoordinateClick;
  }, [onCoordinateClick]);

  useEffect(() => {
    if (layers && Object.keys(layers).length > 0) {
      const firstKey = Object.keys(layers)[0];
      setSelectedLayerKey(firstKey);
      if (layers.SentinelWms && layers.SentinelWms.layers && layers.SentinelWms.layers.length > 0) {
        setSentinelLayers(layers.SentinelWms.layers);
        const defaultLayer =
          layers.SentinelWms.layers.find((l: string) => l === '1_TRUE_COLOR') ||
          layers.SentinelWms.layers[0];
        setSentinelLayer(defaultLayer);
      }
    }
  }, [layers]);

  useEffect(() => {
    if (
      selectedLayerKey === 'SentinelWms' &&
      layers.SentinelWms &&
      layers.SentinelWms.layers &&
      layers.SentinelWms.layers.length > 0
    ) {
      setSentinelLayers(layers.SentinelWms.layers);
      const defaultLayer =
        layers.SentinelWms.layers.find((l: string) => l === '1_TRUE_COLOR') ||
        layers.SentinelWms.layers[0];
      setSentinelLayer(defaultLayer);
    }
  }, [selectedLayerKey, layers]);

  const fromMapClickToLonLat = (coord: [number, number]) => toLonLat(coord) as [number, number];

  const handleGoto = () => {
    const x = parseFloat(gotoLon);
    const y = parseFloat(gotoLat);
    if (!isNaN(x) && !isNaN(y)) {
      let coord: [number, number];
      if (epsg === '4326') {
        coord = [x, y];
      } else {
        coord = transform([x, y], 'EPSG:3857', 'EPSG:4326') as [number, number];
      }
      setCenter(coord);
      setMarkerCoord(coord);
    }
  };

  const handleRemoveMarker = () => {
    setMarkerCoord(null);
    if (markerSourceRef.current) {
      markerSourceRef.current.clear();
    }
  };

  // Dosya import (GeoJSON, KML, SHP)
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async evt => {
      const text = evt.target?.result as string;
      let features: Feature[] = [];
      if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
        features = new GeoJSON().readFeatures(text, { featureProjection: 'EPSG:3857' });
      } else if (file.name.endsWith('.kml')) {
        features = new KML().readFeatures(text, { featureProjection: 'EPSG:3857' });
      } else if (file.name.endsWith('.shp') || file.name.endsWith('.zip')) {
        const arrayBuffer = await file.arrayBuffer();
        const geojson = await shp(arrayBuffer);
        features = new GeoJSON().readFeatures(geojson, { featureProjection: 'EPSG:3857' });
      } else {
        alert('Only GeoJSON, KML, and SHP supported.');
        return;
      }
      if (markerSourceRef.current) {
        markerSourceRef.current.clear();
        markerSourceRef.current.addFeatures(features);
      }
    };
    if (file.name.endsWith('.shp') || file.name.endsWith('.zip')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Export işlemleri (GeoJSON, KML, SHP)
  const handleExport = (format: 'geojson' | 'kml' | 'shp') => {
    if (!markerSourceRef.current) return;
    if (format === 'geojson') {
      const data = new GeoJSON().writeFeatures(markerSourceRef.current.getFeatures());
      downloadFile(data, 'export.geojson', 'application/geo+json');
    } else if (format === 'kml') {
      const data = new KML().writeFeatures(markerSourceRef.current.getFeatures());
      downloadFile(data, 'export.kml', 'application/vnd.google-earth.kml+xml');
    } else if (format === 'shp') {
      const geojson = new GeoJSON().writeFeaturesObject(markerSourceRef.current.getFeatures());
      fetch('http://localhost:5010/api/export/shp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geojson),
      })
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'export.zip';
          a.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => alert('SHP export için backend entegrasyonu gerekir.'));
    }
  };

  const downloadFile = (data: string, filename: string, mime: string) => {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!mapRef.current || !center || zoom === null || !selectedLayerKey) return;

    const markerSource = new VectorSource();
    markerSourceRef.current = markerSource;
    const markerLayer = new VectorLayer({
      source: markerSource,
      style: new Style({
        image: new CircleStyle({
          radius: 4,
          fill: new Fill({ color: 'red' }),
        }),
      }),
    });

    if (markerCoord) {
      markerSource.addFeature(
        new Feature({
          geometry: new Point(fromLonLat(markerCoord)),
        })
      );
    }

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
      const lonLat = fromMapClickToLonLat(event.coordinate as [number, number]);
      const displayCoord = epsg === '4326'
        ? lonLat
        : transform(lonLat, 'EPSG:4326', 'EPSG:3857') as [number, number];
      onCoordinateClickRef.current(displayCoord, epsg);
      markerSource.clear();
      markerSource.addFeature(
        new Feature({
          geometry: new Point(event.coordinate),
        })
      );
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
  }, [center, zoom, layers, selectedLayerKey, sentinelLayer, markerCoord, epsg, onMapReady]);

  return (
    <div style={{ display: 'flex' }}>
      {/* Map Area */}
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 10 }}>
          <label>Coordinate System: </label>
          <select value={epsg} onChange={e => setEpsg(e.target.value as '4326' | '3857')}>
            <option value="4326">EPSG:4326 (Lon/Lat)</option>
            <option value="3857">EPSG:3857 (Web Mercator/meters)</option>
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <input
            type="number"
            placeholder={epsg === '4326' ? 'Longitude' : 'X (meters)'}
            value={gotoLon}
            onChange={e => setGotoLon(e.target.value)}
            style={{ width: 120, marginRight: 5 }}
          />
          <input
            type="number"
            placeholder={epsg === '4326' ? 'Latitude' : 'Y (meters)'}
            value={gotoLat}
            onChange={e => setGotoLat(e.target.value)}
            style={{ width: 120, marginRight: 5 }}
          />
          <button onClick={handleGoto}>Go</button>
          <button onClick={handleRemoveMarker} style={{ marginLeft: 5 }}>Remove Dot</button>
        </div>
        {Object.keys(layers).length > 0 && (
          <select
            value={selectedLayerKey || ''}
            onChange={e => setSelectedLayerKey(e.target.value)}
            style={{ marginBottom: 10 }}
          >
            {Object.keys(layers).map(key => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        )}
        {selectedLayerKey === 'SentinelWms' && sentinelLayers.length > 0 && (
          <select
            value={sentinelLayer}
            onChange={e => setSentinelLayer(e.target.value)}
            style={{ marginLeft: 10, marginBottom: 10 }}
          >
            {sentinelLayers.map(layer => (
              <option key={layer} value={layer}>
                {layer}
              </option>
            ))}
          </select>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '600px' }} />
      </div>
      {/* Right Panel */}
      {showPanel && (
        <div style={{
          width: 250,
          background: '#f7f7f7',
          borderLeft: '1px solid #ddd',
          padding: 16,
          marginLeft: 10
        }}>
          <h3>Veri Ekle/Export</h3>
          <input
            type="file"
            accept=".geojson,.json,.kml,.shp,.zip"
            onChange={handleFileImport}
            style={{ marginBottom: 10 }}
          />
          <div>
            <button onClick={() => handleExport('geojson')} style={{ marginRight: 8 }}>
              Export GeoJSON
            </button>
            <button onClick={() => handleExport('kml')}>
              Export KML
            </button>
            <button onClick={() => handleExport('shp')}>
              Export SHP
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;