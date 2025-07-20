import React, { useState, useCallback, useEffect } from 'react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ChevronLeft, ChevronRight, Clock, AlertCircle, Plus, ExternalLink } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { calendarService, CalendarEvent, CalendarFilter } from '@/services/calendarService';
import { useNotification } from '@/contexts/NotificationContext';
import { CalendarModal } from '@/components/modals/CalendarModal';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { TaskModal } from '@/components/modals/TaskModal';
import { ProjectModal } from '@/components/modals/ProjectModal';

// Date utility functions
const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export function CalendarView() {
  const { t } = useTranslation();
  const { tasks } = useData();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filter, setFilter] = useState<CalendarFilter>({
    startDate: startOfMonth(currentDate),
    endDate: endOfMonth(currentDate),
    userIds: user?.id ? [user.id] : []
  });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  // Filter tasks that are assigned to the current user or created by them
  const userTasks = tasks.filter(task => 
    (task.assignedTo && task.assignedTo.includes(user?.id || '')) || 
    task.createdBy === user?.id
  );

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    return userTasks.filter(task => {
      const taskDate = new Date(task.deadline);
      return taskDate.getDate() === date.getDate() &&
             taskDate.getMonth() === date.getMonth() &&
             taskDate.getFullYear() === date.getFullYear();
    });
  };

  // Charger les événements du calendrier depuis l'API
  const fetchEvents = useCallback(async () => {
    try {
      // Ajustement de la plage de dates pour obtenir plus de contexte
      const extendedFilter = {
        ...filter,
        startDate: addDays(filter.startDate, -7), // 1 semaine avant
        endDate: addDays(filter.endDate, 7)       // 1 semaine après
      };
      
      const fetchedEvents = await calendarService.getEvents(extendedFilter);
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      addNotification({
        type: 'error',
        message: 'Impossible de charger les événements du calendrier'
      });
    }
  }, [filter, addNotification]);

  // Mettre à jour le filtre quand la date change
  useEffect(() => {
    setFilter(prev => ({
      ...prev,
      startDate: startOfMonth(currentDate),
      endDate: endOfMonth(currentDate)
    }));
  }, [currentDate]);

  // Charger les événements quand le filtre change
  useEffect(() => {
    fetchEvents();
  }, [filter, fetchEvents]);

  // Convertir les tâches en événements si l'API ne le fait pas
  useEffect(() => {
    // Si nous n'avons pas d'API qui retourne les événements, utilisons les tâches
    if (events.length === 0 && tasks.length > 0) {
      const taskEvents = tasks
        .filter(task => task.assignedTo.includes(user?.id || '') || task.createdBy === user?.id)
        .map(task => calendarService.convertTaskToEvent(task));
      
      setEvents(taskEvents);
    }
  }, [tasks, user, events.length]);

  // Résumé global des activités
  const globalStats = React.useMemo(() => {
    const tasks = events.filter(e => e.type === 'task');
    const projects = events.filter(e => e.type === 'project');
    const tasksInProgress = tasks.filter(e => e.progress && e.progress < 100).length;
    const tasksCompleted = tasks.filter(e => e.progress === 100).length;
    const projectsInProgress = projects.filter(e => e.progress && e.progress < 100).length;
    const projectsCompleted = projects.filter(e => e.progress === 100).length;
    const overdueTasks = tasks.filter(e => e.end && e.progress !== 100 && e.end < new Date()).length;
    const avgProgress = tasks.length > 0 ? Math.round(tasks.reduce((acc, t) => acc + (t.progress || 0), 0) / tasks.length) : 0;
    return {
      tasksInProgress,
      tasksCompleted,
      projectsInProgress,
      projectsCompleted,
      overdueTasks,
      avgProgress
    };
  }, [events]);

  

  // Retourne les événements couvrant une date donnée
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      // L'événement couvre la date si la date est entre start et end (inclus)
      return date >= start && date <= end;
    });
  };

  // Détermine la couleur de fond dominante pour une case selon les événements
  const getCellBgColor = (eventsForDay: CalendarEvent[]) => {
    if (eventsForDay.some(e => e.type === 'project')) {
      // Projet prioritaire sur la couleur
      const project = eventsForDay.find(e => e.type === 'project');
      return project?.color || 'bg-blue-200';
    }
    if (eventsForDay.some(e => e.type === 'task' && e.progress !== 100)) {
      return 'bg-green-100';
    }
    if (eventsForDay.some(e => e.type === 'task' && e.progress === 100)) {
      return 'bg-gray-100';
    }
    return 'bg-white';
  };

  // Naviguer entre les mois
  const navigateMonth = (action: 'prev' | 'next' | 'today') => {
    setCurrentDate(current => {
      if (action === 'prev') return addMonths(current, -1);
      if (action === 'next') return addMonths(current, 1);
      return new Date();
    });
  };

  

  // Palette minimaliste
  const PROJECT_COLOR = 'bg-blue-500 dark:bg-blue-400';
  const TASK_COLOR = 'bg-green-500 dark:bg-green-400';
  const EVENT_COLOR = 'bg-violet-500 dark:bg-violet-400';
  const TASK_DOT_COLORS = {
    low: 'bg-green-400 dark:bg-green-300',
    medium: 'bg-yellow-400 dark:bg-yellow-300',
    high: 'bg-orange-400 dark:bg-orange-300',
    urgent: 'bg-red-500 dark:bg-red-400',
  };

  // Génère la grille des jours avec barres/ronds minimalistes
  const renderCalendarDays = () => {
    const days = [];
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-32 border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800/50"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const eventsForDay = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      // Sépare projets/événements multi-jours et tâches ponctuelles
      const bars = eventsForDay.filter(e => {
        const start = Number(new Date(e.start));
        const end = Number(new Date(e.end));
        return (end - start) / (1000 * 60 * 60 * 24) >= 1;
      });
      const dots = eventsForDay.filter(e => {
        const start = Number(new Date(e.start));
        const end = Number(new Date(e.end));
        return (end - start) / (1000 * 60 * 60 * 24) < 1 && e.type === 'task';
      });
      days.push(
        <div
          key={day}
          className={`h-32 border border-gray-200 dark:border-gray-700 p-2 cursor-pointer bg-white dark:bg-gray-900 ${isToday ? 'ring-2 ring-primary-500' : ''} hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative`}
          onClick={() => handleDateClick(date)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>{day}</span>
          </div>
          {/* Barres horizontales pour projets/événements multi-jours */}
          <div className="absolute left-2 right-2 top-8 flex flex-col gap-1 pointer-events-none">
            {bars.map((event, idx) => {
              let color = event.type === 'project' ? PROJECT_COLOR : EVENT_COLOR;
              if (event.type === 'task') color = TASK_COLOR;
              return (
                <div
                  key={event.id + idx}
                  className={`h-2 rounded-full ${color} opacity-80 pointer-events-auto`}
                  title={event.title}
                  style={{ minWidth: 24 }}
                />
              );
            })}
          </div>
          {/* Petits ronds pour tâches ponctuelles */}
          <div className="flex flex-wrap gap-1 mt-12">
            {dots.map((event, idx) => {
              let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
              if (event.type === 'task' && 'priority' in event && typeof (event as any).priority === 'string') {
                priority = (event as any).priority as 'low' | 'medium' | 'high' | 'urgent';
              }
              return (
                <span
                  key={event.id + idx}
                  className={`w-3 h-3 rounded-full ${TASK_DOT_COLORS[priority]} border border-white dark:border-gray-900 shadow pointer-events-auto`}
                  title={event.title}
                />
              );
            })}
          </div>
        </div>
      );
    }
    return days;
  };

  // Légende minimaliste à droite
  const MinimalistLegend = () => (
    <div className="fixed right-8 top-32 flex flex-col gap-2 bg-white/80 dark:bg-gray-900/80 p-3 rounded shadow text-xs z-20">
      <div className="flex items-center gap-2"><span className={`w-6 h-2 rounded-full ${PROJECT_COLOR}`}></span> {t('calendar.legend.project')}</div>
      <div className="flex items-center gap-2"><span className={`w-6 h-2 rounded-full ${EVENT_COLOR}`}></span> {t('calendar.legend.event')}</div>
      <div className="flex items-center gap-2"><span className={`w-6 h-2 rounded-full ${TASK_COLOR}`}></span> {t('calendar.legend.longTask')}</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-400 dark:bg-green-300 border"></span> {t('calendar.legend.taskLow')}</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-300 border"></span> {t('calendar.legend.taskMedium')}</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400 dark:bg-orange-300 border"></span> {t('calendar.legend.taskHigh')}</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 dark:bg-red-400 border"></span> {t('calendar.legend.taskUrgent')}</div>
    </div>
  );

  // Handle date click to open modal
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowDateModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowDateModal(false);
    setSelectedDate(null);
  };

  // Handle event CRUD operations
  const handleEventCreate = (newEvent: CalendarEvent) => {
    setEvents(prev => [...prev, newEvent]);
    addNotification({
      type: 'success',
      message: 'Événement créé avec succès'
    });
  };

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    setEvents(prev => prev.map(event => 
      event.id === updatedEvent.id ? updatedEvent : event
    ));
    addNotification({
      type: 'success',
      message: 'Événement mis à jour avec succès'
    });
  };

  const handleEventDelete = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId));
    addNotification({
      type: 'success',
      message: 'Événement supprimé avec succès'
    });
    handleModalClose();
  };

  const upcomingTasks = userTasks
    .filter(task => {
      const taskDate = new Date(task.deadline);
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return taskDate >= today && taskDate <= nextWeek && task.status !== 'completed';
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  // Événements de la date sélectionnée
  const eventsForSelectedDate = selectedDate ? getEventsForDate(selectedDate) : [];

  // Ajout rapide (à implémenter selon vos besoins)
  const handleQuickAdd = (type: 'task' | 'project' | 'event') => {
    if (type === 'task') setShowTaskModal(true);
    if (type === 'project') setShowProjectModal(true);
    if (type === 'event') setShowEventModal(true);
    setShowDateModal(false);
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Calendrier</h2>
          <p className="text-gray-600 dark:text-gray-400">Visualisez vos échéances et planifiez votre travail</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </h3>
              
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {renderCalendarDays()}
            </div>
          </div>
        </div>

        {/* Upcoming Tasks Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Prochaines échéances</h3>
            </div>
            
            <div className="space-y-3">
              {upcomingTasks.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune échéance à venir</p>
              ) : (
                upcomingTasks.map((task) => {
                  const daysUntil = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div key={task.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                        {task.title}
                      </h4>
                      <div className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-1 rounded-full ${
                          task.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' :
                          task.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300' :
                          'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {daysUntil === 0 ? 'Aujourd\'hui' :
                           daysUntil === 1 ? 'Demain' :
                           `Dans ${daysUntil} jours`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistiques</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Tâches ce mois</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {userTasks.filter(task => {
                    const taskDate = new Date(task.deadline);
                    return taskDate.getMonth() === currentDate.getMonth() && 
                           taskDate.getFullYear() === currentDate.getFullYear();
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Terminées</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {userTasks.filter(task => {
                    const taskDate = new Date(task.deadline);
                    return task.status === 'completed' &&
                           taskDate.getMonth() === currentDate.getMonth() && 
                           taskDate.getFullYear() === currentDate.getFullYear();
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">En retard</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {userTasks.filter(task => {
                    const taskDate = new Date(task.deadline);
                    return new Date(task.deadline) < new Date() && 
                           task.status !== 'completed' &&
                           taskDate.getMonth() === currentDate.getMonth() && 
                           taskDate.getFullYear() === currentDate.getFullYear();
                  }).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Modal */}
      <Dialog open={showDateModal} onClose={handleModalClose} className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay pour le fond */}
        <div className="fixed inset-0 bg-black/40 dark:bg-black/70" aria-hidden="true" />
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-md mx-auto p-6 z-10">
          <Dialog.Title className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            {selectedDate && selectedDate.toLocaleDateString()}
          </Dialog.Title>
          <div className="flex gap-2 mb-4">
            <button onClick={() => handleQuickAdd('task')} className="flex items-center gap-1 px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition"><Plus className="w-4 h-4" /> {t('calendar.addTask')}</button>
            <button onClick={() => handleQuickAdd('project')} className="flex items-center gap-1 px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition"><Plus className="w-4 h-4" /> {t('calendar.addProject')}</button>
            <button onClick={() => handleQuickAdd('event')} className="flex items-center gap-1 px-2 py-1 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800 transition"><Plus className="w-4 h-4" /> {t('calendar.addEvent')}</button>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {eventsForSelectedDate.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400 text-sm text-center">{t('calendar.noEvent')}</div>
            )}
            {eventsForSelectedDate.map((event, idx) => (
              <div key={event.id + idx} className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition group">
                {/* Barre/rond minimaliste */}
                {(() => {
                  if (event.type === 'project') return <span className={`w-6 h-2 rounded-full ${PROJECT_COLOR}`}></span>;
                  if (event.type === 'meeting' || event.type === 'deadline') return <span className={`w-6 h-2 rounded-full ${EVENT_COLOR}`}></span>;
                  if (event.type === 'task' && Number(new Date(event.end)) - Number(new Date(event.start)) >= 24*60*60*1000) return <span className={`w-6 h-2 rounded-full ${TASK_COLOR}`}></span>;
                  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
                  if (event.type === 'task' && 'priority' in event && typeof (event as any).priority === 'string') {
                    priority = (event as any).priority as 'low' | 'medium' | 'high' | 'urgent';
                  }
                  return <span className={`w-3 h-3 rounded-full ${TASK_DOT_COLORS[priority]} border`}></span>;
                })()}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-gray-900 dark:text-white">{event.title}</div>
                  {event.type !== 'task' && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t('calendar.period', {start: new Date(event.start).toLocaleDateString(), end: new Date(event.end).toLocaleDateString()})}
                    </div>
                  )}
                </div>
                <a href={`/${event.type}s/${event.relatedId || event.id}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 text-xs"><ExternalLink className="w-4 h-4" /> {t('calendar.seeDetails')}</a>
              </div>
            ))}
          </div>
          <button onClick={handleModalClose} className="mt-4 w-full py-2 rounded bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition">{t('calendar.close')}</button>
        </div>
      </Dialog>
      {/* Modale d’ajout rapide tâche */}
      {showTaskModal && (
        <TaskModal task={null} onClose={() => setShowTaskModal(false)} />
      )}
      {/* Modale d’ajout rapide projet */}
      {showProjectModal && (
        <ProjectModal project={null} isOpen={showProjectModal} onClose={() => setShowProjectModal(false)} />
      )}
      {/* Modale d’ajout rapide événement */}
      {showEventModal && (
        <CalendarModal isOpen={showEventModal} onClose={() => setShowEventModal(false)} selectedDate={selectedDate} />
      )}
    </div>
  );
}
