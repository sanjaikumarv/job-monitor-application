import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JobQueryDto, JobRecord } from '../../common/interfaces/job.interface.js';
import { JsonStorageService } from '../storage/json-storage.service.js';

export interface UpsertResult {
  newlyAdded: JobRecord[];
  updated: JobRecord[];
  unchangedCount: number;
}

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);
  private readonly storageCategory = 'jobs';
  private readonly storageFile = 'jobs.json';
  private readonly jobsMap = new Map<string, JobRecord>();

  constructor(private readonly storage: JsonStorageService) {}

  public async onModuleInit(): Promise<void> {
    await this.loadJobs();
  }

  public async upsertJobs(incoming: JobRecord[]): Promise<UpsertResult> {
    const newlyAdded: JobRecord[] = [];
    const updated: JobRecord[] = [];
    let unchangedCount = 0;
    const now = new Date().toISOString();

    for (const record of incoming) {
      const existing = this.jobsMap.get(record.jobId);
      if (!existing) {
        record.createdAt = record.createdAt || now;
        record.updatedAt = now;
        this.jobsMap.set(record.jobId, record);
        newlyAdded.push(record);
      } else {
        if (this.hasMeaningfulChange(existing, record)) {
          const merged: JobRecord = {
            ...existing,
            ...record,
            createdAt: existing.createdAt,
            updatedAt: now,
          };
          this.jobsMap.set(record.jobId, merged);
          updated.push(merged);
        } else {
          unchangedCount++;
        }
      }
    }

    if (newlyAdded.length > 0 || updated.length > 0) {
      await this.persist();
      this.logger.log(
        `Persisted jobs: ${newlyAdded.length} new, ${updated.length} updated, ${unchangedCount} unchanged.`,
      );
    }

    return { newlyAdded, updated, unchangedCount };
  }

  public async findAll(
    query?: JobQueryDto,
  ): Promise<{ data: JobRecord[]; total: number; page: number; limit: number }> {
    const all = Array.from(this.jobsMap.values());
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 20));

    let filtered = all;

    if (query?.search) {
      const term = query.search.toLowerCase();
      filtered = filtered.filter(
        (j) =>
          j.jobTitle.toLowerCase().includes(term) ||
          j.companyName.toLowerCase().includes(term) ||
          j.skills.some((s) => s.toLowerCase().includes(term)),
      );
    }

    if (query?.company) {
      const comp = query.company.toLowerCase();
      filtered = filtered.filter((j) => j.companyName.toLowerCase().includes(comp));
    }

    if (query?.location) {
      const loc = query.location.toLowerCase();
      filtered = filtered.filter((j) => j.location.toLowerCase().includes(loc));
    }

    // Sort newest first
    filtered.sort(
      (a, b) => new Date(b.postedAt || b.createdAt).getTime() - new Date(a.postedAt || a.createdAt).getTime(),
    );

    const startIndex = (page - 1) * limit;
    const data = filtered.slice(startIndex, startIndex + limit);

    return { data, total: filtered.length, page, limit };
  }

  public findById(id: string): JobRecord | undefined {
    return this.jobsMap.get(id);
  }

  public async getStats(): Promise<{
    totalJobs: number;
    totalCompanies: number;
    sources: Record<string, number>;
  }> {
    const all = Array.from(this.jobsMap.values());
    const companies = new Set(all.map((j) => j.companyName.toLowerCase()));
    const sources: Record<string, number> = {};

    for (const job of all) {
      const src = job.source || 'Other';
      sources[src] = (sources[src] || 0) + 1;
    }

    return {
      totalJobs: all.length,
      totalCompanies: companies.size,
      sources,
    };
  }

  private hasMeaningfulChange(oldJob: JobRecord, newJob: JobRecord): boolean {
    if (oldJob.salary !== newJob.salary) return true;
    if (oldJob.location !== newJob.location) return true;
    if (oldJob.employmentType !== newJob.employmentType) return true;
    if (oldJob.applicationStatus !== newJob.applicationStatus) return true;
    if (oldJob.description !== newJob.description) return true;
    if (oldJob.skills.join(',') !== newJob.skills.join(',')) return true;
    return false;
  }

  private async loadJobs(): Promise<void> {
    const list = await this.storage.read<JobRecord[]>(
      this.storageCategory,
      this.storageFile,
      [],
    );
    this.jobsMap.clear();
    for (const j of list) {
      this.jobsMap.set(j.jobId, j);
    }
    this.logger.log(`Loaded ${this.jobsMap.size} existing job records into memory.`);
  }

  private async persist(): Promise<void> {
    await this.storage.write(
      this.storageCategory,
      this.storageFile,
      Array.from(this.jobsMap.values()),
    );
  }
}

