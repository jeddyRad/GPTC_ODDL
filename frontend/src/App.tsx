import './i18n';
import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '@/components/common';
import { GlobalErrorHandler } from '@/components/common/GlobalErrorHandler';
import { AuthProvider } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SecurityProvider } from '@/contexts/SecurityContext';
import { MonitoringProvider } from '@/contexts/MonitoringContext';
import { NotificationProvider, useNotification } from '@/contexts/NotificationContext';
import { NotificationContainer } from '@/components/common/Notification';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <DataProvider>
              <SecurityProvider>
                <MonitoringProvider>
                  <GlobalErrorHandler>
                    <AppContent />
                  </GlobalErrorHandler>
                </MonitoringProvider>
              </SecurityProvider>
            </DataProvider>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { notifications, removeNotification } = useNotification();
  
  return (
    <DndProvider backend={HTML5Backend}>
      <Outlet />
      <NotificationContainer 
        notifications={notifications} 
        onClose={removeNotification}
      />
    </DndProvider>
  );
}

export default App;
