import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DemoGateway from './pages/DemoGateway';
import FleetDashboard from './pages/FleetDashboard';
import EngineAnalyzer from './pages/EngineAnalyzer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoGateway />} />
        <Route path="/demo/fleet" element={<FleetDashboard />} />
        <Route path="/demo/analyzer" element={<EngineAnalyzer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
