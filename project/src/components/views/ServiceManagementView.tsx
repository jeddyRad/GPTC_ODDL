import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Service, User, Task } from '@/types';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Calendar, 
  DollarSign, 
  Building2, 
  AlertCircle,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  X,
  Save
} from 'lucide-react';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';

interface ServiceFormData {
  name: string;
  description: string;
  color: string;
  capacity: number;
  headId?: string | null;
}

export function ServiceManagementView() {
  const { services = [], users = [], tasks = [] } = useData();
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    color: '#3B82F6',
    capacity: 100,
    headId: null,
  });
  const { t } = useTranslation();

  // Vérifier les permissions
  const canManageServices = user?.role === 'ADMIN';

  // Calculer les statistiques pour chaque service
  const getServiceStats = (serviceId: string) => {
    const serviceUsers = users?.filter(u => u.service === serviceId) || [];
    const serviceTasks = tasks?.filter(t => t.serviceId === serviceId) || [];
    const completedTasks = serviceTasks.filter(t => t.status === 'completed');
    const activeTasks = serviceTasks.filter(t => t.status !== 'completed');
    
    const totalWorkload = serviceTasks.reduce((sum, task) => sum + task.workloadPoints, 0);
    const avgEfficiency = completedTasks.length > 0 
      ? Math.round(completedTasks.reduce((sum, task) => {
          const estimated = task.estimatedTime || 1;
          const actual = task.timeTracked || estimated;
          return sum + (estimated / actual * 100);
        }, 0) / completedTasks.length)
      : 100;

    return {
      userCount: serviceUsers.length,
      activeTasks: activeTasks.length,
      completedTasks: completedTasks.length,
      totalWorkload,
      efficiency: avgEfficiency,
    };
  };

  // Obtenir le nom du chef de service
  const getServiceHeadName = (headId?: string) => {
    if (!headId) return 'Non assigné';
    const head = users.find(u => u.id === headId);
    return head ? `${head.firstName} ${head.lastName}` : 'Non trouvé';
  };

  // Gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Éviter les soumissions multiples
    
    setIsSubmitting(true);
    
    try {
      const serviceData: Omit<Service, 'id'> = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        workloadCapacity: formData.capacity,
        headId: formData.headId || null,
        memberIds: editingService ? editingService.memberIds : (formData.headId ? [formData.headId] : [])
      };

      // Supprimer la validation obligatoire du chef de service
      // Le chef n'est pas obligatoire selon le modèle backend (null=True, blank=True)

      if (editingService) {
        await api.updateService(editingService.id, serviceData);
        addNotification({
          type: "success",
          message: "Service updated successfully!"
        });
      } else {
        await api.createService(serviceData);
        addNotification({
          type: "success",
          message: "Service created successfully!"
        });
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6',
        capacity: 100,
        headId: null,
      });
      setShowServiceForm(false);
      setEditingService(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du service:', error);
      addNotification({
        type: "error",
        message: editingService 
          ? "Erreur lors de la mise à jour du service" 
          : "Erreur lors de la création du service"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gérer la modification d'un service
  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description,
      color: service.color,
      capacity: service.workloadCapacity || 100,
      headId: service.headId,
    });
    setShowServiceForm(true);
  };

  // Gérer la suppression d'un service
  const handleDelete = async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const stats = getServiceStats(serviceId);
    if (stats.userCount > 0 || stats.activeTasks > 0) {
      if (!window.confirm(
        `This service contains ${stats.userCount} user(s) and ${stats.activeTasks} active task(s). ` +
        'Deletion will automatically reassign these elements. Continue?'
      )) {
        return;
      }
    }

    if (window.confirm(`Are you sure you want to delete the service "${service.name}" ?`)) {
      try {
        await api.deleteService(serviceId);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression du service');
      }
    }
  };

  // Fermer le formulaire
  const handleCancel = () => {
    setShowServiceForm(false);
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      capacity: 100,
      headId: null,
    });
  };

  if (!canManageServices) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-300 mb-2">
              Accès restreint
            </h2>
            <p className="text-red-600 dark:text-red-400">
              Seuls les administrateurs peuvent gérer les services.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('serviceManagement.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('serviceManagement.subtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowServiceForm(true)}
            className="px-4 py-2 text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center space-x-2"
            title={t('serviceManagement.newService')}
            aria-label={t('serviceManagement.newService')}
          >
            <Plus className="w-4 h-4" />
            <span>{t('serviceManagement.newService')}</span>
          </button>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Services totaux</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {services?.length || 0}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Utilisateurs actifs</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {users?.length || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tâches actives</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {tasks?.filter(t => t.status !== 'completed')?.length || 0}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Budget total</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {/* Budget total désactivé car la propriété 'budget' n'existe pas sur Service */}
                  0
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Liste des services */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {services.map((service) => {
            const stats = getServiceStats(service.id);
            return (
              <div key={service.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* En-tête du service */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: service.color }}
                      />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {service.name}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(service)}
                        className="p-2 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900 rounded-lg transition-colors"
                        title={t('serviceManagement.editService')}
                        aria-label={t('serviceManagement.editService')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                        title={t('serviceManagement.deleteService')}
                        aria-label={t('serviceManagement.deleteService')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    {service.description || 'Aucune description'}
                  </p>

                  {/* Chef de service */}
                  <div className="flex items-center space-x-2 text-sm">
                    <UserCheck className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-600 dark:text-gray-400">Chef:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getServiceHeadName(service.headId)}
                    </span>
                  </div>
                </div>

                {/* Statistiques du service */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {stats.userCount}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Users</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {stats.activeTasks}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Active tasks</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Charge de travail */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Workload</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {stats.totalWorkload}/{service.workloadCapacity || 100}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            stats.totalWorkload > (service.workloadCapacity || 100) 
                              ? 'bg-red-500' 
                              : stats.totalWorkload > (service.workloadCapacity || 100) * 0.8 
                                ? 'bg-yellow-500' 
                                : 'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min((stats.totalWorkload / (service.workloadCapacity || 100)) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>

                    {/* Efficacité */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Efficiency</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className={`w-4 h-4 ${stats.efficiency >= 90 ? 'text-green-500' : stats.efficiency >= 70 ? 'text-yellow-500' : 'text-red-500'}`} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {stats.efficiency}%
                        </span>
                      </div>
                    </div>

                    {/* Budget */}
                    {/* {service.budget && service.budget > 0 && ( */}
                      {/* {service.budget.toLocaleString('fr-FR')} € */}
                    {/* )} */}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal de formulaire */}
        {showServiceForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingService ? 'Modifier le service' : 'Nouveau service'}
                </h2>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title={t('serviceManagement.cancel')}
                  aria-label={t('serviceManagement.cancel')}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nom du service *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                      placeholder={t('serviceManagement.serviceNamePlaceholder')}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder={t('serviceManagement.serviceDescriptionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Couleur
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={t('serviceManagement.serviceColorPlaceholder')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Chef de service
                    </label>
                    <select
                      value={formData.headId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, headId: e.target.value || null }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">{t('serviceManagement.noHeadAssigned')}</option>
                      {users
                        .filter(u => u.role === 'MANAGER' || u.role === 'ADMIN')
                        .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Capacité (points de charge)
                    </label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder={t('serviceManagement.serviceCapacityPlaceholder')}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title={t('serviceManagement.cancel')}
                    aria-label={t('serviceManagement.cancel')}
                  >
                    {t('serviceManagement.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                      isSubmitting 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-primary-600 hover:bg-primary-700'
                    } text-white`}
                    title={editingService ? t('serviceManagement.updateService') : t('serviceManagement.createService')}
                    aria-label={editingService ? t('serviceManagement.updateService') : t('serviceManagement.createService')}
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSubmitting 
                        ? (editingService ? t('serviceManagement.updating') : t('serviceManagement.creating')) 
                        : (editingService ? t('serviceManagement.update') : t('serviceManagement.create'))
                      }
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
