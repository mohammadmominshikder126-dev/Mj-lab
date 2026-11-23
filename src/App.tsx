import { useEffect, useState } from 'react';
import { DataProvider } from './context/DataContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WebsiteView } from './components/WebsiteView';
import { AdminPanel } from './components/AdminPanel';

function isAdminPath(): boolean {
  return (
    window.location.pathname.startsWith('/admin') ||
    window.location.hash.startsWith('#/admin')
  );
}

export default function App() {
  const [adminRoute, setAdminRoute] = useState<boolean>(() => isAdminPath());

  useEffect(() => {
    const syncRoute = () => setAdminRoute(isAdminPath());
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  return (
    <ErrorBoundary>
      <DataProvider>
        {adminRoute ? <AdminPanel /> : <WebsiteView />}
      </DataProvider>
    </ErrorBoundary>
  );
}
