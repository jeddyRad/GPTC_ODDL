
import {
  LayoutDashboard,
  CheckSquare,
  FolderOpen,
  Calendar,
  Users,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  AlertTriangle,
  BarChart3,
  Shield,
  Building2,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { User } from '@/types';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import oddlLogo from '../../assets/oddl.png';

interface SidebarProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user, logout, refreshUser } = useAuth();
  const { urgencyModes, services } = useData();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);

  const activeUrgencyMode = urgencyModes.find(mode => mode.isActive);
  // Utiliser en priorité les détails du service fournis par l'API utilisateur
  // Correction temporaire pour le typage User enrichi (serviceId, serviceDetails)
  type UserWithService = typeof user & { serviceId?: string; serviceDetails?: any };
  const userTyped = user as UserWithService;
  const userService = userTyped?.serviceDetails || services.find(d => String(d.id) === String(userTyped?.serviceId));

  // Liste complète des éléments de navigation avec les rôles autorisés
  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'DIRECTOR'] },
    { id: 'tasks', label: 'Tâches', icon: CheckSquare, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'DIRECTOR'] },
    { id: 'projects', label: 'Projets', icon: FolderOpen, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'DIRECTOR'] },
    { id: 'calendar', label: 'Calendrier', icon: Calendar, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'DIRECTOR'] },
    { id: 'team', label: 'Équipe', icon: Users, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'DIRECTOR'] },
    { id: 'messages', label: 'Messages', icon: MessageSquare, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'DIRECTOR'] },
    { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'DIRECTOR'] },
    // Accès pour Chef de service et Admin
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN', 'MANAGER', 'DIRECTOR'] },
    // Accès Admin uniquement
    { id: 'services', label: 'Services', icon: Building2, roles: ['ADMIN'] },
    { id: 'security', label: 'Sécurité', icon: Shield, roles: ['ADMIN'] },
    // Paramètres pour tous
    { id: 'settings', label: 'Paramètres', icon: Settings, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'DIRECTOR'] },
  ];

  // Filtrer les éléments de navigation en fonction du rôle de l'utilisateur
  const visibleItems = user ? navItems.filter(item => 
    item.roles.includes(user.role || 'EMPLOYEE')
  ) : [];

  const getRoleLabel = (role: User['role']) => {
    switch (role) {
      case 'ADMIN': return 'Administrateur';
      case 'MANAGER': return 'Chef de service';
      case 'EMPLOYEE': return 'Employé';
      case 'DIRECTOR': return 'Directeur';
      default: return role;
    }
  };

  // Fonction pour obtenir les initiales du nom complet
  const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  // Fonction pour obtenir la couleur basée sur le rôle
  const getRoleColor = (role?: User['role']) => {
    switch (role) {
      case 'ADMIN': return '#DC2626'; // rouge admin
      case 'MANAGER': return '#059669'; // vert chef de service  
      case 'EMPLOYEE': return '#2563EB'; // bleu employé
      case 'DIRECTOR': return '#F59E42'; // orange directeur
      default: return '#6B7280'; // gris par défaut
    }
  };

  // Gestion de la fermeture du sidebar sur mobile
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  // Gestion du clic sur un menu : navigation + callback éventuel
  const handleMenuClick = (id: string) => {
    if (onTabChange) onTabChange(id);
    navigate(`/${id}`);
    setIsOpen(false);
  };

  const handleTabClick = (tab: string, isAllowed: boolean) => {
    if (!isAllowed) return;
    if (onTabChange) onTabChange(tab);
    navigate(`/${tab}`);
  };

  // Correction robuste pour le nom du service
  let serviceName = 'Non assigné';
  if (user) {
    if (user.serviceDetails && user.serviceDetails.name) {
      serviceName = user.serviceDetails.name;
    } else if (user.service) {
      const found = services.find(s => String(s.id) === String(user.service));
      if (found) {
        serviceName = found.name;
      }
    }
  }

  return (
    <>
      {/* Bouton hamburger visible sur mobile/tablette */}
      <button
        className="fixed top-4 left-4 z-40 md:hidden bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
      </button>

      {/* Overlay et sidebar animé */}
      <div
        className={`fixed inset-0 z-30 md:static md:z-auto md:inset-auto transition-all duration-300 ${isOpen ? 'block' : 'hidden'} md:block`}
        onClick={handleOverlayClick}
        style={
          // pointer-events: none uniquement sur mobile quand le menu est fermé
          !isOpen && window.innerWidth < 768 ? { pointerEvents: 'none' } : { pointerEvents: 'auto' }
        }
      >
        <div
          className={`absolute md:static top-0 left-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-64 flex flex-col transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:shadow-none shadow-xl shadow-primary-200/40 dark:shadow-primary-900/30 shadow-[0_0px_24px_0_rgba(0,0,0,0.10),0_8px_32px_0_rgba(0,0,0,0.08)]`}
        >
          {/* Bouton de fermeture sur mobile */}
          <div className="flex md:hidden justify-end p-2">
            <button onClick={() => setIsOpen(false)} aria-label="Fermer le menu" className="p-2">
              <span className="text-2xl">×</span>
            </button>
          </div>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-gradient-to-b from-white-600 to-black-600 rounded-xl flex items-center justify-center shadow-md">
                <img src={oddlLogo} alt="Logo ODDL" className="w-14 h-14 object-contain" />
              </div>
              {/* Bloc d'identité de l'application dans la sidebar */}
              <div>
                <h1 className="font-semibold text-xl text-gray-1000 dark:text-white tracking-wide drop-shadow">GPTC oddl</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Gestion de projets v1.0</p>
              </div>
            </div>
          </div>

          {activeUrgencyMode && (
            <div className="mx-3 mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-800 dark:text-red-200">Mode Urgence</span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{activeUrgencyMode.title}</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              {navItems.map(item => {
                const isAllowed = user && item.roles.includes(user.role);
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-r-2 border-primary-600 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                    } ${isAllowed ? '' : 'cursor-not-allowed pointer-events-none'}`}
                    disabled={!isAllowed}
                    tabIndex={isAllowed ? 0 : -1}
                    title={!isAllowed ? t('common.permissionDeniedTooltip') : undefined}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                    {!isAllowed && <AlertTriangle className="w-4 h-4 ml-2 text-yellow-500" aria-label={t('common.permissionDenied')} />}
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-primary-600 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium border-2 border-white dark:border-gray-800"
                style={{ backgroundColor: getRoleColor(user?.role) }}
              >
                {user ? getInitials(user.firstName, user.lastName) : ''}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user ? `${user.firstName} ${user.lastName}` : ''}
                </p>
                <p className="text-xs font-medium" style={{ color: getRoleColor(user?.role) }}>
                  {user?.role ? getRoleLabel(user.role) : ''}
                </p>
                {user?.role === 'MANAGER' && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                   {serviceName}
                  </p>
                )}
                {user?.role === 'EMPLOYEE' && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                    {userService ? userService.name : 'Non assigné'}
                  </p>
                )}
                {/* Bouton de refresh infos utilisateur */}
                <button
                  onClick={refreshUser}
                  className="mt-1 text-xs text-primary-600 hover:underline focus:outline-none"
                  title="Rafraîchir les informations utilisateur"
                  type="button"
                >
                  Rafraîchir les infos
                </button>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
