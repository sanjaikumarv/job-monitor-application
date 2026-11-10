import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationTask } from '../../../common/interfaces/notification.interface.js';
import { NotificationsService } from '../../notifications/notifications.service.js';
import { QUEUE_EMAIL } from '../../queues/queue.constants.js';
import { EnqueuedJob, QueueService } from '../../queues/queue.service.js';
import { EmailService } from '../email.service.js';

@Injectable()
export class EmailNotificationProcessor implements OnModuleInit {
  private readonly logger = new Logger(EmailNotificationProcessor.name);

  constructor(
    private readonly queue: QueueService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  public onModuleInit(): void {
    this.queue.registerWorker<NotificationTask>(
      QUEUE_EMAIL,
      (job) => this.process(job),
      5,
    );
  }

  public async process(job: EnqueuedJob<NotificationTask>): Promise<void> {
    const task = job.data;
    this.logger.log(`Processing email job ${job.id} for "${task.job.jobTitle}"`);

    await this.notificationsService.updateTaskStatus(task.id, 'processing');

    const result = await this.emailService.sendJobNotification(task.job, task.recipient);
    if (result.success) {
      await this.notificationsService.updateTaskStatus(task.id, 'sent');
      this.logger.log(`Email job ${job.id} delivered to ${task.recipient}`);
    } else {
      await this.notificationsService.updateTaskStatus(task.id, 'failed', result.error);
      throw new Error(result.error || 'Email dispatch failed.');
    }
  }
}

