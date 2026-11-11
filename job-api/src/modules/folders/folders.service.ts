import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { CreateFolderDto } from '../../common/dto/create-folder.dto.js';
import { FolderConfig, MonitoringStatus } from '../../common/interfaces/folder.interface.js';
import { PathSanitizerUtil } from '../../common/utils/path-sanitizer.util.js';
import { JsonStorageService } from '../storage/json-storage.service.js';
import { FolderWatcherService } from './folder-watcher.service.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FoldersService implements OnModuleInit {
  private readonly logger = new Logger(FoldersService.name);
  private readonly storageCategory = 'configurations';
  private readonly storageFile = 'folders.json';
  private folders = new Map<string, FolderConfig>();

  constructor(
    private readonly storage: JsonStorageService,
    private readonly watcher: FolderWatcherService,
    private readonly configService?: ConfigService,
  ) {}

  public async onModuleInit(): Promise<void> {
    await this.loadAndRestore();
    await this.insertPathInEnv();
  }

  private async insertPathInEnv(): Promise<void> {
    if (!this.configService) return;
    const paths = this.configService.get<string>('WATCH_FOLDER_PATH');
    if (!paths || typeof paths !== 'string' || paths.trim() === '') {
      return;
    }

    let parsed: Array<{ path: string; name?: string }>;
    try {
      parsed = JSON.parse(paths);
      if (!Array.isArray(parsed)) {
        this.logger.warn('WATCH_FOLDER_PATH is not a valid JSON array.');
        return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to parse WATCH_FOLDER_PATH: ${msg}`);
      return;
    }

    for (const item of parsed) {
      if (!item?.path) continue;
      try {
        const check = PathSanitizerUtil.sanitizeAndValidate(item.path);
        if (!check.isValid) {
          this.logger.warn(`Skipping folder path "${item.path}": ${check.error}`);
          continue;
        }

        const existing = Array.from(this.folders.values()).find(
          (f) => f.path.toLowerCase() === check.normalizedPath.toLowerCase(),
        );

        if (existing) {
          if (!existing.isActive) await this.activate(existing.id);
          this.logger.log(`Folder active: ${existing.name} (${existing.path})`);
          continue;
        }

        const folder = await this.create({
          path: check.normalizedPath,
          name: item.name || 'Monitored Folder',
          isActive: true,
          recursive: true,
        });
        this.logger.log(`Auto-registered watch folder: "${folder.name}" -> ${folder.path}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Could not register folder "${item.path}": ${msg}`);
      }
    }
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
        throw new BadRequestException(
          'A folder with this path is already registered.',
        );
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
    let resolved = targetPath
      ? path.normalize(path.resolve(targetPath))
      : os.homedir();
    if (!fs.existsSync(resolved)) {
      resolved = process.cwd();
    }

    const parent =
      path.dirname(resolved) !== resolved ? path.dirname(resolved) : undefined;
    let directories: Array<{ name: string; path: string }> = [];

    try {
      const entries = await fs.promises.readdir(resolved, {
        withFileTypes: true,
      });
      directories = entries
        .filter(
          (e) =>
            e.isDirectory() &&
            !e.name.startsWith('$') &&
            !e.name.startsWith('.'),
        )
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
      item.path = PathSanitizerUtil.resolveCrossPlatformPath(item.path);
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
