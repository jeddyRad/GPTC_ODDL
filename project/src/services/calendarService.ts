import apiService from '@/services/api';
import { Task } from '@/types';

const { api } = apiService;

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  description?: string;
  color?: string;
  type: 'task' | 'meeting' | 'deadline' | 'project';
  relatedId?: string; // ID of the related item (task, project, etc.)
  icon?: string; // Ajouté pour l'affichage visuel
  progress?: number; // Ajouté pour l'avancement
}

export interface CalendarFilter {
  startDate: Date;
  endDate: Date;
  serviceIds?: string[];
  projectIds?: string[];
  userIds?: string[];
  types?: ('task' | 'meeting' | 'deadline' | 'project')[];
}

class CalendarService {
  /**
   * Récupérer les événements du calendrier
   */
  async getEvents(filter: CalendarFilter): Promise<CalendarEvent[]> {
    try {
      // Formatage des dates au format ISO pour l'API
      const params = {
        start_date: filter.startDate.toISOString(),
        end_date: filter.endDate.toISOString(),
        service_ids: filter.serviceIds?.join(','),
        project_ids: filter.projectIds?.join(','),
        user_ids: filter.userIds?.join(','),
        types: filter.types?.join(',')
      };

      const response = await api.get('/api/calendar/events/', { params });
      return response.data.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
        icon: event.icon,
        progress: event.progress
      }));
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }

  /**
   * Convertir une tâche en événement de calendrier
   */
  convertTaskToEvent(task: Task): CalendarEvent {
    // Détermination de l'icône selon le statut
    let icon = '📋';
    if (task.status === 'completed') icon = '✅';
    else if (task.status === 'in_progress') icon = '🚧';
    else if (task.status === 'review') icon = '🔎';
    // Progression estimée
    let progress = 0;
    if (task.status === 'completed') progress = 100;
    else if (task.status === 'in_progress') progress = 50;
    return {
      id: task.id,
      title: task.title,
      start: new Date(task.deadline),
      end: new Date(task.deadline),
      allDay: true,
      description: task.description,
      color: this.getPriorityColor(task.priority),
      type: 'task',
      relatedId: task.id,
      icon,
      progress
    };
  }

  /**
   * Obtenir une couleur en fonction de la priorité
   */
  private getPriorityColor(priority: 'low' | 'medium' | 'high' | 'urgent'): string {
    switch (priority) {
      case 'low':
        return '#3b82f6'; // blue-500
      case 'medium':
        return '#10b981'; // emerald-500
      case 'high':
        return '#f59e0b'; // amber-500
      case 'urgent':
        return '#ef4444'; // red-500
      default:
        return '#6b7280'; // gray-500
    }
  }

  /**
   * Créer un nouvel événement
   */
  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const response = await api.post('/api/calendar/events/', {
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString()
    });
    return {
      ...response.data,
      start: new Date(response.data.start),
      end: new Date(response.data.end)
    };
  }

  /**
   * Mettre à jour un événement existant
   */
  async updateEvent(event: CalendarEvent): Promise<CalendarEvent> {
    const response = await api.put(`/api/calendar/events/${event.id}/`, {
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString()
    });
    return {
      ...response.data,
      start: new Date(response.data.start),
      end: new Date(response.data.end)
    };
  }

  /**
   * Supprimer un événement
   */
  async deleteEvent(eventId: string): Promise<void> {
    await api.delete(`/api/calendar/events/${eventId}/`);
  }
}

export const calendarService = new CalendarService();
