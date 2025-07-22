import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { User } from '@/types';

export type Permission = string;

interface UsePermissionsResult {
  user: User | null;
  role: User['role'] | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  checkAnyPermission: (perms: Permission[]) => boolean;
  checkAllPermissions: (perms: Permission[]) => boolean;
}

export function usePermissions(): UsePermissionsResult {
  const { user, isAuthenticated } = useAuth();

  // Permissions extraites du backend (toujours un tableau)
  const permissions: Permission[] = useMemo(() => {
    if (!user || !user.permissions) return [];
    return user.permissions;
  }, [user]);

  // Rôle (ADMIN, MANAGER, EMPLOYEE, DIRECTOR)
  const role = user?.role || null;

  // Seul ADMIN a tous les droits implicites
  const isAdmin = role === 'ADMIN';

  // Vérifie si l'utilisateur possède au moins une des permissions demandées
  const checkAnyPermission = (perms: Permission[]): boolean => {
    if (!perms || perms.length === 0) return true;
    if (isAdmin) return true;
    return perms.some(p => permissions.includes(p));
  };

  // Vérifie si l'utilisateur possède toutes les permissions demandées
  const checkAllPermissions = (perms: Permission[]): boolean => {
    if (!perms || perms.length === 0) return true;
    if (isAdmin) return true;
    return perms.every(p => permissions.includes(p));
  };

  return {
    user,
    role,
    permissions,
    isAuthenticated,
    isAdmin,
    checkAnyPermission,
    checkAllPermissions,
  };
} 