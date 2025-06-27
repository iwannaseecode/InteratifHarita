import axios from 'axios';

const API_URL = 'http://localhost:5010/api/coordinates';

export const sendCoordinate = async (x: number, y: number, epsg: string) => {
  try {
    const response = await axios.post(API_URL, { X: x, Y: y, EPSG: epsg });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      // Server responded with a status code out of 2xx
      console.error('API error:', error.response.status, error.response.data);
    } else if (error.request) {
      // No response received
      console.error('No response from API:', error.request);
    } else {
      // Other errors
      console.error('Error sending coordinate:', error.message);
    }
    throw error;
  }
};

export const fetchMapDefaults = async () => {
  const response = await axios.get('http://localhost:5010/api/mapdefaults');
  return response.data;
};

export const fetchMapLayers = async () => {
  const response = await axios.get('http://localhost:5010/api/maplayers');
  return response.data;
};