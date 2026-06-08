// Entry standalone: monta o Dashboard isolado no dev server (:3001).
// O shell NÃO consome este arquivo — consome via exposes './Dashboard'.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './Dashboard';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <div className="min-h-screen bg-background p-xl">
      <Dashboard />
    </div>
  </StrictMode>
);
