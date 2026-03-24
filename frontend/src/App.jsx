import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard.jsx';
import Assistant from './pages/Assistant';
import Sensors from './pages/Sensors';
import SensorHistory from './pages/SensorHistory';

// Plus besoin de createTheme, ThemeProvider ou CssBaseline ici !

function App() {
  return (
    // AppLayout contient la structure (sidebar, appbar)
    <AppLayout>
      {/* Routes définit quelle page afficher */}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/sensors" element={<Sensors />} />
        <Route path="/sensor/:sensorId" element={<SensorHistory />} />
      </Routes>
    </AppLayout>
  );
}

export default App;