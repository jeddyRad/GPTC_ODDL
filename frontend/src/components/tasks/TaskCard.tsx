
import { useDrag } from 'react-dnd';
import { Calendar, User, MessageSquare, Paperclip, Clock, AlertTriangle, Building2 } from 'lucide-react';
import { Task } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useTranslation } from 'react-i18next';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
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
      onClick={() => {
        console.log('Clicked task:', task.id);
        onClick();
      }}
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all duration-200 ${
        isDragging ? 'opacity-50' : ''
      } ${isOverdue ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white text-sm leading-tight flex-1 pr-2">
          {task.title}
        </h4>
        <div className="flex items-center space-x-1">
          {task.priority === 'urgent' && (
            <AlertTriangle className="w-3 h-3 text-red-500" />
          )}
          <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)} flex-shrink-0`} title={getPriorityLabel(task.priority)} />
        </div>
      </div>

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
                <span key={user.id} className="truncate">
                  {user.firstName} {user.lastName}
                  {index < Math.min(assignedUsers.length, 2) - 1 && assignedUsers.length > 1 ? ',' : ''}
                </span>
              ))}
              {assignedUsers.length > 2 && (
                <span className="text-gray-400">+{assignedUsers.length - 2}</span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
            <Calendar className="w-3 h-3" />
            <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
              {new Date(task.deadline).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>

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
            
            {task.attachments.length > 0 && (
              <div className="flex items-center space-x-1 text-gray-400 dark:text-gray-500">
                <Paperclip className="w-3 h-3" />
                <span className="text-xs">{task.attachments.length}</span>
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