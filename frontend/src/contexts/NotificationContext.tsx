import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'task_assigned'
  | 'deadline_approaching'
  | 'comment_mention'
  | 'project_update'
  | 'security_alert';

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number; // en millisecondes
  relatedId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 5000, // 5 secondes par défaut
    };

    setNotifications((prev) => [...prev, newNotification]);

    // Auto-remove after duration
    if (newNotification.duration !== Infinity) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
