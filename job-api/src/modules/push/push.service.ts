import { Injectable, Logger } from '@nestjs/common';
import { JobRecord } from '../../common/interfaces/job.interface.js';
import { DevicesService } from '../devices/devices.service.js';
import {
  FcmDispatchResult,
  SendNotificationInput,
} from './notification-provider.interface.js';
import { PushProvider } from './push-provider.service.js';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly pushProvider: PushProvider,
    private readonly devicesService: DevicesService,
  ) {}

  public async sendJobPushNotification(job: JobRecord): Promise<FcmDispatchResult> {
    const tokens = this.devicesService.getAllTokens();

    const title = 'New Job Opportunity!';
    const body = `${job.jobTitle} at ${job.companyName}`;
    const idempotencyKey = `push-${job.jobId}-${Date.now()}`;

    if (tokens.length === 0) {
      this.logger.debug(`No device tokens registered. Running mock push for job ${job.jobId}.`);
      await this.pushProvider.send({
        recipient: 'mock-all-devices',
        title,
        body,
        idempotencyKey,
        data: {
          jobId: job.jobId,
          jobTitle: job.jobTitle,
          applicationUrl: job.applicationUrl,
          type: 'NEW_JOB',
        },
      });
      return { accepted: 1, failed: 0, invalidTokens: [] };
    }

    let accepted = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    for (const token of tokens) {
      const input: SendNotificationInput = {
        recipient: token,
        title,
        body,
        idempotencyKey,
        data: {
          jobId: job.jobId,
          jobTitle: job.jobTitle,
          applicationUrl: job.applicationUrl,
          type: 'NEW_JOB',
        },
      };

      try {
        const result = await this.pushProvider.send(input);
        if (result.providerMessageId) {
          accepted++;
        }
      } catch (err: unknown) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Push dispatch failed for token ${token}: ${msg}`);

        if (msg.includes('UNREGISTERED') && !token.startsWith('device-')) {
          invalidTokens.push(token);
        }
      }
    }

    if (invalidTokens.length > 0) {
      await this.devicesService.removeTokens(invalidTokens);
      this.logger.warn(`Pruned ${invalidTokens.length} expired or invalid device tokens.`);
    }

    this.logger.log(
      `Push dispatch completed for "${job.jobTitle}": ${accepted} accepted, ${failed} failed.`,
    );

    return { accepted, failed, invalidTokens };
  }
}
