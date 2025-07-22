import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header, Sidebar } from '@/components/layout';

export function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const location = useLocation();
  const navigate = useNavigate();

  // Met à jour l'onglet actif en fonction de l'URL
  useEffect(() => {
    const currentPath = location.pathname.split('/')[1] || 'dashboard';
    setActiveTab(currentPath);
    console.log('URL actuelle:', location.pathname, 'Tab actif:', currentPath);
  }, [location]);

  // Gère le changement d'onglet et la navigation
  const handleTabChange = (tabId: string) => {
    console.log('Navigation vers:', tabId);
    setActiveTab(tabId);
    navigate(`/${tabId}`);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {/* On force la hauteur à 100% pour que les enfants (ex: MessagesView) puissent occuper tout l'espace vertical */}
          <div className="h-full flex flex-col min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
