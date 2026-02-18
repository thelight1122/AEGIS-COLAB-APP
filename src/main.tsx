import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isE2E } from './lib/e2e'
import { e2eHarness } from './core/e2e/e2eHarness'

declare global {
  interface Window {
    __AEGIS_E2E__?: typeof e2eHarness;
    __AEGIS_LAST_METADATA__?: any;
  }
}

if (isE2E()) {
  window.__AEGIS_E2E__ = e2eHarness;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
