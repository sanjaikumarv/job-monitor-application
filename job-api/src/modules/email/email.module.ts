import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { QueuesModule } from '../queues/queues.module.js';
import { EmailService } from './email.service.js';
import { EmailTemplateService } from './email-template.service.js';
import { EmailNotificationProcessor } from './processors/email.processor.js';

@Module({
  imports: [QueuesModule, forwardRef(() => NotificationsModule)],
  providers: [EmailTemplateService, EmailService, EmailNotificationProcessor],
  exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}

