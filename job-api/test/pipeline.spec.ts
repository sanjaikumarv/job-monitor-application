import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { JsonStorageService } from '../src/modules/storage/json-storage.service.js';
import { FolderWatcherService } from '../src/modules/folders/folder-watcher.service.js';
import { FoldersService } from '../src/modules/folders/folders.service.js';
import { JobsService } from '../src/modules/jobs/jobs.service.js';
import { CsvParserService } from '../src/modules/csv-processing/csv-parser.service.js';
import { CsvNormalizerService } from '../src/modules/csv-processing/csv-normalizer.service.js';
import { CsvValidationService } from '../src/modules/csv-processing/csv-validation.service.js';
import { CsvProcessingService } from '../src/modules/csv-processing/csv-processing.service.js';
import { QueueService } from '../src/modules/queues/queue.service.js';
import { EmailTemplateService } from '../src/modules/email/email-template.service.js';
import { EmailService } from '../src/modules/email/email.service.js';
import { EmailNotificationProcessor } from '../src/modules/email/processors/email.processor.js';
import { PushProvider } from '../src/modules/push/push-provider.service.js';
import { PushService } from '../src/modules/push/push.service.js';
import { PushNotificationProcessor } from '../src/modules/push/processors/push.processor.js';
import { DevicesService } from '../src/modules/devices/devices.service.js';
import { NotificationsService } from '../src/modules/notifications/notifications.service.js';
import { ConfigService } from '@nestjs/config';

describe('End-to-End Pipeline Integration', () => {
  let tempWatchDir: string;
  let storage: JsonStorageService;
  let watcher: FolderWatcherService;
  let foldersService: FoldersService;
  let jobsService: JobsService;
  let csvProcessingService: CsvProcessingService;
  let notificationsService: NotificationsService;
  let queueService: QueueService;

  beforeAll(async () => {
    tempWatchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'job-monitor-test-'));

    storage = new JsonStorageService();
    storage.setBaseDirectory(path.join(tempWatchDir, 'storage'));
    storage.ensureBaseDirectories();

    queueService = new QueueService();
    watcher = new FolderWatcherService();
    foldersService = new FoldersService(storage, watcher);
    jobsService = new JobsService(storage);

    const configService = new ConfigService();
    const emailTemplateService = new EmailTemplateService();
    const emailService = new EmailService(configService, emailTemplateService);
    emailService.sendJobNotification = vi.fn().mockResolvedValue({
      success: true,
      messageId: 'e2e-email-1',
      recipient: 'admin@example.com',
    });
    const devicesService = new DevicesService(storage);
    const pushProvider = new PushProvider();
    const pushService = new PushService(pushProvider, devicesService);

    notificationsService = new NotificationsService(storage, queueService);
    new EmailNotificationProcessor(queueService, emailService, notificationsService).onModuleInit();
    new PushNotificationProcessor(queueService, pushService, notificationsService).onModuleInit();

    csvProcessingService = new CsvProcessingService(
      new CsvParserService(),
      new CsvNormalizerService(),
      new CsvValidationService(),
      jobsService,
      storage,
      watcher,
      foldersService,
      notificationsService,
    );

    await storage.onModuleInit();
    await foldersService.onModuleInit();
    await jobsService.onModuleInit();
    await notificationsService.onModuleInit();
    await csvProcessingService.onModuleInit();
  });

  afterAll(async () => {
    await watcher.onModuleDestroy();
    await queueService.onModuleDestroy();
    if (fs.existsSync(tempWatchDir)) {
      fs.rmSync(tempWatchDir, { recursive: true, force: true });
    }
  });

  it('should process sample CSV, persist job, and complete notifications', async () => {
    // 1. Register folder
    const folder = await foldersService.create({
      name: 'E2E Monitored Folder',
      path: tempWatchDir,
    });
    expect(folder.id).toBeDefined();

    // 2. Drop user's sample CSV into folder
    const sampleFixture = path.resolve(process.cwd(), 'test/fixtures/sample-jobs.csv');
    const targetCsvPath = path.join(tempWatchDir, 'jobs_2026-11-10_190006.csv');
    fs.copyFileSync(sampleFixture, targetCsvPath);

    // 3. Process CSV file
    const result = await csvProcessingService.processCsvFile({
      folderId: folder.id,
      eventType: 'add',
      filePath: targetCsvPath,
      timestamp: new Date().toISOString(),
    });

    expect(result).toBeDefined();
    expect(result?.status).toBe('success');
    expect(result?.recordsTotal).toBe(1);
    expect(result?.recordsValid).toBe(1);
    expect(result?.recordsFailed).toBe(0);

    // 4. Verify job record
    const { data: jobs, total } = await jobsService.findAll();
    expect(total).toBeGreaterThanOrEqual(1);
    const job = jobs.find((j) => j.jobTitle === 'Sr.Reactjs Developer');
    expect(job).toBeDefined();
    expect(job?.companyName).toBe('PositiveEdge Solutions');
    expect(job?.skills).toContain('ReactJS');
    expect(job?.skills).toContain('MongoDB');
    expect(job?.applicationUrl).toContain('linkedin.com/jobs/view/4489472203');

    // 5. Allow queue workers to process
    await new Promise((r) => setTimeout(r, 200));

    // 6. Verify notification tasks
    const notifications = notificationsService.findAll();
    expect(notifications.length).toBeGreaterThanOrEqual(2); // 1 email + 1 push

    const emailTask = notifications.find((n) => n.channel === 'email' && n.jobId === job?.jobId);
    expect(emailTask).toBeDefined();
    expect(emailTask?.status).toBe('sent');

    const pushTask = notifications.find((n) => n.channel === 'push' && n.jobId === job?.jobId);
    expect(pushTask).toBeDefined();
    expect(pushTask?.status).toBe('sent');

    // 7. Test SHA-256 fingerprint deduplication on identical file
    const repeatResult = await csvProcessingService.processCsvFile({
      folderId: folder.id,
      eventType: 'change',
      filePath: targetCsvPath,
      timestamp: new Date().toISOString(),
    });

    expect(repeatResult?.id).toBe(result?.id); // returns existing history item without re-notifying
  });
});
