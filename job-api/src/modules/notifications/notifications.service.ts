import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JobRecord } from '../../common/interfaces/job.interface.js';
import type { ProcessingHistoryItem } from '../../common/interfaces/processing.interface.js';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationStats,
  NotificationTask,
} from '../../common/interfaces/notification.interface.js';
import { QueueService } from '../queues/queue.service.js';
import { QUEUE_EMAIL, QUEUE_PUSH } from '../queues/queue.constants.js';
import { JsonStorageService } from '../storage/json-storage.service.js';
import { EmailService } from '../email/email.service.js';

export interface LiveNotificationEvent {
  type: string;
  title: string;
  body: string;
  url?: string;
  timestamp: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly storageCategory = 'notifications';
  private readonly storageFile = 'notification-history.json';
  private readonly tasksMap = new Map<string, NotificationTask>();
  private readonly liveStream$ = new Subject<LiveNotificationEvent>();

  constructor(
    private readonly storage: JsonStorageService,
    private readonly queue: QueueService,
    @Optional()
    @Inject(forwardRef(() => EmailService))
    private readonly emailService?: EmailService,
  ) {}

  public async onModuleInit(): Promise<void> {
    const list = await this.storage.read<NotificationTask[]>(
      this.storageCategory,
      this.storageFile,
      [],
    );
    this.tasksMap.clear();
    for (const item of list) {
      this.tasksMap.set(item.id, item);
    }
    this.logger.log(`Loaded ${this.tasksMap.size} notification records.`);
  }

  public async enqueueNotification(
    job: JobRecord,
    channel: NotificationChannel,
    recipient: string,
  ): Promise<NotificationTask | null> {
    const id = `notif-${channel}-${job.jobId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const task: NotificationTask = {
      id,
      jobId: job.jobId,
      job,
      channel,
      recipient,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: now,
      updatedAt: now,
    };

    this.tasksMap.set(id, task);
    await this.persist();

    const queueName = channel === 'email' ? QUEUE_EMAIL : QUEUE_PUSH;
    await this.queue.add(queueName, `${channel}-alert`, task, {
      jobId: id,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    return task;
  }

  public async updateTaskStatus(
    id: string,
    status: NotificationDeliveryStatus,
    error?: string,
  ): Promise<void> {
    const task = this.tasksMap.get(id);
    if (task) {
      task.status = status;
      task.attempts++;
      task.updatedAt = new Date().toISOString();
      if (status === 'sent') {
        task.sentAt = new Date().toISOString();
      }
      if (error) {
        task.error = error;
      }
      await this.persist();
    }
  }

  public findAll(): NotificationTask[] {
    return Array.from(this.tasksMap.values()).reverse();
  }

  public getStats(): NotificationStats {
    const all = Array.from(this.tasksMap.values());
    return {
      total: all.length,
      sent: all.filter((t) => t.status === 'sent').length,
      pending: all.filter((t) => t.status === 'pending' || t.status === 'processing').length,
      failed: all.filter((t) => t.status === 'failed').length,
      partiallySent: all.filter((t) => t.status === 'partially_sent').length,
    };
  }

  public async retry(id: string): Promise<NotificationTask> {
    const task = this.tasksMap.get(id);
    if (!task) {
      throw new NotFoundException(`Notification task "${id}" not found.`);
    }

    task.status = 'pending';
    task.error = undefined;
    task.updatedAt = new Date().toISOString();
    await this.persist();

    const queueName = task.channel === 'email' ? QUEUE_EMAIL : QUEUE_PUSH;
    await this.queue.add(queueName, `${task.channel}-retry`, task, {
      jobId: `${id}-retry-${Date.now()}`,
      attempts: 2,
    });

    return task;
  }

  public async recordTask(task: NotificationTask): Promise<void> {
    this.tasksMap.set(task.id, task);
    await this.persist();
  }

  public async handleFileProcessed(
    historyItem: ProcessingHistoryItem,
    allJobs: JobRecord[] = [],
    targetEmail = 'devsanjaikumarv@gmail.com',
  ): Promise<void> {
    if (this.emailService) {
      try {
        await this.emailService.sendFileProcessedSummary(historyItem, targetEmail);
        this.logger.log(
          `Dispatched file processed summary email for "${historyItem.fileName}" to ${targetEmail}`,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to send file summary email: ${msg}`);
      }
    }

    // Send notification email and live push alert for EACH job in this file
    for (const job of allJobs) {
      await this.enqueueNotification(job, 'email', targetEmail);
      await this.enqueueNotification(job, 'push', 'multicast');
      this.emitLiveNotification({
        type: 'JOB_ALERT',
        title: 'New Job Alert!',
        body: `${job.jobTitle} at ${job.companyName}`,
        url: job.applicationUrl,
      });
    }
  }

  public getLiveStream(): Observable<{ data: LiveNotificationEvent }> {
    return this.liveStream$.asObservable().pipe(map((data) => ({ data })));
  }

  public emitLiveNotification(payload: {
    type?: string;
    title: string;
    body: string;
    url?: string;
  }): void {
    this.liveStream$.next({
      type: payload.type || 'NOTIFICATION',
      title: payload.title,
      body: payload.body,
      url: payload.url || 'http://localhost:3000',
      timestamp: new Date().toISOString(),
    });
  }

  private async persist(): Promise<void> {
    await this.storage.write(
      this.storageCategory,
      this.storageFile,
      Array.from(this.tasksMap.values()),
    );
  }
}

