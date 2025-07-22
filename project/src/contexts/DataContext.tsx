import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Task, Project, Service, User, Notification, EmployeeLoan, UrgencyMode, Comment, Attachment } from '../types';
import { isValidUUID } from '../utils/uuid-helpers';
import { getToken, refreshTokenIfNeeded } from '@/utils/auth';
import { useAuth } from '@/contexts/AuthContext';
import { 
  transformService, 
  transformTask, 
  transformProject,
  transformNotification,
  transformEmployeeLoan,
  transformUrgencyMode,
  transformUser,
  transformComment,
  transformAttachment,
  transformTaskToBackend
} from '../utils/dataTransformers';
import { apiService } from '@/services/api';

interface DataContextType {
  tasks: Task[];
  projects: Project[];
  services: Service[];
  users: User[]; // Ajout des utilisateurs
  notifications: Notification[];
  employeeLoans: EmployeeLoan[];
  urgencyModes: UrgencyMode[];
  searchTerm: string;
  isLoading: boolean;
  error: string | null;
  setSearchTerm: (term: string) => void;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addProject: (project: Omit<Project, 'id'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addComment: (taskId: string, comment: Omit<Comment, 'id' | 'createdAt' | 'replies'>) => Promise<void>;
  addAttachment: (attachment: Omit<Attachment, 'id' | 'uploadedAt'> & { file: File }) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;
  createEmployeeLoan: (loan: Omit<EmployeeLoan, 'id'>) => Promise<void>;
  updateEmployeeLoan: (id: string, updates: Partial<EmployeeLoan>) => Promise<void>;
  activateUrgencyMode: (mode: Omit<UrgencyMode, 'id'>) => Promise<void>;
  deactivateUrgencyMode: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  // Service management
  addService: (service: Omit<Service, 'id'>) => Promise<Service>;
  updateService: (id: string, updates: Partial<Service>) => Promise<Service>;
  deleteService: (id: string) => Promise<void>;
  // User management
  addUser: (user: { username: string; email: string; password: string; first_name: string; last_name: string; role: string; service_id?: string; admin_code?: string }) => Promise<User | null>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User>;
  // Advanced comments
  updateComment: (taskId: string, commentId: string, updates: Partial<Comment>) => Promise<void>;
  deleteComment: (taskId: string, commentId: string) => Promise<void>;
  // Advanced notifications
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  // Notification triggers
  triggerTaskAssignmentNotifications: (task: Task, assignedUserIds: string[]) => Promise<void>;
  triggerCommentMentionNotifications: (comment: Comment, task: Task, mentionedUserIds: string[]) => Promise<void>;
  triggerDeadlineNotifications: (task: Task) => Promise<void>;
  deleteAttachment: (attachmentId: string, entityType: 'task' | 'project', entityId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export { DataContext };

// SUPPRIMER la fonction apiCall et toute référence à fetch
// Adapter toutes les fonctions asynchrones pour utiliser apiService (Axios)

const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [employeeLoans, setEmployeeLoans] = useState<EmployeeLoan[]>([]);
  const [urgencyModes, setUrgencyModes] = useState<UrgencyMode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger toutes les données au démarrage seulement si l'utilisateur est authentifié
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadServices(),
        loadTasks(),
        loadProjects(),
        loadNotifications(),
        loadEmployeeLoans(),
        loadUrgencyModes(),
        loadUsers(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const data = await apiService.getServices();
      const transformedServices = (data || []).map(transformService);
      setServices(transformedServices);
    } catch (error) {
      console.error('Erreur lors du chargement des départements:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const data = await apiService.getTasks();
      const transformedTasks = (data || []).map(transformTask);
      setTasks(transformedTasks);
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await apiService.getProjects();
      const transformedProjects = (data || []).map(transformProject);
      setProjects(transformedProjects);
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await apiService.getNotifications();
      const transformedNotifications = (data || []).map(transformNotification);
      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
  };

  const loadEmployeeLoans = async () => {
    try {
      const data = await apiService.getEmployeeLoans();
      const transformedLoans = (data || []).map(transformEmployeeLoan);
      setEmployeeLoans(transformedLoans);
    } catch (error) {
      console.error('Erreur lors du chargement des prêts:', error);
    }
  };

  const loadUrgencyModes = async () => {
    try {
      const data = await apiService.getUrgencyModes();
      const transformedModes = (data || []).map(transformUrgencyMode);
      setUrgencyModes(transformedModes);
    } catch (error) {
      console.error('Erreur lors du chargement des modes d\'urgence:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiService.getUsers();
      const transformedUsers = (data || []).map(transformUser);
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  // Remplacer toutes les fonctions CRUD par les méthodes Axios équivalentes
  // === TÂCHES ===
  const addTask = async (taskData: Omit<Task, 'id'>) => {
    try {
      // S'assurer que le champ type est bien envoyé
      const backendPayload = transformTaskToBackend(taskData);
      const newTask = await apiService.createTask(backendPayload);
      await refreshData();
    } catch (error) {
      throw error;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      // Nettoyage du payload pour éviter les incohérences
      const backendPayload = transformTaskToBackend(updates);
      const updatedTask = await apiService.updateTask(id, backendPayload);
      await refreshData();
    } catch (error) {
      throw error;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await apiService.deleteTask(id);
      await refreshData();
    } catch (error) {
      throw error;
    }
  };

  // === PROJETS ===
  const addProject = async (projectData: Omit<Project, 'id'>): Promise<Project> => {
    try {
      const newProject = await apiService.createProject(projectData);
      await refreshData();
      return transformProject(newProject);
    } catch (error) {
      throw error;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const updatedProject = await apiService.updateProject(id, updates);
      await refreshData();
    } catch (error) {
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await apiService.deleteProject(id);
      await refreshData();
    } catch (error) {
      throw error;
    }
  };

  const addService = async (serviceData: Omit<Service, 'id'>) => {
    try {
      const newService = await apiService.createService(serviceData);
      await refreshData();
      return transformService(newService);
    } catch (error) {
      throw error;
    }
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    try {
      const updatedService = await apiService.updateService(id, updates);
      await refreshData();
      return transformService(updatedService);
    } catch (error) {
      throw error;
    }
  };

  const deleteService = async (id: string) => {
    try {
      await apiService.deleteService(id);
      await refreshData();
    } catch (error) {
      throw error;
    }
  };

  const addUser = async (userData: { username: string; email: string; password: string; first_name: string; last_name: string; role: string; service_id?: string; admin_code?: string }) => {
    try {
      const newUser = await apiService.register(userData);
      const user = newUser.user ? transformUser(newUser.user) : null;
      if (user) setUsers((prev) => [...prev, user]);
      return user;
    } catch (error) {
      throw error;
    }
  };

  const updateUser = async (id: string, updates: Partial<User>): Promise<User> => {
    try {
      const updatedUser = await apiService.updateUser(id, updates);
      setUsers((prev) => prev.map((u) => u.id === id ? transformUser(updatedUser) : u));
      return transformUser(updatedUser);
    } catch (error) {
      throw error;
    }
  };

  // === COMMENTAIRES ===
  const addComment = async (taskId: string, comment: Record<string, any>) => {
    if (!isValidUUID(taskId)) {
      throw new Error('ID de tâche invalide');
    }
    try {
      // On transmet le payload tel quel (pour compatibilité tache/auteur)
      const newComment = await apiService.createComment(comment);
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, comments: [...t.comments, transformComment(newComment)] }
          : t
      ));
    } catch (error) {
      throw new Error('Impossible d\'ajouter le commentaire');
    }
  };

  // === PIÈCES JOINTES ===
  const addAttachment = async (attachment: Omit<Attachment, 'id' | 'uploadedAt'> & { file: File }) => {
    if (!attachment.relatedTo || !attachment.relatedId) {
      throw new Error('relatedTo et relatedId sont obligatoires');
    }
    if (!attachment.file) {
      throw new Error('Aucun fichier fourni pour la pièce jointe');
    }
    try {
      const formData = new FormData();
      formData.append('related_to', attachment.relatedTo);
      formData.append('related_id', attachment.relatedId);
      formData.append('file', attachment.file);
      const newAttachment = await apiService.uploadAttachment(formData);
      // Mise à jour locale : à adapter selon le type d'entité liée
      if (attachment.relatedTo === 'task') {
        setTasks(prev => prev.map(t =>
          t.id === attachment.relatedId
            ? { ...t, attachments: [...(t.attachments ?? []), transformAttachment(newAttachment)] }
            : t
        ));
      } else if (attachment.relatedTo === 'project') {
        setProjects(prev => prev.map(p =>
          p.id === attachment.relatedId
            ? { ...p, attachments: [...(p.attachments ?? []), transformAttachment(newAttachment)] }
            : p
        ));
      }
    } catch (error) {
      throw new Error('Impossible d\'ajouter la pièce jointe');
    }
  };

  // === NOTIFICATIONS ===
  const markNotificationAsRead = async (id: string) => {
    if (!isValidUUID(id)) {
      throw new Error('ID de notification invalide');
    }

    try {
      await apiService.markNotificationAsRead(id);

      setNotifications(prev => prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      ));
    } catch (error) {
      throw new Error('Impossible de marquer la notification comme lue');
    }
  };

  const addNotification = async (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    try {
      // Adapter le mapping des champs pour l'API
      const backendNotification = {
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        userId: notification.userId,
        type: notification.type,
        isRead: notification.isRead ?? false,
        ...(notification.relatedId && { relatedId: notification.relatedId })
      };
      const newNotification = await apiService.createNotification(backendNotification);
      setNotifications(prev => [...prev, transformNotification(newNotification)]);
    } catch (error) {
      throw new Error('Impossible de créer la notification');
    }
  };

  const deleteNotification = async (id: string) => {
    await apiService.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // === PRÊTS D'EMPLOYÉS ===
  const createEmployeeLoan = async (loanData: Omit<EmployeeLoan, 'id'>) => {
    try {
      const newLoan = await apiService.createEmployeeLoan(loanData);
      setEmployeeLoans(prev => [...prev, transformEmployeeLoan(newLoan)]);
    } catch (error) {
      throw new Error('Impossible de créer le prêt d\'employé');
    }
  };

  const updateEmployeeLoan = async (id: string, updates: Partial<EmployeeLoan>) => {
    if (!isValidUUID(id)) {
      throw new Error('ID de prêt d\'employé invalide');
    }

    try {
      const updatedLoan = await apiService.updateEmployeeLoan(id, updates);
      setEmployeeLoans(prev => prev.map(loan => loan.id === id ? transformEmployeeLoan(updatedLoan) : loan));
    } catch (error) {
      throw new Error('Impossible de mettre à jour le prêt d\'employé');
    }
  };

  // === MODES D'URGENCE ===
  const activateUrgencyMode = async (modeData: Omit<UrgencyMode, 'id'>) => {
    try {
      const newMode = await apiService.activateUrgencyMode(modeData);
      setUrgencyModes(prev => [...prev, transformUrgencyMode(newMode)]);
    } catch (error) {
      throw new Error('Impossible d\'activer le mode d\'urgence');
    }
  };

  const deactivateUrgencyMode = async (id: string) => {
    if (!isValidUUID(id)) {
      throw new Error('ID de mode d\'urgence invalide');
    }
    try {
      const updatedMode = await apiService.deactivateUrgencyMode(id);
      setUrgencyModes(prev => prev.map(mode => mode.id === id ? transformUrgencyMode(updatedMode) : mode));
    } catch (error) {
      throw new Error('Impossible de désactiver le mode d\'urgence');
    }
  };

  // === COMMENTAIRES AVANCÉS ===
  const updateComment = async (taskId: string, commentId: string, updates: Partial<Comment>) => {
    if (!isValidUUID(taskId) || !isValidUUID(commentId)) {
      throw new Error('ID de tâche ou commentaire invalide');
    }

    try {
      const updatedComment = await apiService.updateComment(taskId, commentId, updates);

      // Mettre à jour la tâche avec le commentaire modifié
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              comments: task.comments.map(comment => 
                comment.id === commentId ? transformComment(updatedComment) : comment
              )
            }
          : task
      ));
    } catch (error) {
      throw new Error('Impossible de mettre à jour le commentaire');
    }
  };

  const deleteComment = async (taskId: string, commentId: string) => {
    if (!isValidUUID(taskId) || !isValidUUID(commentId)) {
      throw new Error('ID de tâche ou commentaire invalide');
    }

    try {
      await apiService.deleteComment(taskId, commentId);

      // Mettre à jour la tâche en supprimant le commentaire
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              comments: task.comments.filter(comment => comment.id !== commentId)
            }
          : task
      ));
    } catch (error) {
      throw new Error('Impossible de supprimer le commentaire');
    }
  };

  // === NOTIFICATIONS AVANCÉES ===
  const markAllNotificationsAsRead = async () => {
    try {
      // Utiliser la méthode existante pour marquer toutes les notifications comme lues
      const promises = notifications.map(notif => markNotificationAsRead(notif.id));
      await Promise.all(promises);
    } catch (error) {
      throw new Error('Impossible de marquer toutes les notifications comme lues');
    }
  };

  // Initialize NotificationService after all functions are declared
  const triggerTaskAssignmentNotifications = async (task: Task, assignedUserIds: string[]) => {
    if (!user) return;
    
    const promises = assignedUserIds
      .filter(userId => userId !== user.id) // Ne pas notifier l'assigneur
      .map(userId => 
        addNotification({
          userId,
          type: 'task_assigned',
          title: 'Nouvelle tâche assignée',
          message: `La tâche "${task.title}" vous a été assignée.`,
          priority: task.priority === 'urgent' ? 'high' : 'medium',
          relatedId: task.id,
          isRead: false,
        })
      );

    await Promise.all(promises);
  };

  const triggerCommentMentionNotifications = async (comment: Comment, task: Task, mentionedUserIds: string[]) => {
    if (!user) return;
    
    const promises = mentionedUserIds
      .filter(userId => userId !== comment.authorId) // Ne pas notifier l'auteur
      .map(userId => 
        addNotification({
          userId,
          type: 'comment_mention',
          title: 'Vous avez été mentionné',
          message: `Vous avez été mentionné dans un commentaire sur la tâche "${task.title}".`,
          priority: 'medium',
          relatedId: task.id,
          isRead: false,
        })
      );

    await Promise.all(promises);
  };

  const triggerDeadlineNotifications = async (task: Task) => {
    if (!user) return;
    
    const deadline = new Date(task.deadline);
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const hoursUntilDeadline = timeDiff / (1000 * 3600);

    // Notifier si l'échéance est dans moins de 24h
    if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 0) {
      const promises = Array.isArray(task.assignedTo) ? task.assignedTo : []
        .map(userId =>
          addNotification({
            userId,
            type: 'deadline_approaching',
            title: 'Échéance proche',
            message: `La tâche "${task.title}" arrive à échéance dans ${Math.round(hoursUntilDeadline)}h.`,
            priority: 'high',
            relatedId: task.id,
            isRead: false,
          })
        );

      await Promise.all(promises);
    }
  };

  // Auto-check deadlines periodically
  useEffect(() => {
    if (user && tasks.length > 0) {
      const interval = setInterval(async () => {
        const now = new Date();
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const tasksNearDeadline = tasks.filter(task => {
          const deadline = new Date(task.deadline);
          return deadline >= now && deadline <= in24Hours && task.status !== 'completed';
        });

        for (const task of tasksNearDeadline) {
          await triggerDeadlineNotifications(task);
        }
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [user, tasks]);

  const deleteAttachment = async (attachmentId: string, entityType: 'task' | 'project', entityId: string) => {
    try {
      await apiService.deleteAttachment(attachmentId);
      if (entityType === 'task') {
        setTasks(prev => prev.map(t =>
          t.id === entityId
            ? { ...t, attachments: (t.attachments ?? []).filter(a => a.id !== attachmentId) }
            : t
        ));
      } else if (entityType === 'project') {
        setProjects(prev => prev.map(p =>
          p.id === entityId
            ? { ...p, attachments: (p.attachments ?? []).filter(a => a.id !== attachmentId) }
            : p
        ));
      }
    } catch (error) {
      throw new Error('Impossible de supprimer la pièce jointe');
    }
  };

  return (
    <DataContext.Provider value={{
      tasks,
      projects,
      services,
      users,
      notifications,
      employeeLoans,
      urgencyModes,
      searchTerm,
      isLoading,
      error,
      setSearchTerm,
      addTask,
      updateTask,
      deleteTask,
      addProject,
      updateProject,
      deleteProject,
      addComment,
      addAttachment,
      markNotificationAsRead,
      addNotification,
      createEmployeeLoan,
      updateEmployeeLoan,
      activateUrgencyMode,
      deactivateUrgencyMode,
      refreshData,
      // Service management
      addService,
      updateService,
      deleteService,
      // User management
      addUser,
      updateUser,
      // Advanced comments
      updateComment,
      deleteComment,
      // Advanced notifications
      markAllNotificationsAsRead,
      deleteNotification,
      // Notification triggers
      triggerTaskAssignmentNotifications,
      triggerCommentMentionNotifications,
      triggerDeadlineNotifications,
      deleteAttachment,
    }}>
      {children}
    </DataContext.Provider>
  );
}

const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

// Exports nommés
export { DataProvider, useData };
