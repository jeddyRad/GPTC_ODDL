import { Notification, Task, Project, Comment } from '@/types';

// Service pour gérer les notifications automatiques
export class NotificationService {
  private addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;
  private currentUserId: string;
  private users: any[];

  constructor(
    addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>,
    currentUserId: string,
    users: any[] = []
  ) {
    this.addNotification = addNotification;
    this.currentUserId = currentUserId;
    this.users = users;
  }

  // Notification lors de l'assignation d'une tâche
  async notifyTaskAssigned(task: Task, assignedUserIds: string[]) {
    const promises = assignedUserIds
      .filter(userId => userId !== this.currentUserId) // Ne pas notifier l'assigneur
      .map(userId => 
        this.addNotification({
          userId,
          type: 'task_assigned',
          title: 'Nouvelle tâche assignée',
          message: `La tâche "${task.title}" vous a été assignée.`,
          priority: task.priority === 'urgent' ? 'high' : 'medium',
          relatedId: task.id,
          isRead: false,
        })
      );

    await Promise.all(promises);
  }

  // Notification lors d'une mention dans un commentaire
  async notifyCommentMention(comment: Comment, task: Task, mentionedUserIds: string[]) {
    const promises = mentionedUserIds
      .filter(userId => userId !== comment.authorId) // Ne pas notifier l'auteur
      .map(userId => 
        this.addNotification({
          userId,
          type: 'comment_mention',
          title: 'Vous avez été mentionné',
          message: `Vous avez été mentionné dans un commentaire sur la tâche "${task.title}".`,
          priority: 'medium',
          relatedId: task.id,
          isRead: false,
        })
      );

    await Promise.all(promises);
  }

  // Notification d'approche d'échéance
  async notifyDeadlineApproaching(task: Task) {
    const deadline = new Date(task.deadline);
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const hoursUntilDeadline = timeDiff / (1000 * 3600);

    // Notifier si l'échéance est dans moins de 24h
    if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 0) {
      const promises = task.assignedTo.map(userId =>
        this.addNotification({
          userId,
          type: 'deadline_approaching',
          title: 'Échéance proche',
          message: `La tâche "${task.title}" arrive à échéance dans ${Math.round(hoursUntilDeadline)}h.`,
          priority: 'high',
          relatedId: task.id,
          isRead: false,
        })
      );

      await Promise.all(promises);
    }
  }

  // Notification lors de mise à jour de projet
  async notifyProjectUpdate(project: Project, updateType: 'status' | 'team' | 'deadline') {
    let message = '';
    switch (updateType) {
      case 'status':
        message = `Le statut du projet "${project.name}" a été mis à jour.`;
        break;
      case 'team':
        message = `L'équipe du projet "${project.name}" a été modifiée.`;
        break;
      case 'deadline':
        message = `Les dates du projet "${project.name}" ont été modifiées.`;
        break;
    }

    const promises = project.teamMembers
      .filter(userId => userId !== this.currentUserId)
      .map(userId =>
        this.addNotification({
          userId,
          type: 'project_update',
          title: 'Mise à jour de projet',
          message,
          priority: 'medium',
          relatedId: project.id,
          isRead: false,
        })
      );

    await Promise.all(promises);
  }

  // Notification de sécurité
  async notifySecurityAlert(userId: string, message: string) {
    await this.addNotification({
      userId,
      type: 'security_alert',
      title: 'Alerte de sécurité',
      message,
      priority: 'high',
      isRead: false,
    });
  }

  // Vérifier les échéances pour tous les utilisateurs
  async checkAllDeadlines(tasks: Task[]) {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasksNearDeadline = tasks.filter(task => {
      const deadline = new Date(task.deadline);
      return deadline >= now && deadline <= in24Hours && task.status !== 'completed';
    });

    for (const task of tasksNearDeadline) {
      await this.notifyDeadlineApproaching(task);
    }
  }

  // Extraire les mentions d'un texte de commentaire
  static extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  // Résoudre les noms d'utilisateur en IDs
  resolveMentionIds(mentions: string[]): string[] {
    return mentions
      .map(mention => {
        const user = this.users.find(u => 
          u.username?.toLowerCase() === mention.toLowerCase() ||
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(mention.toLowerCase())
        );
        return user?.id;
      })
      .filter(Boolean);
  }
}
