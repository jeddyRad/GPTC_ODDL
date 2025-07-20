import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WorkloadMetrics, PerformanceReport } from '../types';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface MonitoringContextType {
  workloadMetrics: WorkloadMetrics[];
  performanceReports: PerformanceReport[];
  generateReport: (type: PerformanceReport['type'], period: { start: Date; end: Date }, format: 'pdf' | 'csv') => Promise<string>;
  getWorkloadAnalytics: (userId?: string, serviceId?: string) => {
    efficiency: number;
    burnoutRisk: string;
    tasksCompleted: number;
    overtimeHours: number;
    trend: 'up' | 'down' | 'stable';
  };
  getProjectAnalytics: (projectId: string) => {
    completion: number;
    efficiency: number;
    riskLevel: string;
    timeline: { planned: Date; actual: Date; variance: number };
  };
  getServiceAnalytics: (serviceId: string) => {
    workloadCapacity: number;
    utilization: number;
    efficiency: number;
    memberCount: number;
    activeTasks: number;
  };
  getSystemAnalytics: () => {
    totalUsers: number;
    activeUsers: number;
    totalTasks: number;
    completedTasks: number;
    systemLoad: number;
    uptime: number;
  };
  trackWorkload: (userId: string, serviceId: string, tasksCompleted: number, timeSpent: number) => void;
  scheduleReport: (type: PerformanceReport['type'], frequency: 'daily' | 'weekly' | 'monthly', recipients: string[]) => void;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(undefined);

export function MonitoringProvider({ children }: { children: ReactNode }) {
  const [workloadMetrics, setWorkloadMetrics] = useState<WorkloadMetrics[]>([]);
  const [performanceReports, setPerformanceReports] = useState<PerformanceReport[]>([]);

  useEffect(() => {
    // Load monitoring data
    const savedMetrics = localStorage.getItem('taskflow-workload-metrics');
    const savedReports = localStorage.getItem('taskflow-performance-reports');

    if (savedMetrics) {
      setWorkloadMetrics(JSON.parse(savedMetrics).map((metric: any) => ({
        ...metric,
        date: new Date(metric.date),
      })));
    }

    if (savedReports) {
      setPerformanceReports(JSON.parse(savedReports).map((report: any) => ({
        ...report,
        period: {
          start: new Date(report.period.start),
          end: new Date(report.period.end),
        },
        generatedAt: new Date(report.generatedAt),
      })));
    }

    // Initialize sample metrics
    if (!savedMetrics) {
      generateSampleMetrics();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('taskflow-workload-metrics', JSON.stringify(workloadMetrics));
  }, [workloadMetrics]);

  useEffect(() => {
    localStorage.setItem('taskflow-performance-reports', JSON.stringify(performanceReports));
  }, [performanceReports]);

  const generateSampleMetrics = () => {
    const users = ['1', '2', '3'];
    const services = ['1', '2', '3'];
    const metrics: WorkloadMetrics[] = [];

    // Generate last 30 days of metrics
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      users.forEach((userId, userIndex) => {
        const serviceId = services[userIndex];
        const tasksCompleted = Math.floor(Math.random() * 8) + 2;
        const timeSpent = tasksCompleted * (60 + Math.random() * 120); // 60-180 min per task
        const efficiency = Math.min(100, 70 + Math.random() * 30);
        const workloadPoints = tasksCompleted * (2 + Math.random() * 3);
        const overtimeHours = Math.random() > 0.7 ? Math.random() * 3 : 0;

        metrics.push({
          userId,
          serviceId,
          period: 'daily',
          date,
          tasksCompleted,
          timeSpent,
          efficiency,
          workloadPoints,
          overtimeHours,
          burnoutRisk: overtimeHours > 2 ? 'high' : efficiency < 60 ? 'medium' : 'low',
        });
      });
    }

    setWorkloadMetrics(metrics);
  };

  const generateReport = async (
    type: PerformanceReport['type'], 
    period: { start: Date; end: Date }, 
    format: 'pdf' | 'csv'
  ): Promise<string> => {
    const user = JSON.parse(localStorage.getItem('taskflow-user') || '{}');
    
    // Get data based on type
    let data: Record<string, any> = {};
    
    switch (type) {
      case 'user':
        data = getUserReportData(period);
        break;
      case 'service':
        data = getServiceReportData(period);
        break;
      case 'project':
        data = getProjectReportData(period);
        break;
      case 'system':
        data = getSystemReportData(period);
        break;
    }

    const report: PerformanceReport = {
      id: uuidv4(),
      type,
      period,
      generatedAt: new Date(),
      generatedBy: user.id || 'system',
      format,
      data,
      isScheduled: false,
      recipients: [],
    };

    setPerformanceReports(prev => [report, ...prev]);

    if (format === 'pdf') {
      return generatePDFReport(report);
    } else {
      return generateCSVReport(report);
    }
  };

  const generatePDFReport = (report: PerformanceReport): string => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('GPTC - Rapport de Performance', 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Type: ${report.type}`, 20, 50);
    doc.text(`Période: ${format(report.period.start, 'dd/MM/yyyy')} - ${format(report.period.end, 'dd/MM/yyyy')}`, 20, 60);
    doc.text(`Généré le: ${format(report.generatedAt, 'dd/MM/yyyy HH:mm')}`, 20, 70);

    // Content
    let yPosition = 90;
    
    Object.entries(report.data).forEach(([key, value]) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 30;
      }
      
      doc.text(`${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`, 20, yPosition);
      yPosition += 10;
    });

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    
    return url;
  };

  const generateCSVReport = (report: PerformanceReport): string => {
    const headers = Object.keys(report.data);
    const values = Object.values(report.data).map(v => 
      typeof v === 'object' ? JSON.stringify(v) : v
    );
    
    const csvContent = [
      headers.join(','),
      values.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    return url;
  };

  const getUserReportData = (period: { start: Date; end: Date }) => {
    const metrics = workloadMetrics.filter(m => 
      m.date >= period.start && m.date <= period.end
    );
    
    return {
      totalTasks: metrics.reduce((sum, m) => sum + m.tasksCompleted, 0),
      totalTime: metrics.reduce((sum, m) => sum + m.timeSpent, 0),
      averageEfficiency: metrics.reduce((sum, m) => sum + m.efficiency, 0) / metrics.length || 0,
      totalOvertime: metrics.reduce((sum, m) => sum + m.overtimeHours, 0),
      burnoutDays: metrics.filter(m => m.burnoutRisk === 'high').length,
    };
  };

  const getServiceReportData = (period: { start: Date; end: Date }) => {
    const tasks = JSON.parse(localStorage.getItem('taskflow-tasks') || '[]');
    const projects = JSON.parse(localStorage.getItem('taskflow-projects') || '[]');
    
    return {
      activeTasks: tasks.filter((t: any) => t.status !== 'completed').length,
      completedTasks: tasks.filter((t: any) => t.status === 'completed').length,
      activeProjects: projects.filter((p: any) => p.status === 'active').length,
      completedProjects: projects.filter((p: any) => p.status === 'completed').length,
    };
  };

  const getProjectReportData = (period: { start: Date; end: Date }) => {
    const projects = JSON.parse(localStorage.getItem('taskflow-projects') || '[]');
    
    return {
      totalProjects: projects.length,
      activeProjects: projects.filter((p: any) => p.status === 'active').length,
      completedProjects: projects.filter((p: any) => p.status === 'completed').length,
      averageProgress: projects.reduce((sum: number, p: any) => sum + p.progress, 0) / projects.length || 0,
    };
  };

  const getSystemReportData = (period: { start: Date; end: Date }) => {
    const tasks = JSON.parse(localStorage.getItem('taskflow-tasks') || '[]');
    const projects = JSON.parse(localStorage.getItem('taskflow-projects') || '[]');
    
    return {
      totalTasks: tasks.length,
      totalProjects: projects.length,
      systemUptime: 99.9,
      activeUsers: 3,
      dataSize: JSON.stringify({ tasks, projects }).length,
    };
  };

  const getWorkloadAnalytics = (userId?: string, serviceId?: string) => {
    const relevantMetrics = workloadMetrics.filter(m => {
      if (userId && m.userId !== userId) return false;
      if (serviceId && m.serviceId !== serviceId) return false;
      return true;
    });

    const recent = relevantMetrics.slice(0, 7); // Last 7 days
    const previous = relevantMetrics.slice(7, 14); // Previous 7 days

    const recentAvg = recent.reduce((sum, m) => sum + m.efficiency, 0) / recent.length || 0;
    const previousAvg = previous.reduce((sum, m) => sum + m.efficiency, 0) / previous.length || 0;

    const trend: 'up' | 'down' | 'stable' = recentAvg > previousAvg ? 'up' : recentAvg < previousAvg ? 'down' : 'stable';

    return {
      efficiency: recentAvg,
      burnoutRisk: recent.some(m => m.burnoutRisk === 'high') ? 'high' : 
                   recent.some(m => m.burnoutRisk === 'medium') ? 'medium' : 'low',
      tasksCompleted: recent.reduce((sum, m) => sum + m.tasksCompleted, 0),
      overtimeHours: recent.reduce((sum, m) => sum + m.overtimeHours, 0),
      trend,
    };
  };

  const getProjectAnalytics = (projectId: string) => {
    const projects = JSON.parse(localStorage.getItem('taskflow-projects') || '[]');
    const project = projects.find((p: any) => p.id === projectId);
    
    if (!project) {
      return {
        completion: 0,
        efficiency: 0,
        riskLevel: 'low',
        timeline: { planned: new Date(), actual: new Date(), variance: 0 },
      };
    }

    // Calculer l'efficacité basée sur les tâches terminées vs temps passé
    const projectTasks = JSON.parse(localStorage.getItem('taskflow-tasks') || '[]')
      .filter((t: any) => t.projectId === projectId);
    
    const completedTasks = projectTasks.filter((t: any) => t.status === 'completed');
    const totalTimeSpent = projectTasks.reduce((sum: number, t: any) => sum + (t.timeTracked || 0), 0);
    const totalEstimatedTime = projectTasks.reduce((sum: number, t: any) => sum + (t.estimatedTime || 0), 0);
    
    const efficiency = totalEstimatedTime > 0 ? Math.min(100, (totalTimeSpent / totalEstimatedTime) * 100) : 85;
    
    return {
      completion: project.progress || 0,
      efficiency: Math.round(efficiency),
      riskLevel: project.riskLevel || 'low',
      timeline: {
        planned: new Date(project.endDate),
        actual: new Date(project.endDate),
        variance: 0,
      },
    };
  };

  const getServiceAnalytics = (serviceId: string) => {
    const services = JSON.parse(localStorage.getItem('taskflow-services') || '[]');
    const tasks = JSON.parse(localStorage.getItem('taskflow-tasks') || '[]');
    const service = services.find((d: any) => d.id === serviceId);
    
    const serviceTasks = tasks.filter((t: any) => t.serviceId === serviceId);
    const activeTasks = serviceTasks.filter((t: any) => t.status !== 'completed');
    
    // Calculer l'efficacité basée sur les tâches terminées du service
    const completedTasks = serviceTasks.filter((t: any) => t.status === 'completed');
    const totalTimeSpent = serviceTasks.reduce((sum: number, t: any) => sum + (t.timeTracked || 0), 0);
    const totalEstimatedTime = serviceTasks.reduce((sum: number, t: any) => sum + (t.estimatedTime || 0), 0);
    
    const efficiency = totalEstimatedTime > 0 ? Math.min(100, (totalTimeSpent / totalEstimatedTime) * 100) : 80;
    
    return {
      workloadCapacity: service?.workloadCapacity || 100,
      utilization: (activeTasks.length / (service?.workloadCapacity || 100)) * 100,
      efficiency: Math.round(efficiency),
      memberCount: service?.memberIds?.length || 0,
      activeTasks: activeTasks.length,
    };
  };

  const getSystemAnalytics = () => {
    const tasks = JSON.parse(localStorage.getItem('taskflow-tasks') || '[]');
    const completedTasks = tasks.filter((t: any) => t.status === 'completed');
    
    // Calculer la charge système basée sur les tâches actives et les utilisateurs
    const activeTasks = tasks.filter((t: any) => t.status !== 'completed');
    const systemLoad = Math.min(100, (activeTasks.length / Math.max(tasks.length, 1)) * 100);
    
    return {
      totalUsers: 3,
      activeUsers: 3,
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      systemLoad: Math.round(systemLoad),
      uptime: 99.9,
    };
  };

  const trackWorkload = (userId: string, serviceId: string, tasksCompleted: number, timeSpent: number) => {
    const efficiency = Math.min(100, (tasksCompleted * 120) / timeSpent * 100); // Assuming 2 hours per task is 100% efficient
    const workloadPoints = tasksCompleted * 2.5;
    const overtimeHours = timeSpent > 480 ? (timeSpent - 480) / 60 : 0; // Over 8 hours

    const metric: WorkloadMetrics = {
      userId,
      serviceId,
      period: 'daily',
      date: new Date(),
      tasksCompleted,
      timeSpent,
      efficiency,
      workloadPoints,
      overtimeHours,
      burnoutRisk: overtimeHours > 2 ? 'high' : efficiency < 60 ? 'medium' : 'low',
    };

    setWorkloadMetrics(prev => [metric, ...prev]);
  };

  const scheduleReport = (type: PerformanceReport['type'], frequency: 'daily' | 'weekly' | 'monthly', recipients: string[]) => {
    // In a real app, this would set up a scheduled job
    console.log(`Scheduled ${frequency} ${type} report for:`, recipients);
  };

  return (
    <MonitoringContext.Provider value={{
      workloadMetrics,
      performanceReports,
      generateReport,
      getWorkloadAnalytics,
      getProjectAnalytics,
      getServiceAnalytics,
      getSystemAnalytics,
      trackWorkload,
      scheduleReport,
    }}>
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (context === undefined) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
}