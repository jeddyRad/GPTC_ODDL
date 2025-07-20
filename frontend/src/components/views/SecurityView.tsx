import React, { useState } from 'react';
import { Shield, AlertTriangle, Download, Eye, Lock, Key, Database, FileText, Users, Clock } from 'lucide-react';
import { useSecurity } from '@/contexts/SecurityContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export function SecurityView() {
  const { 
    securityEvents, 
    gdprRequests, 
    backupRecords, 
    activityLogs,
    getSecurityMetrics,
    createGDPRRequest,
    processGDPRRequest,
    exportUserData,
    createBackup,
    logSecurityEvent
  } = useSecurity();
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [gdprRequestType, setGdprRequestType] = useState<'data_export' | 'data_deletion' | 'data_rectification' | 'consent_withdrawal'>('data_export');
  const { t } = useTranslation();

  const securityMetrics = getSecurityMetrics();

  const handleCreateGDPRRequest = () => {
    if (user) {
      createGDPRRequest(user.id, gdprRequestType, 'Demande utilisateur via interface');
    }
  };

  const handleExportData = async () => {
    if (user) {
      try {
        const dataUrl = await exportUserData(user.id);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `taskflow-data-export-${user.id}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error exporting data:', error);
      }
    }
  };

  const handleCreateBackup = async () => {
    try {
      await createBackup('manual');
      logSecurityEvent('data_access', 'Sauvegarde manuelle créée', 'low', user?.id);
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  };

  const handleAuditSecurity = () => {
    if (user) {
      logSecurityEvent('security_audit', 'Audit de sécurité effectué', 'low', user.id);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Shield },
    { id: 'events', label: 'Événements Sécurité', icon: AlertTriangle },
    { id: 'gdpr', label: 'RGPD', icon: FileText },
    { id: 'backups', label: 'Sauvegardes', icon: Database },
    { id: 'activity', label: 'Journaux d\'activité', icon: Clock },
  ];

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Security Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('security.totalEvents')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{securityMetrics.totalEvents}</p>
                  </div>
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('security.criticalEvents')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{securityMetrics.criticalEvents}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('security.failedLogins')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{securityMetrics.failedLogins}</p>
                  </div>
                  <Lock className="w-8 h-8 text-orange-600" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('security.suspiciousActivities')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{securityMetrics.suspiciousActivities}</p>
                  </div>
                  <Eye className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Security Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('security.securityStatus')}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-green-800 dark:text-green-200">{t('security.aes256Encryption')}</span>
                  </div>
                  <span className="text-green-600 dark:text-green-400">{t('security.active')}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-green-800 dark:text-green-200">{t('security.automaticBackups')}</span>
                  </div>
                  <span className="text-green-600 dark:text-green-400">{t('security.daily')}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-green-800 dark:text-green-200">{t('security.gdprCompliance')}</span>
                  </div>
                  <span className="text-green-600 dark:text-green-400">{t('security.compliant')}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">{t('security.jwtAuthentication')}</span>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400">{t('security.secure')}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('security.quickActions')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={handleCreateBackup}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Database className="w-6 h-6 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900 dark:text-white">{t('security.createBackup')}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('security.manualBackup')}</p>
                </button>
                <button
                  onClick={handleExportData}
                  className="bg-success-600 hover:bg-success-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Download className="w-6 h-6 text-green-600 mb-2" />
                  <h4 className="font-medium text-gray-900 dark:text-white">{t('security.exportData')}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('security.gdprDataExport')}</p>
                </button>
                <button
                  onClick={handleAuditSecurity}
                  className="bg-warning-600 hover:bg-warning-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Key className="w-6 h-6 text-purple-600 mb-2" />
                  <h4 className="font-medium text-gray-900 dark:text-white">{t('security.auditSecurity')}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('security.completeCheck')}</p>
                </button>
              </div>
            </div>
          </div>
        );

      case 'events':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('security.securityEvents')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3">{t('security.type')}</th>
                    <th className="px-6 py-3">{t('security.severity')}</th>
                    <th className="px-6 py-3">{t('security.description')}</th>
                    <th className="px-6 py-3">{t('security.date')}</th>
                    <th className="px-6 py-3">{t('security.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {securityEvents.slice(0, 10).map((event) => (
                    <tr key={event.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{event.type}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          event.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                          event.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                          event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {event.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{event.description}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {event.timestamp.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          event.resolved ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        }`}>
                          {event.resolved ? t('security.resolved') : t('security.inProgress')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'gdpr':
        return (
          <div className="space-y-6">
            {/* GDPR Request Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('security.newGdprRequest')}</h3>
              <div className="flex items-center space-x-4">
                <select
                  value={gdprRequestType}
                  onChange={(e) => setGdprRequestType(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="data_export">{t('security.dataExport')}</option>
                  <option value="data_deletion">{t('security.dataDeletion')}</option>
                  <option value="data_rectification">{t('security.dataRectification')}</option>
                  <option value="consent_withdrawal">{t('security.consentWithdrawal')}</option>
                </select>
                <button
                  onClick={handleCreateGDPRRequest}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {t('security.createRequest')}
                </button>
              </div>
            </div>

            {/* GDPR Requests List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('security.gdprRequests')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3">{t('security.type')}</th>
                      <th className="px-6 py-3">{t('security.status')}</th>
                      <th className="px-6 py-3">{t('security.requestDate')}</th>
                      <th className="px-6 py-3">{t('security.processingDate')}</th>
                      <th className="px-6 py-3">{t('security.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gdprRequests.slice(0, 10).map((request) => (
                      <tr key={request.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{request.type}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            request.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                            request.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          {request.requestedAt.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          {request.processedAt ? request.processedAt.toLocaleString('fr-FR') : '-'}
                        </td>
                        <td className="px-6 py-4">
                          {request.status === 'pending' && user?.role === 'ADMIN' && (
                            <button
                              onClick={() => processGDPRRequest(request.id, 'completed', user.id)}
                              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                            >
                              {t('security.process')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'backups':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('security.backups')}</h3>
                <button
                  onClick={handleCreateBackup}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Database className="w-4 h-4" />
                  <span>{t('security.newBackup')}</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3">{t('security.type')}</th>
                    <th className="px-6 py-3">{t('security.date')}</th>
                    <th className="px-6 py-3">{t('security.size')}</th>
                    <th className="px-6 py-3">{t('security.status')}</th>
                    <th className="px-6 py-3">{t('security.retention')}</th>
                  </tr>
                </thead>
                <tbody>
                  {backupRecords.slice(0, 10).map((backup) => (
                    <tr key={backup.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{backup.type}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {backup.timestamp.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {(backup.size / 1024).toFixed(2)} KB
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          backup.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                          backup.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                        }`}>
                          {backup.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {backup.retentionUntil.toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('security.activityLogs')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('security.retention')}: 2 ans</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3">{t('security.action')}</th>
                    <th className="px-6 py-3">{t('security.user')}</th>
                    <th className="px-6 py-3">{t('security.type')}</th>
                    <th className="px-6 py-3">{t('security.date')}</th>
                    <th className="px-6 py-3">{t('security.ip')}</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.slice(0, 20).map((log) => (
                    <tr key={log.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{log.action}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{log.userId}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{log.entityType}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {log.timestamp.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('security.securityCompliance')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('security.securityManagement')}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  selectedTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}