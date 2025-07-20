import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <Outlet />
      </div>
    </div>
  );
}
