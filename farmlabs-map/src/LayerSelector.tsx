import React from 'react';

interface LayerSelectorProps {
  layers: any;
  selectedLayerKey: string | null;
  setSelectedLayerKey: (key: string) => void;
  sentinelLayers: string[];
  sentinelLayer: string;
  setSentinelLayer: (layer: string) => void;
}

const LayerSelector: React.FC<LayerSelectorProps> = ({
  layers,
  selectedLayerKey,
  setSelectedLayerKey,
  sentinelLayers,
  sentinelLayer,
  setSentinelLayer,
}) => (
  <div>
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
  </div>
);

export default LayerSelector;