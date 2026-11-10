import { JobRecord } from './job.interface.js';

export type NotificationChannel = 'email' | 'push';
export type NotificationDeliveryStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'partially_sent';

export interface NotificationTask {
  id: string; // Used for queue deduplication
  jobId: string;
  job: JobRecord;
  channel: NotificationChannel;
  recipient: string;
  status: NotificationDeliveryStatus;
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

