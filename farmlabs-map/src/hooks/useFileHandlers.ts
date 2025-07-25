import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
// @ts-ignore
import * as shp from 'shpjs';
import { downloadFile } from '../utils/file';
import { useState } from 'react';
import Feature from 'ol/Feature';

export function useFileHandlers() {
  const [importedFeatures, setImportedFeatures] = useState<Feature[]>([]);
  const [pendingImportedFeatures, setPendingImportedFeatures] = useState<Feature[]>([]);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // DWG import support
    if (file.name.endsWith('.dwg')) {
      const formData = new FormData();
      formData.append('file', file);

      fetch('http://localhost:5010/api/export/dwg/import', {
        method: 'POST',
        body: formData,
      })
        .then(res => res.json())
        .then(data => {
          if (data.geojson) {
            const features = new GeoJSON().readFeatures(data.geojson, { featureProjection: 'EPSG:3857' });
            setPendingImportedFeatures(features);
          } else {
            alert('DWG import result: ' + JSON.stringify(data));
            setPendingImportedFeatures([]);
          }
        })
        .catch((err) => {
          alert('DWG import için backend entegrasyonu gerekir.\n' + err);
          setPendingImportedFeatures([]);
        });
      return;
    }

    const reader = new FileReader();
    reader.onload = async evt => {
      let features: Feature[] = [];
      try {
        if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
          const text = evt.target?.result as string;
          features = new GeoJSON().readFeatures(text, { featureProjection: 'EPSG:3857' });
        } else if (file.name.endsWith('.kml')) {
          const text = evt.target?.result as string;
          features = new KML().readFeatures(text, { featureProjection: 'EPSG:3857' });
        } else if (file.name.endsWith('.shp') || file.name.endsWith('.zip')) {
          const arrayBuffer = evt.target?.result as ArrayBuffer;
          try {
            const geojson = await (shp as any).default
              ? await (shp as any).default(arrayBuffer)
              : await (shp as any)(arrayBuffer);
            features = new GeoJSON().readFeatures(geojson, { featureProjection: 'EPSG:3857' });
          } catch (err) {
            alert('Shapefile import failed: ZIP is invalid or corrupt.');
            setPendingImportedFeatures([]);
            return;
          }
        } else {
          alert('Only GeoJSON, KML, SHP, and DWG supported.');
          setPendingImportedFeatures([]);
          return;
        }
        setPendingImportedFeatures(features);
      } catch (err) {
        alert('File import failed: ' + (err as Error).message);
        setPendingImportedFeatures([]);
      }
    };
    if (file.name.endsWith('.shp') || file.name.endsWith('.zip')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Only insert features to the map when the button is clicked
  const handleAddImportedToMap = () => {
    setImportedFeatures(pendingImportedFeatures);
  };

  // Export only importedFeatures, not markerSource features!
  const handleExport = (format: 'geojson' | 'kml' | 'shp' | 'dwg') => {
    const features = importedFeatures.map((f: Feature) => {
      const clone = f.clone();
      const geom = clone.getGeometry();
      if (geom) {
        geom.transform('EPSG:3857', 'EPSG:4326');
      }
      return clone;
    });

    if (format === 'geojson') {
      const data = new GeoJSON().writeFeatures(features, { featureProjection: 'EPSG:4326', dataProjection: 'EPSG:4326' });
      downloadFile(data, 'export.geojson', 'application/geo+json');
    } else if (format === 'kml') {
      const data = new KML().writeFeatures(features, { featureProjection: 'EPSG:4326', dataProjection: 'EPSG:4326' });
      downloadFile(data, 'export.kml', 'application/vnd.google-earth.kml+xml');
    } else if (format === 'shp') {
      const geojson = new GeoJSON().writeFeaturesObject(features, { featureProjection: 'EPSG:4326', dataProjection: 'EPSG:4326' });
      fetch('http://localhost:5010/api/export/shp/export', {
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
      const geojson = new GeoJSON().writeFeaturesObject(features, { featureProjection: 'EPSG:4326', dataProjection: 'EPSG:4326' });
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

  return {
    handleFileImport,
    handleExport,
    handleAddImportedToMap,
    importedFeatures,
    setImportedFeatures,
    pendingImportedFeatures,
    setPendingImportedFeatures,
  };
}