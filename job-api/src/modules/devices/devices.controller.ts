import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import type { DeviceRegistration } from '../../common/interfaces/device.interface.js';
import { RegisterDeviceDto } from '../../common/dto/register-device.dto.js';
import { BroadcastPushDto } from '../../common/dto/broadcast-push.dto.js';
import { PushProvider } from '../push/push-provider.service.js';
import { DevicesService } from './devices.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Controller('api/devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    @Inject(forwardRef(() => PushProvider))
    private readonly pushProvider: PushProvider,
    @Optional()
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService?: NotificationsService,
  ) {}

  @Post('register')
  public async register(@Body() dto: RegisterDeviceDto): Promise<DeviceRegistration> {
    return this.devicesService.register(dto);
  }

  @Delete(':token')
  public async remove(@Param('token') token: string): Promise<{ success: boolean }> {
    const success = await this.devicesService.remove(token);
    return { success };
  }

  @Get()
  public getAll(): DeviceRegistration[] {
    return this.devicesService.getAllDevices();
  }

  @Post('broadcast')
  public async broadcast(
    @Body() dto: BroadcastPushDto,
  ): Promise<{
    sentCount: number;
    devicesCount: number;
    results: Array<{ token: string; success: boolean; id?: string; error?: string }>;
  }> {
    const devices = this.devicesService.getAllDevices();
    const title = dto.title || 'Job Monitor Alert';
    const body = dto.body || 'New job opportunity detected on monitored folders!';
    const results: Array<{ token: string; success: boolean; id?: string; error?: string }> = [];
    let sentCount = 0;

    // Emit live SSE push event to connected browsers (laptop & mobile)
    this.notificationsService?.emitLiveNotification({
      type: 'BROADCAST_ALERT',
      title,
      body,
      url: dto.url || 'http://localhost:3000',
    });

    for (const d of devices) {
      try {
        const res = await this.pushProvider.send({
          recipient: d.token,
          title,
          body,
          idempotencyKey: `broadcast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          data: {
            applicationUrl: dto.url || 'http://localhost:3000',
            type: 'BROADCAST_ALERT',
          },
        });
        results.push({ token: d.token, success: true, id: res.providerMessageId });
        sentCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ token: d.token, success: false, error: msg });
      }
    }

    return { sentCount, devicesCount: devices.length, results };
  }
}
