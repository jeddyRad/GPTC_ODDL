
import { useDrag } from 'react-dnd';
import { Calendar, User, MessageSquare, Paperclip, Clock, AlertTriangle, Building2, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Task } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { services, users, projects } = useData();
  const { t } = useTranslation();
  
  const [{ isDragging }, drag] = useDrag({
    type: 'task',
    item: { id: task.id },
    collect: (monitor) => {
      const dragging = monitor.isDragging();
      if (dragging) {
        console.log('Dragging task:', task.id);
      }
      return { isDragging: dragging };
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return t('task.priorityUrgent');
      case 'high': return t('task.priorityHigh');
      case 'medium': return t('task.priorityMedium');
      case 'low': return t('task.priorityLow');
      default: return priority;
    }
  };

  // Correction pour éviter erreur si assignedTo est undefined
  const assignedUsers = users.filter(u => Array.isArray(task.assignedTo) && task.assignedTo.includes(u.id));
  // Correction pour affichage du service
  const taskService = services.find(s => String(s.id) === String(task.serviceId));
  const project = projects.find(p => p.id === task.projectId);

  const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';
  const daysUntilDeadline = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div
      ref={drag}
      className={`relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer group ${isOverdue ? 'border-red-400 dark:border-red-600' : ''}`}
      onClick={(e) => {
        // Si le clic vient du menu, ne pas ouvrir les détails
        if ((e.target as HTMLElement).closest('.taskcard-menu')) return;
        onClick();
      }}
    >
      {/* Badge type de tâche */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`px-2 py-1 rounded text-xs font-semibold mr-2
            ${task.type === 'projet' ? 'bg-blue-100 text-blue-800' : task.type === 'service' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
        >
          {/* Texte du badge selon le type */}
          {task.type === 'projet' ? t('task.type.project') : task.type === 'service' ? t('task.type.service') : t('task.type.personal')}
        </span>
        {/* Icône pièce jointe à côté du titre si pièces jointes */}
        {((task.attachments ?? []).length) > 0 && (
          <span title={t('task.attachments')} className="flex items-center text-gray-400 dark:text-gray-500 ml-2">
            <Paperclip className="w-4 h-4" />
            <span className="text-xs ml-1">{(task.attachments ?? []).length}</span>
          </span>
        )}
        {/* Menu d'actions en haut à droite */}
        <div className="taskcard-menu relative ml-auto">
          <button
            type="button"
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            onClick={e => {
              e.stopPropagation();
              setMenuOpen(v => !v);
            }}
            aria-label="Actions"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
              <button
                className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={e => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  // Appeler la fonction de modification (à brancher selon le parent)
                  onClick();
                }}
              >
                <Edit2 className="w-4 h-4 mr-2" /> {t('common.edit')}
              </button>
              <button
                className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                onClick={e => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  // TODO: brancher la suppression via props ou contexte
                  alert('Suppression à implémenter');
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> {t('common.delete')}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Titre de la tâche */}
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 truncate">{task.title}</h3>

      {task.description && (
        <p className="text-gray-600 dark:text-gray-400 text-xs mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="space-y-2">
        {/* Service */}
        {(
          taskService ? (
            <div className="flex items-center space-x-1">
              <Building2 className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {taskService.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <Building2 className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {t('task.unassigned')}
              </span>
            </div>
          )
        )}

        {/* Affichage du projet lié si tâche de projet */}
        {task.type === 'projet' && project && (
          <div className="flex items-center space-x-1">
            <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-300" />
            <span className="text-xs text-blue-600 dark:text-blue-300 font-semibold truncate">
              {project.name}
            </span>
          </div>
        )}

        {/* Employés assignés */}
        {assignedUsers.length > 0 && (
          <div className="flex items-center space-x-1">
            <User className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
              {assignedUsers.slice(0, 2).map((user, index) => (
                <span key={user.id} className="truncate" title={`${user.firstName} ${user.lastName}`}>{user.firstName} {user.lastName}{index < Math.min(assignedUsers.length, 2) - 1 && assignedUsers.length > 1 ? ',' : ''}</span>
              ))}
              {assignedUsers.length > 2 && (
                <span className="text-gray-400">+{assignedUsers.length - 2}</span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs mt-2">
          <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
            <Calendar className="w-3 h-3" />
            <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
              {new Date(task.deadline).toLocaleDateString('fr-FR')}
            </span>
            {/* Badge statut harmonisé */}
            {task.status && (
              <span className={`ml-2 px-2 py-1 rounded-full font-semibold text-xs ${
                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                task.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {t(`task.${task.status}`)}
              </span>
            )}
          </div>
        </div>
        {/* Créateur de la tâche */}
        {task.creatorId && users && (
          <div className="flex items-center space-x-1 text-xs text-gray-400 mt-1">
            <User className="w-3 h-3" />
            <span title={users.find(u => u.id === (task.creatorId || task.createdBy))?.fullName || t('task.unknown')}>
              {users.find(u => u.id === (task.creatorId || task.createdBy))?.fullName || t('task.unknown')}
            </span>
          </div>
        )}

        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                +{task.tags.length - 2}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {task.comments.length > 0 && (
              <div className="flex items-center space-x-1 text-gray-400 dark:text-gray-500">
                <MessageSquare className="w-3 h-3" />
                <span className="text-xs">{task.comments.length}</span>
              </div>
            )}
            
            {((task.attachments ?? []).length) > 0 && (
              <div className="flex items-center space-x-1 text-gray-400 dark:text-gray-500">
                <Paperclip className="w-3 h-3" />
                <span className="text-xs">{(task.attachments ?? []).length}</span>
              </div>
            )}
          </div>

          {task.estimatedTime > 0 && (
            <div className="flex items-center space-x-1 text-gray-400 dark:text-gray-500">
              <Clock className="w-3 h-3" />
              <span className="text-xs">
                {Math.floor(task.estimatedTime / 60)}h{task.estimatedTime % 60 > 0 ? `${task.estimatedTime % 60}m` : ''}
              </span>
            </div>
          )}
        </div>

        {isOverdue && (
          <div className="flex items-center space-x-1 text-red-600 dark:text-red-400 text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            <span>{t('common.late', { count: Math.abs(daysUntilDeadline), plural: Math.abs(daysUntilDeadline) > 1 ? 's' : '' })}</span>
          </div>
        )}
      </div>
    </div>
  );
}