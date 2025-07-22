import { useState } from 'react';
import { Users, UserPlus, Mail, AlertTriangle, Briefcase, CheckSquare, Clock } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeeLoanModal } from '@/components/modals/EmployeeLoanModal';
import { User } from '@/types';
import { getUserPermissions } from '@/utils/permissions';
import { useTranslation } from 'react-i18next';

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
function getProfilePhotoUrl(url?: string) {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return BACKEND_URL.replace(/\/$/, '') + url;
}

export function TeamView() {
  const { services, users, employeeLoans, tasks } = useData();
  const { user: currentUser } = useAuth();
  const [showLoanModal, setShowLoanModal] = useState(false);
  const { t } = useTranslation();

  const permissions = getUserPermissions(currentUser);

  const getRoleLabel = (role: User['role']) => {
    switch (role) {
      case 'ADMIN': return t('team.admin');
      case 'MANAGER': return t('team.manager');
      case 'EMPLOYEE': return t('team.employee');
      default: return role;
    }
  };

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      case 'MANAGER': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
      case 'EMPLOYEE': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };
  
  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return t('team.unassigned');
    return services.find(s => s.id === serviceId)?.name || t('team.unknown_service');
  };

  const activeLoanRequests = employeeLoans.filter(loan => 
    loan.status === 'pending' || loan.status === 'approved'
  );

  // Fonction pour obtenir les tâches assignées à un utilisateur
  const getUserTasks = (userId: string) => {
    return tasks.filter(task => task.assignedTo && task.assignedTo.includes(userId));
  };

  // Fonction pour obtenir les statistiques d'un utilisateur
  const getUserStats = (userId: string) => {
    const userTasks = getUserTasks(userId);
    const completedTasks = userTasks.filter(task => task.status === 'completed');
    const pendingTasks = userTasks.filter(task => task.status !== 'completed');
    const overdueTasks = userTasks.filter(task => 
      new Date(task.deadline) < new Date() && task.status !== 'completed'
    );

    return {
      total: userTasks.length,
      completed: completedTasks.length,
      pending: pendingTasks.length,
      overdue: overdueTasks.length
    };
  };

  const handleInviteUser = () => {
    // TODO: Implement invitation logic
    console.log('Invite user clicked');
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full transition-colors duration-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('team.team_title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('team.team_description')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowLoanModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            title={t('team.request_loan_tooltip')}
            aria-label={t('team.request_loan_aria_label')}
          >
            <Users className="w-4 h-4 mr-2" />
            <span>{t('team.request_loan_button')}</span>
          </button>
          <button
            onClick={handleInviteUser}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            title={t('team.invite_user_tooltip')}
            aria-label={t('team.invite_user_aria_label')}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            <span>{t('team.invite_user_button')}</span>
          </button>
        </div>
      </div>

      {/* Active Loan Requests */}
      {activeLoanRequests.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">{t('team.active_loan_requests_title')}</h3>
          </div>
          <div className="space-y-2">
            {activeLoanRequests.map((loan) => (
              <div key={loan.id} className="text-sm text-yellow-700 dark:text-yellow-300">
                {t('team.loan_request_info', {
                  fromService: getServiceName(loan.fromServiceId),
                  toService: getServiceName(loan.toServiceId),
                  status: loan.status
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('team.total_members_label')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{users.length}</p>
            </div>
            <Users className="w-8 h-8 text-primary-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('team.online_label')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {/* Donnée non disponible pour le moment */}
                {t('team.na_placeholder')}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('team.services_label')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{services.length}</p>
            </div>
            <Briefcase className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('team.active_loans_label')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{activeLoanRequests.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((member) => {
          const memberStats = getUserStats(member.id);
          const memberTasks = getUserTasks(member.id);
          
          return (
            <div
              key={member.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start space-x-4">
                <div className="relative">
                  {member.profilePhoto ? (
                    <img
                      src={getProfilePhotoUrl(member.profilePhoto)}
                      alt={member.fullName || `${member.firstName} ${member.lastName}`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-primary-500 shadow"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        {member.firstName?.[0]}{member.lastName?.[0]}
                      </span>
                    </div>
                  )}
                  {memberStats.overdue > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {memberStats.overdue}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {member.firstName} {member.lastName}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{getServiceName(member.service)}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${getRoleColor(member.role)}`}>
                    {getRoleLabel(member.role)}
                  </span>
                </div>
              </div>

              {/* Statistiques des tâches */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">{memberStats.total}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('team.total_tasks_label')}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <CheckSquare className="w-4 h-4 text-green-500" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">{memberStats.completed}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('team.completed_tasks_label')}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">{memberStats.pending}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('team.pending_tasks_label')}</p>
                </div>
              </div>

              {/* Tâches récentes */}
              {memberTasks.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('team.recent_tasks_title')}</h4>
                  <div className="space-y-1">
                    {memberTasks.slice(0, 2).map((task) => (
                      <div key={task.id} className="flex items-center space-x-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' :
                          'bg-gray-400'
                        }`} />
                        <span className="text-gray-700 dark:text-gray-300 truncate">{task.title}</span>
                      </div>
                    ))}
                    {memberTasks.length > 2 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">+{memberTasks.length - 2} {t('team.more_tasks_text')}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{member.email}</span>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <button 
                  onClick={() => console.log('Envoyer message à', member.firstName, member.lastName)}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                  title={t('team.send_message_tooltip', { firstName: member.firstName, lastName: member.lastName })}
                  aria-label={t('team.send_message_aria_label', { firstName: member.firstName, lastName: member.lastName })}
                >
                  {t('team.send_message_button')}
                </button>
                <button className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm transition-colors"
                  title={t('team.view_profile_tooltip', { firstName: member.firstName, lastName: member.lastName })}
                  aria-label={t('team.view_profile_aria_label', { firstName: member.firstName, lastName: member.lastName })}
                >
                  {t('team.view_profile_button')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Services Section */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('team.services_title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((dept) => {
            const head = users.find(u => u.id === dept.headId);
            return (
              <div
                key={dept.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: dept.color }}
                  />
                  <h4 className="font-semibold text-gray-900 dark:text-white">{dept.name}</h4>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{dept.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {dept.memberIds.length} {t('team.members_text', { count: dept.memberIds.length })}
                  </span>
                  <span className="text-primary-600 dark:text-primary-400 font-medium">
                    {t('team.head_text')}: {head ? `${head.firstName} ${head.lastName}`.split(' ')[0] : t('team.na_placeholder')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Employee Loan Modal */}
      {showLoanModal && (
        <EmployeeLoanModal onClose={() => setShowLoanModal(false)} />
      )}
    </div>
  );
}
