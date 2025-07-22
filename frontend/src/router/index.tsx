import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '@/App';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ProjectsPage } from '@/pages/dashboard/ProjectsPage';
import { TasksPage } from '@/pages/dashboard/TasksPage';
import { AnalyticsPage } from '@/pages/dashboard/AnalyticsPage';
import { MessagesPage } from '@/pages/dashboard/MessagesPage';
import { NotificationsPage } from '@/pages/dashboard/NotificationsPage';
import { SecurityPage } from '@/pages/dashboard/SecurityPage';
import { ServiceManagementPage } from '@/pages/dashboard/ServiceManagementPage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';
import { CalendarPage } from '@/pages/dashboard/CalendarPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AuthLayout, DashboardLayout } from '@/layouts';
import { ProtectedRoute } from './ProtectedRoute';
import { useTranslation } from 'react-i18next';
import { TaskDetailsPage } from '@/pages/dashboard/TaskDetailsPage';
import { ProjectDetailsPage } from '@/pages/dashboard/ProjectDetailsPage';

// Composant temporaire pour les pages en cours de développement
function UnderConstructionPage() {
  const { t } = useTranslation();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">{t('common.underConstructionTitle')}</h1>
      <p>{t('common.underConstructionDesc')}</p>
    </div>
  );
}

// Export du routeur et autres composants liés au routage
export * from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '',
        element: <AuthLayout />,
        children: [
          {
            path: 'login',
            element: <LoginPage />,
          },
          {
            path: 'register',
            element: <RegisterPage />,
          },
        ],
      },
      {
        path: '',
        element: <ProtectedRoute element={<DashboardLayout />} />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'tasks',
            element: <TasksPage />,
          },
          {
            path: 'tasks/:id',
            element: <TaskDetailsPage />,
          },
          {
            path: 'projects',
            element: <ProjectsPage />,
          },
          {
            path: 'projects/:id',
            element: <ProjectDetailsPage />,
          },
          {
            path: 'calendar',
            element: <CalendarPage />,
          },
          {
            path: 'team',
            element: <UnderConstructionPage />,
          },
          {
            path: 'messages',
            element: <MessagesPage />,
          },
          {
            path: 'notifications',
            element: <NotificationsPage />,
          },
          {
            path: 'analytics',
            element: <AnalyticsPage />,
          },
          {
            path: 'services',
            element: <ServiceManagementPage />,
          },
          {
            path: 'security',
            element: <SecurityPage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
          {
            path: '*',
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
]);
