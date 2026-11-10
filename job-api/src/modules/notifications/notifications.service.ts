import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { JobRecord } from '../../common/interfaces/job.interface.js';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationStats,
  NotificationTask,
} from '../../common/interfaces/notification.interface.js';
import { QueueService } from '../queues/queue.service.js';
import { QUEUE_EMAIL, QUEUE_PUSH } from '../queues/queue.constants.js';
import { JsonStorageService } from '../storage/json-storage.service.js';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly storageCategory = 'notifications';
  private readonly storageFile = 'notification-history.json';
  private readonly tasksMap = new Map<string, NotificationTask>();

  constructor(
    private readonly storage: JsonStorageService,
    private readonly queue: QueueService,
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
    const id = `notif-${channel}-${job.jobId}`;
    const now = new Date().toISOString();

    const existing = this.tasksMap.get(id);
    if (existing && existing.status === 'sent') {
      return null;
    }

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

  private async persist(): Promise<void> {
    await this.storage.write(
      this.storageCategory,
      this.storageFile,
      Array.from(this.tasksMap.values()),
    );
  }
}

