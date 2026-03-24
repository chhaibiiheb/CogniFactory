import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Typography, Paper, Box, CircularProgress, Alert, Button } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getSensorHistory, getSensors } from '../api'; // Assurez-vous d'avoir une fonction getSensorHistory dans api.js

export default function SensorHistory() {
    const { sensorId } = useParams(); // Récupère l'ID depuis l'URL
    const [history, setHistory] = useState([]);
    const [sensorInfo, setSensorInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async (isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            // On peut lancer les appels en parallèle
            const historyPromise = getSensorHistory(sensorId);
            const sensorsPromise = getSensors(); // Pour récupérer le nom du capteur

            const [historyResponse, sensorsResponse] = await Promise.all([historyPromise, sensorsPromise]);
            
            // Formater les données pour le graphique
            const formattedHistory = historyResponse.data.map(d => ({
                ...d,
                timestamp: d.timestamp,
                displayTimestamp: new Date(d.timestamp).toLocaleString('fr-FR')
            }));
            
            setHistory(formattedHistory);
            
            const currentSensor = sensorsResponse.data.find(s => s.id === parseInt(sensorId));
            setSensorInfo(currentSensor);
            setError(null);

        } catch (err) {
            console.error("Failed to fetch sensor history:", err);
            setError("Impossible de charger l'historique du capteur.");
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(true); // Fetch initial data with loading state

        const interval = setInterval(() => fetchData(false), 5000); // Update every 5 seconds without loading

        return () => clearInterval(interval); // Cleanup on unmount
    }, [sensorId]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;
    }

    return (
        <>
            <Button component={Link} to="/sensors" variant="outlined" sx={{ mb: 2 }}>
                ← Retour à la liste des capteurs
            </Button>
            <Typography variant="h4" gutterBottom>
                Historique pour le capteur : {sensorInfo ? sensorInfo.name : `ID ${sensorId}`}
            </Typography>
            <Paper sx={{ p: 2, height: '60vh', width: '100%' }}>
                <ResponsiveContainer>
                    <LineChart data={history} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="displayTimestamp" />
                        <YAxis />
                        <Tooltip 
                            formatter={(value, name) => {
                                if (name === 'displayTimestamp') return new Date(value).toLocaleString('fr-FR');
                                return value;
                            }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </Paper>
        </>
    );
}