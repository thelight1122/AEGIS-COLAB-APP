
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import Chamber from './pages/Chamber';
import Artifacts from './pages/Artifacts';
import Sessions from './pages/Sessions';
import Peers from './pages/Peers';
import Lenses from './pages/Lenses';
import Settings from './pages/Settings';
import BoardPage from './pages/BoardPage';
import AuthCallbackPage from './pages/AuthCallbackPage';

import { IDSProvider } from './contexts/IDSContext';

function App() {
  return (
    <BrowserRouter>
      <IDSProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Chamber />} />
            <Route path="/artifacts" element={<Artifacts />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/peers" element={<Peers />} />
            <Route path="/lenses" element={<Lenses />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </IDSProvider>
    </BrowserRouter>
  );
}

export default App;
