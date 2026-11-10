import { Controller, Get, Param, Query } from '@nestjs/common';
import type { JobRecord } from '../../common/interfaces/job.interface.js';
import { JobQueryDto } from '../../common/dto/job-query.dto.js';
import { JobsService } from './jobs.service.js';

@Controller('api/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  public async findAll(
    @Query() query: JobQueryDto,
  ): Promise<{ data: JobRecord[]; total: number; page: number; limit: number }> {
    return this.jobsService.findAll(query);
  }

  @Get('stats')
  public async getStats(): Promise<{
    totalJobs: number;
    totalCompanies: number;
    sources: Record<string, number>;
  }> {
    return this.jobsService.getStats();
  }

  @Get(':id')
  public findById(@Param('id') id: string): JobRecord | { error: string } {
    const job = this.jobsService.findById(id);
    if (!job) {
      return { error: 'Job not found' };
    }
    return job;
  }
}
