import { createRoot } from 'react-dom/client';
import { DataProvider } from './context/DataContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminPanel } from './components/AdminPanel';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <DataProvider>
      <AdminPanel />
    </DataProvider>
  </ErrorBoundary>
);
