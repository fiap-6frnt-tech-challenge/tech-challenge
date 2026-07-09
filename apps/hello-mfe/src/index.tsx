// Entry point para o Rsbuild dev server montar o Hello em standalone.
// Não é o que o shell consome — shell consome via exposes: { './Hello': ... } no rsbuild.config.ts.
// Este arquivo só serve para `npm run dev -w @bytebank/hello-mfe` mostrar o componente isolado.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Hello from './Hello';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <div style={{ padding: '2rem', background: '#f3f3f3', minHeight: '100vh' }}>
      <Hello />
    </div>
  </StrictMode>
);
