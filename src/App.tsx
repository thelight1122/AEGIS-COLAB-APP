import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import Chamber from './pages/Chamber';
import Artifacts from './pages/Artifacts';
import Sessions from './pages/Sessions';
import TeamSetup from './pages/TeamSetup';
import Lenses from './pages/Lenses';
import Settings from './pages/Settings';
import BoardPage from './pages/BoardPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import CommonsRoute from './pages/CommonsRoute';
import LandingPage from './pages/LandingPage';
import FrameworkPage from './pages/FrameworkPage';
import GovernancePage from './pages/GovernancePage';
import { ToolsRoute } from './routes/ToolsRoute';

import { IDSProvider } from './contexts/IDSContext';

function App() {
  return (
    <BrowserRouter>
      <IDSProvider>
        <Routes>
          {/* Public Full-Screen Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/framework" element={<FrameworkPage />} />
          <Route path="/governance" element={<GovernancePage />} />
          <Route path="/commons" element={<CommonsRoute />} />

          {/* Dashboard Pages */}
          <Route path="/chamber" element={<AppShell><Chamber /></AppShell>} />
          <Route path="/artifacts" element={<AppShell><Artifacts /></AppShell>} />
          <Route path="/sessions" element={<AppShell><Sessions /></AppShell>} />
          <Route path="/peers" element={<AppShell><TeamSetup /></AppShell>} />
          <Route path="/lenses" element={<AppShell><Lenses /></AppShell>} />
          <Route path="/settings" element={<AppShell><Settings /></AppShell>} />
          <Route path="/board" element={<AppShell><BoardPage /></AppShell>} />
          <Route path="/tools/*" element={<AppShell><ToolsRoute /></AppShell>} />

          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </IDSProvider>
    </BrowserRouter>
  );
}

export default App;
