import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Paperclip, Eye, Edit } from 'lucide-react';
import type { Project, Attachment } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import { Button } from '../common/Button';
import { AttachmentDropzone } from '../common/AttachmentDropzone';
import apiService from '@/services/api';
import { uploadAttachment } from '@/services/api';
import { Modal } from '../common/Modal';

interface ProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (project: Project) => void;
  readOnly?: boolean;
}

export function ProjectModal({ project, isOpen, onClose, onSave, readOnly = false }: ProjectModalProps) {
  const { services, addProject, updateProject, deleteProject, users, addAttachment, deleteAttachment, tasks } = useData();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Correction du state formData pour utiliser memberIds et serviceIds correctement
  // Typage explicite de formData.attachments comme (Attachment | File)[]
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    status: Project['status'];
    riskLevel: Project['riskLevel'];
    startDate: string;
    endDate: string;
    serviceIds: string[];
    memberIds: string[];
    color: string;
    projectId: string;
    attachments: (Attachment | File)[];
  }>(
    {
      name: project?.name || '',
      description: project?.description || '',
      status: (project?.status as Project['status']) || 'planning',
      riskLevel: (project?.riskLevel as Project['riskLevel']) || 'medium',
      startDate: project?.startDate || '',
      endDate: project?.endDate || '',
      serviceIds: (Array.isArray(project?.serviceIds) && project?.serviceIds.length > 0)
        ? project?.serviceIds.filter(Boolean)
        : (project?.serviceId && typeof project?.serviceId === 'string' && project?.serviceId !== 'null')
          ? [project?.serviceId]
          : [],
      memberIds: project?.memberIds ? project.memberIds.filter(Boolean) : [(user?.id ?? '')],
      color: project?.color || '#3B82F6',
      projectId: project?.id || '',
      attachments: project?.attachments || [],
    }
  );

  // Supprimer selectedMembers et teamMembers, utiliser formData.memberIds partout
  // Ajout des états pour chef et membres
  const [selectedChef, setSelectedChef] = useState<string>(project?.chefId || '');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(project?.memberIds || []);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        status: (project.status as Project['status']) || 'planning',
        riskLevel: (project.riskLevel as Project['riskLevel']) || 'medium',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        // Correction : toujours un tableau d'id de service
        serviceIds: (Array.isArray(project?.serviceIds) && project?.serviceIds.length > 0)
          ? project?.serviceIds.filter(Boolean)
          : (project?.serviceId && typeof project?.serviceId === 'string' && project?.serviceId !== 'null')
            ? [project?.serviceId]
            : [],
        memberIds: project.memberDetails ? project.memberDetails.map(m => m.id).filter(Boolean) : [],
        color: project.color || '#3B82F6',
        projectId: project.id,
        attachments: project.attachments || [],
      });
      setSelectedChef(project.chefDetails?.id || '');
      // Charger les pièces jointes si elles ne sont pas déjà incluses
      if (!project.attachments || project.attachments.length === 0) {
        loadProjectAttachments(project.id);
      }
    } else {
      // Reset form for new project
      setFormData({
        name: '',
        description: '',
        status: 'planning',
        riskLevel: 'medium',
        startDate: '',
        endDate: '',
        serviceIds: [(user?.service ?? '')],
        memberIds: [(user?.id ?? '')],
        color: '#3B82F6',
        projectId: '',
        attachments: [],
      });
    }
  }, [project]);

  // Fonction pour charger les pièces jointes d'un projet
  const loadProjectAttachments = async (projectId: string) => {
    try {
      const allAttachments = await apiService.getAttachments();
      const projectAttachments = allAttachments.filter(att => att.relatedTo === 'project' && att.relatedId === projectId);
      setFormData(prev => ({
        ...prev,
        attachments: projectAttachments
      }));
    } catch (error) {
      console.error('Erreur lors du chargement des pièces jointes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const projectData: Partial<Project> = {
        name: formData.name,
        description: formData.description,
        status: formData.status || 'planning',
        riskLevel: formData.riskLevel || 'medium',
        startDate: formData.startDate,
        endDate: formData.endDate,
        color: formData.color,
        chefId: selectedChef || undefined,
        memberIds: formData.memberIds ?? [],
        serviceIds: formData.serviceIds ?? [],
        // On n'envoie pas les fichiers ici, ils seront uploadés après
      };
      let projectId = project?.id;
      let createdOrUpdatedProject: Project | undefined = undefined;
      if (project) {
        await updateProject(project.id, projectData);
        projectId = project.id;
        createdOrUpdatedProject = project;
      } else {
        const newProject = {
          ...projectData,
          id: '',
          createdAt: new Date(),
          createdBy: user?.id || '',
          tasks: [],
          progress: 0,
        } as Project;
        const created = await addProject(newProject);
        projectId = created.id;
        createdOrUpdatedProject = created;
      }
      // Upload effectif des fichiers qui n'ont pas d'id
      if (projectId) {
        for (const att of formData.attachments) {
          // Upload uniquement si c'est un File natif (pas d'id)
          if (typeof att === 'object' && att instanceof File) {
            const form = new FormData();
            form.append('file', att);
            form.append('projet', projectId);
            await apiService.uploadAttachment(form);
          }
          // Si c'est un objet Attachment, on ne fait rien (déjà uploadé)
        }
        // Rafraîchir la liste des pièces jointes après upload
        try {
          const allAttachments = await apiService.getAttachments();
          const projectAttachments = allAttachments.filter(att => att.relatedTo === 'project' && att.relatedId === projectId);
          setFormData(prev => ({
            ...prev,
            attachments: projectAttachments
          }));
        } catch (error) {
          console.error('Erreur lors du rafraîchissement des pièces jointes:', error);
        }
      }
      // (Optionnel) Rafraîchir la liste des pièces jointes du projet ici si besoin
      if (onSave && createdOrUpdatedProject) onSave(createdOrUpdatedProject);
      onClose();
    } catch (error: any) {
      if (error?.response?.data?.detail || error?.message) {
        setError(error.response?.data?.detail || error.message);
      } else {
        setError('Erreur lors de la sauvegarde du projet.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.')) {
      setIsSubmitting(true);
      setError('');
      try {
        await deleteProject(project.id);
        onClose();
      } catch (error: any) {
        if (error?.response?.data?.detail || error?.message) {
          setError(error.response?.data?.detail || error.message);
        } else {
          setError('Impossible de supprimer ce projet. Vérifiez qu’il ne contient pas de tâches ou de dépendances.');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData(prev => ({
      ...prev,
      attachments: [
        ...prev.attachments,
        ...files.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          relatedTo: 'project' as const,
          relatedId: project?.id || '',
        }))
      ],
    }));
    event.target.value = ''; // Clear the input for re-selection
  };

  const handlePreviewAttachment = (file: { name: string; size: number; type: string; url: string }) => {
    window.open(file.url, '_blank');
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, index) => index !== indexToRemove),
    }));
  };

  // Ajout des handlers conformes à AttachmentDropzone
  const handleAttachmentUpload = async (files: File[]) => {
    if (!project?.id) return;
    
    const newAttachments = [...formData.attachments];
    for (const file of files) {
      try {
        const attachment = await uploadAttachment({ 
          file, 
          relatedTo: 'project' as const, 
          relatedId: project.id 
        });
        newAttachments.push(attachment as Attachment);
      } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        setError('Erreur lors de l\'upload du fichier');
      }
    }
    setFormData(prev => ({
      ...prev,
      attachments: newAttachments,
    }));
  };

  const handleAttachmentDelete = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => {
        if (typeof att === 'object' && !(att instanceof File) && 'id' in att) {
          return att.id !== id;
        }
        return true;
      }),
    }));
  };

  const handleAttachmentDownload = (id: string) => {
    const att = (formData.attachments.filter(att => typeof att === 'object' && !(att instanceof File) && 'id' in att) as Attachment[]).find(a => a.id === id);
    if (att && att.url) {
      window.open(att.url, '_blank');
    }
  };

  const { t } = useTranslation();
  // UI/UX : mode vue ou édition
  const [editMode, setEditMode] = useState(false);

  // Bloc tâches du projet (affichage enrichi)
  let projectTasksBlock = null;
  if (project && Array.isArray(tasks) && tasks.length > 0) {
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    if (projectTasks.length > 0) {
      projectTasksBlock = (
        <div className="mb-4">
          <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{t('project.tasks')}:</span>
          <ul className="mt-1 space-y-1">
            {projectTasks.map(task => (
              <li key={task.id} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                <span className={`px-2 py-1 rounded-full font-semibold ${
                  task.status === 'completed' ? 'bg-green-100 text-green-800' :
                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  task.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {task.status}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{task.title}</span>
                {task.assignedTo && task.assignedTo.length > 0 && users && (
                  <span className="ml-2 text-gray-500">{task.assignedTo.map(uid => users.find(u => u.id === uid)?.fullName || t('task.unassigned')).join(', ')}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }
  }
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={project ? t('project.edit') : t('project.new')} size="2xl">
      {/* Mode vue détails */}
      {!editMode && (
        <div className="p-8">
          <div className="flex items-center mb-6 gap-4">
            <h2 className="text-3xl font-bold text-blue-700 dark:text-blue-300 flex items-center">
              {project?.name}
              {project && Array.isArray(project.attachments) && project.attachments.length > 0 && (
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg ml-3" title={t('project.attachments')}>
                  <div className="flex items-center text-blue-600 dark:text-blue-400">
                    <Paperclip className="w-5 h-5" />
                    <span className="text-sm font-semibold ml-1">{project.attachments.length}</span>
                  </div>
                </div>
              )}
            </h2>
            
            {/* Enhanced status badges */}
            <div className="flex items-center gap-3">
              {project?.color && (
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600">
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: project.color }} />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Couleur</span>
                </div>
              )}
              
              {project?.status && (
                <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
                  project.status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-300' :
                  project.status === 'planning' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-300' :
                  project.status === 'on_hold' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-300' :
                  project.status === 'completed' ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-700 dark:to-gray-600 dark:text-gray-300' :
                  'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 dark:from-gray-700 dark:to-gray-600 dark:text-gray-400'
                }`}>
                  {t(`project.${project.status}`)}
                </span>
              )}
              
              {project?.riskLevel && (
                <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
                  project.riskLevel === 'high' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/30 dark:to-red-800/30 dark:text-red-300' :
                  project.riskLevel === 'medium' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-300' :
                  project.riskLevel === 'low' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-300' :
                  'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-700 dark:to-gray-600 dark:text-gray-300'
                }`}>
                  Risque {t(`project.${project.riskLevel}`)}
                </span>
              )}
            </div>
          </div>
          
          {project?.description && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{project.description}</p>
            </div>
          )}
          
          {/* Enhanced project metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {project?.startDate && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">{t('project.startDate')}</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">{project.startDate}</div>
              </div>
            )}
            {project?.endDate && (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">{t('project.endDate')}</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">{project.endDate}</div>
              </div>
            )}
            {typeof project?.progress === 'number' && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">{t('project.progress')}</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">{project.progress}%</div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${project.progress}%` }}></div>
                </div>
              </div>
            )}
            {typeof project?.taskCount === 'number' && (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">{t('project.taskCount')}</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {project.taskCount}
                  {typeof project?.completedTaskCount === 'number' && (
                    <span className="text-xs text-gray-500 ml-1">({project.completedTaskCount} terminées)</span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Enhanced team section */}
          <div className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
              <h4 className="font-bold text-sm text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                {t('project.manager')}
              </h4>
            {project?.chefDetails ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-200 dark:bg-yellow-800 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-yellow-800 dark:text-yellow-200">
                      {project.chefDetails.fullName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{project.chefDetails.fullName}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{project.chefDetails.role}</div>
                  </div>
                </div>
            ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">{t('project.noManager')}</div>
            )}
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
              <h4 className="font-bold text-sm text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {t('project.team')} ({project?.memberDetails?.length || 0})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {project?.memberDetails && project.memberDetails.length > 0 ? (
                  project.memberDetails.map(m => (
                    <div key={m.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <div className="w-8 h-8 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-green-800 dark:text-green-200">
                          {m.fullName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{m.fullName}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{m.role}</div>
                      </div>
                    </div>
                ))
              ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 italic col-span-2">{t('project.noMembers')}</div>
              )}
              </div>
            </div>
          </div>
          
          {/* Services liés */}
          {project?.serviceIds && services && project.serviceIds.length > 0 && (
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <h4 className="font-bold text-sm text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                {t('project.services')} ({project.serviceIds.length})
              </h4>
              <div className="flex flex-wrap gap-3">
                {project.serviceIds.map(sid => {
                  const service = services.find(s => s.id === sid);
                  if (!service) return null;
                  return (
                    <div key={sid} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg" title={service.description}>
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {service.name}
                      </span>
                      {service.color && (
                        <span className="inline-block w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: service.color }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {projectTasksBlock}
          
          {/* Enhanced action buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="primary" size="lg" onClick={() => setEditMode(true)}>
              <Edit className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </Button>
            <Button variant="secondary" size="lg" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              {t('common.close')}
            </Button>     
          </div>
        </div>
      )}
      {/* Mode édition (formulaire) */}
      {editMode && (
        <>
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {project ? t('project.edit') : t('project.new')}
            </h2>
            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-2 text-primary-600 dark:text-primary-400">{t('project.generalInfo')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="project-name">
                  {t('project.name')}
                </label>
                <input
                  id="project-name"
                  name="name"
                  type="text"
                    value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                    disabled={readOnly || isSubmitting}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="project-description">
                  {t('project.description')}
                </label>
                <textarea
                  id="project-description"
                  name="description"
                    value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                    disabled={readOnly || isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="project-status">
                  {t('project.status')}
                </label>
                <select
                  id="project-status"
                  name="status"
                  value={formData.status ?? 'planning'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={readOnly || isSubmitting}
                >
                  <option value="planning">{t('project.planning')}</option>
                  <option value="active">{t('project.active')}</option>
                  <option value="on_hold">{t('project.onHold')}</option>
                  <option value="completed">{t('project.completed')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="project-risk-level">
                  {t('project.riskLevel')}
                </label>
                <select
                  id="project-risk-level"
                  name="riskLevel"
                  value={formData.riskLevel ?? 'medium'}
                  onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as Project['riskLevel'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={readOnly || isSubmitting}
                >
                  <option value="low">{t('project.lowRisk')}</option>
                  <option value="medium">{t('project.mediumRisk')}</option>
                  <option value="high">{t('project.highRisk')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="project-start-date">
                  {t('project.startDate')}
                </label>
                <input
                  id="project-start-date"
                  name="startDate"
                  type="date"
                    value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                    disabled={readOnly || isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="project-end-date">
                  {t('project.endDate')}
                </label>
                <input
                  id="project-end-date"
                  name="endDate"
                  type="date"
                    value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                    disabled={readOnly || isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="project-color">
                  {t('project.projectColor')}
                </label>
                <input
                  id="project-color"
                  name="color"
                  type="color"
                    value={formData.color || '#3B82F6'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700"
                    disabled={readOnly || isSubmitting}
                />
              </div>
              </div>
            </div>
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-2 text-primary-600 dark:text-primary-400">{t('project.services')}</h3>
              <Select
                isMulti
                options={services.map(s => ({ value: s.id, label: s.name }))}
                value={services.filter(s => (formData.serviceIds || []).includes(s.id)).map(s => ({ value: s.id, label: s.name }))}
                onChange={(selected: any) => setFormData(prev => ({ ...prev, serviceIds: selected ? selected.map((opt: any) => opt.value) : [] }))}
                classNamePrefix="react-select"
                placeholder={t('project.selectServices')}
                isDisabled={readOnly || isSubmitting}
              />
              {formData.serviceIds.length === 0 && formData.memberIds.length === 0 && (
                <p className="text-xs text-red-500 mt-1">{t('project.selectServiceOrMember')}</p>
              )}
            </div>
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-2 text-primary-600 dark:text-primary-400">{t('project.members')}</h3>
              <Select
                isMulti
                options={users.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName} (${u.role})` }))}
                value={users.filter(u => (formData.memberIds || []).includes(u.id)).map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName} (${u.role})` }))}
                onChange={(selected: any) => setFormData(prev => ({ ...prev, memberIds: selected ? selected.map((opt: any) => opt.value) : [] }))}
                classNamePrefix="react-select"
                placeholder={t('project.selectMembers')}
                isDisabled={readOnly || isSubmitting}
              />
              {formData.serviceIds.length === 0 && formData.memberIds.length === 0 && (
                <p className="text-xs text-red-500 mt-1">{t('project.selectServiceOrMember')}</p>
              )}
            </div>
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-2 text-primary-600 dark:text-primary-400">{t('project.manager')}</h3>
              <Select
                options={users.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName} (${u.role})` }))}
                value={users.find(u => u.id === selectedChef) ? { value: selectedChef, label: `${users.find(u => u.id === selectedChef)?.firstName} ${users.find(u => u.id === selectedChef)?.lastName} (${users.find(u => u.id === selectedChef)?.role})` } : null}
                onChange={(selected: any) => setSelectedChef(selected ? selected.value : '')}
                classNamePrefix="react-select"
                placeholder={t('project.selectManager')}
                isClearable
                isDisabled={readOnly || isSubmitting}
              />
              </div>

            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-2 text-primary-600 dark:text-primary-400">{t('project.attachments')}</h3>
              <AttachmentDropzone
                files={formData.attachments.filter(att => typeof att === 'object' && !(att instanceof File)) as Attachment[]}
                onUpload={handleAttachmentUpload}
                onDelete={handleAttachmentDelete}
                onDownload={handleAttachmentDownload}
                relatedTo="project"
                relatedId={project?.id || ''}
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,text/plain"
                maxSize={10 * 1024 * 1024}
                disabled={!project?.id}
                helpText={!project?.id ? 'Créez d\'abord le projet pour ajouter des pièces jointes' : t('attachment.helpText')}
                uploadingText={t('attachment.uploading')}
                errorText={t('attachment.error')}
                downloadText={t('attachment.download')}
                deleteText={t('attachment.delete')}
                previewText={t('attachment.preview')}
                aria-label={t('attachment.sectionAriaLabel')}
              />
            </div>

            <div className="mb-2 flex flex-wrap gap-2">
              {formData.serviceIds.map(id => {
                const s = services.find(s => s.id === id);
                return s ? <span key={id} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{s.name}</span> : null;
              })}
              {formData.memberIds.map(id => {
                const u = users.find(u => u.id === id);
                return u ? <span key={id} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{u.firstName} {u.lastName}</span> : null;
              })}
              {selectedChef && (
                (() => {
                  const chef = users.find(u => u.id === selectedChef);
                  return chef ? <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Chef: {chef.firstName} {chef.lastName}</span> : null;
                })()
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
              <Button variant="ghost" leftIcon={<X />} title={t('common.close')} aria-label={t('common.close')} onClick={onClose}>{t('common.close')}</Button>
              {project && !readOnly && (
                <Button variant="ghost" leftIcon={<Trash2 />} title={t('project.delete')} aria-label={t('project.delete')} onClick={handleDelete}>{t('project.delete')}</Button>
              )}
              {!readOnly && (
                <Button variant="ghost" leftIcon={<Save />} title={project ? t('project.save') : t('project.create')} aria-label={project ? t('project.save') : t('project.create')} type="submit">{project ? t('project.save') : t('project.create')}</Button>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="primary" type="submit" disabled={isSubmitting}>{t('common.save')}</Button>
              <Button variant="ghost" type="button" onClick={() => setEditMode(false)}>{t('common.cancel')}</Button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}