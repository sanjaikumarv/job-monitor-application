import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import type { DeviceRegistration } from '../../common/interfaces/device.interface.js';
import { RegisterDeviceDto } from '../../common/dto/register-device.dto.js';
import { DevicesService } from './devices.service.js';

@Controller('api/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  public async register(@Body() dto: RegisterDeviceDto): Promise<DeviceRegistration> {
    return this.devicesService.register(dto.token, dto.deviceType, dto.userId);
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
}
