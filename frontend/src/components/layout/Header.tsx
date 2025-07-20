import { useState } from 'react';
import { Search, Bell, Plus, AlertTriangle, Sun, Moon, User, ChevronDown, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTheme } from '@/contexts/ThemeContext';
import { NotificationPanel } from '@/components/layout/NotificationPanel';
import { TaskModal } from '@/components/modals/TaskModal';
import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
function getProfilePhotoUrl(url?: string) {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return BACKEND_URL.replace(/\/$/, '') + url;
}

export function Header() {
  const { user, logout } = useAuth();
  const { notifications, searchTerm, setSearchTerm, urgencyModes } = useData();
  const { isDark, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { isAdmin } = usePermissions();
  
  const unreadCount = notifications.filter(n => !n.isRead && n.userId === user?.id).length;
  const activeUrgencyMode = urgencyModes.find(mode => mode.isActive);
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors duration-200 shadow-lg shadow-primary-200/40 dark:shadow-primary-900/30 shadow-[0_4px_24px_0_rgba(0,0,0,0.10),0_0px_16px_0_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white drop-shadow-lg tracking-wide">{t('header.title')}</h1>
            {activeUrgencyMode ? (
              <div className="flex items-center space-x-2">
                <div className="px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-full text-sm font-medium flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t('header.urgencyMode')}</span>
                </div>
              </div>
            ) : user?.role !== 'EMPLOYEE' ? (
              <div className="flex items-center space-x-2">
                <div className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                  {t('header.normalMode')}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={t('header.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
              />
            </div>

            { (isAdmin || user?.permissions?.includes('add_tache')) && (
              <Button
                onClick={() => setShowTaskModal(true)}
                variant="primary"
                size="md"
              >
                {t('header.createTask')}
              </Button>
            )}

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={isDark ? t('header.lightMode') : t('header.darkMode')}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <NotificationPanel onClose={() => setShowNotifications(false)} />
                )}
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {user?.profilePhoto ? (
                  <img src={getProfilePhotoUrl(user.profilePhoto)} alt={t('header.profilePhotoAlt')} className="w-10 h-10 rounded-full object-cover border-2 border-primary-500 shadow hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg text-gray-500 border-2 border-gray-300 shadow">
                    {`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || <UserIcon className="w-6 h-6" />}
                  </div>
                )}
                <div className="text-left">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                    {user ? `${user.firstName} ${user.lastName}` : ''}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.role === 'MANAGER' ? t('user.manager') : t('user.employee')}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <Button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/settings');
                    }}
                    variant="secondary"
                    size="md"
                    leftIcon={<UserIcon className="w-4 h-4" />}
                    className="w-full justify-start"
                  >
                    Profil
                  </Button>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <Button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    variant="danger"
                    size="md"
                    leftIcon={<LogOut className="w-4 h-4" />}
                    className="w-full justify-start"
                  >
                    Déconnexion
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showTaskModal && (
        <TaskModal 
          task={null}
          onClose={() => setShowTaskModal(false)} 
        />
      )}
    </>
  );
}
