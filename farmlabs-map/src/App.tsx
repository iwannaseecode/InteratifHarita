import React, { useEffect, useRef, useState } from 'react';
import MapComponent from './MapComponent';
import { fetchMapDefaults, fetchMapLayers, sendCoordinate } from './api';
import './App.css';
import AreaInfoPanel from './AreaInfoPanel';
import { getArea } from 'ol/sphere';
import Feature from 'ol/Feature';
import Geometry from 'ol/geom/Geometry';

function App() {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [layers, setLayers] = useState<any>({});
  const [lastCoord, setLastCoord] = useState<[number, number] | null>(null);
  const [lastEpsg, setLastEpsg] = useState<string>('4326');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const mapRef = useRef<any>(null);

  // Alan bilgisi için import edilen poligonları takip et
  const [importedFeatures, setImportedFeatures] = useState<Feature<Geometry>[]>([]);

  useEffect(() => {
    fetchMapDefaults().then(data => {
      setCenter(data.center);
      setZoom(data.zoom);
    });
    fetchMapLayers().then(setLayers);
  }, []);

  const handleCoordinateClick = async (coord: [number, number], epsg: string) => {
    setLastCoord(coord);
    setLastEpsg(epsg);
    try {
      const response = await sendCoordinate(coord[0], coord[1], epsg);
      setApiResponse(response);
    } catch (error) {
      setApiResponse({ error: 'Failed to send coordinate' });
    }
  };

  // MapComponent'ten import edilen feature'ları almak için bir callback
  const handleImportedFeatures = (features: Feature<Geometry>[]) => {
    setImportedFeatures(features);
  };

  // Toplam poligon alanını hesapla
  let totalArea: number | null = null;
  if (importedFeatures.length > 0) {
    totalArea = importedFeatures
      .filter(f => f.getGeometry() && f.getGeometry()!.getType() === 'Polygon')
      .map(f => getArea(f.getGeometry()!))
      .reduce((a, b) => a + b, 0);
  }

  return (
    <div className="App">
      <h1>Farmlabs Satellite Viewer</h1>
      {/* Alan tablosu haritanın üstünde */}
      <AreaInfoPanel area={totalArea} />
      <MapComponent
        center={center}
        zoom={zoom}
        layers={layers}
        onCoordinateClick={handleCoordinateClick}
        onMapReady={map => (mapRef.current = map)}
        setCenter={setCenter}
        setZoom={setZoom}
        // Yeni prop: import edilen feature'ları App'e aktar
        onImportedFeatures={handleImportedFeatures}
      />
      {lastCoord && (
        <div className="coord-info">
          <h3>Clicked Coordinate</h3>
          <p>X: {lastCoord[0].toFixed(2)}</p>
          <p>Y: {lastCoord[1].toFixed(2)}</p>
          <p>EPSG: {lastEpsg}</p>
        </div>
      )}
      {apiResponse && (
        <div className="api-response">
          <h3>API Response</h3>
          <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;