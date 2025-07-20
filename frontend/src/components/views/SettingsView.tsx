import React, { useState, useRef } from 'react';
import { Settings, User, Bell, Shield, Palette, Globe, Save, AlertTriangle, CheckSquare, Upload, Eye, EyeOff, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useData } from '@/contexts/DataContext';
import { useNotification } from '@/contexts/NotificationContext';
import apiService from '@/services/api';
import { useTranslation } from 'react-i18next';
import { AttachmentDropzone } from '../common/AttachmentDropzone';

// Fonctions utilitaires pour les rôles et leurs couleurs
const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'ADMIN': return 'Administrateur';
    case 'MANAGER': return 'Chef de service';
    case 'EMPLOYEE': return 'Employé';
    default: return role;
  }
};

const getRoleColorClass = (role: string): string => {
  switch (role) {
    case 'ADMIN':
      return 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300';
    case 'MANAGER':
      return 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
    case 'EMPLOYEE':
      return 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300';
    default:
      return 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white';
  }
};

const getRoleBadgeColor = (role: string): string => {
  switch (role) {
    case 'ADMIN': return 'bg-red-500';
    case 'MANAGER': return 'bg-blue-500';
    case 'EMPLOYEE': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

// Fonctions utilitaires pour les services - maintenant déplacées dans le composant
// pour éviter les problèmes d'appel de hook en dehors d'un composant React

// Fonction utilitaire pour obtenir un timestamp à partir d'une date ou d'une chaîne
function getTimestamp(date: string | Date): number {
  if (date instanceof Date) return date.getTime();
  const d = new Date(date);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
function getProfilePhotoUrl(url?: string) {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return BACKEND_URL.replace(/\/$/, '') + url;
}

export function SettingsView() {
  const { user, refreshUser, uploadProfilePhoto, deleteProfilePhoto } = useAuth();
  const { isDark, setTheme } = useTheme();
  const { activateUrgencyMode, deactivateUrgencyMode, urgencyModes, tasks, services } = useData();
  const { addNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [urgencyForm, setUrgencyForm] = useState({
    title: '',
    description: '',
    severity: 'medium' as 'medium' | 'high' | 'critical',
    serviceId: '',
    endDate: '',
    allocatedResources: 0,
  });
  
  // États pour les préférences de tâches
  const [taskPreferences, setTaskPreferences] = useState({
    notifyBeforeDeadline: true,
    useKanbanByDefault: false,
    autoTimeTracking: true
  });
  
  // Ajout de l'état pour le service sélectionné (pour MANAGER)
  const [selectedServiceId, setSelectedServiceId] = useState(user?.service || '');
  
  // Fonctions utilitaires pour les services
  const getServiceName = (serviceId: string): string => {
    if (!serviceId) return 'Non assigné';
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : 'Non assigné';
  };

  const getServiceColor = (serviceId: string): string => {
    if (!serviceId) return '#6B7280';
    const service = services.find(s => s.id === serviceId);
    return service?.color || '#6B7280'; // Couleur par défaut si non trouvé
  };
  
  // Calcul des statistiques réelles basées sur les tâches de l'utilisateur
  const calculateTaskStats = () => {
    if (!user) return { assignedTasks: 0, completedTasks: 0, workHours: 0, efficiency: 0, efficiencyChange: 0 };
    
    // Filtrer les tâches assignées à l'utilisateur courant
    const userTasks = tasks.filter(task => Array.isArray(task.assignedTo) && task.assignedTo.includes(user.id));
    const completedTasks = userTasks.filter(task => task.status === 'completed');
    
    // Calculer le temps total passé sur des tâches
    const totalTimeTracked = userTasks.reduce((total, task) => total + task.timeTracked, 0);
    const workHours = Math.round(totalTimeTracked / 60); // Conversion en heures
    
    // Calculer l'efficacité (rapport entre temps réalisé et estimé) pour les tâches complétées
    let efficiency = 0;
    if (completedTasks.length > 0) {
      const totalEstimated = completedTasks.reduce((total, task) => total + task.estimatedTime, 0);
      const totalActual = completedTasks.reduce((total, task) => total + task.timeTracked, 0);
      
      // L'efficacité est inversement proportionnelle au dépassement du temps estimé
      // Si on prend moins de temps que prévu, l'efficacité est > 100%
      efficiency = totalEstimated > 0 ? Math.min(Math.round((totalEstimated / totalActual) * 100), 100) : 100;
    }
    
    // Simulation d'un changement d'efficacité par rapport au mois précédent
    const efficiencyChange = Math.round((Math.random() * 10) - 3); // Entre -3 et +7
    
    return {
      assignedTasks: userTasks.length,
      completedTasks: completedTasks.length,
      workHours,
      efficiency,
      efficiencyChange
    };
  };
  
  // Calculer les statistiques une seule fois au chargement du composant ou quand l'utilisateur/tâches changent
  const taskStats = calculateTaskStats();
  
  // Handle profile form changes
  const handleProfileFormChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle password form changes
  const handlePasswordFormChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  // Save profile changes
  const saveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      // Construire explicitement le payload sans champ user imbriqué
      const payload: any = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        email: profileForm.email,
        phone: profileForm.phone,
        bio: profileForm.bio,
      };
      if (user.role === 'MANAGER') {
        payload.serviceIdInput = selectedServiceId;
      }
      await apiService.updateMyProfile(payload);
      await refreshUser();
      // Synchroniser le formulaire avec l'utilisateur rechargé
      const refreshedUser = { ...user, ...payload };
      setProfileForm({
        firstName: refreshedUser.firstName || '',
        lastName: refreshedUser.lastName || '',
        email: refreshedUser.email || '',
        phone: refreshedUser.phone || '',
        bio: refreshedUser.bio || '',
      });
      setIsEditingProfile(false);
      addNotification({
        type: 'success',
        message: 'Profil mis à jour avec succès'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors de la mise à jour du profil'
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Cancel profile editing
  const cancelProfileEdit = () => {
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
    });
    setIsEditingProfile(false);
  };

  // Handle profile photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addNotification({
        type: 'error',
        message: 'Veuillez sélectionner un fichier image valide'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addNotification({
        type: 'error',
        message: 'La taille du fichier ne peut pas dépasser 5MB'
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      await apiService.uploadProfilePhoto(file);
      await refreshUser();
      addNotification({
        type: 'success',
        message: 'Photo de profil mise à jour avec succès'
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors du téléchargement de la photo'
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Change password
  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addNotification({
        type: 'error',
        message: 'Les mots de passe ne correspondent pas'
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      addNotification({
        type: 'error',
        message: 'Le mot de passe doit contenir au moins 8 caractères'
      });
      return;
    }

    try {
      await apiService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      addNotification({
        type: 'success',
        message: 'Mot de passe modifié avec succès'
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordForm(false);
    } catch (error) {
      console.error('Error changing password:', error);
      addNotification({
        type: 'error',
        message: 'Erreur lors du changement de mot de passe'
      });
    }
  };
  
  // Fonction pour gérer les changements de préférences
  const handleTaskPreferenceChange = (preference: keyof typeof taskPreferences) => {
    setTaskPreferences(prev => ({
      ...prev,
      [preference]: !prev[preference]
    }));
  };
  
  // Fonction pour enregistrer les préférences (à connecter à l'API)
  const saveTaskPreferences = () => {
    console.log('Saving task preferences:', taskPreferences);
    
    // Simulation d'un appel API
    setTimeout(() => {
      // Stockage local en attendant l'implémentation de l'API
      localStorage.setItem(`taskflow-user-${user?.id}-preferences`, JSON.stringify(taskPreferences));
      
      // Afficher un toast ou une notification de succès
      alert('Préférences enregistrées avec succès !');
    }, 500);
  };

  const activeUrgencyMode = urgencyModes.find(mode => mode.isActive);

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'tasks', label: 'Tâches', icon: CheckSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Apparence', icon: Palette },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'urgency', label: 'Mode Urgence', icon: AlertTriangle },
    { id: 'system', label: 'Système', icon: Settings },
  ];

  const handleActivateUrgency = () => {
    if (urgencyForm.title && urgencyForm.description && urgencyForm.serviceId && urgencyForm.endDate && urgencyForm.allocatedResources > 0) {
      activateUrgencyMode({
        title: urgencyForm.title,
        description: urgencyForm.description,
        isActive: true,
        startDate: new Date(),
        endDate: new Date(urgencyForm.endDate),
        activatedBy: user?.id || '',
        severity: urgencyForm.severity,
        serviceId: urgencyForm.serviceId,
        affectedProjects: [],
        resourcesAllocated: urgencyForm.allocatedResources,
      });
      setUrgencyForm({
        title: '',
        description: '',
        severity: 'medium',
        serviceId: '',
        endDate: '',
        allocatedResources: 0,
      });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.personalInfo')}</h3>
                {!isEditingProfile ? (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    title={t('settings.editProfile')}
                  >
                    {t('settings.edit')}
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={cancelProfileEdit}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                      title={t('settings.cancelEdit')}
                    >
                      {t('settings.cancel')}
                    </button>
                    <button
                      onClick={saveProfile}
                      disabled={isSavingProfile}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      title={t('settings.saveProfile')}
                    >
                      {isSavingProfile ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{t('settings.save')}</span>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Avatar et info principale */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative w-24 h-24 mx-auto mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {user?.profilePhoto ? (
                    <img
                      src={getProfilePhotoUrl(user.profilePhoto)}
                      alt={t('settings.profilePhotoAlt')}
                      className="w-24 h-24 rounded-full object-cover border-2 border-primary-500 shadow group-hover:opacity-80 transition-opacity duration-150"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-4xl text-gray-500 border-2 border-gray-300 group-hover:opacity-80 transition-opacity duration-150">
                      {`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || '?'}
                    </div>
                  )}
                  {/* Overlay icône appareil photo au survol */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                    <Camera className="w-8 h-8 text-primary-600 bg-white bg-opacity-80 rounded-full p-1 shadow" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-label={t('settings.uploadProfilePhoto')}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        uploadProfilePhoto(e.target.files[0]);
                      }
                    }}
                  />
                  {user?.profilePhoto && (
                    <button
                      type="button"
                      className="absolute top-0 right-0 bg-white rounded-full p-1 shadow text-red-600 hover:bg-red-100"
                      title={t('settings.deleteProfilePhoto')}
                      aria-label={t('settings.deleteProfilePhoto')}
                      onClick={e => { e.stopPropagation(); deleteProfilePhoto(); }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
                
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.firstName || ''} {user?.lastName || ''}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(user?.role || '')} text-white`}>
                      {getRoleLabel(user?.role || '')}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">•</span>
                    <span className="inline-flex items-center text-sm">
                      <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getServiceColor(user?.service || '') }}></span>
                      {getServiceName(user?.service || '')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.firstName')}</label>
                  <input
                    type="text"
                    value={isEditingProfile ? profileForm.firstName : (user?.firstName || '')}
                    onChange={(e) => handleProfileFormChange('firstName', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      !isEditingProfile ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''
                    }`}
                    readOnly={!isEditingProfile}
                    title={t('settings.editFirstName')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.lastName')}</label>
                  <input
                    type="text"
                    value={isEditingProfile ? profileForm.lastName : (user?.lastName || '')}
                    onChange={(e) => handleProfileFormChange('lastName', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      !isEditingProfile ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''
                    }`}
                    readOnly={!isEditingProfile}
                    title={t('settings.editLastName')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.email')}</label>
                  <input
                    type="email"
                    value={isEditingProfile ? profileForm.email : (user?.email || '')}
                    onChange={(e) => handleProfileFormChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      !isEditingProfile ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''
                    }`}
                    readOnly={!isEditingProfile}
                    title={t('settings.editEmail')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.phone')}</label>
                  <input
                    type="tel"
                    value={isEditingProfile ? profileForm.phone : (user?.phone || '')}
                    onChange={(e) => handleProfileFormChange('phone', e.target.value)}
                    placeholder={t('settings.phonePlaceholder')}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      !isEditingProfile ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''
                    }`}
                    readOnly={!isEditingProfile}
                    title={t('settings.editPhone')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.username')}</label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed"
                    readOnly
                    title={t('settings.username')}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.usernameReadOnly')}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.lastLogin')}</label>
                  <input
                    type="text"
                    value={user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString('fr-FR', { 
                      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                    }) : t('settings.never')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed"
                    readOnly
                    title={t('settings.lastLogin')}
                  />
                </div>
              </div>
              
              {/* Bio/Description */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.bio')}</label>
                <textarea
                  value={isEditingProfile ? profileForm.bio : (user?.bio || '')}
                  onChange={(e) => handleProfileFormChange('bio', e.target.value)}
                  placeholder={t('settings.describeYourself')}
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none ${
                    !isEditingProfile ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''
                  }`}
                  readOnly={!isEditingProfile}
                  title={t('settings.editBio')}
                />
              </div>
              
              {/* Détails du rôle et service */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className={`p-4 border rounded-lg ${getRoleColorClass(user?.role || '')}`}>
                  <h4 className="font-medium mb-2">{t('settings.userRole')}</h4>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full ${getRoleBadgeColor(user?.role || '')} text-white`}>
                      {getRoleLabel(user?.role || '')}
                    </span>
                    <div>
                      {user?.role === 'ADMIN' && <span className="text-sm">{t('settings.fullSystemAccess')}</span>}
                      {user?.role === 'MANAGER' && <span className="text-sm">{t('settings.serviceManagement')}</span>}
                      {user?.role === 'EMPLOYEE' && <span className="text-sm">{t('settings.standardAccess')}</span>}
                    </div>
                  </div>
                </div>
                
                {user?.role === 'MANAGER' && isEditingProfile ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.assignedService')}</label>
                    <select
                      value={selectedServiceId}
                      onChange={e => setSelectedServiceId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                      disabled={isSavingProfile}
                    >
                      <option value="">{t('settings.selectService')}</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>{service.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-white">{t('settings.assignedService')}</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full mr-2" style={{ backgroundColor: getServiceColor(user?.service || '') }}></div>
                      <span className="text-gray-900 dark:text-white font-medium">{getServiceName(user?.service || '')}</span>
                    </div>
                    {services.find(s => s.headId === user?.id) && (
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded">{t('settings.serviceManager')}</span>
                    )}
                  </div>
                </div>
                )}
              </div>
              
              {/* Change Password Section */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">{t('settings.accountSecurity')}</h4>
                  <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    title={t('settings.changePassword')}
                  >
                    {showPasswordForm ? t('settings.cancelPasswordChange') : t('settings.changePassword')}
                  </button>
                </div>
                
                {showPasswordForm && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.currentPassword')}</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => handlePasswordFormChange('currentPassword', e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder={t('settings.enterCurrentPassword')}
                          title={t('settings.currentPasswordPlaceholder')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          title={t('settings.showPassword')}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.newPassword')}</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => handlePasswordFormChange('newPassword', e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder={t('settings.enterNewPassword')}
                          title={t('settings.newPasswordPlaceholder')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          title={t('settings.showPassword')}
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.passwordMinLength')}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.confirmNewPassword')}</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => handlePasswordFormChange('confirmPassword', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={t('settings.confirmNewPasswordPlaceholder')}
                        title={t('settings.confirmNewPasswordPlaceholder')}
                      />
                    </div>
                    
                    <button
                      onClick={changePassword}
                      disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('settings.changePassword')}
                    >
                      {t('settings.changePassword')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'tasks':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.taskPreferences')}</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{t('settings.notifyBeforeDeadline')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.notifyBeforeDeadlineDescription')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={taskPreferences.notifyBeforeDeadline}
                      onChange={() => handleTaskPreferenceChange('notifyBeforeDeadline')}
                      title={t('settings.notifyBeforeDeadline')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{t('settings.useKanbanByDefault')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.useKanbanByDefaultDescription')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={taskPreferences.useKanbanByDefault}
                      onChange={() => handleTaskPreferenceChange('useKanbanByDefault')}
                      title={t('settings.useKanbanByDefault')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{t('settings.autoTimeTracking')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.autoTimeTrackingDescription')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={taskPreferences.autoTimeTracking}
                      onChange={() => handleTaskPreferenceChange('autoTimeTracking')}
                      title={t('settings.autoTimeTracking')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.personalStats')}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition-transform hover:scale-105">
                    <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('settings.assignedTasks')}</h5>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{taskStats.assignedTasks}</p>
                    <div className="mt-2 flex items-center">
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded">
                        {taskStats.completedTasks} {t('settings.completed')}
                      </span>
                      <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">
                        {taskStats.assignedTasks > 0 ? `${(taskStats.completedTasks / Math.max(taskStats.assignedTasks, 1)) * 100}% ${t('settings.completedTasksPercentage')}` : t('settings.noData')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition-transform hover:scale-105">
                    <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('settings.workHours')}</h5>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{taskStats.workHours}h</p>
                    <div className="mt-2 flex items-center">
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded">
                        {t('settings.thisWeek')}
                      </span>
                      <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">
                        {taskStats.workHours > 0 ? `${(taskStats.workHours / 40 * 100).toFixed(0)}% ${t('settings.ofGoal')}` : t('settings.noData')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 transition-transform hover:scale-105">
                    <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('settings.efficiency')}</h5>
                    <div className="flex items-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{taskStats.efficiency}%</p>
                      {taskStats.efficiencyChange > 0 ? (
                        <span className="ml-2 text-green-500">↑ {Math.abs(taskStats.efficiencyChange)}%</span>
                      ) : taskStats.efficiencyChange < 0 ? (
                        <span className="ml-2 text-red-500">↓ {Math.abs(taskStats.efficiencyChange)}%</span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        taskStats.efficiency >= 90 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 
                        taskStats.efficiency >= 70 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' : 
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {taskStats.efficiency >= 90 ? t('settings.excellent') : 
                         taskStats.efficiency >= 70 ? t('settings.good') : t('settings.canImprove')}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Liste des tâches récentes */}
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">{t('settings.recentTasks')}</h3>
                  
                  {tasks.filter(task => user && Array.isArray(task.assignedTo) && task.assignedTo.includes(user.id))
                    .sort((a, b) => getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt))
                    .slice(0, 3)
                    .map(task => (
                      <div 
                        key={task.id} 
                        className="mb-2 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center">
                              <div 
                                className={`w-3 h-3 mr-2 rounded-full ${
                                  task.status === 'completed' ? 'bg-green-500' : 
                                  task.status === 'in_progress' ? 'bg-blue-500' : 
                                  task.status === 'review' ? 'bg-yellow-500' : 'bg-gray-500'
                                }`}>
                              </div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{task.description}</p>
                          </div>
                          <div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              task.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : 
                              task.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' : 
                              task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' : 
                              'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            }`}>
                              {task.priority === 'urgent' ? t('settings.urgent') : 
                               task.priority === 'high' ? t('settings.high') : 
                               task.priority === 'medium' ? t('settings.medium') : t('settings.low')}
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                              {new Date(task.deadline).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {(!user || tasks.filter(task => user && Array.isArray(task.assignedTo) && task.assignedTo.includes(user.id)).length === 0) && (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                      {t('settings.noTasksAssigned')}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 border-t dark:border-gray-700 pt-6">
                <button 
                  onClick={saveTaskPreferences}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                  title={t('settings.saveTaskPreferences')}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {t('settings.savePreferences')}
                </button>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.notificationPreferences')}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{t('settings.emailNotifications')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.emailNotificationsDescription')}</p>
                  </div>
                  <input type="checkbox" className="rounded" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{t('settings.taskAssignments')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.taskAssignmentsDescription')}</p>
                  </div>
                  <input type="checkbox" className="rounded" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{t('settings.deadlineReminders')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.deadlineRemindersDescription')}</p>
                  </div>
                  <input type="checkbox" className="rounded" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{t('settings.mentionsInComments')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.mentionsInCommentsDescription')}</p>
                  </div>
                  <input type="checkbox" className="rounded" defaultChecked />
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.theme')}</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-4 border-2 rounded-lg flex items-center space-x-3 ${
                      !isDark ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'
                    }`}
                    title={t('settings.lightTheme')}
                  >
                    <div className="w-6 h-6 bg-white border border-gray-300 rounded" />
                    <span className="font-medium text-gray-900 dark:text-white">{t('settings.lightTheme')}</span>
                  </button>
                  
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-4 border-2 rounded-lg flex items-center space-x-3 ${
                      isDark ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'
                    }`}
                    title={t('settings.darkTheme')}
                  >
                    <div className="w-6 h-6 bg-gray-800 border border-gray-600 rounded" />
                    <span className="font-medium text-gray-900 dark:text-white">{t('settings.darkTheme')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'urgency':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.urgencyMode')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{t('settings.urgencyModeDescription')}</p>

              {activeUrgencyMode ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-200">{activeUrgencyMode.title}</h4>
                      <p className="text-red-700 dark:text-red-300 mt-1">{activeUrgencyMode.description}</p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                        {t('settings.activatedOn', { date: new Date(activeUrgencyMode.startDate).toLocaleString('fr-FR') })}
                      </p>
                    </div>
                    <button
                      onClick={() => deactivateUrgencyMode(activeUrgencyMode.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                      title={t('settings.deactivateUrgency')}
                    >
                      {t('settings.deactivateUrgency')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.urgencyTitle')}</label>
                    <input
                      type="text"
                      value={urgencyForm.title}
                      onChange={(e) => setUrgencyForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder={t('settings.urgencyTitlePlaceholder')}
                      title={t('settings.urgencyTitlePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.urgencyDescription')}</label>
                    <textarea
                      value={urgencyForm.description}
                      onChange={(e) => setUrgencyForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder={t('settings.urgencyDescriptionPlaceholder')}
                      title={t('settings.urgencyDescriptionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.urgencySeverity')}</label>
                    <select
                      value={urgencyForm.severity}
                      onChange={(e) => setUrgencyForm(prev => ({ ...prev, severity: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      title={t('settings.urgencySeverity')}
                    >
                      <option value="medium">{t('settings.mediumSeverity')}</option>
                      <option value="high">{t('settings.highSeverity')}</option>
                      <option value="critical">{t('settings.criticalSeverity')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.urgencyService')}</label>
                    <select
                      value={urgencyForm.serviceId}
                      onChange={(e) => setUrgencyForm(prev => ({ ...prev, serviceId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      title={t('settings.urgencyService')}
                    >
                      <option value="">{t('settings.selectService')}</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>{service.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.urgencyEndDate')}</label>
                    <input
                      type="date"
                      value={urgencyForm.endDate}
                      onChange={(e) => setUrgencyForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      title={t('settings.urgencyEndDate')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.urgencyAllocatedResources')}</label>
                    <input
                      type="number"
                      min="0"
                      value={urgencyForm.allocatedResources}
                      onChange={(e) => setUrgencyForm(prev => ({ ...prev, allocatedResources: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      title={t('settings.urgencyAllocatedResources')}
                    />
                  </div>

                  <button
                    onClick={handleActivateUrgency}
                    disabled={!urgencyForm.title || !urgencyForm.description || !urgencyForm.serviceId || !urgencyForm.endDate || urgencyForm.allocatedResources <= 0}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    title={t('settings.activateUrgency')}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>{t('settings.activateUrgency')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <Settings className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('settings.developmentSection')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('settings.developmentSectionDescription')}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.settings')}</h2>
              <p className="text-gray-600 dark:text-gray-400">{t('settings.managePreferencesAndSettings')}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full ${getRoleBadgeColor(user?.role || '')} text-white`}>
                {getRoleLabel(user?.role || '')}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm">
                <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getServiceColor(user?.service || '') }}></span>
                {getServiceName(user?.service || '')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${getRoleBadgeColor(user?.role || '')}`}>
                  {user?.firstName?.charAt(0) || ''}{user?.lastName?.charAt(0) || ''}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">{user?.firstName || ''} {user?.lastName || ''}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email || ''}</p>
                </div>
              </div>
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      title={tab.label}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
