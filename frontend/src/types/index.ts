export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'DIRECTOR';
  service: string | null;
  permissions?: string[];
  phone?: string;
  bio?: string;
  profilePhoto?: string;
  lastLogin?: string;
  isOnline?: boolean; // Ajout pour compatibilité avec les usages dans les vues/messages
  serviceDetails?: Service;
  fullName?: string; // Ajout pour compatibilité affichage
}

export interface Service {
  id: string;
  name: string;
  description: string;
  headId: string | null;
  memberIds: string[];
  color: string;
  workloadCapacity: number;
}



export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: Date | string;
  createdAt: string | Date;
  updatedAt: string | Date;
  // Champs pour compatibilité backend et frontend
  createdBy?: string;
  creatorId?: string;
  assignedTo?: string[];
  assigneeIds?: string[];
  projectId?: string;
  serviceId: string;
  tags: string[];
  attachments?: Attachment[];
  comments: Comment[];
  timeTracked: number; // in minutes
  estimatedTime: number; // in minutes
  completedAt?: Date;
  workloadPoints: number;
  type: 'personnel' | 'service' | 'projet';
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  progress?: number;
  color?: string;
  startDate?: string;
  endDate?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  creatorId?: string;
  chefId?: string;
  memberIds?: string[];
  // serviceId = service principal, serviceIds = services secondaires
  serviceId: string;
  serviceIds?: string[];
  tasks?: string[];
  attachments?: Attachment[];
  memberDetails?: { id: string; fullName: string; role: string }[];
  chefDetails?: { id: string; fullName: string; role: string };
  taskCount?: number;
  completedTaskCount?: number;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  createdAt: Date;
  mentions: string[];
  parentId?: string;
  replies: Comment[];
  isEdited: boolean;
  editedAt?: Date;
}

export interface Attachment {
  id?: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedBy?: string;
  uploadedAt?: string;
  isEncrypted?: boolean;
  relatedTo: 'task' | 'project' | 'user';
  relatedId: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'task_assigned' | 'comment_mention' | 'deadline_approaching' | 'project_update' | 'security_alert';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  relatedId?: string; // task or project ID
  priority: 'low' | 'medium' | 'high';
  expiresAt?: Date;
}

export interface EmployeeLoan {
  id: string;
  employeeId: string;
  fromServiceId: string;
  toServiceId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'rejected';
  approvedBy?: string;
  workloadImpact: number;
  cost?: number;
}

export interface UrgencyMode {
  id: string;
  serviceId: string;
  title: string;
  description: string;
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  activatedBy: string;
  severity: 'medium' | 'high' | 'critical';
  affectedProjects: string[];
  resourcesAllocated: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: 'task' | 'project' | 'user' | 'service' | 'system';
  entityId: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

export interface BackupRecord {
  id: string;
  timestamp: Date;
  type: 'daily' | 'manual' | 'emergency';
  size: number;
  status: 'completed' | 'failed' | 'in_progress';
  encryptionKey: string;
  retentionUntil: Date;
  checksum: string;
}

export interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'failed_login' | 'permission_denied' | 'data_access' | 'suspicious_activity';
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  ipAddress: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface GDPRRequest {
  id: string;
  userId: string;
  type: 'data_export' | 'data_deletion' | 'data_rectification' | 'consent_withdrawal';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  reason?: string;
  dataExported?: string; // file path or URL
}

export interface WorkloadMetrics {
  userId: string;
  serviceId: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
  tasksCompleted: number;
  timeSpent: number; // in minutes
  efficiency: number; // percentage
  workloadPoints: number;
  overtimeHours: number;
  burnoutRisk: 'low' | 'medium' | 'high';
}

export interface PerformanceReport {
  id: string;
  type: 'user' | 'service' | 'project' | 'system';
  period: { start: Date; end: Date };
  generatedAt: Date;
  generatedBy: string;
  format: 'pdf' | 'csv' | 'json';
  data: Record<string, any>;
  filePath?: string;
  isScheduled: boolean;
  recipients: string[];
}

export interface Urgency {
  id: string;
  // ... other fields
}

// Types for Analytics
export interface MainMetrics {
  totalTasks: number;
  completedTasks: number;
  urgentTasks: number;
  overdueTasks: number;
  completionRate: number;
  activeProjects: number;
  planningProjects: number;
  globalEfficiency: number;
}

export interface ServicePerformance {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  efficiency: number;
}

export interface SystemMetrics {
  activeUsers: number;
  totalUsers: number;
  uptime: number;
  systemLoad: number;
}

export interface AnalyticsData {
  mainMetrics: MainMetrics;
  servicePerformance: ServicePerformance[];
  systemMetrics: SystemMetrics;
}

// Conversation et Message en anglais, propriétés en camelCase
export interface Conversation {
  id: string;
  name: string;
  participants: User[];
  messages?: Message[];
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  isOnline?: boolean;
}

export interface Message {
  id: string;
  content: string;
  author: User;
  conversation: string;
  timestamp: string;
}