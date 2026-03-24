import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Box, 
    Drawer, 
    List, 
    ListItem, 
    ListItemButton, 
    ListItemIcon, 
    ListItemText, 
    AppBar, 
    Toolbar, 
    Typography,
    IconButton,
    useTheme,
    Badge
} from '@mui/material';

import DashboardIcon from '@mui/icons-material/Dashboard';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SensorsIcon from '@mui/icons-material/Sensors';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

import { ColorModeContext } from '../context/ThemeContext';

const drawerWidth = 260;

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'AI Assistant', icon: <SmartToyIcon />, path: '/assistant' },
    { text: 'Capteurs', icon: <SensorsIcon />, path: '/sensors' },
];

export default function AppLayout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const colorMode = useContext(ColorModeContext);

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
            {/* AppBar */}
            <AppBar 
                position="fixed" 
                sx={{ 
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: `1px solid ${theme.palette.divider}`
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box 
                            sx={{ 
                                width: 40, 
                                height: 40, 
                                borderRadius: '10px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '1.2em'
                            }}
                        >
                            ⚙️
                        </Box>
                        <Typography 
                            variant="h6" 
                            noWrap 
                            component="div" 
                            sx={{ 
                                fontWeight: 800,
                                letterSpacing: '-0.02em',
                                background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}
                        >
                            FactoryGuard AI
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            {theme.palette.mode === 'dark' ? 'Mode Sombre' : 'Mode Clair'}
                        </Typography>
                        <IconButton 
                            onClick={colorMode.toggleColorMode} 
                            color="inherit"
                            sx={{ 
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'rotate(20deg)',
                                    background: 'rgba(255, 255, 255, 0.1)'
                                }
                            }}
                        >
                            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Drawer Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: { 
                        width: drawerWidth, 
                        boxSizing: 'border-box',
                        background: theme.palette.mode === 'dark'
                            ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
                            : 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderRight: `1px solid ${theme.palette.divider}`,
                        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)'
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: 'auto', p: 2 }}>
                    <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {menuItems.map((item) => (
                            <ListItem key={item.text} disablePadding>
                                <ListItemButton
                                    selected={location.pathname === item.path}
                                    onClick={() => navigate(item.path)}
                                    sx={{
                                        borderRadius: '10px',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            height: '100%',
                                            width: '4px',
                                            background: theme.palette.primary.main,
                                            transform: location.pathname === item.path ? 'scaleY(1)' : 'scaleY(0)',
                                            transition: 'transform 0.3s ease',
                                            borderRadius: '0 4px 4px 0'
                                        },
                                        '&.Mui-selected': {
                                            backgroundColor: `rgba(167, 139, 250, 0.1)`,
                                            borderRadius: '10px',
                                            '& .MuiListItemIcon-root': {
                                                color: theme.palette.primary.main,
                                            },
                                            '& .MuiListItemText-primary': {
                                                fontWeight: 700,
                                                color: theme.palette.primary.main,
                                            }
                                        },
                                        '&:hover': {
                                            backgroundColor: `rgba(167, 139, 250, 0.08)`,
                                            transform: 'translateX(4px)',
                                        }
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{ 
                                            minWidth: 40,
                                            color: location.pathname === item.path 
                                                ? theme.palette.primary.main 
                                                : theme.palette.text.secondary,
                                            transition: 'color 0.3s ease'
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary={item.text}
                                        sx={{
                                            '& .MuiListItemText-primary': {
                                                fontWeight: location.pathname === item.path ? 700 : 500,
                                                transition: 'font-weight 0.3s ease'
                                            }
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>

                    {/* Footer info dans le sidebar */}
                    <Box 
                        sx={{ 
                            mt: 'auto', 
                            pt: 3, 
                            borderTop: `1px solid ${theme.palette.divider}`,
                            fontSize: '0.75rem',
                            color: theme.palette.text.secondary,
                            textAlign: 'center'
                        }}
                    >
                        <Typography variant="caption" display="block">
                            FactoryGuard v1.0
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            © 2026 - IoT Monitoring
                        </Typography>
                    </Box>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box 
                component="main" 
                sx={{ 
                    flexGrow: 1, 
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    backgroundColor: theme.palette.background.default,
                    width: '100%',
                    maxWidth: '100%'
                }}
            >
                <Toolbar /> {/* Spacing para AppBar */}
                <Box 
                    sx={{ 
                        flex: 1, 
                        overflow: 'auto',
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        p: 2.5,
                        '&::-webkit-scrollbar': {
                            width: '8px'
                        },
                        '&::-webkit-scrollbar-track': {
                            background: 'transparent'
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: theme.palette.primary.main,
                            borderRadius: '4px',
                            '&:hover': {
                                background: theme.palette.primary.light
                            }
                        }
                    }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    );
}