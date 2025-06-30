import React from 'react';

interface CoordinatePanelProps {
  epsg: '4326' | '3857';
  setEpsg: (epsg: '4326' | '3857') => void;
  gotoLon: string;
  setGotoLon: (lon: string) => void;
  gotoLat: string;
  setGotoLat: (lat: string) => void;
  handleGoto: () => void;
  handleRemoveMarker: () => void;
}

const CoordinatePanel: React.FC<CoordinatePanelProps> = ({
  epsg,
  setEpsg,
  gotoLon,
  setGotoLon,
  gotoLat,
  setGotoLat,
  handleGoto,
  handleRemoveMarker,
}) => (
  <>
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
  </>
);

export default CoordinatePanel;