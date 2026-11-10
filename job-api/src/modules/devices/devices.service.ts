import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  DeviceRegistration,
  RegisterDeviceDto,
} from '../../common/interfaces/device.interface.js';
import { JsonStorageService } from '../storage/json-storage.service.js';

@Injectable()
export class DevicesService implements OnModuleInit {
  private readonly logger = new Logger(DevicesService.name);
  private readonly storageCategory = 'devices';
  private readonly storageFile = 'devices.json';
  private readonly devices = new Map<string, DeviceRegistration>();

  constructor(private readonly storage: JsonStorageService) {}

  public async onModuleInit(): Promise<void> {
    const list = await this.storage.read<DeviceRegistration[]>(
      this.storageCategory,
      this.storageFile,
      [],
    );
    this.devices.clear();
    for (const d of list) {
      this.devices.set(d.token, d);
    }
    this.logger.log(`Loaded ${this.devices.size} device tokens into memory.`);
  }

  public async register(dto: RegisterDeviceDto): Promise<DeviceRegistration> {
    const now = new Date().toISOString();
    const existing = this.devices.get(dto.token);

    const record: DeviceRegistration = {
      token: dto.token,
      deviceType: dto.deviceType || 'web',
      deviceName: dto.deviceName || existing?.deviceName || 'Web Browser',
      userAgent: dto.userAgent || existing?.userAgent,
      userId: dto.userId || existing?.userId,
      registeredAt: existing?.registeredAt || now,
      lastSeenAt: now,
    };

    this.devices.set(dto.token, record);
    await this.persist();
    this.logger.log(
      `Device registered [${record.deviceType}] "${record.deviceName}": ${record.token.slice(0, 18)}...`,
    );
    return record;
  }

  public async remove(token: string): Promise<boolean> {
    const existed = this.devices.delete(token);
    if (existed) {
      await this.persist();
      this.logger.log(`Removed device token: ${token.slice(0, 10)}...`);
    }
    return existed;
  }

  public async removeTokens(tokens: string[]): Promise<void> {
    let changed = false;
    for (const t of tokens) {
      if (this.devices.delete(t)) {
        changed = true;
      }
    }
    if (changed) {
      await this.persist();
      this.logger.log(
        `Pruned ${tokens.length} invalid or expired device tokens.`,
      );
    }
  }

  public getAllTokens(): string[] {
    return Array.from(this.devices.keys());
  }

  public getAllDevices(): DeviceRegistration[] {
    return Array.from(this.devices.values());
  }

  private async persist(): Promise<void> {
    await this.storage.write(
      this.storageCategory,
      this.storageFile,
      Array.from(this.devices.values()),
    );
  }
}
