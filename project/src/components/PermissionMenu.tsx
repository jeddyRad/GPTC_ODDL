import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
type Permission = string;
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './common/Button';

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  permissions?: Permission[];
  requireAll?: boolean;
  children?: MenuItem[];
  disabled?: boolean;
  divider?: boolean;
}

interface PermissionMenuProps {
  items: MenuItem[];
  className?: string;
  variant?: 'vertical' | 'horizontal' | 'dropdown';
  size?: 'sm' | 'md' | 'lg';
}

export const PermissionMenu: React.FC<PermissionMenuProps> = ({
  items,
  className = '',
  variant = 'vertical',
  size = 'md'
}) => {
  const { checkAnyPermission, checkAllPermissions } = usePermissions();
  const { t } = useTranslation();

  const hasAccess = (item: MenuItem): boolean => {
    if (!item.permissions || item.permissions.length === 0) {
      return true;
    }
    
    return item.requireAll 
      ? checkAllPermissions(item.permissions)
      : checkAnyPermission(item.permissions);
  };

  const renderMenuItem = (item: MenuItem): React.ReactNode => {
    const isDenied = !hasAccess(item);
    const finalDisabled = item.disabled || isDenied;
    const finalTooltip = isDenied ? t('common.permissionDeniedTooltip') : undefined;

    if (item.divider) {
      return <hr key={item.id} className="my-2 border-gray-200" />;
    }

    // Utilisation du bouton commun pour un look épuré
    return (
      <Button
        key={item.id}
        onClick={finalDisabled ? undefined : item.onClick}
        disabled={finalDisabled}
        variant={variant === 'dropdown' || variant === 'horizontal' ? 'ghost' : 'outline'}
        size={size}
        className={`w-full text-left ${finalDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={finalTooltip}
        aria-disabled={finalDisabled}
        tabIndex={finalDisabled ? -1 : 0}
        leftIcon={item.icon}
      >
        {item.label}
        {isDenied && <AlertTriangle className="ml-2 w-4 h-4 text-yellow-400" aria-label={t('common.permissionDenied')} />}
      </Button>
    );
  };

  const renderMenuItems = (menuItems: MenuItem[]): React.ReactNode => {
    return menuItems.map(item => {
      if (item.children && item.children.length > 0) {
        const accessibleChildren = item.children.filter(hasAccess);
        if (accessibleChildren.length === 0) {
          return null;
        }

        return (
          <div key={item.id} className="space-y-1">
            {renderMenuItem(item)}
            <div className="ml-4 space-y-1">
              {renderMenuItems(accessibleChildren)}
            </div>
          </div>
        );
      }

      return renderMenuItem(item);
    });
  };

  const containerClasses = {
    vertical: 'space-y-1',
    horizontal: 'flex space-x-4',
    dropdown: 'space-y-1 bg-white shadow-lg rounded-md border border-gray-200 p-2'
  };

  const classes = `${containerClasses[variant]} ${className}`;

  return (
    <div className={classes}>
      {renderMenuItems(items)}
    </div>
  );
};

// Menu spécialisé pour la navigation principale
export const MainNavigationMenu: React.FC = () => {
  const items: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      href: '/dashboard',
      permissions: ['view_tasks']
    },
    {
      id: 'tasks',
      label: 'Tâches',
      href: '/tasks',
      permissions: ['view_tasks']
    },
    {
      id: 'projects',
      label: 'Projets',
      href: '/projects',
      permissions: ['view_projects']
    },
    {
      id: 'users',
      label: 'Utilisateurs',
      href: '/users',
      permissions: ['view_users']
    },
    {
      id: 'services',
      label: 'Services',
      href: '/services',
      permissions: ['view_services']
    },
    {
      id: 'analytics',
      label: 'Analyses',
      href: '/analytics',
      permissions: ['view_analytics']
    },
    {
      id: 'reports',
      label: 'Rapports',
      href: '/reports',
      permissions: ['view_reports']
    },
    {
      id: 'security',
      label: 'Sécurité',
      href: '/security',
      permissions: ['view_security']
    },
    {
      id: 'system',
      label: 'Système',
      href: '/system',
      permissions: ['manage_system']
    }
  ];

  return <PermissionMenu items={items} variant="vertical" />;
};

// Menu pour les actions rapides
export const QuickActionsMenu: React.FC = () => {
  const items: MenuItem[] = [
    {
      id: 'create-task',
      label: 'Nouvelle tâche',
      href: '/tasks/create',
      permissions: ['create_tasks']
    },
    {
      id: 'create-project',
      label: 'Nouveau projet',
      href: '/projects/create',
      permissions: ['create_projects']
    },
    {
      id: 'create-user',
      label: 'Nouvel utilisateur',
      href: '/users/create',
      permissions: ['create_users']
    },
    {
      id: 'create-service',
      label: 'Nouveau service',
      href: '/services/create',
      permissions: ['create_services']
    }
  ];

  return <PermissionMenu items={items} variant="dropdown" />;
};