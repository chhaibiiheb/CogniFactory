import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
    Typography, TableSortLabel, Chip, Box, CircularProgress, Alert, 
    TextField, MenuItem, Grid, Card, CardContent, IconButton, Tooltip, Stack,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, LinearProgress, DialogContentText,
    useTheme, Divider
} from '@mui/material';
import Chart from 'react-apexcharts';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import PowerOffIcon from '@mui/icons-material/PowerOff';
import BuildIcon from '@mui/icons-material/Build';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BiotechIcon from '@mui/icons-material/Biotech';
import TimelineIcon from '@mui/icons-material/Timeline';
import BatteryStdIcon from '@mui/icons-material/BatteryStd';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';

import { getSensors, diagnoseSensor } from '../api';

function stableSort(array, comparator) {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}

function getComparator(order, orderBy) {
    return order === 'desc'
        ? (a, b) => (b[orderBy] < a[orderBy] ? -1 : 1)
        : (a, b) => (a[orderBy] < b[orderBy] ? -1 : 1);
}

const statusColor = {
    'Actif': 'success',
    'Inactif': 'error',
    'Maintenance': 'warning'
};

const getUnit = (type) => {
    switch (type) {
        case 'Température': return '°C';
        case 'Humidité': return '%';
        case 'Pression': return 'hPa';
        case 'Qualité de l\'air': return 'AQI';
        default: return '';
    }
};

export default function Sensors() {
    const [sensors, setSensors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('name');
    const [filterName, setFilterName] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [alertedSensors, setAlertedSensors] = useState(new Set());

    const [isDiagnosisOpen, setIsDiagnosisOpen] = useState(false);
    const [selectedSensor, setSelectedSensor] = useState(null);
    const [diagnosisResult, setDiagnosisResult] = useState('');
    const [isDiagnosisLoading, setIsDiagnosisLoading] = useState(false);
    const [diagnosisError, setDiagnosisError] = useState('');
    
    const [selectedGaugeSensor, setSelectedGaugeSensor] = useState(null);
    const [sensorFeedback, setSensorFeedback] = useState('');
    const [feedbackLoading, setFeedbackLoading] = useState(false);

    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();

    const checkAlerts = useCallback((currentSensors) => {
        const newAlerts = new Set(alertedSensors);
        currentSensors.forEach(sensor => {
            if (sensor.status !== 'Actif' || sensor.last_value == null) return;
            const isOutOfRange = sensor.last_value < sensor.min_threshold || sensor.last_value > sensor.max_threshold;
            if (isOutOfRange && !newAlerts.has(sensor.id)) {
                enqueueSnackbar(`Alerte pour ${sensor.name}: Valeur hors seuil ! (${sensor.last_value.toFixed(2)})`, { variant: 'error' });
                newAlerts.add(sensor.id);
            } else if (!isOutOfRange && newAlerts.has(sensor.id)) {
                newAlerts.delete(sensor.id);
            }
        });
        setAlertedSensors(newAlerts);
    }, [enqueueSnackbar, alertedSensors]);

    useEffect(() => {
        const fetchSensors = async () => {
            try {
                const response = await getSensors();
                setSensors(response.data);
                checkAlerts(response.data);
                
                // Auto-refresh feedback if a sensor is selected
                if (selectedGaugeSensor) {
                    const updatedSensor = response.data.find(s => s.id === selectedGaugeSensor.id);
                    if (updatedSensor) {
                        setSensorFeedback(generateSensorFeedback(updatedSensor));
                        setSelectedGaugeSensor(updatedSensor);
                    }
                }
                
                setError(null);
            } catch (err) {
                setError("Impossible de charger les données des capteurs.");
            } finally {
                setLoading(false);
            }
        };
        fetchSensors();
        
        // Refresh sensors every 15 seconds for general updates
        const intervalId = setInterval(fetchSensors, 15000);
        
        // Additional 2-minute interval for detailed feedback refresh
        const feedbackIntervalId = setInterval(() => {
            if (selectedGaugeSensor) {
                setSensors(prevSensors => {
                    const updatedSensor = prevSensors.find(s => s.id === selectedGaugeSensor.id);
                    if (updatedSensor) {
                        setSensorFeedback(generateSensorFeedback(updatedSensor));
                        setSelectedGaugeSensor(updatedSensor);
                    }
                    return prevSensors;
                });
            }
        }, 120000); // 2 minutes

        return () => {
            clearInterval(intervalId);
            clearInterval(feedbackIntervalId);
        };
    }, [checkAlerts, selectedGaugeSensor]);

    const visibleSensors = useMemo(() => {
        return stableSort(
            sensors.filter(s => s.name.toLowerCase().includes(filterName.toLowerCase()) &&
                (filterStatus ? s.status === filterStatus : true)
            ),
            getComparator(order, orderBy)
        );
    }, [sensors, order, orderBy, filterName, filterStatus]);

    const handleSortRequest = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleRowClick = (sensorId) => navigate(`/sensor/${sensorId}`);

    const handleLaunchDiagnosis = useCallback(async (sensor) => {
        setSelectedSensor(sensor);
        setIsDiagnosisOpen(true);
        setIsDiagnosisLoading(true);
        setDiagnosisError('');
        setDiagnosisResult('');
        try {
            const response = await diagnoseSensor(sensor.id);
            setDiagnosisResult(response.data.diagnosis);
        } catch (err) {
            setDiagnosisError(err.response?.data?.error || "Le service de diagnostic est indisponible.");
        } finally {
            setIsDiagnosisLoading(false);
        }
    }, []);

    const generateSensorFeedback = (sensor) => {
        if (!sensor || sensor.status !== 'Actif') {
            return "⚠️ Capteur non actif";
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString('fr-FR');
        const lastUpdate = sensor.last_update ? new Date(sensor.last_update).toLocaleString('fr-FR') : 'N/A';
        const value = sensor.last_value?.toFixed(2) ?? 'N/A';
        const unit = getUnit(sensor.type);
        
        const isOutOfRange = sensor.last_value && (sensor.last_value < sensor.min_threshold || sensor.last_value > sensor.max_threshold);
        const status = isOutOfRange ? '🔴 ALERTE' : '🟢 Normal';

        return `
📊 Capteur: ${sensor.name}
🕐 Heure actuelle: ${timeStr}
📈 Dernière valeur: ${value} ${unit}
⏱️ Dernière mise à jour: ${lastUpdate}
🔋 Batterie: ${sensor.battery_level}%
📡 Type: ${sensor.type}
🎯 Plage: ${sensor.min_threshold} - ${sensor.max_threshold} ${unit}
${status}
        `.trim();
    };

    const handleSelectGaugeSensor = (sensor) => {
        setSelectedGaugeSensor(sensor);
        setSensorFeedback(generateSensorFeedback(sensor));
        setFeedbackLoading(false);
    };

    const handleCloseGaugeDetail = () => {
        setSelectedGaugeSensor(null);
        setSensorFeedback('');
    };

    const handleCloseDiagnosis = () => {
        setIsDiagnosisOpen(false);
        setTimeout(() => {
            setSelectedSensor(null);
            setDiagnosisResult('');
            setDiagnosisError('');
        }, 300);
    };

    const getGaugeProps = (sensor) => {
        const { last_value, min_threshold, max_threshold } = sensor;
        if (last_value == null || min_threshold == null || max_threshold == null) {
            return { percent: 0, color: '#444' };
        }

        // Calculate where the current value sits in the range as a percentage
        const range = max_threshold - min_threshold;
        let percent = ((last_value - min_threshold) / range) * 100;
        
        // Ensure percent is between 0 and 100
        percent = Math.min(100, Math.max(0, percent));

        // Color coding based on thresholds
        let color = '#64f689ff';  // Default green
        
        // Calculate warning thresholds (10% buffer from limits)
        const warningLow = min_threshold + (range * 0.1);
        const warningHigh = max_threshold - (range * 0.1);

        if (last_value < min_threshold || last_value > max_threshold) {
            color = '#f44336';  // Red for out of range
        } else if (last_value < warningLow || last_value > warningHigh) {
            color = '#fc770bff';  // Orange for near limits
        }

        return { percent, color };
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;

    return (
        <Box sx={{ width: '100%', pb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 800 }}>
                🔍 Supervision des Capteurs
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2.5, fontWeight: 700 }}>
                📊 Vue d'ensemble en temps réel
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {sensors.map(sensor => {
                    if (sensor.status !== 'Actif') {
                        return (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={`gauge-${sensor.id}`}>
                                <Card sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    justifyContent: 'center', 
                                    alignItems: 'center', 
                                    opacity: 0.7,
                                    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(167, 139, 250, 0.02) 100%)`,
                                    border: `1px solid ${theme.palette.divider}`,
                                    transition: 'all 0.3s ease'
                                }}>
                                    <CardContent sx={{ textAlign: 'center' }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>{sensor.name}</Typography>
                                        {sensor.status === 'Maintenance' ? <BuildIcon sx={{ fontSize: 80, my: 2, color: 'warning.main' }} /> : <PowerOffIcon sx={{ fontSize: 80, my: 2, color: 'error.main' }} />}
                                        <Chip label={sensor.status} color={statusColor[sensor.status]} size="small" />
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    }

                    const { percent, color } = getGaugeProps(sensor);

                    return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={`gauge-${sensor.id}`}>
                            <Card sx={{ 
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(34, 211, 238, 0.02) 100%)`,
                                border: `1px solid ${theme.palette.divider}`,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    transform: 'translateY(-8px)',
                                    boxShadow: `0 12px 32px rgba(34, 211, 238, 0.2)`
                                }
                            }}>
                                <CardContent sx={{ 
                                    textAlign: 'center', 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    p: 2.5
                                }}>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: theme.palette.primary.main }}>
                                            {sensor.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                            {sensor.type}
                                        </Typography>
                                    </Box>
                                    
                                    <Box sx={{ my: 2 }}>
                                        <Chart
                                            options={{
                                                chart: { type: 'radialBar', sparkline: { enabled: false } },
                                                plotOptions: {
                                                    radialBar: {
                                                        hollow: { size: '65%' },
                                                        track: { background: '#f0f0f0', opacity: 0.2 },
                                                        dataLabels: {
                                                            name: { show: false },
                                                            value: {
                                                                offsetY: 8,
                                                                fontSize: '18px',
                                                                fontWeight: 700,
                                                                formatter: () => `${sensor.last_value?.toFixed(1)}`
                                                            }
                                                        }
                                                    }
                                                },
                                                colors: [color],
                                                stroke: { lineCap: 'round' }
                                            }}
                                            series={[percent]}
                                            type="radialBar"
                                            height={180}
                                        />
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <Box sx={{ textAlign: 'left', flex: 1 }}>
                                            <Typography variant="caption" color="text.secondary">Valeur</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                {sensor.last_value?.toFixed(2)} {getUnit(sensor.type)}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'right', flex: 1 }}>
                                            <Typography variant="caption" color="text.secondary">Batterie</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: sensor.battery_level > 30 ? 'success.main' : 'warning.main' }}>
                                                {sensor.battery_level}%
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Tooltip title="Historique">
                                            <Button 
                                                variant="outlined" 
                                                size="small" 
                                                startIcon={<TimelineIcon />}
                                                onClick={() => navigate(`/sensor/${sensor.id}`)}
                                                sx={{ flex: 1, textTransform: 'none', fontWeight: 600 }}
                                            >
                                                Historique
                                            </Button>
                                        </Tooltip>
                                        <Tooltip title="Détails">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => handleSelectGaugeSensor(sensor)}
                                                sx={{ background: `${theme.palette.primary.main}20`, '&:hover': { background: `${theme.palette.primary.main}40` } }}
                                            >
                                                <SignalCellularAltIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 5, mb: 2.5, fontWeight: 700 }}>
                📋 Tableau détaillé des capteurs
            </Typography>
            <Paper sx={{ p: 3, mb: 2.5, boxShadow: 'none', border: '1px solid rgba(167, 139, 250, 0.1)' }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField 
                            fullWidth 
                            label="Filtrer par nom" 
                            value={filterName} 
                            onChange={(e) => setFilterName(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { fontWeight: 500 } }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField 
                            select 
                            fullWidth 
                            label="Filtrer par statut" 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { fontWeight: 500 } }}
                        >
                            <MenuItem value="">Tous</MenuItem>
                            <MenuItem value="Actif">Actif</MenuItem>
                            <MenuItem value="Inactif">Inactif</MenuItem>
                            <MenuItem value="Maintenance">Maintenance</MenuItem>
                        </TextField>
                    </Grid>
                </Grid>
            </Paper>

            <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nom</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Statut</TableCell>
                            <TableCell>Dernière Valeur</TableCell>
                            <TableCell>Dernière Mise à Jour</TableCell>
                            <TableCell align="right">Batterie</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visibleSensors.map((sensor) => (
                            <TableRow key={sensor.id} hover sx={{
                                cursor: 'pointer',
                                '&:last-child td, &:last-child th': { border: 0 },
                                ...(sensor.status !== 'Actif' && { opacity: 0.6, fontStyle: 'italic' })
                            }}>
                                <TableCell onClick={() => handleRowClick(sensor.id)}>{sensor.name}</TableCell>
                                <TableCell onClick={() => handleRowClick(sensor.id)}>{sensor.type}</TableCell>
                                <TableCell onClick={() => handleRowClick(sensor.id)}>
                                    <Chip label={sensor.status} color={statusColor[sensor.status] || 'default'} size="small" />
                                </TableCell>
                                <TableCell onClick={() => handleRowClick(sensor.id)}>
                                    {sensor.last_value != null ? sensor.last_value.toFixed(2) : 'N/A'}
                                </TableCell>
                                <TableCell onClick={() => handleRowClick(sensor.id)}>
                                    {sensor.last_update ? new Date(sensor.last_update).toLocaleString('fr-FR') : 'N/A'}
                                </TableCell>
                                <TableCell align="right" onClick={() => handleRowClick(sensor.id)}>
                                    {sensor.battery_level}%
                                </TableCell>
                                <TableCell align="center">
                                    <Stack direction="row" spacing={1} onClick={(e) => e.stopPropagation()}>
                                        <Tooltip title="Éditer"><IconButton size="small"><EditIcon fontSize="inherit" /></IconButton></Tooltip>
                                        <Tooltip title="Lancer un diagnostic IA">
                                            <IconButton size="small" onClick={() => handleLaunchDiagnosis(sensor)} disabled={sensor.status !== 'Actif'}>
                                                <BiotechIcon fontSize="inherit" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Supprimer"><IconButton size="small"><DeleteIcon fontSize="inherit" /></IconButton></Tooltip>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={isDiagnosisOpen} onClose={handleCloseDiagnosis} fullWidth maxWidth="md" PaperProps={{ sx: { m: 2 } }}>
                <DialogTitle sx={{ fontWeight: 700, pb: 2 }}>
                    🔬 Diagnostic IA pour : <Typography component="span" variant="h6" color="primary" sx={{ fontWeight: 700 }}>{selectedSensor?.name}</Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
                    {isDiagnosisLoading && (
                        <Box sx={{ width: '100%', py: 4 }}>
                            <LinearProgress />
                            <DialogContentText sx={{ textAlign: 'center', mt: 2 }}>
                                L'IA analyse les données, veuillez patienter...
                            </DialogContentText>
                        </Box>
                    )}
                    {diagnosisError && <Alert severity="error" sx={{ mt: 2 }}>{diagnosisError}</Alert>}
                    {diagnosisResult && (
                        <Box sx={{ mt: 2, p: 3, backgroundColor: 'background.default', borderRadius: 1.5, border: '1px solid rgba(167, 139, 250, 0.1)' }}>
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{diagnosisResult}</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={handleCloseDiagnosis} variant="outlined">Fermer</Button>
                </DialogActions>
            </Dialog>

            {/* Sensor Gauge Detail Dialog */}
            <Dialog 
                open={!!selectedGaugeSensor} 
                onClose={handleCloseGaugeDetail} 
                fullWidth 
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(167, 139, 250, 0.05) 100%)`,
                        borderRadius: 3,
                        border: `1px solid ${theme.palette.divider}`
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                    📊 Détails du Capteur
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 3 }}>
                    {selectedGaugeSensor && (
                        <Grid container spacing={3}>
                            {/* Gauge Chart */}
                            <Grid item xs={12}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                                        {selectedGaugeSensor.name}
                                    </Typography>
                                    <Chart
                                        options={{
                                            chart: { type: 'radialBar' },
                                            plotOptions: {
                                                radialBar: {
                                                    hollow: { size: '60%' },
                                                    track: { background: '#f0f0f0', opacity: 0.2 },
                                                    dataLabels: {
                                                        name: { show: false },
                                                        value: {
                                                            offsetY: 10,
                                                            fontSize: '24px',
                                                            fontWeight: 700
                                                        }
                                                    }
                                                }
                                            },
                                            colors: [getGaugeProps(selectedGaugeSensor).color],
                                            stroke: { lineCap: 'round' }
                                        }}
                                        series={[getGaugeProps(selectedGaugeSensor).percent]}
                                        type="radialBar"
                                        height={250}
                                    />
                                </Box>
                            </Grid>

                            {/* Feedback Section */}
                            <Grid item xs={12}>
                                <Divider sx={{ my: 2 }} />
                                <Box sx={{
                                    p: 2.5,
                                    background: `linear-gradient(135deg, rgba(167, 139, 250, 0.05) 0%, rgba(34, 211, 238, 0.05) 100%)`,
                                    borderRadius: 2,
                                    border: `1px solid ${theme.palette.divider}`,
                                    fontFamily: 'monospace',
                                    fontSize: '0.9rem',
                                    lineHeight: 1.8,
                                    color: theme.palette.text.primary,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                }}>
                                    {sensorFeedback}
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', textAlign: 'center' }}>
                                    ♻️ Feedback mise à jour automatiquement chaque 2 minutes
                                </Typography>
                            </Grid>

                            {/* Additional Info */}
                            <Grid item xs={12}>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Box sx={{ p: 1.5, background: `${theme.palette.primary.main}10`, borderRadius: 1.5 }}>
                                            <Typography variant="caption" color="text.secondary">Min / Max</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                                                {selectedGaugeSensor.min_threshold} - {selectedGaugeSensor.max_threshold} {getUnit(selectedGaugeSensor.type)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Box sx={{ p: 1.5, background: `${theme.palette.success.main}10`, borderRadius: 1.5 }}>
                                            <Typography variant="caption" color="text.secondary">Batterie</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, color: selectedGaugeSensor.battery_level > 30 ? 'success.main' : 'warning.main' }}>
                                                {selectedGaugeSensor.battery_level}%
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={handleCloseGaugeDetail} variant="contained">Fermer</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
