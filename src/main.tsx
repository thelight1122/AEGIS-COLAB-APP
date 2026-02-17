import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isE2E } from './lib/e2e'
import { e2eHarness } from './core/e2e/e2eHarness'

if (isE2E()) {
  (window as any).__AEGIS_E2E__ = e2eHarness;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
