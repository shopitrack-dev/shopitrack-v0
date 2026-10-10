import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageError } from '@/components/PageError';
import { initAnalytics } from '@/analytics';
import { VercelAnalytics } from '@/analytics/VercelAnalytics';
import { VercelSpeedInsights } from '@/analytics/VercelSpeedInsights';
import './index.css';
import './styles/design-system.scss';
import './styles/custom.scss';

initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary name="App" fallback={<PageError />}>
      <App />
    </ErrorBoundary>
    <VercelAnalytics />
    <VercelSpeedInsights />
  </StrictMode>
);
