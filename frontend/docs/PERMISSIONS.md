# Système de Permissions Frontend

Ce document décrit le système de permissions implémenté dans le frontend React de l'application.

## Vue d'ensemble

Le système de permissions est basé sur des rôles (ADMIN, DIRECTOR, MANAGER, EMPLOYEE) et des permissions granulaires. Chaque utilisateur a un rôle qui détermine ses permissions d'accès aux différentes fonctionnalités de l'application.

## Rôles et Permissions

### Rôles disponibles

- **ADMIN** : Accès complet à toutes les fonctionnalités
- **DIRECTOR** : Accès étendu avec gestion des utilisateurs et services
- **MANAGER** : Accès aux projets et tâches avec gestion d'équipe
- **EMPLOYEE** : Accès limité aux tâches et projets de base

### Permissions disponibles

```typescript
type Permission = 
  | 'view_tasks' | 'create_tasks' | 'edit_tasks' | 'delete_tasks' | 'assign_tasks'
  | 'view_projects' | 'create_projects' | 'edit_projects' | 'delete_projects'
  | 'view_users' | 'create_users' | 'edit_users' | 'delete_users'
  | 'view_services' | 'create_services' | 'edit_services' | 'delete_services'
  | 'view_analytics' | 'view_reports' | 'create_reports'
  | 'view_security' | 'manage_security' | 'view_backups' | 'manage_backups'
  | 'view_gdpr' | 'manage_gdpr' | 'view_activity_logs' | 'manage_system';
```

### Mapping des rôles vers permissions

```typescript
const ROLE_PERMISSIONS = {
  ADMIN: [
    'view_tasks', 'create_tasks', 'edit_tasks', 'delete_tasks', 'assign_tasks',
    'view_projects', 'create_projects', 'edit_projects', 'delete_projects',
    'view_users', 'create_users', 'edit_users', 'delete_users',
    'view_services', 'create_services', 'edit_services', 'delete_services',
    'view_analytics', 'view_reports', 'create_reports',
    'view_security', 'manage_security', 'view_backups', 'manage_backups',
    'view_gdpr', 'manage_gdpr', 'view_activity_logs', 'manage_system'
  ],
  DIRECTOR: [
    'view_tasks', 'create_tasks', 'edit_tasks', 'assign_tasks',
    'view_projects', 'create_projects', 'edit_projects',
    'view_users', 'edit_users',
    'view_services', 'edit_services',
    'view_analytics', 'view_reports', 'create_reports',
    'view_security', 'view_backups', 'view_gdpr', 'view_activity_logs'
  ],
  MANAGER: [
    'view_tasks', 'create_tasks', 'edit_tasks', 'assign_tasks',
    'view_projects', 'create_projects', 'edit_projects',
    'view_users', 'view_services', 'view_analytics', 'view_reports'
  ],
  EMPLOYEE: [
    'view_tasks', 'create_tasks', 'edit_tasks',
    'view_projects', 'view_users', 'view_services'
  ]
};
```

## Hook usePermissions

Le hook `usePermissions` fournit une interface simple pour vérifier les permissions de l'utilisateur connecté.

### Utilisation

```typescript
import { usePermissions } from '@/hooks/usePermissions';

const MyComponent = () => {
  const { 
    user, 
    isAuthenticated,
    checkPermission, 
    checkAnyPermission, 
    checkAllPermissions,
    isAdmin, 
    isDirector, 
    isManager, 
    isEmployee,
    canManageUsers,
    canManageServices,
    canManageProjects,
    canManageTasks,
    canViewAnalytics,
    canViewReports,
    canViewSecurity,
    canManageSystem
  } = usePermissions();

  // Vérifier une permission spécifique
  if (checkPermission('create_tasks')) {
    // Afficher le bouton de création de tâche
  }

  // Vérifier plusieurs permissions (au moins une)
  if (checkAnyPermission(['edit_tasks', 'delete_tasks'])) {
    // Afficher les actions de modification
  }

  // Vérifier plusieurs permissions (toutes requises)
  if (checkAllPermissions(['create_users', 'edit_users'])) {
    // Afficher la gestion complète des utilisateurs
  }

  // Vérifier le rôle
  if (isAdmin()) {
    // Afficher les fonctionnalités d'administration
  }

  return (
    <div>
      {/* Contenu du composant */}
    </div>
  );
};
```

## Composants de Protection

### ProtectedRoute

Protège une section de contenu en fonction des permissions.

```typescript
import { ProtectedRoute } from '@/components';

const MyPage = () => {
  return (
    <div>
      <h1>Page publique</h1>
      
      <ProtectedRoute permissions={['view_tasks']}>
        <div>Cette section n'est visible que si l'utilisateur peut voir les tâches</div>
      </ProtectedRoute>

      <ProtectedRoute permissions={['manage_system']}>
        <div>Cette section n'est visible que pour les administrateurs</div>
      </ProtectedRoute>

      <ProtectedRoute permissions={['create_users', 'edit_users']} requireAll={false}>
        <div>Cette section est visible si l'utilisateur peut créer OU modifier des utilisateurs</div>
      </ProtectedRoute>
    </div>
  );
};
```

### Composants spécialisés

```typescript
import { AdminOnly, ManagerOrHigher, CanManageUsers } from '@/components';

const MyPage = () => {
  return (
    <div>
      <AdminOnly>
        <div>Contenu réservé aux administrateurs</div>
      </AdminOnly>

      <ManagerOrHigher>
        <div>Contenu pour managers et plus</div>
      </ManagerOrHigher>

      <CanManageUsers>
        <div>Contenu pour ceux qui peuvent gérer les utilisateurs</div>
      </CanManageUsers>
    </div>
  );
};
```

## Boutons avec Permissions

### PermissionButton

Bouton qui ne s'affiche que si l'utilisateur a les permissions nécessaires.

```typescript
import { PermissionButton } from '@/components';

const MyComponent = () => {
  return (
    <div>
      <PermissionButton
        permissions={['create_tasks']}
        onClick={() => handleCreateTask()}
        variant="success"
      >
        Nouvelle tâche
      </PermissionButton>

      <PermissionButton
        permissions={['delete_tasks']}
        onClick={() => handleDeleteTask()}
        variant="danger"
        disabled={isTaskInProgress}
      >
        Supprimer
      </PermissionButton>
    </div>
  );
};
```

### Composants spécialisés

```typescript
import { CreateButton, EditButton, DeleteButton, AssignButton } from '@/components';

const MyComponent = () => {
  return (
    <div>
      <CreateButton entity="task" onClick={handleCreateTask}>
        Nouvelle tâche
      </CreateButton>

      <EditButton entity="project" onClick={handleEditProject}>
        Modifier le projet
      </EditButton>

      <DeleteButton entity="user" onClick={handleDeleteUser}>
        Supprimer l'utilisateur
      </DeleteButton>

      <AssignButton onClick={handleAssignTask}>
        Assigner la tâche
      </AssignButton>
    </div>
  );
};
```

## Menus avec Permissions

### PermissionMenu

Menu qui affiche seulement les éléments auxquels l'utilisateur a accès.

```typescript
import { PermissionMenu } from '@/components';

const MyComponent = () => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      href: '/dashboard',
      permissions: ['view_tasks']
    },
    {
      id: 'users',
      label: 'Utilisateurs',
      href: '/users',
      permissions: ['view_users']
    },
    {
      id: 'analytics',
      label: 'Analyses',
      href: '/analytics',
      permissions: ['view_analytics']
    }
  ];

  return (
    <PermissionMenu 
      items={menuItems} 
      variant="vertical" 
      size="md" 
    />
  );
};
```

### Menus spécialisés

```typescript
import { MainNavigationMenu, QuickActionsMenu } from '@/components';

const Layout = () => {
  return (
    <div>
      <nav>
        <MainNavigationMenu />
      </nav>
      
      <div className="quick-actions">
        <QuickActionsMenu />
      </div>
    </div>
  );
};
```

## Tableaux avec Permissions

### PermissionTable

Tableau qui affiche seulement les actions autorisées pour chaque ligne.

```typescript
import { PermissionTable } from '@/components';

const MyComponent = () => {
  const columns = [
    { key: 'name', label: 'Nom', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Rôle', sortable: true }
  ];

  const actions = [
    {
      label: 'Voir',
      onClick: (user) => handleViewUser(user),
      permissions: ['view_users']
    },
    {
      label: 'Modifier',
      onClick: (user) => handleEditUser(user),
      permissions: ['edit_users'],
      variant: 'primary'
    },
    {
      label: 'Supprimer',
      onClick: (user) => handleDeleteUser(user),
      permissions: ['delete_users'],
      variant: 'danger'
    }
  ];

  return (
    <PermissionTable
      data={users}
      columns={columns}
      actions={actions}
      onRowClick={(user) => handleRowClick(user)}
    />
  );
};
```

### Tableaux spécialisés

```typescript
import { UsersTable, TasksTable } from '@/components';

const MyPage = () => {
  return (
    <div>
      <UsersTable
        users={users}
        onView={handleViewUser}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
      />

      <TasksTable
        tasks={tasks}
        onView={handleViewTask}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
        onAssign={handleAssignTask}
      />
    </div>
  );
};
```

## Fonctions utilitaires

### Vérification des permissions

```typescript
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/types';

// Vérifier une permission
const canCreateTasks = hasPermission(userRole, 'create_tasks');

// Vérifier au moins une permission
const canManageTasks = hasAnyPermission(userRole, ['edit_tasks', 'delete_tasks']);

// Vérifier toutes les permissions
const canManageUsers = hasAllPermissions(userRole, ['create_users', 'edit_users', 'delete_users']);
```

## Bonnes pratiques

### 1. Vérification côté client ET serveur

Les permissions doivent toujours être vérifiées côté serveur. Le système frontend est une couche de sécurité supplémentaire pour l'expérience utilisateur.

### 2. Utilisation des composants spécialisés

Préférer les composants spécialisés (`CreateButton`, `AdminOnly`, etc.) aux composants génériques quand possible pour une meilleure lisibilité.

### 3. Gestion des états de chargement

```typescript
const MyComponent = () => {
  const { user, isAuthenticated } = usePermissions();

  if (!isAuthenticated) {
    return <div>Chargement...</div>;
  }

  return (
    <div>
      {/* Contenu protégé */}
    </div>
  );
};
```

### 4. Messages d'erreur appropriés

```typescript
<ProtectedRoute 
  permissions={['manage_system']}
  fallback={<div>Accès non autorisé. Contactez votre administrateur.</div>}
>
  <AdminPanel />
</ProtectedRoute>
```

## Tests

### Test des permissions

```typescript
import { render, screen } from '@testing-library/react';
import { usePermissions } from '@/hooks/usePermissions';

// Mock du hook
jest.mock('@/hooks/usePermissions');

const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>;

describe('Permissions', () => {
  it('should show admin content for admin user', () => {
    mockUsePermissions.mockReturnValue({
      user: { role: 'ADMIN' },
      isAdmin: () => true,
      checkPermission: () => true,
      // ... autres propriétés
    });

    render(<AdminComponent />);
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('should hide admin content for employee user', () => {
    mockUsePermissions.mockReturnValue({
      user: { role: 'EMPLOYEE' },
      isAdmin: () => false,
      checkPermission: () => false,
      // ... autres propriétés
    });

    render(<AdminComponent />);
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });
});
```

## Migration depuis l'ancien système

Si vous migrez depuis un système de permissions différent :

1. **Mettre à jour les types** : Remplacer les anciens types de rôles par les nouveaux
2. **Adapter les composants** : Remplacer les vérifications manuelles par les nouveaux composants
3. **Tester les permissions** : Vérifier que chaque rôle a accès aux bonnes fonctionnalités
4. **Documenter les changements** : Mettre à jour la documentation utilisateur

## Support

Pour toute question ou problème avec le système de permissions, consultez :

- La documentation des types dans `src/types/index.ts`
- Les exemples d'utilisation dans `src/pages/PermissionsDemo.tsx`
- Les tests dans `src/__tests__/permissions/`