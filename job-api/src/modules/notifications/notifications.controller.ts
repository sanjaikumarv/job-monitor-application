import { Controller, Get, Param, Post } from '@nestjs/common';
import type {
  NotificationStats,
  NotificationTask,
} from '../../common/interfaces/notification.interface.js';
import { NotificationsService } from './notifications.service.js';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  public findAll(): NotificationTask[] {
    return this.notificationsService.findAll();
  }

  @Get('stats')
  public getStats(): NotificationStats {
    return this.notificationsService.getStats();
  }

  @Post(':id/retry')
  public async retry(@Param('id') id: string): Promise<NotificationTask> {
    return this.notificationsService.retry(id);
  }
}
