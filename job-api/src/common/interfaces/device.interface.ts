export type DevicePlatform = 'web' | 'android' | 'ios';

export interface DeviceRegistration {
  token: string;
  deviceType: DevicePlatform;
  userId?: string;
  deviceName?: string;
  userAgent?: string;
  registeredAt: string;
  lastSeenAt: string;
}

export interface RegisterDeviceDto {
  token: string;
  deviceType?: DevicePlatform;
  deviceName?: string;
  userAgent?: string;
  userId?: string;
}
