import React, { useState, useEffect, useRef } from 'react';
import { X, Paperclip, Save, Send, Trash2, Plus, Edit2, Eye, EyeOff } from 'lucide-react';
import { Task, Comment, Attachment } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { isValidUUID, ensureUUID } from '@/utils/uuid-helpers';
import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';
import { AttachmentDropzone } from '../common/AttachmentDropzone';
import apiService from '@/services/api';
import { uploadAttachment } from '@/services/api';

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
}

export function TaskModal({ task, onClose }: TaskModalProps) {
  const { addTask, updateTask, deleteTask, services, addComment, updateComment, deleteComment, projects, addAttachment, deleteAttachment } = useData();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
    deadline: '',
    serviceId: user?.service || '', // Correction : valeur par défaut vide si pas de service
    assignedTo: task?.assignedTo ?? [user?.id || ''],
    tags: '',
    estimatedTime: 0,
    projectId: '', // Ajouté pour éviter les erreurs de typage
    attachments: task?.attachments ?? [],
    timeTracked: 0, // Ajouté pour éviter l'erreur
    workloadPoints: 0, // Ajouté pour éviter l'erreur
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [isPersonalTask, setIsPersonalTask] = useState(false);
  // Ajout d'un état pour le type de tâche
  const [taskType, setTaskType] = useState<'personnel' | 'service' | 'projet'>('personnel');
  const [selectedService, setSelectedService] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task?.id) {
      apiService.getAttachments().then(all => {
        setAttachments(all.filter(a => a.id && task.attachments?.some(att => att.id === a.id)));
      });
    }
  }, [task?.id]);

  const handleUpload = async (files: File[]) => {
    if (!task?.id && !user?.id) return;
    
    const newAttachments = [...attachments];
    for (const file of files) {
      try {
        const relatedTo = taskType === 'personnel' ? 'user' : (taskType === 'projet' ? 'project' : 'task');
        const relatedId = task?.id || user?.id || '';
        
        if (relatedId) {
          const attachment = await uploadAttachment({ 
            file, 
            relatedTo, 
            relatedId 
          });
          newAttachments.push(attachment);
        }
      } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        setError('Erreur lors de l\'upload du fichier');
      }
    }
    setAttachments(newAttachments);
  };

  const handleDeleteAttachment = async (id: string) => {
    await apiService.deleteAttachment(id);
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const handleDownload = async (id: string) => {
    const blob = await apiService.downloadAttachment(id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachments.find(f => f.id === id)?.name || 'piece-jointe';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (task) {
      setTaskType(task.type || 'personnel');
      setFormData({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        deadline: new Date(task.deadline).toISOString().slice(0, 16),
        serviceId: task.serviceId,
        assignedTo: task.assignedTo ?? [],
        tags: task.tags.join(', '),
        estimatedTime: task.estimatedTime,
        projectId: task.projectId || '', // Assurez-vous que projectId est une chaîne
        attachments: task.attachments ?? [],
        timeTracked: task.timeTracked || 0,
        workloadPoints: task.workloadPoints || 0,
      });
      setAttachments(task.attachments ?? []);
      setIsPersonalTask(!task.serviceId && !task.projectId);
    } else {
      setTaskType('personnel');
      setIsPersonalTask(false);
    }
  }, [task]);

  // État pour gérer le chargement pendant la soumission
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation stricte des champs obligatoires
    if (!formData.title || !formData.title.trim()) {
      setError(t('task.titleRequired'));
      setLoading(false);
      return;
    }
    if (!formData.priority || !formData.priority.trim()) {
      setError(t('task.priorityRequired'));
      setLoading(false);
      return;
    }
    
    // Valider que tous les UUIDs sont dans un format valide
    if (user?.id && !isValidUUID(user.id)) {
      console.error("ID utilisateur invalide:", user.id);
      alert(t('common.userInvalidId'));
      setLoading(false);
      return;
    }
    
    // Valider le serviceId uniquement pour les tâches de type 'service'
    if (taskType === 'service' && !isValidUUID(formData.serviceId)) {
      console.error("ID service invalide:", formData.serviceId);
      setError(t('task.serviceRequired'));
      setLoading(false);
      return;
    }
    
    // Valider les IDs des personnes assignées
    const validAssignedIds = formData.assignedTo.filter(id => isValidUUID(id));
    if (validAssignedIds.length !== formData.assignedTo.length) {
      console.error("Certains IDs d'assignation sont invalides:", 
        formData.assignedTo.filter(id => !isValidUUID(id)));
      // On continue mais on nettoie les IDs invalides
    }
    
    // Adapter la logique selon le type de tâche
    let serviceId = '';
    let projectId = '';
    if (taskType === 'service') serviceId = formData.serviceId;
    if (taskType === 'projet') projectId = formData.projectId || '';
    
    // Construction du payload strictement conforme à Omit<Task, 'id'>
    const taskData: any = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      deadline: new Date(formData.deadline),
      type: taskType,
      assignedTo: validAssignedIds,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      estimatedTime: formData.estimatedTime,
      attachments: attachments,
      comments: [],
      timeTracked: formData.timeTracked || 0,
      workloadPoints: formData.workloadPoints || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (taskType === 'service' && isValidUUID(formData.serviceId)) {
      taskData.serviceId = formData.serviceId;
    }
    if (taskType === 'projet' && isValidUUID(formData.projectId)) {
      taskData.projectId = formData.projectId;
    }
    // Pour 'personnel', ne rien ajouter et ne pas envoyer serviceId

    setIsSubmitting(true);

    try {
      if (task) {
        if (!isValidUUID(task.id)) {
          console.error("ID de tâche invalide pour la mise à jour:", task.id);
          alert(t('task.taskInvalidId'));
          return;
        }
        await updateTask(task.id, taskData);
        console.log("Tâche mise à jour avec succès");
      } else {
        const newTask = await addTask(taskData);
        console.log("Tâche ajoutée avec succès:", newTask);
      }
      
      // Fermer le modal après une opération réussie
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'opération sur la tâche:", error);
      alert(t('common.errorOccurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ajout pour validation des mentions
  const { users } = useData();
  const validUsernames = users.map(u => u.username);
  const mentionRegex = /@(\w+)/g;
  const mentions = Array.from(newComment.matchAll(mentionRegex)).map(m => m[1]);
  const invalidMentions = mentions.filter(m => !validUsernames.includes(m));

  const handleAddComment = () => {
    if (invalidMentions.length > 0) {
      setError(t('task.userNotFound', { users: invalidMentions.join(', ') }));
      return;
    }
    if (newComment.trim() && task && user && user.id && task.id) {
      addComment(task.id, {
        content: newComment,
        tache: String(task.id),
        auteur: String(user.id),
        mentions,
        est_modifie: false
      } as any);
      setNewComment('');
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const handleSaveEditComment = async () => {
    if (task && editingCommentId && editingCommentContent.trim()) {
      try {
        await updateComment(task.id, editingCommentId, {
          content: editingCommentContent,
          isEdited: true,
          editedAt: new Date(),
        });
        setEditingCommentId(null);
        setEditingCommentContent('');
      } catch (error) {
        console.error('Erreur lors de la modification du commentaire:', error);
        alert(t('task.commentEditError'));
      }
    }
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const handleDeleteComment = async (commentId: string) => {
    if (task && window.confirm(t('task.confirmDeleteComment'))) {
      try {
        await deleteComment(task.id, commentId);
      } catch (error) {
        console.error('Erreur lors de la suppression du commentaire:', error);
        alert(t('task.commentDeleteError'));
      }
    }
  };

  const handleDeleteTask = () => {
    if (task && window.confirm(t('task.confirmDeleteTask'))) {
      deleteTask(task.id);
      onClose();
    }
  };

  const canEdit = !task || task.createdBy === user?.id || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newAttachments = [...formData.attachments];
    files.forEach(file => {
      const fileId = `temp-${Date.now()}`; // Générer un ID temporaire
      const fileUrl = URL.createObjectURL(file); // Créer une URL temporaire pour l'aperçu
      // Lors de la création d'un nouvel Attachment, inclure relatedTo et relatedId :
      const newAttachment: Attachment = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl,
        relatedTo: 'task',
        relatedId: task?.id || '',
      };
      newAttachments.push(newAttachment);
    });
    setFormData(prev => ({ ...prev, attachments: newAttachments }));
    event.target.value = ''; // Réinitialiser la valeur pour permettre la sélection multiple
  };

  const handlePreviewAttachment = (file: { url: string }) => {
    window.open(file.url, '_blank');
  };

  const handleRemoveAttachment = (index: number) => {
    const newAttachments = [...formData.attachments];
    newAttachments.splice(index, 1);
    setFormData(prev => ({ ...prev, attachments: newAttachments }));
  };

  // Quand on change le type de tâche, réinitialiser le serviceId si besoin
  const handleTaskTypeChange = (type: 'personnel' | 'projet' | 'service') => {
    setTaskType(type);
    setFormData(prev => ({
      ...prev,
      serviceId: type === 'service' ? (user?.service || '') : '',
      projectId: type === 'projet' ? prev.projectId : '',
    }));
  };

  // Autocomplétion @mention pour le champ commentaire
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const filteredUsers = users.filter(u => u.username.toLowerCase().startsWith(mentionQuery.toLowerCase()) && mentionQuery.length > 0);

  const handleCommentInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewComment(val);
    const match = val.slice(0, e.target.selectionStart ?? 0).match(/@(\w*)$/);
    if (match) {
      setShowMentionList(true);
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setShowMentionList(false);
      setMentionQuery('');
    }
  };

  const handleMentionSelect = (username: string) => {
    if (!commentInputRef.current) return;
    const input = commentInputRef.current;
    const cursor = input.selectionStart ?? newComment.length;
    const before = newComment.slice(0, cursor).replace(/@(\w*)$/, `@${username} `);
    const after = newComment.slice(cursor);
    setNewComment(before + after);
    setShowMentionList(false);
    setMentionQuery('');
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(before.length, before.length);
    }, 0);
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionList && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        setMentionIndex(i => (i + 1) % filteredUsers.length);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setMentionIndex(i => (i - 1 + filteredUsers.length) % filteredUsers.length);
        e.preventDefault();
      } else if (e.key === 'Enter') {
        handleMentionSelect(filteredUsers[mentionIndex].username);
        e.preventDefault();
      } else if (e.key === 'Escape') {
        setShowMentionList(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative animate-in slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Enter' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            const form = e.currentTarget.querySelector('form');
            if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }}
        tabIndex={-1}
      >
        {/* 1. En haut à gauche de la modale, placer : */}
        {/* - <Button variant="ghost" leftIcon={<X />} title={t('common.close')} aria-label={t('common.close')} onClick={onClose} /> */}
        {/* - <Button variant="ghost" leftIcon={<Trash2 />} title={t('task.delete')} aria-label={t('task.delete')} onClick={handleDeleteTask} /> */}
        {/* - (optionnel) <Button variant="ghost" leftIcon={<Save />} title={t('task.save')} aria-label={t('task.save')} type="submit" /> */}
        {/* <div className="flex items-center justify-end gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
          <Button variant="ghost" leftIcon={<X />} title={t('common.close')} aria-label={t('common.close')} onClick={onClose} />
            {task && canEdit && (
            <Button variant="ghost" leftIcon={<Trash2 />} title={t('common.delete')} aria-label={t('common.delete')} onClick={handleDeleteTask} />
            )}
          <Button variant="ghost" leftIcon={<Save />} title={task ? t('common.save') : t('common.create')} aria-label={task ? t('common.save') : t('common.create')} type="submit" form="task-modal-form" />
        </div> */}
        {/* Enhanced task type selector */}
        {!task && (
          <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('task.typechoisie')}</label>
              </div>
            <select
                className="rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
              value={taskType}
              onChange={e => handleTaskTypeChange(e.target.value as 'personnel' | 'projet' | 'service')}
            >
              <option value="personnel">{t('task.personal')}</option>
              <option value="projet">{t('task.project')}</option>
              <option value="service">{t('task.service')}</option>
            </select>
            </div>
          </div>
        )}
        
        {/* Enhanced form with better visual organization */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="px-6 py-6 space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                Informations générales
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titre de la tâche *
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                  placeholder="Entrez le titre de la tâche"
                  required
                  disabled={!canEdit}
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500 resize-none"
                  placeholder="Décrivez la tâche en détail"
                  disabled={!canEdit}
                />
                </div>
              </div>
            </div>

            {/* Status and Priority Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                Statut et priorité
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Statut
                  </label>
                  <select
                    value={formData.status || 'todo'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Task['status'] }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                    disabled={!canEdit}
                  >
                    <option value="todo">{t('task.todo')}</option>
                    <option value="in_progress">{t('task.inProgress')}</option>
                    <option value="review">{t('task.review')}</option>
                    <option value="completed">{t('task.completed')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priorité
                  </label>
                  <select
                    value={formData.priority || 'medium'}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                    disabled={!canEdit}
                  >
                    <option value="low">{t('task.low')}</option>
                    <option value="medium">{t('task.medium')}</option>
                    <option value="high">{t('task.high')}</option>
                    <option value="urgent">{t('task.urgent')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Timing and Assignment Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                Échéance et assignation
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Échéance *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.deadline || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                    required
                    disabled={!canEdit}
                  />
                </div>
                
                {taskType === 'service' && (
                  <div>
                    <label htmlFor="service" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Service*
                    </label>
                    <select
                      name="service"
                      id="service"
                      value={formData.serviceId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, serviceId: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                      required
                      disabled={!canEdit}
                    >
                      <option value="">{t('task.selectService')}</option>
                      {services.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    {error && error.includes('service') && (
                      <p className="text-red-500 text-xs mt-1">{error}</p>
                    )}
                  </div>
                )}
                
                {taskType === 'projet' && (
                  <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('task.projectLabel')}
                </label>
                <select
                  id="project"
                  value={formData.projectId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                  required
                  disabled={!canEdit}
                >
                  <option value="">{t('task.selectProject')}</option>
                  {projects && projects.length > 0 && projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                    </div>
                )}
              </div>
            </div>

            {/* Additional Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
                Détails supplémentaires
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                    placeholder={t('task.tagsPlaceholder')}
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Temps estimé (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estimatedTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-500"
                    placeholder={t('task.estimatedTimePlaceholder')}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced action buttons */}
          {canEdit && (
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-end gap-3">
                  <Button
                    onClick={onClose}
                    variant="secondary"
                    size="md"
                    title={t('common.cancel')}
                    aria-label={t('common.cancel')}
                    type="button"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    variant="primary"
                    size="md"
                    title={task ? t('common.save') : t('common.create')}
                    aria-label={task ? t('common.save') : t('common.create')}
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    <span>{task ? t('common.save') : t('common.create')}</span>
                  </Button>
              </div>
            </div>
          )}
            </form>

            {/* Enhanced tabs for existing tasks */}
            {task && (
              <div className="border-t-2 border-gray-100 dark:border-gray-700">
                <div className="flex space-x-1 px-6 pt-6 bg-gray-50 dark:bg-gray-800/50">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                      activeTab === 'details'
                        ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 shadow-sm'
                    }`}
                  >
                    {t('task.details')}
                  </button>
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 relative ${
                      activeTab === 'comments'
                        ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 shadow-sm'
                    }`}
                  >
                    {t('task.comments')} ({task.comments?.length || 0})
                    {(task.comments?.length || 0) > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {task.comments?.length || 0}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('attachments')}
                    className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 relative ${
                      activeTab === 'attachments'
                        ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 shadow-sm'
                    }`}
                  >
                    {t('task.attachments')} ({attachments.length})
                    {attachments.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {attachments.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Contenu des onglets */}
            {activeTab === 'details' && task && (
              <div className="p-6">
                {/* Afficher les détails de la tâche en lecture seule */}
                {/* Badge type de tâche et icône pièce jointe à côté du titre */}
                <div className="flex items-center mb-4">
          <span className={`px-2 py-1 rounded text-xs font-semibold mr-2
            ${task?.type === 'projet' ? 'bg-blue-100 text-blue-800' : task?.type === 'service' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
          >
            {task?.type === 'projet' ? t('task.type.project') : task?.type === 'service' ? t('task.type.service') : t('task.type.personal')}
          </span>
          <h2 className="text-2xl font-bold text-primary-700 dark:text-primary-300 flex items-center">
            {task?.title}
            {/* Icône pièce jointe si la tâche a des pièces jointes */}
            {((task?.attachments ?? []).length) > 0 && (
              <span title={t('task.attachments')} className="flex items-center text-gray-400 dark:text-gray-500 ml-2">
                <Paperclip className="w-5 h-5" />
                <span className="text-xs ml-1">{(task.attachments ?? []).length}</span>
              </span>
            )}
          </h2>
        </div>
        {/* Liste détaillée des pièces jointes */}
        {((task?.attachments ?? []).length) > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-2 flex items-center">
              <Paperclip className="w-4 h-4 mr-1" /> {t('task.attachmentsList')}
            </h3>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {(task.attachments ?? []).map((att: any) => (
                <li key={att.id || att.name} className="py-2 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{att.name}</span>
                    <span className="text-xs text-gray-500">{att.size ? (att.size / 1024).toFixed(1) + ' Ko' : ''}</span>
                    {att.uploader && <span className="text-xs text-gray-400">{t('task.uploadedBy')}: {att.uploader.fullName || att.uploader.username}</span>}
                    {att.uploadedAt && <span className="text-xs text-gray-400">{t('task.uploadedAt')}: {new Date(att.uploadedAt).toLocaleString()}</span>}
                  </div>
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs ml-2">
                    {t('task.download')}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('task.title')}
                    </label>
                    <p className="text-gray-900 dark:text-white">{task.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('task.description')}
                    </label>
                    <p className="text-gray-900 dark:text-white">{task.description || t('task.noDescription')}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('task.status')}
                      </label>
                      <p className="text-gray-900 dark:text-white capitalize">{task.status}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('task.priority')}
                      </label>
                      <p className="text-gray-900 dark:text-white capitalize">{task.priority}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {activeTab === 'comments' && task && (
            <div className="p-6 space-y-4">
              <div className="space-y-4">
                {task.comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {/* Afficher le nom complet de l'auteur si disponible */}
                        {comment.authorFullName || users.find(u => u.id === comment.authorId)?.fullName || users.find(u => u.id === comment.authorId)?.username || `Utilisateur ${comment.authorId}`}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(comment.createdAt).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingCommentContent}
                          onChange={(e) => setEditingCommentContent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                          rows={3}
                        />
                        <div className="flex space-x-2">
                          <Button
                            onClick={handleSaveEditComment}
                            variant="primary"
                            leftIcon={<Save />}
                            title={t('task.save')}
                            aria-label={t('task.save')}
                          >
                            {t('task.save')}
                          </Button>
                          <Button
                            onClick={handleCancelEditComment}
                            variant="secondary"
                            leftIcon={<X />}
                            title={t('common.cancel')}
                            aria-label={t('common.cancel')}
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                        <div className="flex space-x-2 mt-2">
                          {comment.isEdited && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              (modifié)
                            </span>
                          )}
                          {canEdit && comment.authorId === user?.id && (
                            <>
                              <Button
                                onClick={() => handleEditComment(comment)}
                                variant="secondary"
                                leftIcon={<Edit2 />}
                                title={t('task.edit')}
                                aria-label={t('task.edit')}
                              >
                                {t('task.edit')}
                              </Button>
                              <Button
                                onClick={() => handleDeleteComment(comment.id)}
                                variant="secondary"
                                leftIcon={<Trash2 />}
                                title={t('task.delete')}
                                aria-label={t('task.delete')}
                              >
                                {t('task.delete')}
                              </Button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      ref={commentInputRef}
                      type="text"
                      value={newComment}
                      onChange={handleCommentInput}
                      onKeyDown={handleCommentKeyDown}
                      placeholder={t('task.addCommentPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {showMentionList && filteredUsers.length > 0 && (
                      <ul className="absolute z-50 left-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-48 overflow-auto">
                        {filteredUsers.map((u, i) => (
                          <li
                            key={u.id}
                            className={`px-3 py-2 cursor-pointer ${i === mentionIndex ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200' : ''}`}
                            onMouseDown={e => { e.preventDefault(); handleMentionSelect(u.username); }}
                          >
                            @{u.username} <span className="text-xs text-gray-400">{u.fullName || u.username}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {error && (
                    <div className="text-red-500 text-xs mt-1">{error}</div>
                  )}
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || invalidMentions.length > 0}
                    variant="primary"
                    leftIcon={<Send />}
                    title={t('task.addComment')}
                    aria-label={t('task.addComment')}
                  >
                    {t('task.addComment')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="p-6">
              <AttachmentDropzone
                files={attachments}
                onUpload={handleUpload}
                onDelete={handleDeleteAttachment}
                onDownload={handleDownload}
                relatedTo={taskType === 'personnel' ? 'user' : (taskType === 'projet' ? 'project' : 'task')}
                relatedId={task?.id || user?.id || ''}
                disabled={!task?.id && !user?.id}
                helpText={!task?.id && !user?.id ? 'Créez d\'abord la tâche pour ajouter des pièces jointes' : 'Glissez-déposez vos fichiers ici'}
              />
            </div>
          )}
      </div>
    </div>
  );
}
