import React, { createContext, useState, useMemo, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Création du contexte
export const ColorModeContext = createContext({ toggleColorMode: () => {} });

// Le Provider qui va envelopper notre application
export const ColorModeContextProvider = ({ children }) => {
    // On essaie de récupérer le mode depuis le localStorage, sinon 'dark' par défaut
    const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'dark');

    // On sauvegarde le mode dans le localStorage à chaque changement
    useEffect(() => {
        localStorage.setItem('themeMode', mode);
    }, [mode]);

    const colorMode = useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
            },
        }),
        [],
    );

    // useMemo pour ne pas recréer le thème à chaque rendu. C'est une optimisation cruciale.
    const theme = useMemo(() => {
        const designTokens = {
            palette: {
                mode, // 'light' ou 'dark'
                ...(mode === 'light'
                    // Palette pour le mode clair - Industrie moderne avec violet
                    ? {
                        primary: { main: '#7c3aed', light: '#a78bfa', dark: '#6d28d9' }, // Violet moderne
                        secondary: { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2' }, // Cyan
                        success: { main: '#10b981', light: '#6ee7b7', dark: '#059669' }, // Vert
                        warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' }, // Orange
                        error: { main: '#ef4444', light: '#fca5a5', dark: '#dc2626' }, // Rouge
                        background: { default: '#f8fafc', paper: '#ffffff' },
                        text: { primary: '#1e293b', secondary: '#64748b' },
                        divider: '#e2e8f0'
                      }
                    // Palette pour le mode sombre - Dashboard moderne avec violet
                    : {
                        primary: { main: '#a78bfa', light: '#ddd6fe', dark: '#7c3aed' }, // Violet clair
                        secondary: { main: '#22d3ee', light: '#67e8f9', dark: '#06b6d4' }, // Cyan clair
                        success: { main: '#10b981', light: '#6ee7b7', dark: '#059669' },
                        warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
                        error: { main: '#ef4444', light: '#fca5a5', dark: '#dc2626' },
                        background: { default: '#0f172a', paper: '#1e293b' },
                        text: { primary: '#f1f5f9', secondary: '#cbd5e1' },
                        divider: '#334155'
                      }),
            },
            typography: {
                fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
                h1: { fontWeight: 800, letterSpacing: '-0.02em' },
                h2: { fontWeight: 700, letterSpacing: '-0.01em' },
                h3: { fontWeight: 700 },
                h4: { fontWeight: 700 },
                h5: { fontWeight: 600 },
                h6: { fontWeight: 600 },
                body1: { fontWeight: 400, lineHeight: 1.6 },
                body2: { fontWeight: 400, lineHeight: 1.5 },
            },
            shape: {
                borderRadius: 12, // Bords arrondis pour un look moderne
            },
            shadows: [
                'none',
                '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            ],
            components: {
                MuiPaper: {
                    styleOverrides: {
                        root: {
                            transition: 'background-color 0.3s ease-in-out, box-shadow 0.3s',
                        }
                    }
                },
                MuiCard: {
                    styleOverrides: {
                        root: ({ theme }) => ({
                            border: `1px solid ${theme.palette.divider}`,
                            backdropFilter: 'blur(10px)',
                            '&:hover': {
                                boxShadow: theme.shadows[8],
                                transform: 'translateY(-4px)',
                                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
                                borderColor: theme.palette.primary.main,
                            }
                        })
                    }
                },
                MuiButton: {
                    styleOverrides: {
                        contained: ({ theme }) => ({
                            fontWeight: 600,
                            textTransform: 'none',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            '&:hover': {
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                transform: 'translateY(-2px)',
                                transition: 'all 0.2s ease-in-out',
                            }
                        }),
                        outlined: {
                            fontWeight: 600,
                            textTransform: 'none',
                        }
                    }
                },
                MuiAppBar: {
                    styleOverrides: {
                        root: ({ theme }) => ({
                            backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            backdropFilter: 'blur(10px)',
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        })
                    }
                },
                MuiDrawer: {
                    styleOverrides: {
                        paper: ({ theme }) => ({
                            borderRight: `1px solid ${theme.palette.divider}`,
                            backgroundImage: theme.palette.mode === 'dark' 
                                ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
                                : 'linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 1) 100%)',
                        })
                    }
                },
                MuiTableCell: {
                    styleOverrides: {
                        root: ({ theme }) => ({
                            borderColor: theme.palette.divider,
                            fontWeight: 500,
                        })
                    }
                },
                MuiTextField: {
                    styleOverrides: {
                        root: {
                            '& .MuiOutlinedInput-root': {
                                fontWeight: 500,
                            }
                        }
                    }
                },
                MuiChip: {
                    styleOverrides: {
                        root: {
                            fontWeight: 500,
                        }
                    }
                }
            }
        };
        return createTheme(designTokens);
    }, [mode]);

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline /> {/* Normalise le style et applique la couleur de fond */}
                {children}
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
};