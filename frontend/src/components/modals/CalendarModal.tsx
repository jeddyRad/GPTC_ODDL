import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, Tag, AlertCircle, Plus, Edit, Trash2, Save } from 'lucide-react';
import { CalendarEvent, calendarService } from '@/services/calendarService';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Task, Project, User } from '@/types';
import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  existingEvent?: CalendarEvent | null;
  onEventCreate?: (event: CalendarEvent) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
  onEventDelete?: (eventId: string) => void;
}

interface EventFormData {
  title: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  type: 'task' | 'meeting' | 'deadline' | 'project';
  relatedProjectId?: string;
  assigneeId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export function CalendarModal({
  isOpen,
  onClose,
  selectedDate,
  existingEvent,
  onEventCreate,
  onEventUpdate,
  onEventDelete
}: CalendarModalProps) {
  const { tasks, projects, users } = useData();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { t } = useTranslation();
  
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
  const [isLoading, setIsLoading] = useState(false);
  const [dateEvents, setDateEvents] = useState<CalendarEvent[]>([]);
  const [dateTasks, setDateTasks] = useState<Task[]>([]);
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    start: '',
    end: '',
    allDay: true,
    type: 'task',
    priority: 'medium'
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && selectedDate) {
      if (existingEvent) {
        setMode('view');
        setFormData({
          title: existingEvent.title,
          description: existingEvent.description || '',
          start: existingEvent.start.toISOString().slice(0, 16),
          end: existingEvent.end.toISOString().slice(0, 16),
          allDay: existingEvent.allDay,
          type: existingEvent.type,
          relatedProjectId: existingEvent.relatedId,
        });
      } else {
        setMode('view');
        const dateStr = selectedDate.toISOString().slice(0, 10);
        setFormData({
          title: '',
          description: '',
          start: `${dateStr}T09:00`,
          end: `${dateStr}T10:00`,
          allDay: true,
          type: 'task',
          priority: 'medium'
        });
      }
      
      // Load events and tasks for the selected date
      loadDateContent();
    }
  }, [isOpen, selectedDate, existingEvent]);

  const loadDateContent = async () => {
    if (!selectedDate) return;
    
    setIsLoading(true);
    try {
      // Get events for the date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const events = await calendarService.getEvents({
        startDate: startOfDay,
        endDate: endOfDay,
        userIds: user?.id ? [user.id] : []
      });
      
      setDateEvents(events);
      
      // Get tasks for the date
      const tasksForDate = tasks.filter(task => {
        const taskDate = new Date(task.deadline);
        return taskDate.getDate() === selectedDate.getDate() &&
               taskDate.getMonth() === selectedDate.getMonth() &&
               taskDate.getFullYear() === selectedDate.getFullYear() &&
               (Array.isArray(task.assignedTo) ? task.assignedTo.includes(user?.id || '') : false) || task.createdBy === user?.id;
      });
      
      setDateTasks(tasksForDate);
    } catch (error) {
      console.error('Error loading date content:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors du chargement du contenu de la date'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      addNotification({
        type: 'error',
        message: 'Le titre est requis'
      });
      return;
    }

    setIsLoading(true);
    try {
      const eventData: Omit<CalendarEvent, 'id'> = {
        title: formData.title,
        description: formData.description,
        start: new Date(formData.start),
        end: new Date(formData.end),
        allDay: formData.allDay,
        type: formData.type,
        relatedId: formData.relatedProjectId
      };

      if (mode === 'edit' && existingEvent) {
        const updatedEvent = await calendarService.updateEvent({
          ...eventData,
          id: existingEvent.id
        });
        onEventUpdate?.(updatedEvent);
        addNotification({
          type: 'success',
          message: 'Événement mis à jour avec succès'
        });
      } else {
        const newEvent = await calendarService.createEvent(eventData);
        onEventCreate?.(newEvent);
        addNotification({
          type: 'success',
          message: 'Événement créé avec succès'
        });
      }
      
      setMode('view');
      loadDateContent();
    } catch (error) {
      console.error('Error saving event:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de la sauvegarde de l\'événement'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingEvent) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;
    
    setIsLoading(true);
    try {
      await calendarService.deleteEvent(existingEvent.id);
      onEventDelete?.(existingEvent.id);
      addNotification({
        type: 'success',
        message: 'Événement supprimé avec succès'
      });
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de la suppression de l\'événement'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-300';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300';
      case 'medium': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-300';
      case 'in_progress': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300';
      case 'todo': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  if (!isOpen || !selectedDate) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div
        className="flex items-center justify-center min-h-screen p-4"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Enter' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            const form = e.currentTarget.querySelector('form');
            if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }}
        tabIndex={-1}
      >
        <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedDate.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {mode === 'create' ? 'Créer un nouvel événement' :
                   mode === 'edit' ? 'Modifier l\'événement' :
                   'Contenu de la journée'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {mode === 'view' && !existingEvent && (
                <Button
                  onClick={() => setMode('create')}
                  variant="primary"
                  leftIcon={<Plus />}
                  title={t('calendar.newEvent')}
                  aria-label={t('calendar.newEvent')}
                >
                  {t('calendar.newEvent')}
                </Button>
              )}
              {mode === 'view' && existingEvent && (
                <>
                  <Button
                    onClick={() => setMode('edit')}
                    variant="secondary"
                    leftIcon={<Edit />}
                    title={t('calendar.edit')}
                    aria-label={t('calendar.edit')}
                  >
                    {t('calendar.edit')}
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="danger"
                    leftIcon={<Trash2 />}
                    title={t('calendar.delete')}
                    aria-label={t('calendar.delete')}
                  >
                    {t('calendar.delete')}
                  </Button>
                </>
              )}
              <Button
                onClick={onClose}
                variant="secondary"
                leftIcon={<X />}
                title={t('common.close')}
                aria-label={t('common.close')}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Chargement...</p>
                </div>
              </div>
            ) : mode === 'view' ? (
              <div className="space-y-6">
                {/* Existing Event Details */}
                {existingEvent && (
                  <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {existingEvent.title}
                    </h3>
                    {existingEvent.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {existingEvent.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {existingEvent.allDay ? 'Toute la journée' : 
                           `${existingEvent.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${existingEvent.end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Tag className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400 capitalize">
                          {existingEvent.type}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tasks for this date */}
                {dateTasks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Tâches du jour ({dateTasks.length})
                    </h3>
                    <div className="space-y-3">
                      {dateTasks.map((task) => (
                        <div key={task.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-2 mt-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(task.status)}`}>
                                  {task.status}
                                </span>
                              </div>
                            </div>
                            {new Date(task.deadline) < new Date() && task.status !== 'completed' && (
                              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 ml-2" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Events for this date */}
                {dateEvents.length > 0 && !existingEvent && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Événements du jour ({dateEvents.length})
                    </h3>
                    <div className="space-y-3">
                      {dateEvents.map((event) => (
                        <div key={event.id} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {event.title}
                          </h4>
                          {event.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2 text-xs">
                            <span className="text-gray-600 dark:text-gray-400">
                              {event.allDay ? 'Toute la journée' : 
                               `${event.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${event.end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-full">
                              {event.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!existingEvent && dateEvents.length === 0 && dateTasks.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Aucun contenu pour cette date
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Aucune tâche ou événement planifié pour cette journée
                    </p>
                    <Button
                      onClick={() => setMode('create')}
                      variant="primary"
                      leftIcon={<Plus />}
                      title={t('calendar.newEvent')}
                      aria-label={t('calendar.newEvent')}
                    >
                      {t('calendar.newEvent')}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Create/Edit Form */
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Titre *
                    </label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Titre de l'événement"
                      required
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Description de l'événement"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type d'événement
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="task">Tâche</option>
                      <option value="meeting">Réunion</option>
                      <option value="deadline">Échéance</option>
                      <option value="project">Projet</option>
                    </select>
                  </div>

                  {formData.type === 'task' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Priorité
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => handleInputChange('priority', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="low">Basse</option>
                        <option value="medium">Moyenne</option>
                        <option value="high">Haute</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Projet associé
                    </label>
                    <select
                      value={formData.relatedProjectId || ''}
                      onChange={(e) => handleInputChange('relatedProjectId', e.target.value || undefined)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Aucun projet</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assigné à
                    </label>
                    <select
                      value={formData.assigneeId || ''}
                      onChange={(e) => handleInputChange('assigneeId', e.target.value || undefined)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Non assigné</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.allDay}
                        onChange={(e) => handleInputChange('allDay', e.target.checked)}
                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Toute la journée</span>
                    </label>
                  </div>

                  {!formData.allDay && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Heure de début
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.start}
                          onChange={(e) => handleInputChange('start', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Heure de fin
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.end}
                          onChange={(e) => handleInputChange('end', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    onClick={() => setMode('view')}
                    variant="secondary"
                    title={t('common.cancel')}
                    aria-label={t('common.cancel')}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    leftIcon={<Save />}
                    disabled={isLoading}
                    title={mode === 'edit' ? t('calendar.save') : t('calendar.create')}
                    aria-label={mode === 'edit' ? t('calendar.save') : t('calendar.create')}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{mode === 'edit' ? t('calendar.save') : t('calendar.create')}</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
