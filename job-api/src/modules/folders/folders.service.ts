import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { CreateFolderDto } from '../../common/dto/create-folder.dto.js';
import { FolderConfig, MonitoringStatus } from '../../common/interfaces/folder.interface.js';
import { PathSanitizerUtil } from '../../common/utils/path-sanitizer.util.js';
import { JsonStorageService } from '../storage/json-storage.service.js';
import { FolderWatcherService } from './folder-watcher.service.js';

@Injectable()
export class FoldersService implements OnModuleInit {
  private readonly logger = new Logger(FoldersService.name);
  private readonly storageCategory = 'configurations';
  private readonly storageFile = 'folders.json';
  private folders = new Map<string, FolderConfig>();

  constructor(
    private readonly storage: JsonStorageService,
    private readonly watcher: FolderWatcherService,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.loadAndRestore();
  }

  public async findAll(): Promise<FolderConfig[]> {
    return Array.from(this.folders.values()).map((f) => ({
      ...f,
      status: this.watcher.getStatus(f.id),
    }));
  }

  public async findById(id: string): Promise<FolderConfig> {
    const folder = this.folders.get(id);
    if (!folder) {
      throw new NotFoundException(`Folder configuration "${id}" not found.`);
    }
    return {
      ...folder,
      status: this.watcher.getStatus(folder.id),
    };
  }

  public async create(dto: CreateFolderDto): Promise<FolderConfig> {
    const check = PathSanitizerUtil.sanitizeAndValidate(dto.path);
    if (!check.isValid) {
      throw new BadRequestException(check.error || 'Invalid folder path.');
    }

    // Check duplicate path
    for (const existing of this.folders.values()) {
      if (existing.path.toLowerCase() === check.normalizedPath.toLowerCase()) {
        throw new BadRequestException('A folder with this path is already registered.');
      }
    }

    const id = `folder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const config: FolderConfig = {
      id,
      name: dto.name.trim(),
      path: check.normalizedPath,
      isActive: dto.isActive ?? true,
      recursive: dto.recursive ?? true,
      createdAt: now,
      updatedAt: now,
      status: 'initial',
    };

    this.folders.set(id, config);
    await this.persist();

    if (config.isActive) {
      this.watcher.watchFolder(config);
      config.status = 'watching';
    }

    return config;
  }

  public async activate(id: string): Promise<FolderConfig> {
    const folder = await this.findById(id);
    folder.isActive = true;
    folder.updatedAt = new Date().toISOString();
    this.watcher.watchFolder(folder);
    folder.status = 'watching';
    await this.persist();
    return folder;
  }

  public async deactivate(id: string): Promise<FolderConfig> {
    const folder = await this.findById(id);
    folder.isActive = false;
    folder.updatedAt = new Date().toISOString();
    await this.watcher.unwatchFolder(id);
    folder.status = 'stopped';
    await this.persist();
    return folder;
  }

  public async remove(id: string): Promise<{ success: boolean; id: string }> {
    const folder = await this.findById(id);
    await this.watcher.unwatchFolder(id);
    this.folders.delete(folder.id);
    await this.persist();
    return { success: true, id };
  }

  public async updateLastEventTime(id: string): Promise<void> {
    const folder = this.folders.get(id);
    if (folder) {
      folder.lastEventTime = new Date().toISOString();
      await this.persist();
    }
  }

  public getStatus(id: string): MonitoringStatus {
    return this.watcher.getStatus(id);
  }

  public async browseDirectories(targetPath?: string): Promise<{
    currentPath: string;
    parentPath?: string;
    directories: Array<{ name: string; path: string }>;
  }> {
    let resolved = targetPath ? path.normalize(path.resolve(targetPath)) : os.homedir();
    if (!fs.existsSync(resolved)) {
      resolved = process.cwd();
    }

    const parent = path.dirname(resolved) !== resolved ? path.dirname(resolved) : undefined;
    let directories: Array<{ name: string; path: string }> = [];

    try {
      const entries = await fs.promises.readdir(resolved, { withFileTypes: true });
      directories = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('$') && !e.name.startsWith('.'))
        .map((e) => ({
          name: e.name,
          path: path.join(resolved, e.name),
        }))
        .slice(0, 100);
    } catch {
      directories = [];
    }

    return {
      currentPath: resolved,
      parentPath: parent,
      directories,
    };
  }

  private async loadAndRestore(): Promise<void> {
    const raw = await this.storage.read<FolderConfig[]>(
      this.storageCategory,
      this.storageFile,
      [],
    );
    this.folders.clear();
    for (const item of raw) {
      this.folders.set(item.id, item);
      if (item.isActive) {
        try {
          this.watcher.watchFolder(item);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to restart watcher for ${item.id}: ${msg}`);
        }
      }
    }
    this.logger.log(`Loaded ${this.folders.size} folder configs into memory.`);
  }

  private async persist(): Promise<void> {
    const list = Array.from(this.folders.values());
    await this.storage.write(this.storageCategory, this.storageFile, list);
  }
}

