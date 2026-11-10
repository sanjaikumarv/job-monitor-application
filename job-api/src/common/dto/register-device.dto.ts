import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { DevicePlatform } from '../interfaces/device.interface.js';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsOptional()
  @IsIn(['web', 'android', 'ios'])
  deviceType?: DevicePlatform = 'web';

  @IsOptional()
  @IsString()
  userId?: string;
}

