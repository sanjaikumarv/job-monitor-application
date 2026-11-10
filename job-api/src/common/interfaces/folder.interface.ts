export type MonitoringStatus = 'watching' | 'stopped' | 'error' | 'initial';

export interface FolderConfig {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  recursive: boolean;
  createdAt: string;
  updatedAt: string;
  lastEventTime?: string;
  status: MonitoringStatus;
  errorMessage?: string;
}

export interface WatcherEventPayload {
  folderId: string;
  eventType: 'add' | 'change' | 'unlink' | 'error' | 'ready';
  filePath?: string;
  error?: Error;
  timestamp: string;
}
