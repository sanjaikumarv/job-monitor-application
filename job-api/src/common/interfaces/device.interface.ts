export type DevicePlatform = 'web' | 'android' | 'ios';

export interface DeviceRegistration {
  token: string;
  deviceType: DevicePlatform;
  userId?: string;
  userAgent?: string;
  registeredAt: string;
  lastSeenAt: string;
}

export interface RegisterDeviceDto {
  token: string;
  deviceType?: DevicePlatform;
  userId?: string;
}

