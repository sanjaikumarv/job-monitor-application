import { Module, forwardRef } from '@nestjs/common';
import { EmailModule } from '../email/email.module.js';
import { PushModule } from '../push/push.module.js';
import { QueuesModule } from '../queues/queues.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  imports: [QueuesModule, forwardRef(() => EmailModule), forwardRef(() => PushModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

