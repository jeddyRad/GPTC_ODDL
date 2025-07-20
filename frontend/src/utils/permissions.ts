import { User } from '@/types';

export interface UserPermissions {
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canCreateTasks: boolean;
  canEditTasks: boolean;
  canDeleteTasks: boolean;
  canManageUsers: boolean;
  canManageServices: boolean;
  canViewAnalytics: boolean;
  canViewAllProjects: boolean;
  canViewAllTasks: boolean;
  canManageNotifications: boolean;
  canAccessSettings: boolean;
}

export const getUserPermissions = (user: User | null): UserPermissions => {
  if (!user) {
    return {
      canCreateProjects: false,
      canEditProjects: false,
      canDeleteProjects: false,
      canCreateTasks: false,
      canEditTasks: false,
      canDeleteTasks: false,
      canManageUsers: false,
      canManageServices: false,
      canViewAnalytics: false,
      canViewAllProjects: false,
      canViewAllTasks: false,
      canManageNotifications: false,
      canAccessSettings: false,
    };
  }

  // Utiliser uniquement les permissions Django (codenames)
  const perms = user.permissions || [];

  return {
    canCreateProjects: perms.includes('api.add_projet'),
    canEditProjects: perms.includes('api.change_projet'),
    canDeleteProjects: perms.includes('api.delete_projet'),
    canCreateTasks: perms.includes('api.add_tache'),
    canEditTasks: perms.includes('api.change_tache'),
    canDeleteTasks: perms.includes('api.delete_tache'),
    canManageUsers: perms.includes('api.add_utilisateur') || perms.includes('api.change_utilisateur') || perms.includes('api.delete_utilisateur'),
    canManageServices: perms.includes('api.add_service') || perms.includes('api.change_service') || perms.includes('api.delete_service'),
    canViewAnalytics: perms.includes('api.view_projet') || perms.includes('api.view_tache'),
    canViewAllProjects: perms.includes('api.view_projet'),
    canViewAllTasks: perms.includes('api.view_tache'),
    canManageNotifications: perms.includes('api.add_notification') || perms.includes('api.change_notification') || perms.includes('api.delete_notification'),
    canAccessSettings: perms.includes('api.change_settings') || perms.includes('api.add_settings'),
  };
};

export const canUserEditProject = (user: User | null, project: any): boolean => {
  if (!user || !project) return false;
  const permissions = getUserPermissions(user);
  if (permissions.canEditProjects) return true;
  // Project creator can always edit
  if (project.createdBy === user.id) return true;
  // Team members, memberIds, memberDetails can edit if MANAGER
  if (user.role === 'MANAGER') {
    if (Array.isArray(project.teamMembers) && project.teamMembers.includes(user.id)) return true;
    if (Array.isArray(project.memberIds) && project.memberIds.includes(user.id)) return true;
    if (Array.isArray(project.memberDetails) && project.memberDetails.some((m: any) => m.id === user.id)) return true;
  }
  return false;
};

export const canUserDeleteProject = (user: User | null, project: any): boolean => {
  if (!user || !project) return false;
  
  const permissions = getUserPermissions(user);
  if (permissions.canDeleteProjects) return true;
  
  // Only admins can delete projects
  return user.role === 'ADMIN';
};

export const canUserEditTask = (user: User | null, task: any): boolean => {
  if (!user || !task) return false;
  
  // Task creator can edit
  if (task.createdBy === user.id) return true;
  
  // Assigned users can edit
  if (task.assignedTo?.includes(user.id)) return true;
  
  // Admin and chef can edit any task
  const permissions = getUserPermissions(user);
  return permissions.canEditTasks && (user.role === 'ADMIN' || user.role === 'MANAGER');
};

export const canUserDeleteTask = (user: User | null, task: any): boolean => {
  if (!user || !task) return false;
  
  const permissions = getUserPermissions(user);
  if (permissions.canDeleteTasks) return true;
  
  // Task creator can delete their own tasks
  return task.createdBy === user.id;
};

export const filterProjectsByPermission = (projects: any[], user: User | null): any[] => {
  if (!user) return [];
  const permissions = getUserPermissions(user);
  if (permissions.canViewAllProjects) {
    return projects;
  }
  // Pour les managers : voir tous les projets de leur service, où ils sont chef, membre, ou chefId
  if (user.role === 'MANAGER' && user.service) {
    return projects.filter(project =>
      project.createdBy === user.id ||
      (Array.isArray(project.teamMembers) && project.teamMembers.includes(user.id)) ||
      (Array.isArray(project.memberIds) && project.memberIds.includes(user.id)) ||
      (project.serviceId === user.service) ||
      (Array.isArray(project.serviceIds) && project.serviceIds.includes(user.service)) ||
      (project.chefId === user.id) ||
      (project.chefDetails && project.chefDetails.id === user.id) ||
      (Array.isArray(project.memberDetails) && project.memberDetails.some((m: any) => m.id === user.id))
    );
  }
  // Employé : projets où il est membre, créateur, ou membreDetails
  return projects.filter(project =>
    project.createdBy === user.id ||
    (Array.isArray(project.teamMembers) && project.teamMembers.includes(user.id)) ||
    (Array.isArray(project.memberIds) && project.memberIds.includes(user.id)) ||
    (Array.isArray(project.memberDetails) && project.memberDetails.some((m: any) => m.id === user.id))
  );
};

export const filterTasksByPermission = (tasks: any[], user: User | null): any[] => {
  if (!user) return [];
  
  const permissions = getUserPermissions(user);
  
  if (permissions.canViewAllTasks) {
    return tasks;
  }
  
  // Filter tasks where user is involved
  return tasks.filter(task => 
    task.createdBy === user.id ||
    task.assignedTo?.includes(user.id) ||
    (user.role === 'MANAGER' && task.serviceId === user.service)
  );
};
