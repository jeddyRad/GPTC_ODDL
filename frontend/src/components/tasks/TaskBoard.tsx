import React, { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';
import { TaskColumn } from './TaskColumn';
import { TaskModal } from '@/components/modals/TaskModal';
import { Button } from '@/components/common/Button';
import { useTranslation } from 'react-i18next';

// Composant principal du tableau Kanban des tâches, avec filtres et gestion du mode urgence
export function TaskBoard() {
  const { tasks, searchTerm, urgencyModes, services, projects } = useData();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  // const [filterService, setFilterService] = useState('all'); // Supprimé car inutilisé
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterTaskType, setFilterTaskType] = useState('all'); // 'all', 'personal', 'project', 'service'

  const activeUrgencyMode = urgencyModes.find(mode => mode.isActive);

  // Ne pas afficher le Kanban si la liste des services n'est pas chargée
  if (!services || services.length === 0) {
    return <div className="p-6 text-center text-gray-500">Chargement des services...</div>;
  }

  const columns = [
    { id: 'todo', title: t('taskBoard.columns.todo'), color: 'bg-gray-100 dark:bg-gray-700' },
    { id: 'in_progress', title: t('taskBoard.columns.inProgress'), color: 'bg-blue-100 dark:bg-blue-900/20' },
    { id: 'review', title: t('taskBoard.columns.review'), color: 'bg-yellow-100 dark:bg-yellow-900/20' },
    { id: 'completed', title: t('taskBoard.columns.completed'), color: 'bg-green-100 dark:bg-green-900/20' },
  ];

  // Fonction utilitaire pour filtrer de façon sécurisée
  function safeFilter(items: any[], filterFn: (item: any) => boolean) {
    if (!Array.isArray(items)) return [];
    return items.filter(filterFn);
  }

  // Filtrage avancé selon le rôle
  let userTasks: Task[] = [];
  if (user?.role === 'ADMIN') {
    userTasks = tasks;
  } else if (user?.role === 'MANAGER') {
    userTasks = tasks.filter(task =>
      (task.serviceId && task.serviceId === (user.service || '')) ||
      (Array.isArray(task.assignedTo) && task.assignedTo.includes(user.id)) ||
      (task.creatorId === user.id) ||
      // Tâches de projet où le manager est chef, membre, ou lié par service
      (task.projectId && projects.some(p =>
        p.id === task.projectId && (
          p.chefId === user.id ||
          (Array.isArray(p.memberIds) && p.memberIds.includes(user.id)) ||
          (Array.isArray(p.memberDetails) && p.memberDetails.some((m: any) => m.id === user.id)) ||
          (user.service && (p.serviceId === user.service || (Array.isArray(p.serviceIds) && p.serviceIds.includes(user.service))))
        )
      ))
    );
  } else if (user?.role === 'EMPLOYEE') {
    userTasks = tasks.filter(task =>
      (Array.isArray(task.assignedTo) && task.assignedTo.includes(user.id)) ||
      (task.creatorId === user.id) ||
      // Tâches de service : si l'employé est membre du service
      (task.serviceId && user.service && task.serviceId === user.service) ||
      // Tâches de projet : si l'employé est membre du projet
      (task.projectId && projects.some(p =>
        p.id === task.projectId && (
          p.chefId === user.id ||
          (Array.isArray(p.memberIds) && p.memberIds.includes(user.id)) ||
          (Array.isArray(p.memberDetails) && p.memberDetails.some((m: any) => m.id === user.id)) ||
          (user.service && Array.isArray(p.serviceIds) && p.serviceIds.includes(user.service))
        )
      ))
    );
  }

  const filteredTasks = userTasks.filter(task => {
    // Nouveau filtrage par type de tâche
    if (filterTaskType === 'personal' && (task.serviceId || task.projectId)) return false;
    if (filterTaskType === 'project' && !task.projectId) return false;
    if (filterTaskType === 'service' && (!task.serviceId || task.projectId)) return false;
    
    const matchesSearch = searchTerm === '' || 
                         task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesAssignee = filterAssignee === 'all' || 
                           (filterAssignee === 'me' && (task.assigneeIds || []).includes(user?.id || '')) ||
                           (task.assigneeIds || []).includes(filterAssignee);
    
    // Logique d'accès cohérente avec le backend
    let hasAccess = false;
    
    if (!user) {
      hasAccess = false;
    } else if (user.role === 'ADMIN') {
      hasAccess = true; // Admin voit tout
    } else if (user.role === 'MANAGER') {
      hasAccess = Boolean(
        (Array.isArray(task.assignedTo) && task.assignedTo.includes(user.id)) ||
        task.creatorId === user.id ||
        (user.service && task.serviceId === user.service) ||
        // Tâches de projet où le manager est membre
        (task.projectId && projects.some(p =>
          p.id === task.projectId && (
            p.chefId === user.id ||
            (Array.isArray(p.memberIds) && p.memberIds.includes(user.id)) ||
            (Array.isArray(p.memberDetails) && p.memberDetails.some((m: any) => m.id === user.id)) ||
            (user.service && (p.serviceId === user.service || (Array.isArray(p.serviceIds) && p.serviceIds.includes(user.service))))
          )
        ))
      );
    } else {
      // Employé : tâches créées par lui, assignées, ou de son service/projet
      hasAccess = Boolean(
        (task.assigneeIds || []).includes(user.id) || 
        task.creatorId === user.id ||
        (user.service && task.serviceId === user.service) ||
        // Tâches de projet où l'employé est membre
        (task.projectId && projects.some(p =>
          p.id === task.projectId && (
            p.chefId === user.id ||
            (Array.isArray(p.memberIds) && p.memberIds.includes(user.id)) ||
            (Array.isArray(p.memberDetails) && p.memberDetails.some((m: any) => m.id === user.id)) ||
            (user.service && (p.serviceId === user.service || (Array.isArray(p.serviceIds) && p.serviceIds.includes(user.service))))
          )
        ))
      );
    }
    
    console.log(`Task ${task.id} (${task.title}): matchesSearch=${matchesSearch}, matchesPriority=${matchesPriority}, matchesAssignee=${matchesAssignee}, hasAccess=${hasAccess}`);
    
    return matchesSearch && matchesPriority && matchesAssignee && hasAccess;
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsTaskModalOpen(true);
  };

  return (
      <div className="p-6 h-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Alerte mode urgence */}
        {activeUrgencyMode && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="font-semibold text-red-800 dark:text-red-200">{t('taskBoard.urgencyModeActive')}</h3>
            </div>
            <p className="text-red-700 dark:text-red-300 mt-1">{activeUrgencyMode.description}</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              {t('taskBoard.level')}: <span className="font-medium capitalize">{activeUrgencyMode.severity}</span>
            </p>
          </div>
        )}

        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('taskBoard.boardTitle')}</h2>
            <div className="flex items-center space-x-2">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">{t('taskBoard.priority.all')}</option>
                <option value="low">{t('taskBoard.priority.low')}</option>
                <option value="medium">{t('taskBoard.priority.medium')}</option>
                <option value="high">{t('taskBoard.priority.high')}</option>
                <option value="urgent">{t('taskBoard.priority.urgent')}</option>
              </select>
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">{t('taskBoard.assignee.all')}</option>
                <option value="me">{t('taskBoard.assignee.me')}</option>
              </select>
              <select
                value={filterTaskType}
                onChange={e => setFilterTaskType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">{t('taskBoard.taskType.all')}</option>
                <option value="personal">{t('taskBoard.taskType.personal')}</option>
                <option value="project">{t('taskBoard.taskType.project')}</option>
                <option value="service">{t('taskBoard.taskType.service')}</option>
              </select>
            </div>
          </div>

          <Button
            onClick={handleCreateTask}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t('taskBoard.newTask')}</span>
          </Button>
        </div>

        {/* Statistiques par colonne */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter(task => task.status === column.id);
            const urgentTasks = columnTasks.filter(task => task.priority === 'urgent').length;
            
            return (
              <div key={column.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 dark:text-white">{column.title}</h3>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{columnTasks.length}</span>
                </div>
                {urgentTasks > 0 && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {t('taskBoard.urgentCount', { count: urgentTasks, plural: urgentTasks > 1 ? 'es' : 'e' })}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Tableau Kanban */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-hidden">
          {columns.map((column) => (
            <TaskColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={filteredTasks.filter(task => task.status === column.id)}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>

        {/* Modal de tâche */}
        {isTaskModalOpen && (
          <TaskModal
            task={selectedTask}
            onClose={() => setIsTaskModalOpen(false)}
          />
        )}
      </div>
  );
}
