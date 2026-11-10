import axios from 'axios';
import {
  FolderConfig,
  JobRecord,
  NotificationStats,
  NotificationTask,
  ProcessingHistoryItem,
} from './types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Folders
  getFolders: async (): Promise<FolderConfig[]> => {
    const { data } = await apiClient.get<FolderConfig[]>('/folders');
    return data;
  },
  createFolder: async (payload: {
    name: string;
    path: string;
    recursive?: boolean;
  }): Promise<FolderConfig> => {
    const { data } = await apiClient.post<FolderConfig>('/folders', payload);
    return data;
  },
  activateFolder: async (id: string): Promise<FolderConfig> => {
    const { data } = await apiClient.patch<FolderConfig>(`/folders/${id}/activate`);
    return data;
  },
  deactivateFolder: async (id: string): Promise<FolderConfig> => {
    const { data } = await apiClient.patch<FolderConfig>(`/folders/${id}/deactivate`);
    return data;
  },
  deleteFolder: async (id: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.delete<{ success: boolean }>(`/folders/${id}`);
    return data;
  },
  browseFolders: async (dirPath?: string): Promise<{
    currentPath: string;
    parentPath?: string;
    directories: Array<{ name: string; path: string }>;
  }> => {
    const { data } = await apiClient.get('/folders/browse', {
      params: dirPath ? { path: dirPath } : undefined,
    });
    return data;
  },

  // Jobs
  getJobs: async (params?: {
    search?: string;
    company?: string;
    location?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: JobRecord[]; total: number; page: number; limit: number }> => {
    const { data } = await apiClient.get('/jobs', { params });
    return data;
  },
  getJobStats: async (): Promise<{
    totalJobs: number;
    totalCompanies: number;
    sources: Record<string, number>;
  }> => {
    const { data } = await apiClient.get('/jobs/stats');
    return data;
  },

  // Processing
  getProcessingHistory: async (): Promise<ProcessingHistoryItem[]> => {
    const { data } = await apiClient.get<ProcessingHistoryItem[]>('/processing/history');
    return data;
  },

  // Notifications
  getNotifications: async (): Promise<NotificationTask[]> => {
    const { data } = await apiClient.get<NotificationTask[]>('/notifications');
    return data;
  },
  getNotificationStats: async (): Promise<NotificationStats> => {
    const { data } = await apiClient.get<NotificationStats>('/notifications/stats');
    return data;
  },
  retryNotification: async (id: string): Promise<NotificationTask> => {
    const { data } = await apiClient.post<NotificationTask>(`/notifications/${id}/retry`);
    return data;
  },

  // Devices
  registerDevice: async (payload: { token: string; deviceType: string }) => {
    const { data } = await apiClient.post('/devices/register', payload);
    return data;
  },
};

