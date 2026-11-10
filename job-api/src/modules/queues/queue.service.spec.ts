import { describe, it, expect, vi } from 'vitest';
import { QueueService } from './queue.service.js';

describe('QueueService (BullMQ Integration)', () => {
  it('should process enqueued jobs with worker', async () => {
    const queue = new QueueService();
    const processed: string[] = [];

    queue.registerWorker<string>('test-queue', async (job) => {
      processed.push(job.data);
    });

    await queue.add('test-queue', 'job-1', 'Hello BullMQ', { jobId: 'uniq-1' });

    // Allow async tick
    await new Promise((r) => setTimeout(r, 50));
    expect(processed).toContain('Hello BullMQ');
  });

  it('should prevent duplicate queue submissions with same jobId', async () => {
    const queue = new QueueService();
    const processed: string[] = [];

    queue.registerWorker<string>('dedup-queue', async (job) => {
      processed.push(job.data);
    });

    const job1 = await queue.add('dedup-queue', 'task', 'Data 1', { jobId: 'dup-123' });
    const job2 = await queue.add('dedup-queue', 'task', 'Data 2', { jobId: 'dup-123' });

    expect(job1).toBeDefined();
    expect(job2).toBeNull();
  });

  it('should retry failed jobs with exponential backoff up to max attempts', async () => {
    const queue = new QueueService();
    let attempts = 0;

    queue.registerWorker('fail-queue', async () => {
      attempts++;
      throw new Error('Simulated failure');
    });

    await queue.add('fail-queue', 'retry-job', {}, {
      jobId: 'fail-1',
      attempts: 3,
      backoff: { type: 'exponential', delay: 20 },
    });

    // Wait for retries
    await new Promise((r) => setTimeout(r, 200));
    expect(attempts).toBe(3);
  });
});

