import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@bytebank/api-client';
import TransactionsPage from './TransactionsPage';
import AccountOverview from './components/AccountOverview';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background p-xl flex flex-col gap-xl">
        <AccountOverview />
        <TransactionsPage />
      </div>
    </QueryClientProvider>
  </StrictMode>
);
