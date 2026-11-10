import { Module, forwardRef } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { QueuesModule } from '../queues/queues.module.js';
import { PushProvider } from './push-provider.service.js';
import { PushNotificationProcessor } from './processors/push.processor.js';
import { PushService } from './push.service.js';

@Module({
  imports: [DevicesModule, QueuesModule, forwardRef(() => NotificationsModule)],
  providers: [PushProvider, PushService, PushNotificationProcessor],
  exports: [PushService, PushProvider],
})
export class PushModule {}
