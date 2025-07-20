import React from 'react';
import { useDrop } from 'react-dnd';
import { TaskCard } from './TaskCard';
import { Task } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useTranslation } from 'react-i18next';
import { transformTaskToBackend } from '@/utils/dataTransformers';

interface TaskColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function TaskColumn({ id, title, color, tasks, onTaskClick }: TaskColumnProps) {
  const { updateTask, tasks: allTasks } = useData();
  const { t } = useTranslation();

  const [{ isOver }, drop] = useDrop({
    accept: 'task',
    drop: async (item: { id: string }) => {
      console.log('Drop triggered in column', id, 'with item:', item);
      
      // Récupérer la tâche depuis le contexte global au lieu du tableau local
      const task = allTasks.find(t => t.id === item.id);
      if (!task) {
        console.error('Task not found in global context:', item.id);
        console.log('Available tasks:', allTasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
        return;
      }
      
      try {
        // Adapter les données au format attendu par l'API backend
        let updateData: any = {
          ...task,
          status: id as Task['status'],
        };
        // Nettoyage via transformTaskToBackend pour garantir tous les champs obligatoires
        const backendPayload = transformTaskToBackend(updateData);
        if (task.type === 'service') {
          backendPayload.serviceIdInput = task.serviceId;
        }
        if (task.type === 'projet') {
          backendPayload.projet = task.projectId;
        }
        // Pour personnel, ne rien ajouter
        console.log('Updating task with data:', backendPayload);
        // Vérifier que serviceId ou projectId est présent uniquement pour les types concernés
        if ((task.type === 'service' && !backendPayload.serviceIdInput) || (task.type === 'projet' && !backendPayload.projet)) {
          console.error('Service ou Projet manquant pour cette tâche:', task);
          alert('Erreur: Service ou Projet manquant pour cette tâche. Impossible de la déplacer.');
          return;
        }
        await updateTask(item.id, backendPayload);
        console.log('Task updated successfully');
      } catch (error) {
        // Afficher l'erreur dans la console et en notification utilisateur
        console.error('Erreur lors du déplacement de la tâche :', error);
        alert('Erreur lors du déplacement de la tâche : ' + (error instanceof Error ? error.message : error));
      }
      return { moved: true };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const urgentTasks = tasks.filter(task => task.priority === 'urgent').length;
  const overdueTasks = tasks.filter(task => 
    new Date(task.deadline) < new Date() && task.status !== 'completed'
  ).length;

  return (
    <div
      ref={drop}
      className={`${color} rounded-lg p-4 h-full flex flex-col ${
        isOver ? 'ring-2 ring-primary-400 bg-opacity-80' : ''
      } transition-all duration-200`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          {urgentTasks > 0 && (
            <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs font-medium">
              {urgentTasks}
            </span>
          )}
        </div>
        <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300">
          {tasks.length}
        </span>
      </div>

      {overdueTasks > 0 && (
        <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
          {t('common.overdueTasks', { count: overdueTasks, plural: overdueTasks > 1 ? 's' : '' })}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p className="text-sm">{t('common.noTask')}</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))
        )}
      </div>
    </div>
  );
}
