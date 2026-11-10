import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as chokidar from 'chokidar';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  FolderConfig,
  MonitoringStatus,
  WatcherEventPayload,
} from '../../common/interfaces/folder.interface.js';

type EventListener = (payload: WatcherEventPayload) => Promise<void> | void;

@Injectable()
export class FolderWatcherService implements OnModuleDestroy {
  private readonly logger = new Logger(FolderWatcherService.name);
  private readonly watchers = new Map<string, chokidar.FSWatcher>();
  private readonly folderStatuses = new Map<string, MonitoringStatus>();
  private readonly listeners = new Set<EventListener>();
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();

  public onFileEvent(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getStatus(folderId: string): MonitoringStatus {
    return this.folderStatuses.get(folderId) ?? 'stopped';
  }

  public watchFolder(folder: FolderConfig): void {
    this.unwatchFolder(folder.id);

    this.logger.log(
      `Starting watcher for folder: "${folder.name}" (${folder.path})`,
    );
    this.folderStatuses.set(folder.id, 'watching');

    const watcher = chokidar.watch(folder.path, {
      ignored: [
        /(^|[/\\])\../, // dotfiles
        /~.*$/, // temp files
        /\.tmp$/i,
        /\.crdownload$/i,
        (file: string) => {
          // Allow directories to be traversed if recursive, otherwise filter non-csv files
          if (!file) return false;
          const ext = path.extname(file).toLowerCase();
          return ext !== '' && ext !== '.csv';
        },
      ],
      persistent: true,
      ignoreInitial: false,
      depth: folder.recursive ? undefined : 0,
      awaitWriteFinish: false, // We use custom robust stability check
    });

    watcher
      .on('add', (filePath: string) =>
        this.handleFileEvent(folder.id, 'add', filePath),
      )
      .on('change', (filePath: string) =>
        this.handleFileEvent(folder.id, 'change', filePath),
      )
      .on('unlink', (filePath: string) =>
        this.emitEvent(folder.id, 'unlink', filePath),
      )
      .on('error', (err: unknown) => {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        this.logger.error(
          `Watcher error for folder ${folder.id}: ${errorObj.message}`,
        );
        this.folderStatuses.set(folder.id, 'error');
        this.emitEvent(folder.id, 'error', undefined, errorObj);
      })
      .on('ready', () => {
        this.logger.log(`Watcher ready for folder "${folder.name}"`);
        this.emitEvent(folder.id, 'ready');
      });

    this.watchers.set(folder.id, watcher);
  }

  public async unwatchFolder(folderId: string): Promise<void> {
    const existing = this.watchers.get(folderId);
    if (existing) {
      await existing.close();
      this.watchers.delete(folderId);
      this.folderStatuses.set(folderId, 'stopped');
      this.logger.log(`Stopped watcher for folder: ${folderId}`);
    }
  }

  public async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing all filesystem watchers...');
    for (const [id, watcher] of this.watchers.entries()) {
      await watcher.close();
      this.logger.debug(`Closed watcher ${id}`);
    }
    this.watchers.clear();
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  private handleFileEvent(
    folderId: string,
    eventType: 'add' | 'change',
    filePath: string,
  ): void {
    if (path.extname(filePath).toLowerCase() !== '.csv') return;

    const debounceKey = `${folderId}:${filePath}`;
    const existingTimer = this.debounceTimers.get(debounceKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(debounceKey);
      const isReady = await this.verifyFileStability(filePath);
      if (isReady) {
        await this.emitEvent(folderId, eventType, filePath);
      } else {
        this.logger.warn(`File ${filePath} could not be stabilized or read.`);
      }
    }, 400);

    this.debounceTimers.set(debounceKey, timer);
  }

  private async verifyFileStability(
    filePath: string,
    maxAttempts = 6,
  ): Promise<boolean> {
    let previousSize = -1;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        if (!fs.existsSync(filePath)) return false;
        const stats = await fs.promises.stat(filePath);
        if (stats.size === previousSize && stats.size > 0) {
          // Attempt to open readable handle to verify no OS locks
          const fd = await fs.promises.open(filePath, 'r');
          await fd.close();
          return true;
        }
        previousSize = stats.size;
      } catch {
        // file locked or busy, wait
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
  }

  private async emitEvent(
    folderId: string,
    eventType: 'add' | 'change' | 'unlink' | 'error' | 'ready',
    filePath?: string,
    error?: Error,
  ): Promise<void> {
    const payload: WatcherEventPayload = {
      folderId,
      eventType,
      filePath,
      error,
      timestamp: new Date().toISOString(),
    };

    for (const listener of this.listeners) {
      try {
        await listener(payload);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Listener failed processing event ${eventType}: ${msg}`,
        );
      }
    }
  }
}
