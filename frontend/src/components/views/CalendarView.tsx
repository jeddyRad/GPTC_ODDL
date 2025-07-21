import React, { useState, useCallback, useEffect } from 'react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ChevronLeft, ChevronRight, Clock, AlertCircle, Plus, ExternalLink, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { calendarService, CalendarEvent, CalendarFilter } from '@/services/calendarService';
import { useNotification } from '@/contexts/NotificationContext';
import { CalendarModal } from '@/components/modals/CalendarModal';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { TaskModal } from '@/components/modals/TaskModal';
import { ProjectModal } from '@/components/modals/ProjectModal';
import { Task, Project } from '@/types';

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
  const { tasks, projects } = useData();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  // Gestion d'erreur pour éviter les problèmes de rendu
  if (!tasks || !projects) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du calendrier...</p>
        </div>
      </div>
    );
  }
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
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Filter tasks that are assigned to the current user or created by them
  const userTasks = tasks.filter(task => 
    (task.assignedTo && task.assignedTo.includes(user?.id || '')) || 
    (task.assigneeIds && task.assigneeIds.includes(user?.id || '')) ||
    task.createdBy === user?.id ||
    task.creatorId === user?.id
  );

  // Filter projects that the user is involved in
  const userProjects = user?.role === 'ADMIN'
    ? projects
    : projects.filter(project => 
        project.creatorId === user?.id ||
        (project.memberIds && project.memberIds.includes(user?.id || '')) ||
        project.chefId === user?.id
      );

  // Debug: afficher les projets disponibles une seule fois
  useEffect(() => {
    if (userProjects.length > 0) {
      console.log('Projets utilisateur disponibles:', userProjects.map(p => ({
        id: p.id,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        color: p.color,
        status: p.status,
        startDateType: typeof p.startDate,
        endDateType: typeof p.endDate
      })));
      
      // Vérifier les projets avec des dates valides
      const projectsWithValidDates = userProjects.filter(p => {
        if (!p.startDate || !p.endDate) return false;
        const startDate = typeof p.startDate === 'string' ? new Date(p.startDate) : p.startDate;
        const endDate = typeof p.endDate === 'string' ? new Date(p.endDate) : p.endDate;
        return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime());
      });
      
      console.log('Projets avec dates valides:', projectsWithValidDates.length);
      console.log('Projets avec dates valides:', projectsWithValidDates.map(p => ({
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        color: p.color
      })));
    }
  }, [userProjects]);

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    return userTasks.filter(task => {
      const taskDate = new Date(task.deadline);
      return taskDate.getDate() === date.getDate() &&
             taskDate.getMonth() === date.getMonth() &&
             taskDate.getFullYear() === date.getFullYear();
    });
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  // Get projects for a specific date (projects that span this date)
  const getProjectsForDate = (date: Date) => {
    return userProjects.filter(project => {
      if (!project.startDate || !project.endDate) return false;
      
      // Convertir les dates en objets Date si elles sont des chaînes
      const startDate = typeof project.startDate === 'string' ? new Date(project.startDate) : project.startDate;
      const endDate = typeof project.endDate === 'string' ? new Date(project.endDate) : project.endDate;
      
      // Vérifier que les dates sont valides
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.log(`Dates invalides pour le projet ${project.name}:`, { startDate: project.startDate, endDate: project.endDate });
        return false;
      }
      
      const isInRange = date >= startDate && date <= endDate;
      
      // Debug: afficher les projets trouvés
      if (isInRange) {
        console.log(`Projet ${project.name} trouvé pour la date ${date.toDateString()}:`, {
          projectId: project.id,
          projectName: project.name,
          startDate: startDate.toDateString(),
          endDate: endDate.toDateString(),
          currentDate: date.toDateString(),
          color: project.color
        });
      }
      
      return isInRange;
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
  }, [fetchEvents]);

  // Get upcoming tasks (next 7 days)
  const upcomingTasks = userTasks
    .filter(task => {
      const taskDate = new Date(task.deadline);
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return taskDate >= today && taskDate <= nextWeek && task.status !== 'completed';
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5);

  // Get events for selected date
  const eventsForSelectedDate = selectedDate ? getEventsForDate(selectedDate) : [];
  const tasksForSelectedDate = selectedDate ? getTasksForDate(selectedDate) : [];
  const projectsForSelectedDate = selectedDate ? getProjectsForDate(selectedDate) : [];

  // Couleurs pour les différents types d'événements
  const PROJECT_COLOR = 'bg-blue-500 dark:bg-blue-400';
  const EVENT_COLOR = 'bg-purple-500 dark:bg-purple-400';
  const TASK_COLOR = 'bg-gray-500 dark:bg-gray-400';

  // Couleurs pour les priorités des tâches
  const TASK_PRIORITY_COLORS = {
    low: 'bg-green-500 dark:bg-green-400',
    medium: 'bg-yellow-500 dark:bg-yellow-400',
    high: 'bg-orange-500 dark:bg-orange-400',
    urgent: 'bg-red-500 dark:bg-red-400',
  };

  // Couleurs pour les statuts des tâches
  const TASK_STATUS_COLORS = {
    todo: 'bg-gray-500 dark:bg-gray-400',
    in_progress: 'bg-blue-500 dark:bg-blue-400',
    review: 'bg-yellow-500 dark:bg-yellow-400',
    completed: 'bg-green-500 dark:bg-green-400',
  };

  const navigateMonth = (action: 'prev' | 'next' | 'today') => {
    switch (action) {
      case 'prev':
        setCurrentDate(addMonths(currentDate, -1));
        break;
      case 'next':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case 'today':
        setCurrentDate(new Date());
        break;
    }
  };

  // Génère la grille des jours avec barres/ronds améliorés
  const renderCalendarDays = () => {
    const days = [];
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    // Calculer les projets qui traversent ce mois
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Extraire les projets du payload d'événements (type: 'project')
    const eventProjects = events.filter(e => e.type === 'project').map(e => ({
      id: e.relatedId || e.id,
      name: e.title,
      description: e.description,
      color: e.color,
      startDate: typeof e.start === 'string' ? new Date(e.start) : e.start,
      endDate: typeof e.end === 'string' ? new Date(e.end) : e.end,
      icon: e.icon,
      progress: e.progress,
      // status: e.status || 'active', // Retiré pour éviter l'erreur linter
    }));

    // Fusionner les projets du contexte et du payload d'événements (éviter les doublons)
    const projectMap = new Map<string, Project>();
    userProjects.forEach(p => projectMap.set(p.id, p));
    eventProjects.forEach(ep => {
      const id = (ep as any).relatedId || ep.id;
      if (!projectMap.has(id)) {
        projectMap.set(id, {
          ...ep,
          id,
          description: ep.description ?? '',
          color: ep.color ?? '#3B82F6',
          progress: ep.progress ?? 0,
          status: 'active',
          startDate: ep.startDate instanceof Date ? ep.startDate.toISOString().slice(0, 10) : (typeof ep.startDate === 'string' ? ep.startDate : ''),
          endDate: ep.endDate instanceof Date ? ep.endDate.toISOString().slice(0, 10) : (typeof ep.endDate === 'string' ? ep.endDate : ''),
          serviceId: '',
          serviceIds: [],
          memberIds: [],
          memberDetails: [],
          chefId: '',
          chefDetails: undefined,
          taskCount: 0,
          completedTaskCount: 0,
          attachments: [],
          createdAt: '',
          updatedAt: '',
          riskLevel: 'medium',
          creatorId: '',
        } as Project);
      }
    });
    const allProjects: Project[] = Array.from(projectMap.values());

    // Créer un mapping des projets par jour pour l'affichage multi-jours
    const projectMapping: { [key: string]: { project: any; startDay: number; endDay: number; row: number } } = {};
    let currentRow = 0;

    allProjects.forEach(project => {
      if (!project.startDate || !project.endDate) return;
      
      // Convertir les dates en objets Date si elles sont des chaînes
      const startDate = typeof project.startDate === 'string' ? new Date(project.startDate) : project.startDate;
      const endDate = typeof project.endDate === 'string' ? new Date(project.endDate) : project.endDate;
      
      // Vérifier que les dates sont valides
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.log(`Dates invalides pour le projet ${project.name} dans le mapping:`, { 
          startDate: project.startDate, 
          endDate: project.endDate 
        });
        return;
      }
      
      // Calculer les jours dans ce mois (même si le projet commence avant)
      const effectiveStartDate = startDate < monthStart ? monthStart : startDate;
      const effectiveEndDate = endDate > monthEnd ? monthEnd : endDate;
      
      const startDay = effectiveStartDate.getDate();
      const endDay = effectiveEndDate.getDate();
      
      console.log(`Mapping projet ${project.name}:`, {
        projectId: project.id,
        startDay,
        endDay,
        row: currentRow,
        color: project.color,
        originalStart: startDate.toDateString(),
        originalEnd: endDate.toDateString(),
        effectiveStart: effectiveStartDate.toDateString(),
        effectiveEnd: effectiveEndDate.toDateString()
      });
      
      projectMapping[project.id] = {
        project,
        startDay,
        endDay,
        row: currentRow
      };
      currentRow++;
    });

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-40 border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800/50"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const eventsForDay = getEventsForDate(date);
      const tasksForDay = getTasksForDate(date);
      // Correction : utiliser allProjects pour le mapping des projets du jour
      const projectsForDay = allProjects.filter(project => {
        if (!project.startDate || !project.endDate) return false;
        const startDate = typeof project.startDate === 'string' ? new Date(project.startDate) : project.startDate;
        const endDate = typeof project.endDate === 'string' ? new Date(project.endDate) : project.endDate;
        return startDate <= date && date <= endDate;
      });
      const isToday = date.toDateString() === new Date().toDateString();
      
      // Détection d'échéance dépassée
      const isOverdue = tasksForDay.some(task => new Date(task.deadline) < new Date() && task.status !== 'completed')
        || projectsForDay.some(project => {
          if (!project.endDate) return false;
          const endDate = typeof project.endDate === 'string' ? new Date(project.endDate) : project.endDate;
          return endDate && endDate < new Date();
        });

      // Ronds pour tâches ponctuelles
      const taskDots = tasksForDay.slice(0, 6); // Limiter à 6 tâches par jour
      
      // Barres pour événements multi-jours
      const eventBars = eventsForDay.filter(e => {
        const start = Number(new Date(e.start));
        const end = Number(new Date(e.end));
        return (end - start) / (1000 * 60 * 60 * 24) >= 1;
      }).slice(0, 2); // Limiter à 2 événements par jour

      days.push(
        <div
          key={day}
          className={`h-40 border border-gray-200 dark:border-gray-700 p-2 cursor-pointer bg-white dark:bg-gray-900 ${isToday ? 'ring-2 ring-primary-500' : ''} hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative`}
          onClick={() => handleDateClick(date)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>{day}</span>
            <div className="flex items-center gap-1">
              {(tasksForDay.length > 0 || projectsForDay.length > 0 || eventsForDay.length > 0) && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {tasksForDay.length + projectsForDay.length + eventsForDay.length}
                </span>
              )}
              {isOverdue && (
                <AlertCircle className="w-4 h-4 text-red-500 ml-1" aria-label="Échéance dépassée" />
              )}
            </div>
          </div>
          
          {/* Barres pour projets (utilisent la couleur du projet) */}
          <div className="absolute left-2 right-2 top-8 flex flex-col gap-2 pointer-events-none">
            {projectsForDay.slice(0, 3).map((project, idx) => {
              const projectInfo = projectMapping[project.id];
              if (!projectInfo) {
                console.log(`Projet ${project.name} non trouvé dans le mapping pour le jour ${day}`);
                return null;
              }
              const { startDay, endDay, row } = projectInfo;
              const isStart = day === startDay;
              const isEnd = day === endDay;
              const isMiddle = day > startDay && day < endDay;
              const isSingleDay = startDay === endDay;
              const leftOffset = isStart ? 0 : -2;
              const rightOffset = isEnd ? 0 : 2;
              return (
                <div
                  key={`project-${project.id}-${idx}`}
                  className={`h-5 rounded-md opacity-95 pointer-events-auto flex items-center px-2 text-xs font-semibold text-white shadow-md ${
                    isStart || isSingleDay ? 'rounded-l-lg' : ''
                  } ${
                    isEnd || isSingleDay ? 'rounded-r-lg' : ''
                  } ${
                    isMiddle ? 'rounded-none' : ''
                  }`}
                  style={{ 
                    backgroundColor: project.color || '#3B82F6',
                    minWidth: 32,
                    marginLeft: leftOffset,
                    marginRight: rightOffset,
                    zIndex: 10 - row
                  }}
                  title={`Projet: ${project.name}${isStart ? ' (Début)' : isEnd ? ' (Fin)' : ''}`}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedProject(project);
                    setShowProjectModal(true);
                  }}
                >
                  {(isStart || isSingleDay) && (
                    <span className="truncate text-white text-xs font-semibold flex items-center gap-1">
                      {typeof (project as any).icon === 'string' && (project as any).icon.length > 0 ? (
                        <span className="mr-1">{(project as any).icon}</span>
                      ) : null}
                      {project.name.length > 10 ? project.name.substring(0, 10) + '...' : project.name}
                    </span>
                  )}
                </div>
              );
            })}
            {/* Barres pour événements multi-jours */}
            {eventBars.map((event, idx) => (
              <div
                key={`event-${event.id}-${idx}`}
                className={`h-2 rounded-full ${EVENT_COLOR} opacity-80 pointer-events-auto`}
                style={{ minWidth: 24 }}
                title={event.title}
              />
            ))}
          </div>
          {/* Ronds pour tâches (utilisent la couleur de priorité) */}
          <div className="flex flex-wrap gap-2 mt-24">
            {taskDots.map((task, idx) => (
              <span
                key={`task-${task.id}-${idx}`}
                className={`w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 shadow pointer-events-auto ${TASK_PRIORITY_COLORS[task.priority]}`}
                title={`Tâche: ${task.title} (${task.priority}) - ${task.status}`}
              />
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  // Légende améliorée
  const CalendarLegend = () => (
    <div className="sticky top-4 right-0 flex flex-col gap-3 bg-white/95 dark:bg-gray-900/95 p-4 rounded-lg shadow-lg text-xs backdrop-blur-sm border border-gray-200 dark:border-gray-700 max-w-xs">
      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Légende</h4>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded-sm bg-blue-500"></div>
          <span className="text-gray-700 dark:text-gray-300">Projets (barres colorées)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-2 rounded-full bg-purple-500"></span>
          <span className="text-gray-700 dark:text-gray-300">Événements</span>
        </div>
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Priorités des tâches</h5>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 border"></span>
            <span className="text-gray-700 dark:text-gray-300">Faible</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500 border"></span>
            <span className="text-gray-700 dark:text-gray-300">Moyenne</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 border"></span>
            <span className="text-gray-700 dark:text-gray-300">Élevée</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 border"></span>
            <span className="text-gray-700 dark:text-gray-300">Urgente</span>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
        <h5 className="font-medium text-gray-900 dark:text-white mb-2">Statuts des projets</h5>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-gray-700 dark:text-gray-300">Actif</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-gray-700 dark:text-gray-300">Planification</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="text-gray-700 dark:text-gray-300">En attente</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-500"></span>
            <span className="text-gray-700 dark:text-gray-300">Terminé</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Handle date click to open modal
  const handleDateClick = (date: Date) => {
    if (selectedDate && selectedDate.toDateString() === date.toDateString() && showDateModal) {
      setShowDateModal(false);
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
      setShowDateModal(true);
    }
  };

  const handleModalClose = () => {
    setShowDateModal(false);
    setSelectedDate(null);
  };

  const handleEventCreate = (newEvent: CalendarEvent) => {
    setEvents(prev => [...prev, newEvent]);
    setShowEventModal(false);
  };

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    setEvents(prev => prev.map(event => 
      event.id === updatedEvent.id ? updatedEvent : event
    ));
    setShowEventModal(false);
  };

  const handleEventDelete = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId));
    setShowEventModal(false);
  };

  const handleQuickAdd = (type: 'task' | 'project' | 'event') => {
    setShowDateModal(false); // Fermer la modale de date avant d'ouvrir une modale d'ajout
    switch (type) {
      case 'task':
        setShowTaskModal(true);
        break;
      case 'project':
        setShowProjectModal(true);
        break;
      case 'event':
        setShowEventModal(true);
        break;
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('calendar.title')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth('today')}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {t('calendar.today')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Légende - Sticky en haut */}
          <div className="sticky top-4 z-10">
            <CalendarLegend />
          </div>

          {/* Upcoming Tasks */}
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
                          task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                          'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
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

      {/* Modal de détails de date améliorée */}
      <Dialog open={showDateModal} onClose={handleModalClose} className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay pour le fond */}
        <div className="fixed inset-0 bg-black/40 dark:bg-black/70" aria-hidden="true" onClick={handleModalClose} />
        <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl mx-auto p-6 z-10 max-h-[80vh] overflow-y-auto">
          {/* Bouton X en haut à droite */}
          <button
            onClick={handleModalClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-xl font-bold focus:outline-none"
            aria-label="Fermer"
          >
            ×
          </button>
          <Dialog.Title className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            {selectedDate && selectedDate.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Dialog.Title>
          {/* Boutons d'ajout rapide */}
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => handleQuickAdd('task')} 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 
              Nouvelle tâche
            </button>
            <button 
              onClick={() => handleQuickAdd('project')} 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 
              Nouveau projet
            </button>
            <button 
              onClick={() => handleQuickAdd('event')} 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> 
              Nouvel événement
            </button>
          </div>
          {/* Contenu de la modal */}
          <div className="space-y-6">
            {/* Un seul fragment pour tous les blocs conditionnels */}
            <>
              {tasksForSelectedDate.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Tâches ({tasksForSelectedDate.length})
                  </h3>
                  <div className="space-y-3">
                    {tasksForSelectedDate.map((task) => (
                      <div key={task.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs">
                              <span className={`px-2 py-1 rounded-full ${
                                task.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' :
                                task.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300' :
                                task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                                'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                              }`}>
                                {task.priority}
                              </span>
                              <span className={`px-2 py-1 rounded-full ${
                                task.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                                task.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' :
                                task.status === 'review' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                              }`}>
                                {task.status}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {new Date(task.deadline).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <a 
                            href={`/tasks/${task.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 text-xs"
                          >
                            <ExternalLink className="w-4 h-4" /> 
                            Voir détails
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {projectsForSelectedDate.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Projets ({projectsForSelectedDate.length})
                  </h3>
                  <div className="space-y-3">
                    {projectsForSelectedDate.map((project) => {
                      const startDate = project.startDate ? 
                        (typeof project.startDate === 'string' ? new Date(project.startDate) : project.startDate) : null;
                      const endDate = project.endDate ? 
                        (typeof project.endDate === 'string' ? new Date(project.endDate) : project.endDate) : null;
                      const duration = startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) ? 
                        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                      return (
                        <div key={project.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">{project.name}</h4>
                                {typeof (project as any).icon === 'string' && (project as any).icon.length > 0 && (
                                  <span className="mr-1">{(project as any).icon}</span>
                                )}
                                {project.color && (
                                  <div 
                                    className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                                    style={{ backgroundColor: project.color }}
                                    title="Couleur du projet"
                                  />
                                )}
                              </div>
                              {project.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{project.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-xs mb-2">
                                {project.progress !== undefined && (
                                  <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                                    {project.progress}% terminé
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                {startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) ? (
                                  <>
                                    <span>
                                      <strong>Début:</strong> {startDate.toLocaleDateString('fr-FR')}
                                    </span>
                                    <span>
                                      <strong>Fin:</strong> {endDate.toLocaleDateString('fr-FR')}
                                    </span>
                                    <span>
                                      <strong>Durée:</strong> {duration} jour{duration > 1 ? 's' : ''}
                                    </span>
                                  </>
                                ) : (
                                  <span>Dates non définies</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {eventsForSelectedDate.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    Événements ({eventsForSelectedDate.length})
                  </h3>
                  <div className="space-y-3">
                    {eventsForSelectedDate.map((event) => (
                      <div key={event.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{event.title}</h4>
                            {event.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{event.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs">
                              <span className={`px-2 py-1 rounded-full ${
                                event.type === 'project' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' :
                                event.type === 'task' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                                'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300'
                              }`}>
                                {event.type}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {new Date(event.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tasksForSelectedDate.length === 0 && projectsForSelectedDate.length === 0 && eventsForSelectedDate.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Aucun événement pour cette date</p>
                </div>
              )}
            </>
          </div>
        </div>
      </Dialog>

      {/* Modales d'ajout */}
      {showTaskModal && (
        <TaskModal task={null} onClose={() => setShowTaskModal(false)} />
      )}
      {showProjectModal && (
        <ProjectModal project={selectedProject || null} isOpen={showProjectModal} onClose={() => setShowProjectModal(false)} />
      )}
      {showEventModal && (
        <CalendarModal isOpen={showEventModal} onClose={() => setShowEventModal(false)} selectedDate={selectedDate} />
      )}
    </div>
  );
}