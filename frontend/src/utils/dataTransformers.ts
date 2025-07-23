/**
 * Helpers pour transformer les données entre les formats backend et frontend
 */

import { Task, Project, Service, User, Notification, EmployeeLoan, UrgencyMode, Comment, Attachment } from '../types';
import i18n from '@/i18n';
import { t } from 'i18next';

/**
 * Transforme un service du format backend vers le format frontend
 */
export function transformService(backendService: any): Service {
  return {
    id: backendService.id,
    name: backendService.name || backendService.nom,
    description: backendService.description || '',
    headId: backendService.headId || '',
    memberIds: backendService.memberIds || [],
    color: backendService.color || '#3B82F6',
    workloadCapacity: backendService.workloadCapacity || 100,
  };
}

/**
 * Transforme une tâche du format backend vers le format frontend
 */
export function transformTask(backendTask: any): Task {
  // Compatibilité : toujours exposer creatorId/createdBy et assigneeIds/assignedTo
  const creatorId = backendTask.creatorId || backendTask.createdBy || backendTask.createur;
  const createdBy = backendTask.createdBy || backendTask.creatorId || backendTask.createur;
  const assigneeIds = backendTask.assigneeIds || backendTask.assignedTo || (backendTask.assignee ? [backendTask.assignee] : []);
  const assignedTo = backendTask.assignedTo || backendTask.assigneeIds || (backendTask.assignee ? [backendTask.assignee] : []);
  return {
    id: backendTask.id,
    title: backendTask.title || backendTask.titre,
    description: backendTask.description || '',
    status: backendTask.status || backendTask.statut || 'todo',
    priority: backendTask.priority || backendTask.priorite || 'medium',
    deadline: backendTask.deadline ? new Date(backendTask.deadline) : new Date(),
    createdAt: backendTask.createdAt ? new Date(backendTask.createdAt) : new Date(),
    updatedAt: backendTask.updatedAt ? new Date(backendTask.updatedAt) : new Date(),
    createdBy,
    creatorId,
    assignedTo,
    assigneeIds,
    projectId: backendTask.projectId || backendTask.projet || backendTask.project || '',
    serviceId: backendTask.serviceId || backendTask.service || '',
    tags: backendTask.tags || [],
    attachments: backendTask.attachments || [],
    comments: backendTask.comments || [],
    timeTracked: backendTask.timeTracked || backendTask.temps_suivi || 0,
    estimatedTime: backendTask.estimatedTime || backendTask.temps_estime || 0,
    completedAt: backendTask.completedAt ? new Date(backendTask.completedAt) : undefined,
    workloadPoints: backendTask.workloadPoints || backendTask.points_charge || 1,
    type: backendTask.type || backendTask.type_tache || 'personnel',
  };
}

/**
 * Transforme un projet du format backend vers le format frontend
 */
export function transformProject(backendProject: any): Project {
  return {
    id: backendProject.id,
    name: backendProject.name || backendProject.nom,
    description: backendProject.description || '',
    status: backendProject.status || backendProject.statut || 'planning',
    startDate: backendProject.startDate || backendProject.date_debut || '',
    endDate: backendProject.endDate
      ? (backendProject.endDate instanceof Date
          ? backendProject.endDate.toISOString().split('T')[0]
          : backendProject.endDate)
      : (backendProject.date_fin
          ? (backendProject.date_fin instanceof Date
              ? backendProject.date_fin.toISOString().split('T')[0]
              : backendProject.date_fin)
          : ''),
    // actualEndDate retiré car non présent dans le type Project
    riskLevel: backendProject.riskLevel || backendProject.risk_level,
    color: backendProject.color || '#10B981',
    progress: backendProject.progress || backendProject.progres || 0,
    creatorId: backendProject.creatorId || backendProject.createur,
    chefId: backendProject.chefId || backendProject.chef,
    memberIds: backendProject.memberIds || backendProject.membres || backendProject.teamMembers || [],
    serviceIds: backendProject.serviceIds || backendProject.services || (backendProject.service ? [backendProject.service] : []),
    serviceId: backendProject.serviceId || backendProject.service || '',
    tasks: backendProject.tasks || [],
    taskCount: backendProject.taskCount,
    attachments: backendProject.attachments || [],
    memberDetails: backendProject.memberDetails,
    chefDetails: backendProject.chefDetails,
    completedTaskCount: backendProject.completedTaskCount,
  };
}

/**
 * Transforme un utilisateur du format backend vers le format frontend
 */
export function transformUser(backendUser: any): User {
  return {
    id: backendUser.id,
    username: backendUser.username,
    email: backendUser.email,
    firstName: backendUser.firstName || backendUser.first_name,
    lastName: backendUser.lastName || backendUser.last_name,
    role: backendUser.role || 'EMPLOYEE',
    service: backendUser.service,
    permissions: backendUser.permissions,
    profilePhoto: backendUser.profilePhoto,
    lastLogin: backendUser.lastLogin,
    isOnline: backendUser.isOnline,
    serviceDetails: backendUser.serviceDetails,
    fullName: backendUser.fullName,
  };
}

/**
 * Transforme une notification du format backend vers le format frontend
 */
export function transformNotification(backendNotification: any): Notification {
  let title = backendNotification.title || backendNotification.titre;
  let message = backendNotification.message;
  if ((backendNotification.type || '') === 'status_update') {
    // Chercher le statut dans le message et le traduire
    // Correction : on recherche le mot 'statut' suivi d'un nom de statut, et on remplace proprement
    const match = /statut(?: de la tâche)? ["“”«»]?([a-zA-Z_]+)["“”«»]?/i.exec(message);
    if (match && match[1]) {
      const frStatus = translateStatus(match[1]);
      // On remplace toute la séquence 'statut ... à <status>' par 'statut ... à <frStatus>'
      message = message.replace(match[1], frStatus);
      // Correction : éviter la répétition de 'statut' ou 'Statut inconnu' en double
      message = message.replace(/Statut inconnutatut/g, 'Statut inconnu');
      if (title && title.includes(match[1])) {
        title = title.replace(match[1], frStatus);
      }
    }
    // Harmonisation : si le message commence par 'Le Statut inconnutatut', corriger en 'Le statut inconnu'
    message = message.replace(/^Le Statut inconnutatut/, 'Le statut inconnu');
  }
  return {
    id: backendNotification.id,
    userId: backendNotification.userId || backendNotification.utilisateur,
    type: backendNotification.type,
    title,
    message,
    isRead: backendNotification.isRead ?? backendNotification.est_lue ?? false,
    createdAt: backendNotification.createdAt ? new Date(backendNotification.createdAt) : new Date(),
    relatedId: backendNotification.relatedId,
    priority: backendNotification.priority || backendNotification.priorite || 'medium',
    expiresAt: backendNotification.expiresAt ? new Date(backendNotification.expiresAt) : undefined,
  };
}

/**
 * Transforme un prêt d'employé du format backend vers le format frontend
 */
export function transformEmployeeLoan(backendLoan: any): EmployeeLoan {
  return {
    id: backendLoan.id,
    employeeId: backendLoan.employeeId || backendLoan.employe,
    fromServiceId: backendLoan.fromServiceId || backendLoan.service_source,
    toServiceId: backendLoan.toServiceId || backendLoan.service_destination,
    startDate: new Date(backendLoan.startDate || backendLoan.date_debut),
    endDate: new Date(backendLoan.endDate || backendLoan.date_fin),
    reason: backendLoan.reason || backendLoan.raison,
    status: backendLoan.status || backendLoan.statut || 'pending',
    approvedBy: backendLoan.approvedBy,
    workloadImpact: backendLoan.workloadImpact || backendLoan.impact_charge || 0,
    cost: backendLoan.cost || backendLoan.cout,
  };
}

/**
 * Transforme un mode d'urgence du format backend vers le format frontend
 */
export function transformUrgencyMode(backendMode: any): UrgencyMode {
  return {
    id: backendMode.id,
    serviceId: backendMode.serviceId || '',
    title: backendMode.title || backendMode.titre,
    description: backendMode.description || '',
    isActive: backendMode.isActive || backendMode.est_actif || false,
    startDate: new Date(backendMode.startDate || backendMode.date_debut),
    endDate: backendMode.endDate ? new Date(backendMode.endDate || backendMode.date_fin) : undefined,
    activatedBy: backendMode.activatedBy || '',
    severity: backendMode.severity || backendMode.severite || 'medium',
    affectedProjects: backendMode.affectedProjects || [],
    resourcesAllocated: backendMode.resourcesAllocated || 0,
  };
}

/**
 * Transforme un commentaire du format backend vers le format frontend
 * users?: User[] permet d'enrichir avec le nom complet de l'auteur
 */
export function transformComment(backendComment: any, users?: User[]): Comment {
  let authorFullName = undefined;
  if (users && backendComment.authorId) {
    const user = users.find(u => u.id === backendComment.authorId);
    if (user) authorFullName = user.fullName || `${user.firstName} ${user.lastName}`;
  }
  return {
    id: backendComment.id,
    content: backendComment.content || backendComment.contenu,
    authorId: backendComment.authorId || backendComment.auteur,
    createdAt: new Date(backendComment.createdAt || backendComment.date_creation),
    mentions: backendComment.mentions || [],
    parentId: backendComment.parentId,
    replies: backendComment.replies || [],
    isEdited: backendComment.isEdited || backendComment.est_modifie || false,
    editedAt: backendComment.editedAt ? new Date(backendComment.editedAt) : undefined,
    authorFullName,
  };
}

/**
 * Transforme une pièce jointe du format backend vers le format frontend
 */
export function transformAttachment(backendAttachment: any): Attachment {
  return {
    id: backendAttachment.id,
    name: backendAttachment.name || backendAttachment.nom,
    type: backendAttachment.type || backendAttachment.type_mime,
    size: backendAttachment.size,
    url: backendAttachment.url,
    uploadedBy: backendAttachment.uploadedBy || backendAttachment.telecharge_par || backendAttachment.uploadedById,
    uploadedAt: (backendAttachment.uploadedAt || backendAttachment.date_creation)
      ? new Date(backendAttachment.uploadedAt || backendAttachment.date_creation).toISOString()
      : undefined,
    isEncrypted: backendAttachment.isEncrypted || backendAttachment.est_chiffre || false,
    relatedTo: backendAttachment.relatedTo || '',
    relatedId: backendAttachment.relatedId || '',
    // checksum retiré car non présent dans le type Attachment
  };
}

/**
 * Transforme une tâche du format frontend vers le format backend
 */
export function transformTaskToBackend(frontendTask: Partial<Task>): any {
  const payload: any = {
    title: frontendTask.title,
    description: frontendTask.description,
    status: frontendTask.status,
    priority: frontendTask.priority,
    deadline: frontendTask.deadline instanceof Date ? frontendTask.deadline.toISOString() : frontendTask.deadline,
    // Correction : n'envoyer que le premier assigné
    assignee: frontendTask.assignedTo?.[0] || null,
    serviceIdInput: frontendTask.serviceId,
    estimatedTime: frontendTask.estimatedTime,
    workloadPoints: frontendTask.workloadPoints,
    type: frontendTask.type,
  };
  if (frontendTask.type === 'projet' && frontendTask.projectId) {
    payload.projectId = frontendTask.projectId;
  }
  // Ne pas envoyer projectId si ce n'est pas une tâche de projet
  // Ne pas envoyer creator
  if ('creator' in payload) {
    delete payload.creator;
  }
  return payload;
}

/**
 * Transforme un projet du format frontend vers le format backend
 */
export function transformProjectToBackend(frontendProject: Partial<Project>): any {
  return {
    name: frontendProject.name,
    description: frontendProject.description,
    statut: frontendProject.status,
    date_debut: frontendProject.startDate,
    date_fin: frontendProject.endDate,
  };
}

/**
 * Transforme une notification du format frontend vers le format backend
 */
export function transformNotificationToBackend(frontendNotification: Partial<Notification>): any {
  return {
    type: frontendNotification.type,
    titre: frontendNotification.title,
    message: frontendNotification.message,
    priorite: frontendNotification.priority,
  };
}

/**
 * Transforme un prêt d'employé du format frontend vers le format backend
 */
export function transformEmployeeLoanToBackend(frontendLoan: Partial<EmployeeLoan>): any {
  return {
    employe: frontendLoan.employeeId,
    service_source: frontendLoan.fromServiceId,
    service_destination: frontendLoan.toServiceId,
    date_debut: frontendLoan.startDate?.toISOString().split('T')[0],
    date_fin: frontendLoan.endDate?.toISOString().split('T')[0],
    raison: frontendLoan.reason,
    statut: frontendLoan.status,
    impact_charge: frontendLoan.workloadImpact,
    cout: frontendLoan.cost,
  };
}

/**
 * Transforme un mode d'urgence du format frontend vers le format backend
 */
export function transformUrgencyModeToBackend(frontendMode: Partial<UrgencyMode>): any {
  return {
    titre: frontendMode.title,
    description: frontendMode.description,
    est_actif: frontendMode.isActive,
    date_debut: frontendMode.startDate?.toISOString(),
    date_fin: frontendMode.endDate?.toISOString(),
    severite: frontendMode.severity,
    ressources_allouees: frontendMode.resourcesAllocated?.toString(),
  };
}

/**
 * Transforme un commentaire du format frontend vers le format backend
 */
export function transformCommentToBackend(frontendComment: Partial<Comment>): any {
  return {
    content: frontendComment.content,
    mentions: frontendComment.mentions,
  };
}

/**
 * Transforme un message du format backend vers le format frontend
 * users?: User[] permet d'enrichir avec l'objet User complet (profilePhoto, etc.)
 */
export function transformMessage(backendMessage: any, users?: User[]): Message {
  // Supporte sender ou author (backend)
  let author = backendMessage.author || backendMessage.sender;
  if (users && author && typeof author === 'string') {
    // Si author est un id, enrichir avec l'objet User
    const userObj = users.find(u => u.id === author);
    if (userObj) author = userObj;
  } else if (users && author && author.id) {
    // Si author est un objet partiel, enrichir avec l'objet User complet si dispo
    const userObj = users.find(u => u.id === author.id);
    if (userObj) author = { ...userObj, ...author };
  }
  return {
    id: backendMessage.id,
    content: backendMessage.content || backendMessage.contenu,
    author,
    conversation: backendMessage.conversation || backendMessage.conversation_id,
    timestamp: backendMessage.timestamp ? new Date(backendMessage.timestamp) : (backendMessage.createdAt ? new Date(backendMessage.createdAt) : new Date()),
  };
}

/**
 * Transforme un message du format frontend vers le format backend
 */
export function transformMessageToBackend(frontendMessage: Partial<Message>): any {
  return {
    content: frontendMessage.content,
    conversation: frontendMessage.conversation,
    // Ne pas envoyer author côté frontend (géré par le backend via l'utilisateur connecté)
  };
}

/**
 * Traduit un statut technique en français via i18n
 */
export function translateStatus(status: string): string {
  switch (status) {
    case 'todo':
      return t('taskBoard.columns.todo', 'À faire');
    case 'in_progress':
      return t('taskBoard.columns.inProgress', 'En cours');
    case 'review':
      return t('taskBoard.columns.review', 'En relecture');
    case 'completed':
      return t('taskBoard.columns.completed', 'Terminé');
    case 'planning':
      return t('projects.onPlanning', 'En planification');
    case 'active':
      return t('projects.activeProjects', 'Projets actifs');
    case 'on_hold':
      return t('projects.onHold', 'En pause');
    case 'completed_project':
      return t('projects.completed', 'Terminé');
    default:
      return t('task.status.unknown', 'Statut inconnu');
  }
}
