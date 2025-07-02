import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
// @ts-ignore
import * as shp from 'shpjs';
import { downloadFile } from '../utils/file';

export function useFileHandlers(markerSource: any) {
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async evt => {
      const text = evt.target?.result as string;
      let features: any[] = [];
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
      markerSource.clear();
      markerSource.addFeatures(features);
    };
    if (file.name.endsWith('.shp') || file.name.endsWith('.zip')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleExport = (format: 'geojson' | 'kml' | 'shp' | 'dwg') => {
    if (!markerSource) return;
    if (format === 'geojson') {
      const data = new GeoJSON().writeFeatures(markerSource.getFeatures());
      downloadFile(data, 'export.geojson', 'application/geo+json');
    } else if (format === 'kml') {
      const data = new KML().writeFeatures(markerSource.getFeatures());
      downloadFile(data, 'export.kml', 'application/vnd.google-earth.kml+xml');
    } else if (format === 'shp') {
      const geojson = new GeoJSON().writeFeaturesObject(markerSource.getFeatures());
      fetch('http://localhost:5010/api/export/shp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geojson),
      })
        .then(res => res.blob())
        .then(blob => {
          downloadFile(blob, 'export.zip', 'application/zip');
        })
        .catch(() => alert('SHP export için backend entegrasyonu gerekir.'));
    } else if (format === 'dwg') {
      const geojson = new GeoJSON().writeFeaturesObject(markerSource.getFeatures());
      fetch('http://localhost:5010/api/export/dwg/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geojson),
      })
        .then(res => res.blob())
        .then(blob => {
          downloadFile(blob, 'export.dwg', 'application/acad');
        })
        .catch(() => alert('DWG export için backend entegrasyonu gerekir.'));
    }
  };

  return { handleFileImport, handleExport };
}