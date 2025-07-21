import { useState } from 'react';
import { Plus, Calendar, Users, BarChart3, Clock, AlertCircle, AlertTriangle, Edit, Trash2, CheckSquare, Paperclip } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/types';
import { ProjectModal } from '@/components/modals/ProjectModal';
import { getUserPermissions, filterProjectsByPermission, canUserEditProject } from '@/utils/permissions';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';
import React from 'react';
import { User } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';

interface ProjectDetailsProps {
  project: Project;
  onClose: () => void;
}

function ProjectDetails({ project, onClose }: ProjectDetailsProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-8 shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl">×</button>
        <h2 className="text-2xl font-bold mb-2 text-primary-700 dark:text-primary-300">{project.name}</h2>
        <p className="mb-4 text-gray-600 dark:text-gray-300">{project.description}</p>
        <div className="mb-2 flex flex-wrap gap-2">
          <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Statut : {project.status}</span>
          <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Risque : {project.riskLevel}</span>
          <span className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">Début : {project.startDate}</span>
          <span className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">Fin : {project.endDate}</span>
        </div>
        <div className="mb-4">
          <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Chef de projet : </span>
          {project.chefDetails ? (
            <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs ml-1">{project.chefDetails.fullName} ({project.chefDetails.role})</span>
          ) : (
            <span className="text-xs text-gray-400">Non assigné</span>
          )}
        </div>
        <div className="mb-4">
          <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Membres :</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {project.memberDetails && project.memberDetails.length > 0 ? (
              project.memberDetails.map(m => (
                <span key={m.id} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{m.fullName} ({m.role})</span>
              ))
            ) : (
              <span className="text-xs text-gray-400">Aucun membre</span>
            )}
          </div>
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">Tâches : {project.taskCount}</span>
          <span className="inline-block bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs">Tâches terminées : {project.completedTaskCount}</span>
        </div>
        <div className="mt-4">
          <span className="inline-block w-4 h-4 rounded-full mr-2 align-middle" style={{ backgroundColor: project.color }}></span>
          <span className="text-xs text-gray-500">Couleur du projet</span>
        </div>
      </div>
    </div>
  );
}

// Nouveau composant ProjectCard
function ProjectCard({ project, onDetails, onEdit, onDelete }: {
  project: Project;
  onDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const progress = project.progress || 0;
  const { t } = useTranslation();
  return (
    <div
      className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col shadow-md hover:shadow-xl transition-shadow duration-200 cursor-pointer group"
      onClick={onDetails}
    >
      {/* Boutons minimalistes en haut à droite */}
      <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="p-1 rounded hover:bg-primary-100 dark:hover:bg-primary-900/20"
          title="Modifier"
        >
          <Edit className="w-4 h-4 text-primary-600" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
      <div className="flex items-center mb-2">
        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold mr-2 ${project.status === 'active' ? 'bg-green-100 text-green-800' : project.status === 'planning' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{project.status}</span>
        <span className="inline-block w-4 h-4 rounded-full mr-2 align-middle" style={{ backgroundColor: project.color }}></span>
        <span className="text-xs text-gray-500">{project.riskLevel}</span>
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate flex items-center">
        {project.name}
        {/* Icône pièce jointe si le projet a des pièces jointes */}
        {((project.attachments ?? []).length) > 0 && (
          <span title={t('project.attachments')} className="flex items-center text-gray-400 dark:text-gray-500 ml-2">
            <Paperclip className="w-4 h-4" />
            <span className="text-xs ml-1">{(project.attachments ?? []).length}</span>
          </span>
        )}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{project.description}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        {project.chefDetails && (
          <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Chef: {project.chefDetails.fullName}</span>
        )}
        {project.memberDetails && project.memberDetails.length > 0 && project.memberDetails.slice(0, 3).map(m => (
          <span key={m.id} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{m.fullName}</span>
        ))}
        {project.memberDetails && project.memberDetails.length > 3 && (
          <span className="inline-block bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs">+{project.memberDetails.length - 3} autres</span>
        )}
      </div>
      <div className="flex items-center text-xs text-gray-500 mb-2">
        <Calendar className="w-4 h-4 mr-1" /> {project.startDate} → {project.endDate}
      </div>
      <div className="flex items-center text-xs text-gray-500 mb-2">
        <CheckSquare className="w-4 h-4 mr-1" /> {project.taskCount || 0} tâches
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-auto">
        <div
          className="h-2 bg-primary-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <span className="text-xs text-gray-500 mt-2">Progression : {progress}%</span>
    </div>
  );
}

export function ProjectsView() {
  const { projects, tasks, deleteProject } = useData();
  const { user } = useAuth();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDetailMode, setIsDetailMode] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const [detailsProject, setDetailsProject] = useState<Project | null>(null);
  const { isAdmin, role } = usePermissions();

  const permissions = getUserPermissions(user);
  const userProjects = filterProjectsByPermission(projects, user);
  // Correction : inclure aussi les projets où le user est chef, ou dans serviceIds
  const extendedUserProjects = userProjects.concat(
    projects.filter(p =>
      (user && p.chefId === user.id) ||
      (user && Array.isArray(p.serviceIds) && p.serviceIds.includes(user.service || ''))
    )
  ).filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx);
  const canCreate = isAdmin || role === 'MANAGER' || permissions.canCreateProjects;

  const handleCreateProject = () => {
    if (!canCreate) return;
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    if (!canUserEditProject(user, project)) return;
    setEditingProject(project);
    setIsDetailMode(false);
    setIsProjectModalOpen(true);
  };

  const handleViewDetails = (project: Project) => {
    setDetailsProject(project);
    setShowDetails(true);
  };

  const handleCloseModal = () => {
    setIsProjectModalOpen(false);
    setEditingProject(null);
    setIsDetailMode(false);
    setError('');
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setDetailsProject(null);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) return;
    setError('');
    try {
      await deleteProject(projectId);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Erreur lors de la suppression du projet.');
    }
  };

  const getProjectProgress = (project: any) => {
    const projectTasks = tasks.filter(task => (project.tasks ?? []).includes(task.id));
    if (projectTasks.length === 0) return 0;
    const completedTasks = projectTasks.filter(task => task.status === 'completed');
    return Math.round((completedTasks.length / projectTasks.length) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'planning': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
      case 'on_hold': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
      case 'completed': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t('projects.active');
      case 'planning': return t('projects.planning');
      case 'on_hold': return t('projects.onHold');
      case 'completed': return t('projects.completed');
      default: return status;
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('projects.title')}</h1>
        {canCreate && (
          <Button
            onClick={handleCreateProject}
            variant="primary"
            size="md"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('projects.createProject')}
          </Button>
        )}
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('projects.totalProjects')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{userProjects.length}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-primary-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('projects.activeProjects')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {userProjects.filter(p => p.status === 'active').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('projects.onPlanning')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {userProjects.filter(p => p.status === 'planning').length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('projects.completed')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {userProjects.filter(p => p.status === 'completed').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {extendedUserProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onDetails={() => handleViewDetails(project)}
            onEdit={() => handleEditProject(project)}
            onDelete={() => handleDeleteProject(project.id)}
          />
        ))}
      </div>

      {userProjects.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('projects.noProjectsFound')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {(isAdmin || permissions.canCreateProjects)
              ? t('projects.startCreatingProjects')
              : t('projects.noProjectsAvailable')
            }
          </p>
          <button 
            onClick={handleCreateProject}
            className={`bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 mx-auto ${(isAdmin || permissions.canCreateProjects) ? '' : 'bg-gray-300 cursor-not-allowed'}`}
            disabled={!(isAdmin || permissions.canCreateProjects)}
          >
            <Plus className="w-5 h-5" />
            <span>{t('projects.createProject')}</span>
            {!(isAdmin || permissions.canCreateProjects) && <AlertTriangle className="w-5 h-5 ml-2 text-yellow-500" aria-label="Permission requise" />}
          </button>
        </div>
      )}

      {/* Project Modal */}
      {isProjectModalOpen && (
        <ProjectModal 
          isOpen={isProjectModalOpen} 
          onClose={handleCloseModal} 
          project={editingProject}
          readOnly={isDetailMode}
        />
      )}

      {showDetails && detailsProject && (
        <ProjectDetails project={detailsProject} onClose={handleCloseDetails} />
      )}
    </div>
  );
}
