export const QUEUE_EMAIL = 'email-notifications';
export const QUEUE_PUSH = 'push-notifications';

export interface QueueJobOptions {
  jobId?: string;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  concurrency?: number;
}

