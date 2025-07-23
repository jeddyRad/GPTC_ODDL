import React from 'react';
import {
  CheckSquare,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  Calendar,
  BarChart3,
  Plus,
  MessageSquare,
  Building2,
  Target,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';
import { usePermissions } from '@/hooks/usePermissions';

export function Dashboard() {
  const { user } = useAuth();
  const { tasks, projects, services, searchTerm, isLoading, error } = useData();
  const { t } = useTranslation();
  const { isAdmin } = usePermissions();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-red-500 bg-red-100 dark:bg-red-900/20 p-4 rounded-lg">
          <p>{t('dashboard.loadingError', 'Une erreur est survenue lors du chargement des données.')}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  // Vérifications de sécurité pour éviter les erreurs lors de l'accès aux données
  const safeFilter = (items: any[], filterFn: (item: any) => boolean) => {
    if (!Array.isArray(items)) return [];
    return items.filter(filterFn);
  };

  // Nouveau filtrage : l'admin voit tout
  const userTasks = user?.role === 'ADMIN'
    ? tasks
    : safeFilter(tasks, task => 
        Array.isArray(task.assignedTo) && 
        task.assignedTo.includes(user?.id || '') &&
        (searchTerm === '' || 
         task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
         task.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
  
  const completedTasks = safeFilter(userTasks, task => task.status === 'completed');
  const urgentTasks = safeFilter(userTasks, task => task.priority === 'urgent');
  const overdueTasks = safeFilter(userTasks, task => {
    try {
      const deadline = task.deadline instanceof Date ? task.deadline : new Date(task.deadline);
      return deadline < new Date() && task.status !== 'completed';
    } catch (e) {
      console.error('Erreur de date pour la tâche:', task.id, e);
      return false;
    }
  });

  // Métriques spécifiques ODDL
  const userService = services.find(d => d.id === user?.service);
  const serviceTasks = safeFilter(tasks, t => t.serviceId === user?.service);
  const serviceProjects = safeFilter(projects, p => 
    Array.isArray(p.serviceIds) && p.serviceIds.includes(user?.service || '')
  );

  const stats = [
    {
      title: 'Mes tâches',
      value: userTasks.length,
      icon: CheckSquare,
      color: 'bg-blue-500',
      change: `${completedTasks.length} terminées`,
      trend: 'neutral',
    },
    {
      title: 'Tâches urgentes',
      value: urgentTasks.length,
      icon: AlertTriangle,
      color: 'bg-red-500',
      change: overdueTasks.length > 0 ? `${overdueTasks.length} en retard` : 'À jour',
      trend: overdueTasks.length > 0 ? 'down' : 'up',
    },
    {
      title: `Service ${userService?.name}`,
      value: serviceTasks.length,
      icon: Building2,
      color: 'bg-green-500',
      change: `${serviceTasks.filter(t => t.status === 'completed').length} terminées`,
      trend: 'up',
    },
    {
      title: 'Projets actifs',
      value: serviceProjects.filter(p => p.status === 'active').length,
      icon: Target,
      color: 'bg-purple-500',
      change: `${serviceProjects.length} total`,
      trend: 'neutral',
    },
  ];

  const recentTasks = userTasks
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const upcomingDeadlines = userTasks
    .filter(task => task.status !== 'completed')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5);

  const getServiceName = (deptId: string) => {
    return services.find(d => d.id === deptId)?.name || 'Service inconnu';
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const handleCreateTask = () => {
    // TODO: Implement navigation or modal for creating a new task
    console.log('Create Task clicked');
  };

  const handleRequestLoan = () => {
    // TODO: Implement navigation or modal for requesting an employee loan
    console.log('Request Loan clicked');
  };

  const handleGenerateReport = () => {
    // TODO: Implement navigation or modal for generating reports
    console.log('Generate Report clicked');
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-full transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getWelcomeMessage()}, {user?.username}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {userService?.name} - ODDL | {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Building2 className="w-4 h-4" />
            <span>Observatoire du Développement Local</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
                  <p className={`text-sm mt-1 ${
                    stat.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                    stat.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activité récente</h3>
            <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="space-y-3">
            {recentTasks.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">Aucune activité récente</p>
            ) : (
              recentTasks.map((task) => (
                <div key={task.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <div className={`w-3 h-3 rounded-full ${
                    task.status === 'completed' ? 'bg-green-500' :
                    task.status === 'in_progress' ? 'bg-blue-500' :
                    task.status === 'review' ? 'bg-yellow-500' : 'bg-gray-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getServiceName(task.serviceId)} • Échéance: {new Date(task.deadline).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    task.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' :
                    task.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300' :
                    task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}>
                    {task.priority === 'urgent' ? 'Urgent' :
                     task.priority === 'high' ? 'Élevée' :
                     task.priority === 'medium' ? 'Moyenne' : 'Faible'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Échéances prioritaires</h3>
            <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="space-y-3">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">Aucune échéance à venir</p>
            ) : (
              upcomingDeadlines.map((task) => {
                const daysUntilDeadline = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntilDeadline < 0;
                const isUrgent = daysUntilDeadline <= 2;
                
                return (
                  <div key={task.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <div className={`w-3 h-3 rounded-full ${
                      isOverdue ? 'bg-red-500' :
                      isUrgent ? 'bg-orange-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                      <p className={`text-xs ${
                        isOverdue ? 'text-red-600 dark:text-red-400' :
                        isUrgent ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {isOverdue ? `En retard de ${Math.abs(daysUntilDeadline)} jour(s)` :
                         daysUntilDeadline === 0 ? 'Aujourd\'hui' :
                         daysUntilDeadline === 1 ? 'Demain' :
                         `Dans ${daysUntilDeadline} jours`} • {getServiceName(task.serviceId)}
                      </p>
                    </div>
                    {(isOverdue || isUrgent) && (
                      <AlertTriangle className={`w-4 h-4 ${isOverdue ? 'text-red-500' : 'text-orange-500'}`} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions for ODDL */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions rapides ODDL</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          { (isAdmin || user?.permissions?.includes('add_tache')) && (
            <Button
              onClick={handleCreateTask}
              variant="primary"
              size="md"
            >
              {t('dashboard.quickActionAddTask')}
            </Button>
          )}
          <button
            onClick={handleRequestLoan}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Users className="w-6 h-6 text-white mb-2" />
            <h4 className="font-medium text-white">Collaboration inter-services</h4>
            <p className="text-sm text-white">Demander un prêt d'employé</p>
          </button>
          <button
            onClick={handleGenerateReport}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <BarChart3 className="w-6 h-6 text-white mb-2" />
            <h4 className="font-medium text-white">Rapports ODDL</h4>
            <p className="text-sm text-white">Générer des rapports d'activité</p>
          </button>
        </div>
      </div>
    </div>
  );
}
