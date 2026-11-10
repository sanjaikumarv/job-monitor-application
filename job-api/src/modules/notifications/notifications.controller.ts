import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Sse,
  forwardRef,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type {
  NotificationStats,
  NotificationTask,
} from '../../common/interfaces/notification.interface.js';
import { TestEmailDto } from '../../common/dto/test-email.dto.js';
import { TestPushDto } from '../../common/dto/test-push.dto.js';
import { EmailService } from '../email/email.service.js';
import { PushService } from '../push/push.service.js';
import { LiveNotificationEvent, NotificationsService } from './notifications.service.js';

@Controller('api/notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => PushService))
    private readonly pushService: PushService,
  ) {}

  @Get()
  public findAll(): NotificationTask[] {
    return this.notificationsService.findAll();
  }

  @Get('stats')
  public getStats(): NotificationStats {
    return this.notificationsService.getStats();
  }

  @Sse('stream')
  public stream(): Observable<{ data: LiveNotificationEvent }> {
    return this.notificationsService.getLiveStream();
  }

  @Post(':id/retry')
  public async retry(@Param('id') id: string): Promise<NotificationTask> {
    return this.notificationsService.retry(id);
  }

  @Post(['test-email', '/api/email/test'])
  public async testEmailPost(@Body() dto: TestEmailDto) {
    return this.handleTestEmail(dto);
  }

  @Get(['test-email', '/api/email/test'])
  public async testEmailGet(@Query() query: TestEmailDto) {
    return this.handleTestEmail(query);
  }

  @Post(['test-push', '/api/push/test'])
  public async testPushPost(@Body() dto: TestPushDto) {
    return this.handleTestPush(dto);
  }

  @Get(['test-push', '/api/push/test'])
  public async testPushGet(@Query() query: TestPushDto) {
    return this.handleTestPush(query);
  }

  private async handleTestEmail(dto: TestEmailDto) {
    const result = await this.emailService.sendTestEmail(
      dto.to,
      dto.subject,
      dto.message,
    );

    const now = new Date().toISOString();
    const taskId = `test-email-${Date.now()}`;
    const testTask: NotificationTask = {
      id: taskId,
      jobId: 'TEST-EMAIL-ALERT',
      job: {
        jobId: 'TEST-EMAIL-ALERT',
        jobTitle: dto.subject || 'Senior Full Stack Engineer (Test Email)',
        companyName: 'Acme Systems Corp',
        location: 'Remote',
        employmentType: 'Full-time',
        experience: '5+ years',
        salary: '$140k - $180k',
        description: 'Test email alert job description.',
        applicationUrl: 'http://localhost:3000',
        postedAt: now,
        skills: ['TypeScript', 'NestJS', 'Next.js', 'BullMQ'],
        source: 'System Test',
        platform: 'Test Pipeline',
        createdAt: now,
        updatedAt: now,
      },
      channel: 'email',
      recipient: result.recipient,
      status: result.success ? 'sent' : 'failed',
      attempts: 1,
      maxAttempts: 3,
      error: result.error,
      sentAt: result.success ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await this.notificationsService.recordTask(testTask);

    return {
      success: result.success,
      channel: 'email',
      recipient: result.recipient,
      messageId: result.messageId,
      status: result.success ? 'sent' : 'failed',
      error: result.error,
      message: result.success
        ? 'Test email dispatched successfully.'
        : `Email dispatch failed: ${result.error}`,
      taskId,
    };
  }

  private async handleTestPush(dto: TestPushDto) {
    const title = dto.title || 'Job Monitor Push Alert';
    const body = dto.body || 'Testing real-time push notification delivery.';
    const url = dto.url || 'http://localhost:3000';

    // 1. Emit live SSE push event to connected browsers (laptop & mobile)
    this.notificationsService.emitLiveNotification({
      type: 'TEST_PUSH',
      title,
      body,
      url,
    });

    // 2. Dispatch to FCM / device tokens
    const result = await this.pushService.sendTestPush({
      token: dto.token,
      title,
      body,
      url,
    });

    const now = new Date().toISOString();
    const taskId = `test-push-${Date.now()}`;
    const testTask: NotificationTask = {
      id: taskId,
      jobId: 'TEST-PUSH-ALERT',
      job: {
        jobId: 'TEST-PUSH-ALERT',
        jobTitle: title,
        companyName: 'Job Monitor System',
        location: 'Remote',
        employmentType: 'Full-time',
        experience: '5+ years',
        salary: '$140k - $180k',
        description: 'Test push notification job description.',
        applicationUrl: url,
        postedAt: now,
        skills: ['WebPush', 'FCM', 'ServiceWorker'],
        source: 'Push Pipeline',
        platform: 'Push Pipeline',
        createdAt: now,
        updatedAt: now,
      },
      channel: 'push',
      recipient: dto.token || 'all-registered-devices',
      status: result.success ? 'sent' : 'failed',
      attempts: 1,
      maxAttempts: 3,
      sentAt: result.success ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await this.notificationsService.recordTask(testTask);

    return {
      success: result.success,
      channel: 'push',
      provider: result.provider,
      devicesTargeted: result.devicesTargeted,
      accepted: result.accepted,
      failed: result.failed,
      results: result.results,
      message: result.success
        ? `Test push dispatched to ${result.accepted} device(s).`
        : 'Push dispatch failed or no devices responded.',
      taskId,
    };
  }
}
