import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { IStorageService, StorageCategory } from './storage.interface.js';

@Injectable()
export class JsonStorageService implements IStorageService, OnModuleInit {
  private readonly logger = new Logger(JsonStorageService.name);
  private readonly baseStorageDir = path.resolve(process.cwd(), 'storage');
  private readonly fileWriteLocks = new Map<string, Promise<void>>();

  public onModuleInit(): void {
    this.ensureBaseDirectories();
  }

  public ensureBaseDirectories(): void {
    const categories: StorageCategory[] = [
      'configurations',
      'jobs',
      'processing',
      'notifications',
      'devices',
    ];
    for (const cat of categories) {
      const dir = path.join(this.baseStorageDir, cat);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  public getStoragePath(category: string, filename: string): string {
    return path.join(this.baseStorageDir, category, filename);
  }

  public exists(category: string, filename: string): boolean {
    const filePath = this.getStoragePath(category, filename);
    return fs.existsSync(filePath);
  }

  public async read<T>(category: string, filename: string, fallback: T): Promise<T> {
    const filePath = this.getStoragePath(category, filename);
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      if (!content.trim()) return fallback;
      return JSON.parse(content) as T;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to read JSON from ${filePath}: ${msg}`);
      return fallback;
    }
  }

  public async write<T>(category: string, filename: string, data: T): Promise<void> {
    const filePath = this.getStoragePath(category, filename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    const currentLock = this.fileWriteLocks.get(filePath) || Promise.resolve();
    const writeOperation = currentLock.then(async () => {
      const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`;
      try {
        const serialized = JSON.stringify(data, null, 2);
        await fs.promises.writeFile(tmpPath, serialized, 'utf-8');
        await fs.promises.rename(tmpPath, filePath);
      } catch (err: unknown) {
        if (fs.existsSync(tmpPath)) {
          await fs.promises.unlink(tmpPath).catch(() => {});
        }
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Atomic write failed for ${filePath}: ${msg}`);
        throw err;
      }
    });

    this.fileWriteLocks.set(
      filePath,
      writeOperation.catch(() => {}),
    );
    await writeOperation;
  }
}

