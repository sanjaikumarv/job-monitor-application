import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { QueueJobOptions } from './queue.constants.js';

export interface EnqueuedJob<T> {
  id: string;
  name: string;
  data: T;
  opts: QueueJobOptions;
  attemptsMade: number;
  lastError?: Error;
  addedAt: number;
}

export type QueueWorkerProcessor<T> = (job: EnqueuedJob<T>) => Promise<void>;

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, EnqueuedJob<unknown>[]>();
  private readonly processedJobIds = new Set<string>();
  private readonly activeWorkers = new Map<string, QueueWorkerProcessor<unknown>>();
  private readonly workerConcurrency = new Map<string, number>();
  private readonly activeCount = new Map<string, number>();
  private isShuttingDown = false;

  public async add<T>(
    queueName: string,
    jobName: string,
    data: T,
    opts: QueueJobOptions = {},
  ): Promise<EnqueuedJob<T> | null> {
    const jobId = opts.jobId || `${queueName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Job deduplication check
    if (opts.jobId && this.processedJobIds.has(opts.jobId)) {
      this.logger.debug(`Job ${jobId} already queued or processed in ${queueName}. Skipping.`);
      return null;
    }

    if (opts.jobId) {
      this.processedJobIds.add(opts.jobId);
    }

    const job: EnqueuedJob<T> = {
      id: jobId,
      name: jobName,
      data,
      opts: {
        attempts: opts.attempts ?? 3,
        backoff: opts.backoff ?? { type: 'exponential', delay: 1000 },
        removeOnComplete: opts.removeOnComplete ?? 100,
        removeOnFail: opts.removeOnFail ?? 200,
        concurrency: opts.concurrency ?? 5,
      },
      attemptsMade: 0,
      addedAt: Date.now(),
    };

    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }
    this.queues.get(queueName)!.push(job as EnqueuedJob<unknown>);
    this.logger.debug(`Enqueued job ${job.id} into queue "${queueName}"`);

    // Trigger processing
    this.processNext(queueName);
    return job;
  }

  public registerWorker<T>(
    queueName: string,
    processor: QueueWorkerProcessor<T>,
    concurrency = 5,
  ): void {
    this.activeWorkers.set(queueName, processor as QueueWorkerProcessor<unknown>);
    this.workerConcurrency.set(queueName, concurrency);
    this.activeCount.set(queueName, 0);
    this.logger.log(`Registered BullMQ worker for queue "${queueName}" with concurrency ${concurrency}`);
    this.processNext(queueName);
  }

  public async onModuleDestroy(): Promise<void> {
    this.logger.log('Gracefully shutting down queues and waiting for in-flight tasks...');
    this.isShuttingDown = true;
    let attempts = 0;
    while (Array.from(this.activeCount.values()).some((c) => c > 0) && attempts < 10) {
      await new Promise((r) => setTimeout(r, 200));
      attempts++;
    }
  }

  private processNext(queueName: string): void {
    if (this.isShuttingDown) return;
    const worker = this.activeWorkers.get(queueName);
    if (!worker) return;

    const maxConcurrency = this.workerConcurrency.get(queueName) || 5;
    const currentActive = this.activeCount.get(queueName) || 0;
    if (currentActive >= maxConcurrency) return;

    const queue = this.queues.get(queueName);
    if (!queue || queue.length === 0) return;

    const job = queue.shift()!;
    this.activeCount.set(queueName, currentActive + 1);

    this.executeJob(queueName, job, worker).finally(() => {
      const active = (this.activeCount.get(queueName) || 1) - 1;
      this.activeCount.set(queueName, Math.max(0, active));
      this.processNext(queueName);
    });
  }

  private async executeJob(
    queueName: string,
    job: EnqueuedJob<unknown>,
    worker: QueueWorkerProcessor<unknown>,
  ): Promise<void> {
    job.attemptsMade++;
    try {
      await worker(job);
      this.logger.debug(`Job ${job.id} completed successfully in queue "${queueName}"`);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      job.lastError = error;
      const maxAttempts = job.opts.attempts || 3;

      if (job.attemptsMade < maxAttempts) {
        const delay = this.computeBackoffDelay(job.opts.backoff, job.attemptsMade);
        this.logger.warn(
          `Job ${job.id} failed attempt ${job.attemptsMade}/${maxAttempts}: ${error.message}. Retrying in ${delay}ms...`,
        );
        setTimeout(() => {
          if (!this.isShuttingDown) {
            this.queues.get(queueName)?.push(job);
            this.processNext(queueName);
          }
        }, delay);
      } else {
        this.logger.error(`Job ${job.id} permanently failed after ${maxAttempts} attempts: ${error.message}`);
      }
    }
  }

  private computeBackoffDelay(
    backoff?: { type: 'exponential' | 'fixed'; delay: number },
    attempt = 1,
  ): number {
    if (!backoff) return 1000;
    if (backoff.type === 'fixed') return backoff.delay;
    return backoff.delay * Math.pow(2, attempt - 1);
  }
}

