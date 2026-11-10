import { describe, it, expect, afterAll } from 'vitest';
import { JsonStorageService } from './json-storage.service.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('JsonStorageService', () => {
  const service = new JsonStorageService();
  service.ensureBaseDirectories();
  const testCategory = 'configurations';
  const testFile = 'unit-test-data.json';

  afterAll(async () => {
    const fullPath = service.getStoragePath(testCategory, testFile);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath).catch(() => {});
    }
  });

  it('should return fallback if file does not exist', async () => {
    const data = await service.read(testCategory, 'non_existent.json', { default: true });
    expect(data).toEqual({ default: true });
  });

  it('should perform atomic write and read back content correctly', async () => {
    const payload = [{ id: '1', name: 'Software Folder' }];
    await service.write(testCategory, testFile, payload);

    expect(service.exists(testCategory, testFile)).toBe(true);
    const readBack = await service.read(testCategory, testFile, []);
    expect(readBack).toEqual(payload);
  });
});

