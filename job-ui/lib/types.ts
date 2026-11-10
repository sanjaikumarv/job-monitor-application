export interface FolderConfig {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  recursive: boolean;
  createdAt: string;
  updatedAt: string;
  lastEventTime?: string;
  status: 'watching' | 'stopped' | 'error' | 'initial';
}

export interface JobRecord {
  jobId: string;
  jobTitle: string;
  companyName: string;
  location: string;
  employmentType: string;
  experience: string;
  salary: string;
  description: string;
  applicationUrl: string;
  postedAt: string;
  skills: string[];
  source: string;
  platform?: string;
  workMode?: string;
  matchScore?: string | number;
  matchExplanation?: string;
  sourceFolderId?: string;
  sourceFileName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingError {
  line: number;
  message: string;
  field?: string;
}

export interface ProcessingHistoryItem {
  id: string;
  folderId: string;
  folderName: string;
  fileName: string;
  filePath: string;
  fileHash: string;
  eventType: 'add' | 'change';
  status: 'success' | 'failed' | 'partial';
  recordsTotal: number;
  recordsValid: number;
  recordsFailed: number;
  durationMs: number;
  errors: ProcessingError[];
  processedAt: string;
}

export interface NotificationTask {
  id: string;
  jobId: string;
  job: JobRecord;
  channel: 'email' | 'push';
  recipient: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'partially_sent';
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
}

export interface NotificationStats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  partiallySent: number;
}

