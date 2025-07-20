import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Paperclip, Eye } from 'lucide-react';
import { Project } from '@/types';
import type { Attachment } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import { Button } from '../common/Button';
import { AttachmentDropzone } from '../common/AttachmentDropzone';
import apiService from '@/services/api';

interface ProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (project: Project) => void;
  readOnly?: boolean;
}

export function ProjectModal({ project, isOpen, onClose, onSave, readOnly = false }: ProjectModalProps) {
  const { services, addProject, updateProject, deleteProject, users, addAttachment, deleteAttachment } = useData();
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
      serviceIds: project?.serviceIds ? project.serviceIds.filter(Boolean) : [(user?.service ?? '')],
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
        serviceIds: (project.serviceIds || []).filter(Boolean),
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
      const projectAttachments = allAttachments.filter(att => att.projetId && att.projetId === projectId);
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
          const projectAttachments = allAttachments.filter(att => att.projetId && att.projetId === projectId);
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
      attachments: [...prev.attachments, ...files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file), // For preview
      }))],
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
  const handleAttachmentUpload = (files: File[]) => {
    const newAttachments = files.map(file => ({
      id: `temp-${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    }));
    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments ?? []), ...newAttachments],
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

  if (!isOpen) return null;

  const { t } = useTranslation();

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
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,text/plain"
              maxSize={10 * 1024 * 1024}
              helpText={t('attachment.helpText')}
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
        </form>
      </div>
    </div>
  );
}