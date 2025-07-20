import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
type Permission = string;
import { Button } from './common/Button';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface Action<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  permissions?: Permission[];
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: (item: T) => boolean;
}

interface PermissionTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  sortable?: boolean;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  currentSort?: { key: keyof T; direction: 'asc' | 'desc' };
}

export function PermissionTable<T extends { id: string | number }>({
  data,
  columns,
  actions = [],
  onRowClick,
  className = '',
  emptyMessage = 'Aucune donnée disponible',
  loading = false,
  sortable = false,
  onSort,
  currentSort
}: PermissionTableProps<T>) {
  const { checkAnyPermission } = usePermissions();
  const { t } = useTranslation();

  const hasActionPermission = (action: Action<T>): boolean => {
    if (!action.permissions || action.permissions.length === 0) {
      return true;
    }
    return checkAnyPermission(action.permissions);
  };

  // On ne filtre plus, on affiche tout, mais on désactive si non autorisé
  const renderActionButton = (action: Action<T>, item: T, key: number) => {
    const isDenied = !hasActionPermission(action);
    const finalDisabled = action.disabled?.(item) || isDenied;
    const finalTooltip = isDenied ? t('common.permissionDeniedTooltip') : undefined;
    return (
      <Button
        key={key}
        onClick={finalDisabled ? undefined : () => action.onClick(item)}
        disabled={finalDisabled}
        variant={action.variant === 'danger' ? 'danger' : 'ghost'}
        size={action.size || 'sm'}
        className="text-xs"
        title={finalTooltip}
        aria-disabled={finalDisabled}
        tabIndex={finalDisabled ? -1 : 0}
        leftIcon={action.icon}
      >
        {action.label}
        {isDenied && <AlertTriangle className="ml-2 w-4 h-4 text-yellow-400" aria-label={t('common.permissionDenied')} />}
      </Button>
    );
  };

  const handleSort = (key: keyof T) => {
    if (!sortable || !onSort) return;
    
    const direction = currentSort?.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc';
    onSort(key, direction);
  };

  const renderSortIcon = (key: keyof T) => {
    if (!sortable) return null;
    
    if (currentSort?.key === key) {
      return (
        <span className="ml-1">
          {currentSort.direction === 'asc' ? '↑' : '↓'}
        </span>
      );
    }
    return <span className="ml-1 text-gray-400">↕</span>;
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 h-8 rounded mb-4"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-200 h-12 rounded mb-2"></div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        {t('common.emptyTable')}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable && sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key as keyof T)}
              >
                <div className="flex items-center">
                  {column.label}
                  {column.sortable && renderSortIcon(column.key as keyof T)}
                </div>
              </th>
            ))}
            {actions.length > 0 && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr
              key={item.id}
              className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {column.render
                    ? column.render(item[column.key as keyof T], item)
                    : String(item[column.key as keyof T] || '')
                  }
                </td>
              ))}
              {actions.length > 0 && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex space-x-2">
                    {actions.map((action, actionIndex) => renderActionButton(action, item, actionIndex))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Composants spécialisés pour des entités courantes
export const TasksTable: React.FC<{
  tasks: any[];
  onEdit?: (task: any) => void;
  onDelete?: (task: any) => void;
  onAssign?: (task: any) => void;
  onView?: (task: any) => void;
}> = ({ tasks, onEdit, onDelete, onAssign, onView }) => {
  const { t } = useTranslation();
  const columns = [
    { key: 'title', label: t('tasks.title'), sortable: true },
    { key: 'status', label: t('tasks.status'), sortable: true },
    { key: 'priority', label: t('tasks.priority'), sortable: true },
    { key: 'deadline', label: t('tasks.deadline'), sortable: true },
    { key: 'assignedTo', label: t('tasks.assignedTo'), sortable: true }
  ];

  const actions: Action<any>[] = [
    {
      label: t('common.view'),
      onClick: onView!,
      permissions: ['view_tache']
    },
    {
      label: t('common.edit'),
      onClick: onEdit!,
      permissions: ['change_tache'],
      variant: 'primary'
    },
    {
      label: t('common.assign'),
      onClick: onAssign!,
      permissions: ['change_tache'],
      variant: 'ghost'
    },
    {
      label: t('common.delete'),
      onClick: onDelete!,
      permissions: ['delete_tache'],
      variant: 'danger'
    }
  ];

  return (
    <PermissionTable
      data={tasks}
      columns={columns}
      actions={actions}
    />
  );
};

export const UsersTable: React.FC<{
  users: any[];
  onEdit?: (user: any) => void;
  onDelete?: (user: any) => void;
  onView?: (user: any) => void;
}> = ({ users, onEdit, onDelete, onView }) => {
  const { t } = useTranslation();
  const columns = [
    { key: 'username', label: t('users.username'), sortable: true },
    { key: 'firstName', label: t('users.firstName'), sortable: true },
    { key: 'lastName', label: t('users.lastName'), sortable: true },
    { key: 'email', label: t('users.email'), sortable: true },
    { key: 'role', label: t('users.role'), sortable: true }
  ];

  const actions: Action<any>[] = [
    {
      label: t('common.view'),
      onClick: onView!,
      permissions: ['view_users' as Permission]
    },
    {
      label: t('common.edit'),
      onClick: onEdit!,
      permissions: ['edit_users' as Permission],
      variant: 'primary'
    },
    {
      label: t('common.delete'),
      onClick: onDelete!,
      permissions: ['delete_users' as Permission],
      variant: 'danger'
    }
  ];

  return (
    <PermissionTable
      data={users}
      columns={columns}
      actions={actions}
    />
  );
};