import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Permissions } from '../types/index';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: Permissions[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permissions = [],
  requireAll = false,
  fallback = <div>Accès non autorisé</div>,
  redirectTo
}) => {
  const { checkAnyPermission, checkAllPermissions, isAuthenticated } = usePermissions();

  // Si l'utilisateur n'est pas connecté
  if (!isAuthenticated) {
    if (redirectTo) {
      window.location.href = redirectTo;
      return null;
    }
    return fallback;
  }

  // Si aucune permission n'est requise, afficher le contenu
  if (permissions.length === 0) {
    return <>{children}</>;
  }

  // Vérifier les permissions
  const hasAccess = requireAll 
    ? checkAllPermissions(permissions)
    : checkAnyPermission(permissions);

  if (!hasAccess) {
    if (redirectTo) {
      window.location.href = redirectTo;
      return null;
    }
    return fallback;
  }

  return <>{children}</>;
};

// Composants spécialisés pour des cas d'usage courants
export const AdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute permissions={['manage_system']}>
    {children}
  </ProtectedRoute>
);

export const ManagerOrHigher: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute permissions={['create_projects', 'edit_projects', 'delete_projects']}>
    {children}
  </ProtectedRoute>
);

export const CanManageUsers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute permissions={['create_users', 'edit_users', 'delete_users']}>
    {children}
  </ProtectedRoute>
);

export const CanViewAnalytics: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute permissions={['view_analytics']}>
    {children}
  </ProtectedRoute>
);

export const CanViewReports: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute permissions={['view_reports']}>
    {children}
  </ProtectedRoute>
);

export const CanManageTasks: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute permissions={['add_tache', 'change_tache', 'delete_tache']}>
    {children}
  </ProtectedRoute>
);