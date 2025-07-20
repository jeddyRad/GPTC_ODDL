import { useState } from 'react';
import { Bell, CheckCircle, Clock, MessageSquare, AlertTriangle, Trash2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useTranslation } from 'react-i18next';

export function NotificationsView() {
  const { notifications, markNotificationAsRead, deleteNotification, markAllNotificationsAsRead } = useData();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [filter, setFilter] = useState('all');
  const { t } = useTranslation();

  const userNotifications = notifications.filter(n => n.userId === user?.id);

  const filteredNotifications = userNotifications.filter(notification => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'read') return notification.isRead;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'deadline_approaching':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'comment_mention':
        return <MessageSquare className="w-5 h-5 text-green-500" />;
      case 'project_update':
        return <AlertTriangle className="w-5 h-5 text-purple-500" />;
      case 'security_alert':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'task_assigned': return 'Tâche assignée';
      case 'deadline_approaching': return 'Échéance proche';
      case 'comment_mention': return 'Mention';
      case 'project_update': return 'Mise à jour projet';
      case 'security_alert': return 'Alerte sécurité';
      default: return 'Notification';
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      addNotification({
        type: 'success',
        message: 'Toutes les notifications ont été marquées comme lues'
      });
    } catch (error) {
      console.error('Erreur lors du marquage des notifications:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors du marquage des notifications comme lues'
      });
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      addNotification({
        type: 'success',
        message: 'Notification supprimée'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de la suppression de la notification'
      });
    }
  };

  const unreadCount = userNotifications.filter(n => !n.isRead).length;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full transition-colors duration-200">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Restez informé des dernières activités et mises à jour
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">Toutes</option>
              <option value="unread">Non lues</option>
              <option value="read">Lues</option>
            </select>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200"
                disabled={unreadCount === 0}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>{t('notifications.markAllRead')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Notification Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {userNotifications.length}
                </p>
              </div>
              <Bell className="w-8 h-8 text-primary-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Non lues</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{unreadCount}</p>
              </div>
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <Bell className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aujourd'hui</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {userNotifications.filter(n => {
                    const today = new Date();
                    const notifDate = new Date(n.createdAt);
                    return notifDate.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {filter === 'unread' ? 'Aucune notification non lue' : 
                 filter === 'read' ? 'Aucune notification lue' : 
                 'Aucune notification'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {filter === 'all' 
                  ? 'Vous recevrez ici toutes vos notifications importantes.'
                  : 'Changez le filtre pour voir d\'autres notifications.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.isRead && markNotificationAsRead(notification.id)}
                  className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </h3>
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                              {getNotificationTypeLabel(notification.type)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {new Date(notification.createdAt).toLocaleString('fr-FR')}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                          <button
                            onClick={() => markNotificationAsRead(notification.id)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                            title={t('notifications.markAsRead')}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                            title={t('notifications.deleteNotification')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
