import { useData } from '@/contexts/DataContext';
import { useState } from 'react';
import { Users, Mail, Phone, MapPin, Clock, AlertTriangle, MessageCircle, User as UserIcon, List, Grid, Plus } from 'lucide-react';
import { TaskModal } from '@/components/modals/TaskModal';
import { MessagesView } from '@/components/views/MessagesView';
import { User, Task } from '@/types';

// 1. Composant utilitaire pour avatar avec photo, initiales et badge de statut
function ProfileAvatar({ user, size = 48 }: { user: User, size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {user.profilePhoto ? (
        <img src={user.profilePhoto} alt="avatar" className="rounded-full object-cover bg-gray-300 dark:bg-gray-600 border border-gray-200 dark:border-gray-700" style={{ width: size, height: size }} />
      ) : (
        <span className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-700 text-white font-bold border border-gray-200 dark:border-gray-700"
          style={{ width: size, height: size, fontSize: size / 2 }}
          aria-label={user.fullName || user.username}
        >
          {(user.fullName || user.username).split(' ').map(n => n[0]).join('').slice(0, 2)}
        </span>
      )}
      {/* Badge statut en ligne/hors ligne */}
      <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
    </div>
  );
}

export function TeamView() {
  const { users, services, employeeLoans, tasks } = useData();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTo, setMessageTo] = useState<User | null>(null);
  const [filterService, setFilterService] = useState<string>('');
  const [filterRole, setFilterRole] = useState('');
  const [filterOnline, setFilterOnline] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalAssignee, setTaskModalAssignee] = useState<User | null>(null);

  // Sécurisation des accès tableaux
  const safeUsers = Array.isArray(users) ? users : [];
  const safeDepartments = Array.isArray(services) ? services : [];
  const safeEmployeeLoans = Array.isArray(employeeLoans) ? employeeLoans : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Statistiques
  const totalMembers = safeUsers.length;
  const onlineMembers = safeUsers.filter(u => u.isOnline).length;
  const activeLoanRequests = safeEmployeeLoans.filter(loan => loan.status === 'pending' || loan.status === 'approved');

  // Filtres avancés
  let filteredUsers = safeUsers.filter(u =>
    (u.fullName || u.username).toLowerCase().includes(search.toLowerCase())
  );
  if (filterService) filteredUsers = filteredUsers.filter(u => u.service === filterService);
  if (filterRole) filteredUsers = filteredUsers.filter(u => u.role === filterRole);
  if (filterOnline) filteredUsers = filteredUsers.filter(u => (filterOnline === 'online' ? u.isOnline : !u.isOnline));

  // Helpers
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrateur';
      case 'MANAGER': return 'Manager';
      case 'EMPLOYEE': return 'Employé';
      case 'DIRECTOR': return 'Directeur';
      default: return role;
    }
  };
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      case 'MANAGER': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
      case 'EMPLOYEE': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'DIRECTOR': return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };
  const getProfilePic = (user: any) => user.profilePhoto || '/default-avatar.png';
  const getStatusLabel = (u: any) => u.isOnline ? 'En ligne' : (u.lastLogin ? `Vu il y a ${Math.floor((Date.now() - new Date(u.lastLogin).getTime()) / (1000 * 60))} min` : 'Statut inconnu');

  // Uniques services et rôles pour les filtres
  const uniqueServices = Array.from(new Set(safeUsers.map(u => u.service).filter(Boolean)));
  const uniqueRoles = Array.from(new Set(safeUsers.map(u => u.role)));

  // Ouvre TaskModal pré-rempli avec l'utilisateur comme assigné
  const handleAssignTask = (user: User) => {
    setTaskModalAssignee(user);
    setShowTaskModal(true);
  };

  // Ouvre la messagerie avec l'utilisateur (modale MessagesView centrée sur la conversation)
  const handleOpenMessage = (user: User) => {
    // Guard : n'ouvre pas la modale si elle est déjà ouverte ou si messageTo est déjà défini
    if (showMessageModal || messageTo) return;
    setMessageTo(user);
    setShowMessageModal(true);
  };

  // Ferme la modale d’assignation de tâche
  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setTaskModalAssignee(null);
  };

  // Ferme la modale de messagerie
  const handleCloseMessageModal = () => {
    setShowMessageModal(false);
    setMessageTo(null);
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full transition-colors duration-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Équipe</h2>
          <p className="text-gray-600 dark:text-gray-400">Gérez votre équipe et les collaborations inter-services</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <select value={filterService} onChange={e => setFilterService((e.target.value as string) || '')} className="px-2 py-1 border rounded">
            <option value="">Tous services</option>
            {uniqueServices.map(s => <option key={s} value={s}>{safeDepartments.find(d => d.id === s)?.name || s}</option>)}
          </select>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-2 py-1 border rounded">
            <option value="">Tous rôles</option>
            {uniqueRoles.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
          </select>
          <select value={filterOnline} onChange={e => setFilterOnline(e.target.value)} className="px-2 py-1 border rounded">
            <option value="">Tous statuts</option>
            <option value="online">En ligne</option>
            <option value="offline">Hors ligne</option>
          </select>
          <button className={`ml-2 px-2 py-1 rounded ${viewMode === 'card' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`} onClick={() => setViewMode('card')}><Grid className="w-4 h-4" /></button>
          <button className={`px-2 py-1 rounded ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`} onClick={() => setViewMode('list')}><List className="w-4 h-4" /></button>
          <button className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 ml-2" onClick={() => { setFilterService(''); setFilterRole(''); setFilterOnline(''); setSearch(''); }} aria-label="Réinitialiser les filtres" title="Réinitialiser les filtres">Réinitialiser</button>
        </div>
      </div>

      {/* Active Loan Requests */}
      {activeLoanRequests.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Demandes de prêt actives</h3>
          </div>
          <div className="space-y-2">
            {activeLoanRequests.map((loan) => (
              <div key={loan.id || loan.employeeId + '-' + loan.fromServiceId + '-' + loan.toServiceId} className="text-sm text-yellow-700 dark:text-yellow-300">
                Prêt d'employé du {safeDepartments.find(d => d.id === loan.fromServiceId)?.name} vers {safeDepartments.find(d => d.id === loan.toServiceId)?.name} -
                <span className="font-medium ml-1 capitalize">{loan.status}</span>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Membres</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalMembers}</p>
            </div>
            <Users className="w-8 h-8 text-primary-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En ligne</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{onlineMembers}</p>
            </div>
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Services</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{safeDepartments.length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Prêts Actifs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{activeLoanRequests.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Team Members Grid or List */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((member) => (
            <div
              key={member.id || member.username}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start space-x-4">
                <div className="relative">
                  <ProfileAvatar user={member} size={48} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {member.fullName || member.username}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{safeDepartments.find(d => d.id === member.service)?.name || member.service}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${getRoleColor(member.role)}`}>
                    {getRoleLabel(member.role)}
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  <span>{member.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>{member.bio}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{getStatusLabel(member)}</span>
                </div>
              </div>
              {/* Remplace les gros boutons d'action par des boutons icônes compacts */}
              <div className="mt-4 flex space-x-2">
                <button
                  className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full transition-colors focus:ring-2 focus:ring-primary-400"
                  aria-label={`Envoyer un message à ${member.fullName || member.username}`}
                  title={`Envoyer un message à ${member.fullName || member.username}`}
                  onClick={() => handleOpenMessage(member)}
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button
                  className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full transition-colors focus:ring-2 focus:ring-primary-400"
                  aria-label={`Voir le profil de ${member.fullName || member.username}`}
                  title={`Voir le profil de ${member.fullName || member.username}`}
                  onClick={() => setSelectedUser(member)}
                >
                  <UserIcon className="w-5 h-5" />
                </button>
                <button
                  className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors focus:ring-2 focus:ring-green-400"
                  aria-label={`Assigner une tâche à ${member.fullName || member.username}`}
                  title={`Assigner une tâche à ${member.fullName || member.username}`}
                  onClick={() => handleAssignTask(member)}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2">Avatar</th>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Rôle</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(member => (
                <tr key={member.id || member.username} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-2"><ProfileAvatar user={member} size={32} /></td>
                  <td className="px-4 py-2">{member.fullName || member.username}</td>
                  <td className="px-4 py-2">{safeDepartments.find(d => d.id === member.service)?.name || member.service}</td>
                  <td className="px-4 py-2"><span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(member.role)}`}>{getRoleLabel(member.role)}</span></td>
                  <td className="px-4 py-2">{getStatusLabel(member)}</td>
                  <td className="px-4 py-2 flex gap-1">
                    <button className="bg-primary-600 hover:bg-primary-700 text-white px-2 py-1 rounded text-xs flex items-center gap-1" aria-label={`Envoyer un message à ${member.fullName || member.username}`} title={`Envoyer un message à ${member.fullName || member.username}`} onClick={() => handleOpenMessage(member)}><MessageCircle className="w-4 h-4" />Message</button>
                    <button className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs flex items-center gap-1" aria-label={`Voir le profil de ${member.fullName || member.username}`} title={`Voir le profil de ${member.fullName || member.username}`} onClick={() => setSelectedUser(member)}><UserIcon className="w-4 h-4" />Profil</button>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs flex items-center gap-1" aria-label={`Assigner une tâche à ${member.fullName || member.username}`} title={`Assigner une tâche à ${member.fullName || member.username}`} onClick={() => handleAssignTask(member)}><Plus className="w-4 h-4" />Assigner</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Departments Section */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {safeDepartments.map((dept) => (
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
                  {dept.memberIds?.length || 0} membre{dept.memberIds?.length > 1 ? 's' : ''}
                </span>
                <span className="text-primary-600 dark:text-primary-400 font-medium">
                  Chef: {safeUsers.find(m => m.id === dept.headId)?.fullName?.split(' ')[0] || safeUsers.find(m => m.id === dept.headId)?.username}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal fiche membre détaillée */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedUser(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg relative" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="absolute top-2 right-2" onClick={() => setSelectedUser(null)}><UserIcon /></button>
            <div className="flex items-center gap-4 mb-4">
              <ProfileAvatar user={selectedUser} size={64} />
              <div>
                <div className="font-semibold text-lg">{selectedUser.fullName || selectedUser.username}</div>
                <div className="text-xs text-gray-500">{getRoleLabel(selectedUser.role)} {selectedUser.service ? `- ${safeDepartments.find((d: any) => d.id === selectedUser.service)?.name}` : ''}</div>
                <div className="text-xs text-gray-400 mt-1">{getStatusLabel(selectedUser)}</div>
              </div>
            </div>
            <div className="mb-2 font-semibold">Tâches en cours</div>
            <ul className="mb-4 max-h-32 overflow-y-auto">
              {safeTasks.filter(t => t.assignedTo?.includes(selectedUser.id) && t.status !== 'completed').map(t => (
                <li key={t.id} className="text-sm mb-1 flex items-center gap-2">
                  {t.title}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ml-2 ${t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : t.status === 'todo' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-800'}`}>{t.status === 'in_progress' ? 'En cours' : t.status === 'todo' ? 'À faire' : 'Terminé'}</span>
                </li>
              ))}
              {safeTasks.filter(t => t.assignedTo?.includes(selectedUser.id) && t.status !== 'completed').length === 0 && (
                <li className="text-xs text-gray-400">Aucune tâche en cours</li>
              )}
            </ul>
            <div className="mb-2 font-semibold">Tâches terminées</div>
            <ul className="mb-4 max-h-32 overflow-y-auto">
              {safeTasks.filter(t => t.assignedTo?.includes(selectedUser.id) && t.status === 'completed').map(t => (
                <li key={t.id} className="text-sm mb-1">{t.title}</li>
              ))}
              {safeTasks.filter(t => t.assignedTo?.includes(selectedUser.id) && t.status === 'completed').length === 0 && (
                <li className="text-xs text-gray-400">Aucune tâche terminée</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Modal messagerie interne (ouvre MessagesView sur la conversation directe) */}
      {showMessageModal && messageTo && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={e => {
            // Permet la fermeture uniquement si le clic cible l'overlay (pas la modale elle-même)
            if (e.target === e.currentTarget) handleCloseMessageModal();
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-0 w-full max-w-3xl relative" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="absolute top-2 right-2 z-10" onClick={handleCloseMessageModal}><MessageCircle /></button>
            <MessagesView directUser={messageTo} onClose={handleCloseMessageModal} />
          </div>
        </div>
      )}

      {/* Modal assignation rapide de tâche */}
      {showTaskModal && taskModalAssignee && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={handleCloseTaskModal}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-0 w-full max-w-lg relative" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="absolute top-2 right-2 z-10" onClick={handleCloseTaskModal}><Plus /></button>
            <TaskModal
              task={null}
              onClose={handleCloseTaskModal}
              defaultAssignedTo={[taskModalAssignee.id]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
