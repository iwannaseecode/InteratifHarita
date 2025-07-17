import React from 'react';

interface DataPanelProps {
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExport: (format: 'geojson' | 'kml' | 'shp' | 'dwg') => void;
  handleAddImportedToMap: () => void;
  importedFeatures: any[];
  pendingImportedFeatures: any[];
}

const DataPanel: React.FC<DataPanelProps> = ({
  handleFileImport,
  handleExport,
  handleAddImportedToMap,
  importedFeatures,
  pendingImportedFeatures,
}) => {
  return (
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
        accept=".geojson,.json,.kml,.shp,.zip,.dwg"
        onChange={handleFileImport}
        style={{ marginBottom: 10 }}
      />
      <div>
        <button onClick={() => handleExport('geojson')} style={{ marginRight: 8 }}>
          Export GeoJSON
        </button>
        <button onClick={() => handleExport('kml')} style={{ marginRight: 8 }}>
          Export KML
        </button>
        <button onClick={() => handleExport('shp')} style={{ marginRight: 8 }}>
          Export SHP
        </button>
        <button onClick={() => handleExport('dwg')} style={{ marginRight: 8 }}>
          Export DWG
        </button>
        <button
          onClick={handleAddImportedToMap}
          disabled={pendingImportedFeatures.length === 0}
          style={{ marginTop: 8 }}
        >
          Add Imported to Map
        </button>
        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
          {pendingImportedFeatures.length > 0
            ? `${pendingImportedFeatures.length} feature(s) ready to add`
            : 'No imported features yet'}
        </div>
      </div>
    </div>
  );
};

export default DataPanel;