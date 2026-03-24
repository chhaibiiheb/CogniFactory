import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx'
import './index.css'
import { SnackbarProvider } from 'notistack';
import { ColorModeContextProvider } from './context/ThemeContext'; // 1. Importer

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Utiliser notre Provider de thème comme parent principal */}
    <ColorModeContextProvider>
      <BrowserRouter>
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <App />
        </SnackbarProvider>
      </BrowserRouter>
    </ColorModeContextProvider>
  </React.StrictMode>,
)