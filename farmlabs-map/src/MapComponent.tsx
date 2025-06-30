import React, { useEffect, useRef, useState } from 'react';
import CoordinatePanel from './CoordinatePanel';
import LayerSelector from './LayerSelector';
import DataPanel from './DataPanel';
import { useOpenLayersMap } from './hooks/useOpenLayersMap';
import { useMarkerLayer } from './hooks/useMarkerLayer';
import { useFileHandlers } from './hooks/useFileHandlers';

interface MapComponentProps {
  center: [number, number] | null;
  zoom: number | null;
  layers: any;
  onCoordinateClick: (coord: [number, number], epsg: string) => void;
  onMapReady?: (map: any) => void;
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
  const [selectedLayerKey, setSelectedLayerKey] = useState<string | null>(null);
  const [sentinelLayer, setSentinelLayer] = useState<string>('1_TRUE_COLOR');
  const [sentinelLayers, setSentinelLayers] = useState<string[]>([]);
  const [gotoLon, setGotoLon] = useState<string>('');
  const [gotoLat, setGotoLat] = useState<string>('');
  const [markerCoord, setMarkerCoord] = useState<[number, number] | null>(null);
  const [epsg, setEpsg] = useState<'4326' | '3857'>('4326');
  const [showPanel] = useState(true);

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

  const { markerLayer, markerSource } = useMarkerLayer(markerCoord);

  // Only call the hook if all required values are non-null
  useOpenLayersMap({
    mapRef,
    center: center ?? [0, 0],
    zoom: zoom ?? 2,
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
  });

  const { handleFileImport, handleExport } = useFileHandlers(markerSource);

  const handleGoto = () => {
    const x = parseFloat(gotoLon);
    const y = parseFloat(gotoLat);
    if (!isNaN(x) && !isNaN(y)) {
      let coord: [number, number];
      if (epsg === '4326') {
        coord = [x, y];
      } else {
        coord = [x, y];
      }
      setCenter(coord);
      setMarkerCoord(coord);
    }
  };

  const handleRemoveMarker = () => {
    setMarkerCoord(null);
    markerSource.clear();
  };

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1 }}>
        <CoordinatePanel
          epsg={epsg}
          setEpsg={setEpsg}
          gotoLon={gotoLon}
          setGotoLon={setGotoLon}
          gotoLat={gotoLat}
          setGotoLat={setGotoLat}
          handleGoto={handleGoto}
          handleRemoveMarker={handleRemoveMarker}
        />
        <LayerSelector
          layers={layers}
          selectedLayerKey={selectedLayerKey}
          setSelectedLayerKey={setSelectedLayerKey}
          sentinelLayers={sentinelLayers}
          sentinelLayer={sentinelLayer}
          setSentinelLayer={setSentinelLayer}
        />
        <div ref={mapRef} style={{ width: '100%', height: '600px' }} />
      </div>
      {showPanel && (
        <DataPanel
          handleFileImport={handleFileImport}
          handleExport={handleExport}
        />
      )}
    </div>
  );
};

export default MapComponent;