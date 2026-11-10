import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationTask } from '../../../common/interfaces/notification.interface.js';
import { NotificationsService } from '../../notifications/notifications.service.js';
import { QUEUE_PUSH } from '../../queues/queue.constants.js';
import { EnqueuedJob, QueueService } from '../../queues/queue.service.js';
import { PushService } from '../push.service.js';

@Injectable()
export class PushNotificationProcessor implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationProcessor.name);

  constructor(
    private readonly queue: QueueService,
    private readonly pushService: PushService,
    private readonly notificationsService: NotificationsService,
  ) {}

  public onModuleInit(): void {
    this.queue.registerWorker<NotificationTask>(
      QUEUE_PUSH,
      (job) => this.process(job),
      5,
    );
  }

  public async process(job: EnqueuedJob<NotificationTask>): Promise<void> {
    const task = job.data;
    this.logger.log(`Processing push job ${job.id} for "${task.job.jobTitle}"`);

    await this.notificationsService.updateTaskStatus(task.id, 'processing');

    const result = await this.pushService.sendJobPushNotification(task.job);

    if (result.accepted > 0 && result.failed === 0) {
      await this.notificationsService.updateTaskStatus(task.id, 'sent');
    } else if (result.accepted > 0 && result.failed > 0) {
      await this.notificationsService.updateTaskStatus(task.id, 'partially_sent');
    } else if (result.accepted === 0 && result.failed > 0) {
      const err = `Failed to deliver push notification to ${result.failed} devices`;
      await this.notificationsService.updateTaskStatus(task.id, 'failed', err);
      throw new Error(err);
    } else {
      // 0 registered devices
      await this.notificationsService.updateTaskStatus(task.id, 'sent');
    }
  }
}

