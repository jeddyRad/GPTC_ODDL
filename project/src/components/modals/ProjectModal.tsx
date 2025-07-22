import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Paperclip, Eye } from 'lucide-react';
import type { Project, Attachment } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import { Button } from '../common/Button';
import { AttachmentDropzone } from '../common/AttachmentDropzone';
import apiService from '@/services/api';
import { uploadAttachment } from '@/services/api';

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
            {projectTasks.map(t => (
              <li key={t.id} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                <span className={`px-2 py-1 rounded-full font-semibold ${
                  t.status === 'completed' ? 'bg-green-100 text-green-800' :
                  t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  t.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {t.status}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{t.title}</span>
                {t.assignedTo && t.assignedTo.length > 0 && users && (
                  <span className="ml-2 text-gray-500">{t.assignedTo.map(uid => users.find(u => u.id === uid)?.fullName || t('task.unknown')).join(', ')}</span>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md max-w-2xl w-full max-h-[90vh] overflow-y-auto relative p-0"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Enter' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            const form = e.currentTarget.querySelector('form');
            if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }}
        tabIndex={-1}
      >
        {/* Mode vue détails */}
        {!editMode && (
          <div className="p-6">
            <div className="flex items-center mb-4 gap-4">
              <h2 className="text-2xl font-bold text-primary-700 dark:text-primary-300 flex items-center">
                {project?.name}
                {project && Array.isArray(project.attachments) && project.attachments.length > 0 && (
                  <span title={t('project.attachments')} className="flex items-center text-gray-400 dark:text-gray-500 ml-2">
                    <Paperclip className="w-5 h-5" />
                    <span className="text-xs ml-1">{project.attachments.length}</span>
                  </span>
                )}
              </h2>
              {project?.color && (
                <span className="inline-block w-6 h-6 rounded-full border border-gray-300 ml-2" style={{ backgroundColor: project.color }} title={t('project.projectColor')} />
              )}
              {project?.status && (
                <span className={`px-2 py-1 rounded text-xs font-semibold ml-2 ${
                  project.status === 'active' ? 'bg-green-100 text-green-800' :
                  project.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                  project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                  project.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {t(`project.${project.status}`)}
                </span>
              )}
              {project?.riskLevel && (
                <span className={`px-2 py-1 rounded text-xs font-semibold ml-2 ${
                  project.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                  project.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  project.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {t(`project.${project.riskLevel}`)}
                </span>
              )}
            </div>
            {project?.description && (
              <p className="mb-4 text-gray-700 dark:text-gray-300 whitespace-pre-line">{project.description}</p>
            )}
            <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-600 dark:text-gray-400">
              {project?.startDate && (
                <span><strong>{t('project.startDate')}:</strong> {project.startDate}</span>
              )}
              {project?.endDate && (
                <span><strong>{t('project.endDate')}:</strong> {project.endDate}</span>
              )}
              {typeof project?.progress === 'number' && (
                <span><strong>{t('project.progress')}:</strong> {project.progress}%</span>
              )}
              {typeof project?.taskCount === 'number' && (
                <span><strong>{t('project.taskCount')}:</strong> {project.taskCount}</span>
              )}
              {typeof project?.completedTaskCount === 'number' && (
                <span><strong>{t('project.completedTaskCount')}:</strong> {project.completedTaskCount}</span>
              )}
            </div>
            <div className="mb-4">
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{t('project.manager')}:</span>
              {project?.chefDetails ? (
                <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs ml-1">{project.chefDetails.fullName} ({project.chefDetails.role})</span>
              ) : (
                <span className="text-xs text-gray-400 ml-1">{t('project.noManager')}</span>
              )}
            </div>
            <div className="mb-4">
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{t('project.team')}:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {project?.memberDetails && project.memberDetails.length > 0 ? (
                  project.memberDetails.map(m => (
                    <span key={m.id} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{m.fullName} ({m.role})</span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">{t('project.noMembers')}</span>
                )}
              </div>
            </div>
            {/* Services liés */}
            {project?.serviceIds && services && project.serviceIds.length > 0 && (
              <div className="mb-4">
                <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{t('project.services')}:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {project.serviceIds.map(sid => {
                    const service = services.find(s => s.id === sid);
                    if (!service) return null;
                    return (
                      <span key={sid} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs" title={service.description}>
                        {service.name}
                        {service.color && (
                          <span className="inline-block w-3 h-3 rounded-full ml-1 border border-gray-300" style={{ backgroundColor: service.color }} />
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {projectTasksBlock}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="primary" onClick={() => setEditMode(true)}>{t('common.edit')}</Button>
              <Button variant="ghost" onClick={onClose}>{t('common.close')}</Button>
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
              <Button variant="ghost" leftIcon={<X />} title={t('common.close')} aria-label={t('common.close')} onClick={onClose} />
              {project && !readOnly && (
                <Button variant="ghost" leftIcon={<Trash2 />} title={t('project.delete')} aria-label={t('project.delete')} onClick={handleDelete} />
              )}
              {!readOnly && (
                <Button variant="ghost" leftIcon={<Save />} title={project ? t('project.save') : t('project.create')} aria-label={project ? t('project.save') : t('project.create')} type="submit" />
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="primary" type="submit" disabled={isSubmitting}>{t('common.save')}</Button>
              <Button variant="ghost" type="button" onClick={() => setEditMode(false)}>{t('common.cancel')}</Button>
            </div>
          </form>
        </>
      )}
    </div>
  </div>
);
}