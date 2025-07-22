import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target, 
  AlertTriangle,
  Download,
  PieChart,
  Activity
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '../../services/apiClient';
import { AnalyticsData } from '../../types';
import { getUserPermissions } from '@/utils/permissions';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/hooks/usePermissions';

export default function AnalyticsView() {
  const { services } = useData();
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedService, setSelectedService] = useState('all');
  const { t } = useTranslation();
  const { isAdmin, role } = usePermissions();

  const permissions = getUserPermissions(user);

  // Check if user has permission to view analytics
  if (!(isAdmin || role === 'MANAGER' || permissions.canViewAnalytics)) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Accès Restreint
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Vous n'avez pas les permissions nécessaires pour accéder aux analyses.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('period', selectedPeriod);
        if (selectedService !== 'all') {
          params.append('service_id', selectedService);
        }

        const response = await apiClient.get(`/api/analytics/?${params.toString()}`);
        // Adapter les clés du backend vers le format frontend
        const data = response.data;
        setAnalyticsData({
          mainMetrics: data.main_metrics,
          servicePerformance: data.service_performance,
          systemMetrics: data.system_metrics,
        });
        setError(null);
      } catch (err) {
        setError('Impossible de charger les données analytiques.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [selectedPeriod, selectedService]);

  const handleGenerateReport = async (type: 'pdf' | 'csv') => {
    // This function can be implemented later to generate reports from the backend
    console.log(`Génération d'un rapport ${type} pour la période ${selectedPeriod} et le service ${selectedService}`);
    alert('La génération de rapports sera bientôt disponible.');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Chargement des données...</div>;
  }

  if (error || !analyticsData) {
    return <div className="flex items-center justify-center h-full text-red-500">{error || "Données non disponibles."}</div>;
  }

  const { mainMetrics, servicePerformance, systemMetrics } = analyticsData;

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Reporting ODDL</h2>
          <p className="text-gray-600 dark:text-gray-400">Tableau de bord analytique et rapports de performance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            aria-label="Période"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          
          <select
            aria-label="Service"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">Tous les services</option>
            {services.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleGenerateReport('pdf')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => handleGenerateReport('csv')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tâches</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{mainMetrics.totalTasks}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                {mainMetrics.completionRate}% terminées
              </p>
            </div>
            <Target className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Projets Actifs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {mainMetrics.activeProjects}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                +{mainMetrics.planningProjects} en planification
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tâches Urgentes</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{mainMetrics.urgentTasks}</p>
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                {mainMetrics.overdueTasks} en retard
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Efficacité Globale</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {Math.round(mainMetrics.globalEfficiency)}%
              </p>
              <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                → Stable
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Performance par service */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance par Service</h3>
            <PieChart className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          
          <div className="space-y-4">
            {servicePerformance.map((dept) => (
              <div key={dept.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{dept.name}</h4>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {dept.completionRate}% terminé
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${dept.completionRate}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{dept.completedTasks}/{dept.totalTasks} tâches</span>
                  <span>Efficacité: {Math.round(dept.efficiency)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Charge de Travail</h3>
            <Activity className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-800 dark:text-blue-200">Tâches Complétées</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {mainMetrics.completedTasks}
                </span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Cette période</p>
            </div>
            
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-orange-800 dark:text-orange-200">Heures Supplémentaires</span>
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  0h
                </span>
              </div>
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">Cette semaine</p>
            </div>
            
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center justify-between">
                <span className="font-medium text-green-800 dark:text-green-200">
                  Risque d'Épuisement
                </span>
                <span className="text-sm px-2 py-1 rounded-full bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200">
                  Faible
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Métriques système */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Métriques Système</h3>
          <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {systemMetrics.activeUsers}/{systemMetrics.totalUsers}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Utilisateurs Actifs</p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {Math.round(systemMetrics.uptime)}%
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Disponibilité Système</p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {Math.round(systemMetrics.systemLoad)}%
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Charge Système</p>
          </div>
        </div>
      </div>
    </div>
  );
}
