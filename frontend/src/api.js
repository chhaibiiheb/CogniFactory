import axios from 'axios';

// This client points to your Flask backend.
const apiClient = axios.create({
    baseURL: 'http://20.51.200.142:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// ... (vos autres fonctions comme getSensors, getStats)
//api pour obtenir les statistiques dashbaord 
export const generateSummary = (sensors) => {
    return axios.post(`${API_URL}/api/generate-summary`, { sensors });
};
//api diagnose un capteur
export const diagnoseSensor = (sensorId) => {
    return axios.post(`${API_URL}/api/diagnose-sensor`, { sensor_id: sensorId });
};
// dans src/api.js (ou autre)
const API_URL = 'http://20.51.200.142:5000'; // ou votre URL d'API

// ... autres fonctions
export const getSensorHistory = (sensorId) => axios.get(`${API_URL}/api/sensor-history/${sensorId}`);
// Functions to call specific API endpoints
export const getSensors = () => apiClient.get('/sensors');
export const getStats = () => apiClient.get('/stats');
export const askQuestion = (contents) => apiClient.post('/ask', { contents });
export const getVideos = () => apiClient.get('/videos');