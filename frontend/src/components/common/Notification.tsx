import React from 'react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';
import { Notification, NotificationType } from '@/contexts/NotificationContext';

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const getIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5" />;
    case 'error':
      return <AlertCircle className="h-5 w-5" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5" />;
    case 'info':
    default:
      return <Info className="h-5 w-5" />;
  }
};

const getStyles = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
    case 'error':
      return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
    case 'warning':
      return 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
    case 'info':
    default:
      return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  const { type, title, message } = notification;
  const styles = getStyles(type);
  const icon = getIcon(type);

  return (
    <div
      className={`flex items-start p-4 mb-3 rounded-lg shadow-md border animate-slide-in ${styles}`}
      role="alert"
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="ml-3 flex-1">
        {title && <h3 className="text-sm font-medium">{title}</h3>}
        <div className="text-sm">{message}</div>
      </div>
      <button
        onClick={onClose}
        className="ml-4 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
        aria-label="Fermer"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export const NotificationContainer: React.FC<{ notifications: Notification[]; onClose: (id: string) => void }> = ({
  notifications,
  onClose,
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-sm space-y-2">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} onClose={() => onClose(notification.id)} />
      ))}
    </div>
  );
};
