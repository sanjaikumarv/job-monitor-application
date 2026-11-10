import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PushProvider } from './push-provider.service.js';
import { PushService } from './push.service.js';
import { DevicesService } from '../devices/devices.service.js';
import { JobRecord } from '../../common/interfaces/job.interface.js';

describe('PushProvider & PushService', () => {
  let pushProvider: PushProvider;
  let pushService: PushService;
  let mockDevicesService: Partial<DevicesService>;

  const mockJob: JobRecord = {
    jobId: 'JOB-2026-001',
    jobTitle: 'Senior Full Stack Developer',
    companyName: 'Tech Solutions Pvt Ltd',
    location: 'Remote - India',
    employmentType: 'Full-time',
    experience: '4-6 Years',
    salary: '12-18 LPA',
    description: 'We are looking for an experienced full-stack developer.',
    applicationUrl: 'https://example.com/jobs/senior-full-stack-developer',
    postedAt: '2026-11-10T10:30:00Z',
    skills: ['React.js', 'Next.js'],
    source: 'Company Careers',
    createdAt: '2026-11-10T10:30:00Z',
    updatedAt: '2026-11-10T10:30:00Z',
  };

  beforeEach(() => {
    pushProvider = new PushProvider();

    mockDevicesService = {
      getAllTokens: vi.fn().mockReturnValue(['mock-token-web-1', 'mock-token-mobile-2']),
      removeTokens: vi.fn().mockResolvedValue(undefined),
    };

    pushService = new PushService(
      pushProvider,
      mockDevicesService as DevicesService,
    );
  });

  it('should dispatch push notifications via PushProvider in mock mode', async () => {
    const result = await pushProvider.send({
      recipient: 'mock-device-1',
      title: 'New Job Opportunity!',
      body: 'Senior Full Stack Developer at Tech Solutions Pvt Ltd',
      idempotencyKey: 'test-key-1',
    });

    expect(result.isMock).toBe(true);
    expect(result.providerMessageId).toMatch(/^mock-push-/);
  });

  it('should dispatch to all registered devices and track accepted outcomes', async () => {
    const res = await pushService.sendJobPushNotification(mockJob);
    expect(res.accepted).toBe(2);
    expect(res.failed).toBe(0);
  });

  it('should fallback to mock dispatch when no devices are registered', async () => {
    mockDevicesService.getAllTokens = vi.fn().mockReturnValue([]);
    const res = await pushService.sendJobPushNotification(mockJob);
    expect(res.accepted).toBe(1);
    expect(res.failed).toBe(0);
  });
});
