import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FoldersService } from './folders.service.js';
import { JsonStorageService } from '../storage/json-storage.service.js';
import { FolderWatcherService } from './folder-watcher.service.js';
import * as os from 'node:os';
import * as path from 'node:path';

describe('FoldersService', () => {
  let service: FoldersService;
  let mockStorage: Partial<JsonStorageService>;
  let mockWatcher: Partial<FolderWatcherService>;
  const tempDir = os.tmpdir();

  beforeEach(() => {
    mockStorage = {
      read: vi.fn().mockResolvedValue([]),
      write: vi.fn().mockResolvedValue(undefined),
      ensureBaseDirectories: vi.fn(),
    };

    mockWatcher = {
      watchFolder: vi.fn(),
      unwatchFolder: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue('watching'),
    };

    service = new FoldersService(
      mockStorage as JsonStorageService,
      mockWatcher as FolderWatcherService,
    );
  });

  it('should register a valid folder and start watcher', async () => {
    const folder = await service.create({
      name: 'Test Dir',
      path: tempDir,
      recursive: true,
      isActive: true,
    });

    expect(folder).toBeDefined();
    expect(folder.id).toMatch(/^folder-/);
    expect(folder.name).toBe('Test Dir');
    expect(folder.isActive).toBe(true);
    expect(mockWatcher.watchFolder).toHaveBeenCalledWith(
      expect.objectContaining({ id: folder.id, path: path.normalize(tempDir) }),
    );
    expect(mockStorage.write).toHaveBeenCalled();
  });

  it('should reject invalid or non-existent directories', async () => {
    await expect(
      service.create({
        name: 'Invalid Dir',
        path: 'C:/non_existent_folder_xyz_123',
      }),
    ).rejects.toThrow();
  });

  it('should reject directory traversal patterns', async () => {
    await expect(
      service.create({
        name: 'Traversal',
        path: `${tempDir}/../`,
      }),
    ).rejects.toThrow('Directory traversal is forbidden');
  });

  it('should deactivate an active folder', async () => {
    const folder = await service.create({
      name: 'Temp',
      path: tempDir,
      isActive: true,
    });

    const deactivated = await service.deactivate(folder.id);
    expect(deactivated.isActive).toBe(false);
    expect(mockWatcher.unwatchFolder).toHaveBeenCalledWith(folder.id);
  });

  it('should activate an inactive folder', async () => {
    const folder = await service.create({
      name: 'Temp',
      path: tempDir,
      isActive: false,
    });

    const activated = await service.activate(folder.id);
    expect(activated.isActive).toBe(true);
    expect(mockWatcher.watchFolder).toHaveBeenCalledWith(
      expect.objectContaining({ id: folder.id, isActive: true }),
    );
  });

  it('should remove a folder and stop its watcher', async () => {
    const folder = await service.create({
      name: 'Temp',
      path: tempDir,
    });

    const res = await service.remove(folder.id);
    expect(res.success).toBe(true);
    expect(mockWatcher.unwatchFolder).toHaveBeenCalledWith(folder.id);
  });
});

