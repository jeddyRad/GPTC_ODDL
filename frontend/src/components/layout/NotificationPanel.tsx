import React from 'react';
import { X, CheckCircle, Clock, MessageSquare, AlertTriangle, ExternalLink, Check } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, markNotificationAsRead } = useData();
  const { user } = useAuth();
  const { t } = useTranslation();

  const userNotifications = notifications.filter(n => n.userId === user?.id);

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
      default:
        return <CheckCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markNotificationAsRead(notification.id);
    }
    // Redirection basée sur le type de notification
    redirectToRelevantPage(notification);
  };

  const handleMarkAsRead = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  const redirectToRelevantPage = (notification: any) => {
    // Ici on pourrait implémenter la logique de redirection
    // Pour l'instant, on log juste pour indiquer l'intention
    console.log('Redirection vers:', notification.type, notification.relatedId);
    // Exemple d'implémentation future:
    // if (notification.type === 'task_assigned' && notification.relatedId) {
    //   navigate(`/tasks/${notification.relatedId}`);
    // }
  };

  return (
    <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {userNotifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Aucune notification
          </div>
        ) : (
          userNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {new Date(notification.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {!notification.isRead ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent notification click from triggering handleMarkAsRead
                          handleMarkAsRead(notification.id);
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Marquer comme lu"
                      >
                        <Check className="w-4 h-4 text-green-500" />
                      </button>
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    </>
                  ) : (
                    <div title="Voir détails">
                      <ExternalLink className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {userNotifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              userNotifications.forEach(n => {
                if (!n.isRead) markNotificationAsRead(n.id);
              });
            }}
            className="w-full p-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            title="Marquer toutes comme lues"
          >
            {t('notifications.markAllRead')}
          </button>
        </div>
      )}
    </div>
  );
}
