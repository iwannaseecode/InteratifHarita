import React from 'react';

interface DataPanelProps {
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExport: (format: 'geojson' | 'kml' | 'shp') => void;
}

const DataPanel: React.FC<DataPanelProps> = ({ handleFileImport, handleExport }) => (
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
);

export default DataPanel;