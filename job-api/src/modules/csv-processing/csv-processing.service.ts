import {
  Injectable,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import * as path from 'node:path';
import { JobRecord } from '../../common/interfaces/job.interface.js';
import {
  ProcessingError,
  ProcessingHistoryItem,
} from '../../common/interfaces/processing.interface.js';
import { WatcherEventPayload } from '../../common/interfaces/folder.interface.js';
import { FileHasherUtil } from '../../common/utils/file-hasher.util.js';
import { FolderWatcherService } from '../folders/folder-watcher.service.js';
import { FoldersService } from '../folders/folders.service.js';
import { JobsService } from '../jobs/jobs.service.js';
import { JsonStorageService } from '../storage/json-storage.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CsvNormalizerService } from './csv-normalizer.service.js';
import { CsvParserService } from './csv-parser.service.js';
import { CsvValidationService } from './csv-validation.service.js';
import { ConfigService } from '@nestjs/config';

export type JobNotificationDispatcher = (jobs: {
  newJobs: JobRecord[];
  updatedJobs: JobRecord[];
}) => Promise<void> | void;

@Injectable()
export class CsvProcessingService implements OnModuleInit {
  private readonly logger = new Logger(CsvProcessingService.name);
  private readonly storageCategory = 'processing';
  private readonly storageFile = 'processing-history.json';
  private history: ProcessingHistoryItem[] = [];
  private notificationDispatcher?: JobNotificationDispatcher;

  constructor(
    private readonly parser: CsvParserService,
    private readonly configService: ConfigService,
    private readonly normalizer: CsvNormalizerService,
    private readonly validator: CsvValidationService,
    private readonly jobsService: JobsService,
    private readonly storage: JsonStorageService,
    private readonly watcher: FolderWatcherService,
    private readonly foldersService: FoldersService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService?: NotificationsService,
  ) {}

  public async onModuleInit(): Promise<void> {
    this.history = await this.storage.read<ProcessingHistoryItem[]>(
      this.storageCategory,
      this.storageFile,
      [],
    );
    this.watcher.onFileEvent(async (payload) => {
      if (
        (payload.eventType === 'add' || payload.eventType === 'change') &&
        payload.filePath
      ) {
        await this.processCsvFile(payload);
      }
    });
  }

  public setNotificationDispatcher(
    dispatcher: JobNotificationDispatcher,
  ): void {
    this.notificationDispatcher = dispatcher;
  }

  public getHistory(): ProcessingHistoryItem[] {
    return [...this.history].reverse();
  }

  public getHistoryById(id: string): ProcessingHistoryItem | undefined {
    return this.history.find((h) => h.id === id);
  }

  public async processCsvFile(
    event: WatcherEventPayload,
  ): Promise<ProcessingHistoryItem | null> {
    const filePath = event.filePath!;
    const fileName = path.basename(filePath);
    const startTime = Date.now();
    this.logger.log(
      `Beginning CSV processing for file: ${fileName} (${filePath})`,
    );

    let fileHash = '';
    try {
      fileHash = await FileHasherUtil.computeFileHash(filePath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Unable to compute file hash for ${filePath}: ${msg}`);
      return null;
    }

    const alreadyProcessed = this.history.find(
      (h) =>
        h.filePath === filePath &&
        h.fileHash === fileHash &&
        h.status === 'success',
    );
    if (alreadyProcessed) {
      this.logger.log(
        `Skipping unchanged file version: ${fileName} (hash: ${fileHash})`,
      );
      return alreadyProcessed;
    }

    const folderConfig = await this.foldersService
      .findById(event.folderId)
      .catch(() => null);
    const folderName = folderConfig ? folderConfig.name : 'Unknown Folder';

    let rawRows;
    try {
      rawRows = await this.parser.parseCsvFile(filePath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const failedItem = this.createHistoryItem({
        event,
        folderName,
        fileName,
        fileHash,
        status: 'failed',
        total: 0,
        valid: 0,
        failed: 0,
        duration: Date.now() - startTime,
        errors: [{ line: 1, message: `CSV parsing failed: ${msg}` }],
      });
      await this.saveHistoryItem(failedItem);
      return failedItem;
    }

    const validJobs: JobRecord[] = [];
    const errors: ProcessingError[] = [];

    for (const row of rawRows) {
      const normalized = this.normalizer.normalizeRow(row.data, {
        folderId: event.folderId,
        fileName,
      });
      const validation = this.validator.validateRow(
        normalized,
        row.lineNumber,
        row.data,
      );
      if (validation.isValid && validation.record) {
        validJobs.push(validation.record);
      } else {
        errors.push(...validation.errors);
      }
    }

    await this.jobsService.upsertJobs(validJobs);
    await this.foldersService.updateLastEventTime(event.folderId);

    const status =
      errors.length === 0
        ? 'success'
        : validJobs.length > 0
          ? 'partial'
          : 'failed';
    const historyItem = this.createHistoryItem({
      event,
      folderName,
      fileName,
      fileHash,
      status,
      total: rawRows.length,
      valid: validJobs.length,
      failed: errors.length,
      duration: Date.now() - startTime,
      errors,
    });

    await this.saveHistoryItem(historyItem);

    if (this.notificationsService) {
      await this.notificationsService
        .handleFileProcessed(
          historyItem,
          validJobs,
          this.configService.get('SMTP_FROM'),
        )
        .catch((err) =>
          this.logger.error(`Notification dispatch failed: ${err.message}`),
        );
    } else if (this.notificationDispatcher) {
      try {
        await this.notificationDispatcher({
          newJobs: validJobs,
          updatedJobs: [],
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Notification dispatch failed: ${msg}`);
      }
    }

    return historyItem;
  }

  private createHistoryItem(params: {
    event: WatcherEventPayload;
    folderName: string;
    fileName: string;
    fileHash: string;
    status: 'success' | 'failed' | 'partial';
    total: number;
    valid: number;
    failed: number;
    duration: number;
    errors: ProcessingError[];
  }): ProcessingHistoryItem {
    return {
      id: `proc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      folderId: params.event.folderId,
      folderName: params.folderName,
      fileName: params.fileName,
      filePath: params.event.filePath!,
      fileHash: params.fileHash,
      eventType: params.event.eventType === 'change' ? 'change' : 'add',
      status: params.status,
      recordsTotal: params.total,
      recordsValid: params.valid,
      recordsFailed: params.failed,
      durationMs: params.duration,
      errors: params.errors,
      processedAt: new Date().toISOString(),
    };
  }

  private async saveHistoryItem(item: ProcessingHistoryItem): Promise<void> {
    this.history.push(item);
    if (this.history.length > 500) {
      this.history = this.history.slice(-500);
    }
    await this.storage.write(
      this.storageCategory,
      this.storageFile,
      this.history,
    );
  }
}
