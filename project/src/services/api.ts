import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { isValidUUID } from '@/utils/uuid-helpers';
import { 
  Task, Project, Service, Notification, EmployeeLoan, UrgencyMode, 
  Comment, Attachment, User 
} from '@/types';

// Configuration de l'API
// IMPORTANT : VITE_API_URL ne doit PAS contenir /api à la fin !
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/?api\/?$/, '');

// Instance Axios configurée
class ApiService {
  // Modification de private à public pour permettre la réutilisation
  public api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur pour ajouter le token d'authentification
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Intercepteur de réponse pour gérer les erreurs
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expiré ou invalide
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Méthodes génériques
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api(config);
      return response.data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  private validateUUID(id: string, resource: string): void {
    if (!isValidUUID(id)) {
      throw new Error(`Invalid UUID for ${resource}: ${id}`);
    }
  }

  // === SERVICES ===
  async getServices(): Promise<Service[]> {
    return this.request<Service[]>({
      method: 'GET',
      url: '/api/services/',
    });
  }

  async getService(id: string): Promise<Service> {
    this.validateUUID(id, 'service');
    return this.request<Service>({
      method: 'GET',
      url: `/api/services/${id}/`,
    });
  }

  async createService(service: Omit<Service, 'id'>): Promise<Service> {
    return this.request<Service>({
      method: 'POST',
      url: '/api/services/',
      data: service,
    });
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service> {
    this.validateUUID(id, 'service');
    return this.request<Service>({
      method: 'PUT',
      url: `/api/services/${id}/`,
      data: updates,
    });
  }

  async deleteService(id: string): Promise<void> {
    this.validateUUID(id, 'service');
    return this.request<void>({
      method: 'DELETE',
      url: `/api/services/${id}/`,
    });
  }

  // === UTILISATEURS ===
  async getUsers(): Promise<User[]> {
    return this.request<User[]>({
      method: 'GET',
      url: '/api/users/',
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>({
      method: 'GET',
      url: '/api/users/me/',
    });
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    return this.request<User>({
      method: 'PUT',
      url: `/api/users/${userId}/`,
      data: userData,
    });
  }

  async updateMyProfile(userData: Partial<User>): Promise<User> {
    return this.request<User>({
      method: 'PATCH', // PATCH au lieu de PUT
      url: '/api/users/me/',
      data: userData,
    });
  }

  async uploadProfilePhoto(file: File): Promise<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('photo_profil', file);
    const response = await this.api.post('/api/users/me/upload-profile-photo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>({
      method: 'POST',
      url: '/api/users/me/change-password/',
      data: {
        current_password: currentPassword,
        new_password: newPassword,
      },
    });
  }

  // === PROJETS ===
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>({
      method: 'GET',
      url: '/api/projects/',
    });
  }

  async getProject(id: string): Promise<Project> {
    this.validateUUID(id, 'project');
    return this.request<Project>({
      method: 'GET',
      url: `/api/projects/${id}/`,
    });
  }

  async createProject(project: Omit<Project, 'id'>): Promise<Project> {
    return this.request<Project>({
      method: 'POST',
      url: '/api/projects/',
      data: project,
    });
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    this.validateUUID(id, 'project');
    return this.request<Project>({
      method: 'PUT',
      url: `/api/projects/${id}/`,
      data: updates,
    });
  }

  async deleteProject(id: string): Promise<void> {
    this.validateUUID(id, 'project');
    return this.request<void>({
      method: 'DELETE',
      url: `/api/projects/${id}/`,
    });
  }

  // === TÂCHES ===
  async getTasks(): Promise<Task[]> {
    return this.request<Task[]>({
      method: 'GET',
      url: '/api/tasks/',
    });
  }

  async getTask(id: string): Promise<Task> {
    this.validateUUID(id, 'task');
    return this.request<Task>({
      method: 'GET',
      url: `/api/tasks/${id}/`,
    });
  }

  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    return this.request<Task>({
      method: 'POST',
      url: '/api/tasks/',
      data: task,
    });
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    this.validateUUID(id, 'task');
    return this.request<Task>({
      method: 'PUT',
      url: `/api/tasks/${id}/`,
      data: updates,
    });
  }

  async deleteTask(id: string): Promise<void> {
    this.validateUUID(id, 'task');
    return this.request<void>({
      method: 'DELETE',
      url: `/api/tasks/${id}/`,
    });
  }

  // === COMMENTAIRES ===
  async createComment(data: any): Promise<Comment> {
    return this.request<Comment>({
      method: 'POST',
      url: '/api/comments/',
      data,
    });
  }

  async updateComment(taskId: string, commentId: string, updates: Partial<Comment>): Promise<Comment> {
    this.validateUUID(taskId, 'task');
    this.validateUUID(commentId, 'comment');
    return this.request<Comment>({
      method: 'PUT',
      url: `/api/tasks/${taskId}/comments/${commentId}/`,
      data: updates,
    });
  }

  async deleteComment(taskId: string, commentId: string): Promise<void> {
    this.validateUUID(taskId, 'task');
    this.validateUUID(commentId, 'comment');
    return this.request<void>({
      method: 'DELETE',
      url: `/api/tasks/${taskId}/comments/${commentId}/`,
    });
  }

  // === NOTIFICATIONS ===
  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>({
      method: 'GET',
      url: '/api/notifications/',
    });
  }

  async markNotificationAsRead(id: string): Promise<Notification> {
    this.validateUUID(id, 'notification');
    return this.request<Notification>({
      method: 'PATCH',
      url: `/api/notifications/${id}/`,
      data: { isRead: true },
    });
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    return this.request<Notification>({
      method: 'POST',
      url: '/api/notifications/',
      data: notification,
    });
  }

  async deleteNotification(id: string): Promise<void> {
    this.validateUUID(id, 'notification');
    return this.request<void>({
      method: 'DELETE',
      url: `/api/notifications/${id}/`,
    });
  }

  // === PRÊTS D'EMPLOYÉS ===
  async getEmployeeLoans(): Promise<EmployeeLoan[]> {
    return this.request<EmployeeLoan[]>({
      method: 'GET',
      url: '/api/employee-loans/',
    });
  }

  async createEmployeeLoan(loan: Omit<EmployeeLoan, 'id'>): Promise<EmployeeLoan> {
    return this.request<EmployeeLoan>({
      method: 'POST',
      url: '/api/employee-loans/',
      data: loan,
    });
  }

  async updateEmployeeLoan(id: string, updates: Partial<EmployeeLoan>): Promise<EmployeeLoan> {
    this.validateUUID(id, 'employee_loan');
    return this.request<EmployeeLoan>({
      method: 'PUT',
      url: `/api/employee-loans/${id}/`,
      data: updates,
    });
  }

  // === MODES D'URGENCE ===
  async getUrgencyModes(): Promise<UrgencyMode[]> {
    return this.request<UrgencyMode[]>({
      method: 'GET',
      url: '/api/urgencies/',
    });
  }

  async activateUrgencyMode(mode: Omit<UrgencyMode, 'id'>): Promise<UrgencyMode> {
    return this.request<UrgencyMode>({
      method: 'POST',
      url: '/api/urgencies/',
      data: mode,
    });
  }

  async deactivateUrgencyMode(id: string): Promise<UrgencyMode> {
    this.validateUUID(id, 'urgency_mode');
    return this.request<UrgencyMode>({
      method: 'PATCH',
      url: `/api/urgencies/${id}/`,
      data: { isActive: false, endDate: new Date() },
    });
  }

  // === RECHERCHE ===
  async searchTasks(query: string): Promise<Task[]> {
    return this.request<Task[]>({
      method: 'GET',
      url: '/api/tasks/search/',
      params: { q: query },
    });
  }

  async searchProjects(query: string): Promise<Project[]> {
    return this.request<Project[]>({
      method: 'GET',
      url: '/api/projects/search/',
      params: { q: query },
    });
  }

  // === PIÈCES JOINTES ===
  async getAttachments(): Promise<Attachment[]> {
    return this.request<Attachment[]>({
      method: 'GET',
      url: '/api/attachments/',
    });
  }

  async uploadAttachment(formData: FormData): Promise<Attachment> {
    return this.request<Attachment>({
      method: 'POST',
      url: '/api/attachments/',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async deleteAttachment(id: string): Promise<void> {
    return this.request<void>({
      method: 'DELETE',
      url: `/api/attachments/${id}/`,
    });
  }

  async downloadAttachment(id: string): Promise<Blob> {
    const response = await this.api.get(`/api/attachments/${id}/download/`, { responseType: 'blob' });
    return response.data;
  }

  // === AUTHENTIFICATION ===
  async login(username: string, password: string): Promise<{ access: string; refresh: string; user: User }> {
    return this.request<{ access: string; refresh: string; user: User }>({
      method: 'POST',
      url: '/api/token/',
      data: { username, password },
    });
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
    service_id?: string;
    admin_code?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    return this.request<{ success: boolean; user?: User; error?: string }>({
      method: 'POST',
      url: '/api/register/',
      data: userData,
    });
  }

  async refreshToken(refreshToken: string): Promise<{ access: string }> {
    return this.request<{ access: string }>({
      method: 'POST',
      url: '/api/token/refresh/',
      data: { refresh: refreshToken },
    });
  }

  async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    return this.request<{ available: boolean }>({
      method: 'GET',
      url: '/api/check-username/',
      params: { username },
    });
  }

  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    return this.request<{ available: boolean }>({
      method: 'GET',
      url: '/api/check-email/',
      params: { email },
    });
  }
}

// Instance singleton
export const apiService = new ApiService();
export default apiService;

// Upload d'une pièce jointe via le nouvel endpoint backend
export async function uploadAttachment({ file, relatedTo, relatedId, name }: { file: File, relatedTo: 'task' | 'project' | 'user', relatedId: string, name?: string }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('related_to', relatedTo);
  formData.append('related_id', relatedId);
  if (name) formData.append('name', name);
  
  // Debug: afficher les données envoyées
  console.log('Upload attachment debug:', {
    fileName: file.name,
    fileSize: file.size,
    relatedTo,
    relatedId,
    name
  });
  
  const response = await apiService.api.post('/api/attachments/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
