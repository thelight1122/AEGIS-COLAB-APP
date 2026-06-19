import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import Chamber from './pages/Chamber';
import Artifacts from './pages/Artifacts';
import Sessions from './pages/Sessions';
import TeamSetup from './pages/TeamSetup';
import Lenses from './pages/Lenses';
import Settings from './pages/Settings';
import CommonsRoute from './pages/CommonsRoute';
import LandingPage from './pages/LandingPage';
import EcoVerseLanding from './pages/EcoVerseLanding';
import FrameworkPage from './pages/FrameworkPage';
import GovernancePage from './pages/GovernancePage';
import BuildmasterWorkshop from './pages/BuildmasterWorkshop';
import MirrorReflect from './pages/MirrorReflect';
import LessonLibrary from './pages/LessonLibrary';
import LessonPlanBuilder from './components/lessons/LessonPlanBuilder';
import { ToolsRoute } from './routes/ToolsRoute';

import { IDSProvider } from './contexts/IDSContext';
import { KeyringProvider } from './contexts/KeyringContext';
import { ProviderStatusProvider } from './contexts/ProviderStatusContext';
import { DataQuadProvider } from './contexts/DataQuadContext';
import { AdvisorProvider } from './contexts/AdvisorContext';
import { ArchiveProvider } from './contexts/ArchiveContext';

function App() {
  return (
    <BrowserRouter>
      <ArchiveProvider>
        <KeyringProvider>
          <ProviderStatusProvider>
            <DataQuadProvider>
              <IDSProvider>
                <AdvisorProvider>
                  <Routes>
                    {/* Diagnostic Tools — no AppShell */}
                    <Route path="/mirror" element={<MirrorReflect />} />

                    {/* Public Full-Screen Pages */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/ecoverse" element={<EcoVerseLanding />} />
                    <Route path="/framework" element={<FrameworkPage />} />
                    <Route path="/governance" element={<GovernancePage />} />
                    <Route path="/commons" element={<AppShell><CommonsRoute /></AppShell>} />
                    <Route path="/buildmaster" element={<AppShell><BuildmasterWorkshop /></AppShell>} />
                    <Route path="/artifacts" element={<AppShell><Artifacts /></AppShell>} />

                    {/* Dashboard Pages */}
                    <Route path="/chamber" element={<AppShell><Chamber /></AppShell>} />
                    <Route path="/sessions" element={<AppShell><Sessions /></AppShell>} />
                    <Route path="/peers" element={<AppShell><TeamSetup /></AppShell>} />
                    <Route path="/lenses" element={<AppShell><Lenses /></AppShell>} />
                    <Route path="/settings" element={<AppShell><Settings /></AppShell>} />
                    <Route path="/lessons" element={<AppShell><LessonLibrary /></AppShell>} />
                    <Route path="/lessons/new" element={<AppShell><LessonPlanBuilder /></AppShell>} />
                    <Route path="/tools/*" element={<AppShell><ToolsRoute /></AppShell>} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AdvisorProvider>
              </IDSProvider>
            </DataQuadProvider>
          </ProviderStatusProvider>
        </KeyringProvider>
      </ArchiveProvider>
    </BrowserRouter>
  );
}

export default App;
