import React, { useState, useEffect, useCallback } from 'react';
import { 
    Grid, 
    Card, 
    CardContent, 
    Typography, 
    Box, 
    Button, 
    CircularProgress, 
    Alert,
    useTheme,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Divider
} from '@mui/material';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import Chart from 'react-apexcharts';

import SensorsIcon from '@mui/icons-material/Sensors';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CloseIcon from '@mui/icons-material/Close';
import TimelineIcon from '@mui/icons-material/Timeline';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import OpacityIcon from '@mui/icons-material/Opacity';
import AirIcon from '@mui/icons-material/Air';
import AcUnitIcon from '@mui/icons-material/AcUnit';

import { getStats, getSensors, generateSummary, getVideos } from '../api';
import VideoPlayer from '../components/VideoPlayer';

const COLORS_TYPE = ['#a78bfa', '#22d3ee', '#10b981', '#f59e0b', '#962323d0'];

const getSensorIcon = (sensorType) => {
    switch (sensorType) {
        case 'Température':
            return ThermostatIcon;
        case 'Humidité':
            return OpacityIcon;
        case 'Pression':
            return AirIcon;
        case 'Qualité de l\'air':
            return AcUnitIcon;
        default:
            return SensorsIcon;
    }
};

export default function Dashboard() {
    const theme = useTheme();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [summary, setSummary] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState('');
    const [videos, setVideos] = useState([]);
    const [videosLoading, setVideosLoading] = useState(false);
    const [openReportDialog, setOpenReportDialog] = useState(false);
    const [sensorHistory, setSensorHistory] = useState([]);
    const [selectedHistorySensor, setSelectedHistorySensor] = useState(null);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const statsResponse = await getStats();
                setStats(statsResponse.data);
                
                // Charger les vidéos
                setVideosLoading(true);
                try {
                    const videosResponse = await getVideos();
                    if (videosResponse.data && videosResponse.data.videos) {
                        setVideos(videosResponse.data.videos);
                    }
                } catch (videoErr) {
                    console.warn("Impossible de charger la liste des vidéos:", videoErr);
                    setVideos([]);
                } finally {
                    setVideosLoading(false);
                }
            } catch (err) {
                console.error("Failed to load dashboard stats:", err);
                setError('Impossible de charger les statistiques du tableau de bord.');
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();

        // Auto-refresh stats every 5 seconds for real-time updates
        const interval = setInterval(async () => {
            try {
                const statsResponse = await getStats();
                setStats(statsResponse.data);
            } catch (err) {
                console.error("Failed to refresh stats:", err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const handleGenerateSummary = useCallback(async () => {
        setIsSummaryLoading(true);
        setSummaryError('');
        setSummary('');
        try {
            const sensorsResponse = await getSensors();
            if (sensorsResponse.data && sensorsResponse.data.length > 0) {
                const summaryResponse = await generateSummary(sensorsResponse.data);
                setSummary(summaryResponse.data.summary);
                setOpenReportDialog(true);
            } else {
                setSummaryError("Aucun capteur à analyser.");
            }
        } catch (err) {
            console.error("Failed to generate summary:", err);
            const errorMessage = err.response?.data?.error || "Le service d'analyse IA n'a pas pu générer le rapport.";
            setSummaryError(errorMessage);
        } finally {
            setIsSummaryLoading(false);
        }
    }, []);

    const handleOpenHistoryDialog = (trend) => {
        setSelectedHistorySensor(trend);
        setHistoryDialogOpen(true);
    };

    const handleCloseHistoryDialog = () => {
        setHistoryDialogOpen(false);
        setTimeout(() => setSelectedHistorySensor(null), 300);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={60} sx={{ color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        Chargement des données...
                    </Typography>
                </Box>
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    const statusColorMapping = {
        'Actif': theme.palette.success.main,
        'Inactif': theme.palette.error.main,
        'Maintenance': theme.palette.warning.main,
    };

    // Enhanced KPI Card Component
    const KPICard = ({ icon: Icon, label, value, color, trend }) => (
        <Card 
            sx={{ 
                height: '100%', 
                minHeight: 180,
                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(167, 139, 250, 0.05) 100%)`,
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)`,
                    transition: 'left 0.5s ease',
                },
                '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: `0 12px 24px rgba(${color}, 0.2)`,
                    borderColor: color,
                    '&::before': {
                        left: '100%'
                    }
                }
            }}
        >
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                            {label}
                        </Typography>
                    </Box>
                    <Box 
                        sx={{ 
                            p: 1.5,
                            borderRadius: 2,
                            background: `rgba(167, 139, 250, 0.1)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Icon sx={{ fontSize: 28, color: color }} />
                    </Box>
                </Box>
                <Box>
                    <Typography variant="h2" sx={{ fontWeight: 900, color: color, mb: 1 }}>
                        {value}
                    </Typography>
                    {trend && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: theme.palette.success.main }}>
                            <TrendingUpIcon sx={{ fontSize: 16 }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                +{trend}% ce mois
                            </Typography>
                        </Box>
                    )}
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ p: 3 }}>

            {/* AI Analysis Section */}
            <Card 
                sx={{ 
                    mb: 4, 
                    p: 3.5,
                    background: `linear-gradient(135deg, rgba(167, 139, 250, 0.08) 0%, rgba(34, 211, 238, 0.08) 100%)`,
                    border: `1.5px solid ${theme.palette.primary.main}30`,
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'slideInDown 0.6s ease-out',
                    boxShadow: `0 8px 32px rgba(167, 139, 250, 0.12)`,
                    transition: 'all 0.3s ease'
                }}
            >
                <Box sx={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: `radial-gradient(circle, ${theme.palette.primary.main}15 0%, transparent 70%)`, borderRadius: '50%', animation: 'float 6s ease-in-out infinite' }} />
                <Box sx={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, background: `radial-gradient(circle, ${theme.palette.secondary.main}10 0%, transparent 70%)`, borderRadius: '50%' }} />
                
                <CardContent sx={{ p: 0, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1.5, fontSize: '1.1rem' }}>
                                <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                                <span>Analyse Intelligente par FactoryGuard AI</span>
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.85, fontWeight: 500 }}>
                                Obtenez des insights détaillés et recommandations sur l'état de votre système
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={!isSummaryLoading && <AutoAwesomeIcon />}
                            onClick={handleGenerateSummary}
                            disabled={isSummaryLoading}
                            sx={{ 
                                minWidth: 220,
                                height: 50,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                boxShadow: `0 12px 28px rgba(167, 139, 250, 0.35)`,
                                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                position: 'relative',
                                overflow: 'hidden',
                                borderRadius: 1.5,
                                fontSize: '0.95rem',
                                textTransform: 'none',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: '-50%',
                                    left: '-50%',
                                    width: '200%',
                                    height: '200%',
                                    background: `radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)`,
                                    animation: 'shimmer 3s infinite',
                                    pointerEvents: 'none'
                                },
                                '&:hover': {
                                    transform: 'translateY(-3px) scale(1.02)',
                                    boxShadow: `0 16px 40px rgba(167, 139, 250, 0.5)`,
                                },
                                '&:active': {
                                    transform: 'translateY(-1px)',
                                },
                                '&:disabled': {
                                    opacity: 0.65,
                                    transform: 'none',
                                }
                            }}
                        >
                            {isSummaryLoading ? (
                                <>
                                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                                    Génération...
                                </>
                            ) : (
                                '✨ Générer le rapport IA'
                            )}
                        </Button>
                    </Box>

                    {summaryError && (
                        <Alert severity="warning" sx={{ mt: 2, animation: 'slideInUp 0.3s ease-out' }}>
                            {summaryError}
                        </Alert>
                    )}
                    {!summary && !isSummaryLoading && !summaryError && (
                        <Box sx={{ p: 3, textAlign: 'center', opacity: 0.6 }}>
                            <Typography variant="body2" color="text.secondary">
                                Cliquez sur le bouton pour générer une analyse détaillée de vos capteurs
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Report Dialog */}
            <Dialog 
                open={openReportDialog} 
                onClose={() => setOpenReportDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(167, 139, 250, 0.05) 100%)`,
                        backdropFilter: 'blur(10px)',
                        borderRadius: 3,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
                    <AutoAwesomeIcon sx={{ color: 'primary.main' }} />
                    Rapport d'Analyse IA
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box sx={{ 
                        p: 2, 
                        backgroundColor: 'background.default', 
                        borderRadius: 2, 
                        border: `1px solid ${theme.palette.divider}`,
                        maxHeight: '60vh',
                        overflowY: 'auto'
                    }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: 'text.primary' }}>
                            {summary}
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button 
                        onClick={() => setOpenReportDialog(false)}
                        variant="contained"
                        sx={{
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            boxShadow: `0 4px 12px rgba(167, 139, 250, 0.3)`,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: `0 8px 20px rgba(167, 139, 250, 0.4)`,
                            }
                        }}
                    >
                        Fermer
                    </Button>
                </DialogActions>
            </Dialog>

            {/* KPI Cards Grid */}
            {stats && (
                <Grid container spacing={3} sx={{ mb: 5, animation: 'fadeIn 0.8s ease-in-out' }}>
                    <Grid item xs={12} sm={6} md={4}>
                        <KPICard 
                            icon={SensorsIcon}
                            label="Total Capteurs"
                            value={stats.total_sensors}
                            color={theme.palette.primary.main}
                            trend={12}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <KPICard 
                            icon={CheckCircleOutlineIcon}
                            label="Capteurs Actifs"
                            value={stats.active_sensors}
                            color={theme.palette.success.main}
                            trend={8}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <KPICard 
                            icon={WarningAmberIcon}
                            label="Alertes / Inactifs"
                            value={stats.alerts}
                            color={theme.palette.error.main}
                        />
                    </Grid>
                </Grid>
            )}

            
            {/* Historical Sensor Data Chart */}
            {stats && (
                <Box sx={{ mb: 5 }}>
                    <Typography 
                        variant="h5" 
                        sx={{ 
                            fontWeight: 700, 
                            mb: 3, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1.5,
                            color: theme.palette.primary.main
                        }}
                    >
                        <Box sx={{ width: 5, height: 24, background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`, borderRadius: 1 }} />
                         Historique des Capteurs - Valeurs en Temps Réel
                    </Typography>
                    
                    {stats.sensor_trends && stats.sensor_trends.length > 0 ? (
                        <Grid container spacing={3}>
                            {stats.sensor_trends.map((trend, idx) => (
                                <Grid item xs={12} sm={6} md={4} lg={3} key={trend.id || idx}>
                                    <Card 
                                        sx={{ 
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
                                        }}
                                    >
                                        <CardContent sx={{ 
                                            flex: 1, 
                                            display: 'flex', 
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            p: 2.5
                                        }}>
                                            {/* Header */}
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                                                    {trend.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {trend.data_points_count || 0} points de données
                                                </Typography>
                                            </Box>

                                            {/* Gauge Chart */}
                                            {trend.latest_value !== null && trend.latest_value !== undefined ? (
                                                <Box sx={{ my: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Box sx={{ position: 'relative', width: 160, height: 160 }}>
                                                        <Chart
                                                            options={{
                                                                chart: { type: 'radialBar', sparkline: { enabled: false } },
                                                                plotOptions: {
                                                                    radialBar: {
                                                                        hollow: { size: '70%' },
                                                                        track: { background: '#f0f0f0', opacity: 0.2 },
                                                                        dataLabels: {
                                                                            name: { show: false },
                                                                            value: { show: false }
                                                                        }
                                                                    }
                                                                },
                                                                colors: ['#22d3ee'],
                                                                stroke: { lineCap: 'round' }
                                                            }}
                                                            series={[75]}
                                                            type="radialBar"
                                                            height={160}
                                                        />
                                                        {/* Icon Overlay */}
                                                        <Box sx={{
                                                            position: 'absolute',
                                                            top: '50%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            {React.createElement(getSensorIcon(trend.name), {
                                                                sx: {
                                                                    fontSize: 48,
                                                                    color: 'primary.main'
                                                                }
                                                            })}
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                                                    <Typography variant="body2">
                                                        ❌ Aucune donnée
                                                    </Typography>
                                                </Box>
                                            )}

                                            {/* Value Display */}
                                            <Box sx={{ textAlign: 'center', mb: 2 }}>
                                                <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                                    {trend.latest_value !== null && trend.latest_value !== undefined 
                                                        ? trend.latest_value.toFixed(2) 
                                                        : 'N/A'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Dernière valeur
                                                </Typography>
                                            </Box>

                                            {/* History Button */}
                                            <Button 
                                                variant="contained" 
                                                startIcon={<TimelineIcon />}
                                                onClick={() => handleOpenHistoryDialog(trend)}
                                                fullWidth
                                                sx={{
                                                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                                    boxShadow: `0 4px 12px rgba(167, 139, 250, 0.3)`,
                                                    transition: 'all 0.3s ease',
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: `0 8px 20px rgba(167, 139, 250, 0.4)`,
                                                    }
                                                }}
                                            >
                                                Voir l'historique
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Alert severity="info" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '18px' }}>📊</span>
                            Les données historiques des capteurs seront affichées ici une fois disponibles dans la base de données
                        </Alert>
                    )}
                </Box>
            )}

            {/* History Dialog */}
            <Dialog 
                open={historyDialogOpen} 
                onClose={handleCloseHistoryDialog} 
                fullWidth 
                maxWidth="md"
                PaperProps={{
                    sx: {
                        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(167, 139, 250, 0.05) 100%)`,
                        borderRadius: 3,
                        border: `1px solid ${theme.palette.divider}`
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TimelineIcon sx={{ color: 'primary.main' }} />
                        Historique: {selectedHistorySensor?.name}
                    </Box>
                    <IconButton onClick={handleCloseHistoryDialog} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 3 }}>
                    {selectedHistorySensor && (
                        <>
                            {/* Summary Stats */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={6}>
                                    <Box sx={{ p: 1.5, background: `${theme.palette.primary.main}10`, borderRadius: 2 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Points de données
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                                            {selectedHistorySensor.data_points_count || 0}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <Box sx={{ p: 1.5, background: `${theme.palette.success.main}10`, borderRadius: 2 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Dernière valeur
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, color: 'primary.main' }}>
                                            {selectedHistorySensor.latest_value?.toFixed(2) || 'N/A'}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>

                            {/* Chart */}
                            {selectedHistorySensor.data && selectedHistorySensor.data.length > 0 ? (
                                <Box sx={{ height: 350 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={selectedHistorySensor.data}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                                            <XAxis 
                                                dataKey="time" 
                                                tick={{ fontSize: 12 }}
                                                stroke={theme.palette.text.secondary}
                                            />
                                            <YAxis 
                                                tick={{ fontSize: 12 }}
                                                stroke={theme.palette.text.secondary}
                                            />
                                            <Tooltip 
                                                contentStyle={{
                                                    background: theme.palette.background.paper,
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    borderRadius: 8,
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                                }}
                                                formatter={(value) => [value.toFixed(2), 'Valeur']}
                                                labelFormatter={(label) => `Heure: ${label}`}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="value" 
                                                stroke="#22d3ee"
                                                strokeWidth={3}
                                                dot={false}
                                                isAnimationActive={true}
                                                animationDuration={500}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </Box>
                            ) : (
                                <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                                    <Typography variant="body2">
                                        ❌ Aucune donnée disponible pour ce capteur
                                    </Typography>
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={handleCloseHistoryDialog} variant="contained">
                        Fermer
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Computer Vision Video Outputs Section */}
            {stats && (
                <Box sx={{ mt: 4, animation: 'slideInUp 0.6s ease-out 0.3s both', mb: 2 }}>
                    <Typography 
                        variant="h5" 
                        sx={{ 
                            fontWeight: 700, 
                            mb: 3, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1.5,
                            color: theme.palette.primary.main
                        }}
                    >
                        <Box sx={{ width: 5, height: 24, background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`, borderRadius: 1 }} />
                         Computer Vision - Sorties des Modèles
                    </Typography>

                    <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ mb: 3 }}
                    >
                        Visualisez les analyses visuelles en temps réel de vos équipements
                    </Typography>

                    {videosLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : videos.length === 0 ? (
                        <Alert severity="info" sx={{ mb: 3 }}>
                            📁 Aucune vidéo trouvée. Placez vos vidéos dans le dossier <code>frontend/public/videos/</code> (formats supportés: MP4, WebM, Ogg)
                        </Alert>
                    ) : (
                        <Grid container spacing={3}>
                            {videos.map((video, index) => (
                                <Grid item xs={12} sm={6} md={4} lg={3} key={video.name}>
                                    <VideoPlayer 
                                        title={video.name.replace(/\.[^/.]+$/, '')}
                                        videoPath={`/videos/${video.name}`}  // ne pas forcer en lowercase
 
                                        description={`Vidéo ${index + 1} - ${(video.size / 1024).toFixed(2)} KB`}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    <Card sx={{ 
                        mt: 3,
                        background: `linear-gradient(135deg, rgba(167, 139, 250, 0.05) 0%, rgba(34, 211, 238, 0.05) 100%)`,
                        border: `1px dashed ${theme.palette.primary.main}`,
                    }}>
                        <CardContent>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span style={{ fontSize: '20px' }}>ℹ️</span>
                                <strong>Note:</strong> Placez vos vidéos dans le dossier <code>frontend/public/videos/</code>. 
                                Les formats supportés : MP4, WebM, Ogg. Elles s'affichent automatiquement et se répètent en boucle.
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            )}
        </Box>
    );
};