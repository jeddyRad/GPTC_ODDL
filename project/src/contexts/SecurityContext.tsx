import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SecurityEvent, GDPRRequest, BackupRecord, ActivityLog } from '../types';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

interface SecurityContextType {
  securityEvents: SecurityEvent[];
  gdprRequests: GDPRRequest[];
  backupRecords: BackupRecord[];
  activityLogs: ActivityLog[];
  logActivity: (action: string, entityType: string, entityId: string, details?: Record<string, any>) => void;
  logSecurityEvent: (type: SecurityEvent['type'], description: string, severity: SecurityEvent['severity'], userId?: string) => void;
  createGDPRRequest: (userId: string, type: GDPRRequest['type'], reason?: string) => void;
  processGDPRRequest: (requestId: string, status: GDPRRequest['status'], processedBy: string) => void;
  exportUserData: (userId: string) => Promise<string>;
  anonymizeUserData: (userId: string) => Promise<void>;
  createBackup: (type: BackupRecord['type']) => Promise<void>;
  encryptData: (data: string) => string;
  decryptData: (encryptedData: string) => string;
  validateDataIntegrity: (data: any, checksum: string) => boolean;
  getSecurityMetrics: () => {
    totalEvents: number;
    criticalEvents: number;
    failedLogins: number;
    suspiciousActivities: number;
  };
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const ENCRYPTION_KEY = 'GPTC-2024-Security-Key-AES256';
const RETENTION_PERIOD = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [gdprRequests, setGDPRRequests] = useState<GDPRRequest[]>([]);
  const [backupRecords, setBackupRecords] = useState<BackupRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    // Load security data from localStorage
    const savedEvents = localStorage.getItem('taskflow-security-events');
    const savedGDPR = localStorage.getItem('taskflow-gdpr-requests');
    const savedBackups = localStorage.getItem('taskflow-backups');
    const savedLogs = localStorage.getItem('taskflow-activity-logs');

    if (savedEvents) {
      setSecurityEvents(JSON.parse(savedEvents).map((event: any) => ({
        ...event,
        timestamp: new Date(event.timestamp),
        resolvedAt: event.resolvedAt ? new Date(event.resolvedAt) : undefined,
      })));
    }

    if (savedGDPR) {
      setGDPRRequests(JSON.parse(savedGDPR).map((request: any) => ({
        ...request,
        requestedAt: new Date(request.requestedAt),
        processedAt: request.processedAt ? new Date(request.processedAt) : undefined,
      })));
    }

    if (savedBackups) {
      setBackupRecords(JSON.parse(savedBackups).map((backup: any) => ({
        ...backup,
        timestamp: new Date(backup.timestamp),
        retentionUntil: new Date(backup.retentionUntil),
      })));
    }

    if (savedLogs) {
      const logs = JSON.parse(savedLogs).map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));
      
      // Clean old logs (2-year retention)
      const cutoffDate = new Date(Date.now() - RETENTION_PERIOD);
      const validLogs = logs.filter((log: ActivityLog) => log.timestamp > cutoffDate);
      setActivityLogs(validLogs);
    }

    // Schedule daily backup
    const scheduleBackup = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0); // 2 AM

      const timeUntilBackup = tomorrow.getTime() - now.getTime();
      
      setTimeout(() => {
        createBackup('daily');
        setInterval(() => createBackup('daily'), 24 * 60 * 60 * 1000); // Every 24 hours
      }, timeUntilBackup);
    };

    scheduleBackup();
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('taskflow-security-events', JSON.stringify(securityEvents));
  }, [securityEvents]);

  useEffect(() => {
    localStorage.setItem('taskflow-gdpr-requests', JSON.stringify(gdprRequests));
  }, [gdprRequests]);

  useEffect(() => {
    localStorage.setItem('taskflow-backups', JSON.stringify(backupRecords));
  }, [backupRecords]);

  useEffect(() => {
    localStorage.setItem('taskflow-activity-logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

  const logActivity = (action: string, entityType: string, entityId: string, details: Record<string, any> = {}) => {
    const user = JSON.parse(localStorage.getItem('taskflow-user') || '{}');
    
    const activity: ActivityLog = {
      id: uuidv4(),
      userId: user.id || 'system',
      action,
      entityType: entityType as ActivityLog['entityType'],
      entityId,
      details,
      timestamp: new Date(),
      ipAddress: '127.0.0.1', // In real app, get from request
      userAgent: navigator.userAgent,
      sessionId: sessionStorage.getItem('taskflow-session') || uuidv4(),
    };

    setActivityLogs(prev => [activity, ...prev]);
  };

  const logSecurityEvent = (type: SecurityEvent['type'], description: string, severity: SecurityEvent['severity'], userId?: string) => {
    const event: SecurityEvent = {
      id: uuidv4(),
      type,
      userId,
      severity,
      description,
      timestamp: new Date(),
      ipAddress: '127.0.0.1',
      resolved: false,
    };

    setSecurityEvents(prev => [event, ...prev]);
  };

  const createGDPRRequest = (userId: string, type: GDPRRequest['type'], reason?: string) => {
    const request: GDPRRequest = {
      id: uuidv4(),
      userId,
      type,
      status: 'pending',
      requestedAt: new Date(),
      reason,
    };

    setGDPRRequests(prev => [request, ...prev]);
    logActivity('gdpr_request_created', 'user', userId, { type, reason });
  };

  const processGDPRRequest = (requestId: string, status: GDPRRequest['status'], processedBy: string) => {
    setGDPRRequests(prev => prev.map(request => 
      request.id === requestId 
        ? { ...request, status, processedAt: new Date(), processedBy }
        : request
    ));

    logActivity('gdpr_request_processed', 'user', requestId, { status, processedBy });
  };

  const exportUserData = async (userId: string): Promise<string> => {
    // Simulate data export
    const userData = {
      user: JSON.parse(localStorage.getItem('taskflow-user') || '{}'),
      tasks: JSON.parse(localStorage.getItem('taskflow-tasks') || '[]').filter((task: any) => 
        task.createdBy === userId || task.assignedTo.includes(userId)
      ),
      projects: JSON.parse(localStorage.getItem('taskflow-projects') || '[]').filter((project: any) => 
        project.createdBy === userId || project.teamMembers.includes(userId)
      ),
      notifications: JSON.parse(localStorage.getItem('taskflow-notifications') || '[]').filter((notif: any) => 
        notif.userId === userId
      ),
      activityLogs: activityLogs.filter(log => log.userId === userId),
    };

    const exportData = JSON.stringify(userData, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    logActivity('data_exported', 'user', userId);
    return url;
  };

  const anonymizeUserData = async (userId: string): Promise<void> => {
    // Simulate data anonymization
    const anonymizedId = `anon_${uuidv4().slice(0, 8)}`;
    
    // In a real app, this would update the database
    logActivity('data_anonymized', 'user', userId, { anonymizedId });
  };

  const createBackup = async (type: BackupRecord['type']): Promise<void> => {
    const allData = {
      tasks: localStorage.getItem('taskflow-tasks'),
      projects: localStorage.getItem('taskflow-projects'),
      notifications: localStorage.getItem('taskflow-notifications'),
      users: localStorage.getItem('taskflow-user'),
      timestamp: new Date().toISOString(),
    };

    const dataString = JSON.stringify(allData);
    const encrypted = encryptData(dataString);
    const checksum = CryptoJS.SHA256(dataString).toString();

    const backup: BackupRecord = {
      id: uuidv4(),
      timestamp: new Date(),
      type,
      size: encrypted.length,
      status: 'completed',
      encryptionKey: ENCRYPTION_KEY,
      retentionUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      checksum,
    };

    setBackupRecords(prev => [backup, ...prev]);
    
    // Store encrypted backup
    localStorage.setItem(`taskflow-backup-${backup.id}`, encrypted);
    
    logActivity('backup_created', 'system', backup.id, { type, size: backup.size });
  };

  const encryptData = (data: string): string => {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  };

  const decryptData = (encryptedData: string): string => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  const validateDataIntegrity = (data: any, checksum: string): boolean => {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const calculatedChecksum = CryptoJS.SHA256(dataString).toString();
    return calculatedChecksum === checksum;
  };

  const getSecurityMetrics = () => {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentEvents = securityEvents.filter(event => event.timestamp > last24Hours);
    
    return {
      totalEvents: recentEvents.length,
      criticalEvents: recentEvents.filter(event => event.severity === 'critical').length,
      failedLogins: recentEvents.filter(event => event.type === 'failed_login').length,
      suspiciousActivities: recentEvents.filter(event => event.type === 'suspicious_activity').length,
    };
  };

  return (
    <SecurityContext.Provider value={{
      securityEvents,
      gdprRequests,
      backupRecords,
      activityLogs,
      logActivity,
      logSecurityEvent,
      createGDPRRequest,
      processGDPRRequest,
      exportUserData,
      anonymizeUserData,
      createBackup,
      encryptData,
      decryptData,
      validateDataIntegrity,
      getSecurityMetrics,
    }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}