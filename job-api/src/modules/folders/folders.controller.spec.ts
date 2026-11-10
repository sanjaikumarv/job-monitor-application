import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FoldersController } from './folders.controller.js';
import { FoldersService } from './folders.service.js';
import { FolderConfig } from '../../common/interfaces/folder.interface.js';

describe('FoldersController', () => {
  let controller: FoldersController;
  let mockService: Partial<FoldersService>;

  const mockFolder: FolderConfig = {
    id: 'folder-test-1',
    name: 'Software Engineering',
    path: 'C:/test/path',
    isActive: true,
    recursive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'watching',
  };

  beforeEach(() => {
    mockService = {
      findAll: vi.fn().mockResolvedValue([mockFolder]),
      findById: vi.fn().mockResolvedValue(mockFolder),
      create: vi.fn().mockResolvedValue(mockFolder),
      activate: vi.fn().mockResolvedValue({ ...mockFolder, isActive: true }),
      deactivate: vi.fn().mockResolvedValue({ ...mockFolder, isActive: false }),
      remove: vi.fn().mockResolvedValue({ success: true, id: 'folder-test-1' }),
      getStatus: vi.fn().mockReturnValue('watching'),
    };

    controller = new FoldersController(mockService as FoldersService);
  });

  it('should list all folders', async () => {
    const res = await controller.findAll();
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('folder-test-1');
  });

  it('should create a folder configuration', async () => {
    const res = await controller.create({
      name: 'Software Engineering',
      path: 'C:/test/path',
    });
    expect(res.name).toBe('Software Engineering');
  });

  it('should activate a folder', async () => {
    const res = await controller.activate('folder-test-1');
    expect(res.isActive).toBe(true);
  });

  it('should deactivate a folder', async () => {
    const res = await controller.deactivate('folder-test-1');
    expect(res.isActive).toBe(false);
  });

  it('should return folder monitoring status', () => {
    const res = controller.getStatus('folder-test-1');
    expect(res.status).toBe('watching');
  });
});

