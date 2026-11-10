import { Injectable } from '@nestjs/common';
import { JobRecord } from '../../common/interfaces/job.interface.js';
import { ProcessingError } from '../../common/interfaces/processing.interface.js';

export interface RowValidationResult {
  isValid: boolean;
  errors: ProcessingError[];
  record?: JobRecord;
}

@Injectable()
export class CsvValidationService {
  public validateRow(
    row: Partial<JobRecord>,
    lineNumber: number,
    rawRow?: Record<string, unknown>,
  ): RowValidationResult {
    const errors: ProcessingError[] = [];

    if (!row.jobTitle || row.jobTitle.trim().length === 0) {
      errors.push({
        line: lineNumber,
        field: 'jobTitle',
        message: 'Job Title is required and cannot be empty.',
        raw: rawRow,
      });
    }

    if (!row.companyName || row.companyName.trim().length === 0) {
      errors.push({
        line: lineNumber,
        field: 'companyName',
        message: 'Company Name is required and cannot be empty.',
        raw: rawRow,
      });
    }

    if (!row.applicationUrl || row.applicationUrl.trim().length === 0) {
      errors.push({
        line: lineNumber,
        field: 'applicationUrl',
        message: 'Application URL is required and cannot be empty.',
        raw: rawRow,
      });
    } else if (!this.isValidUrl(row.applicationUrl)) {
      errors.push({
        line: lineNumber,
        field: 'applicationUrl',
        message: `Application URL is malformed: "${row.applicationUrl}".`,
        raw: rawRow,
      });
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors: [],
      record: row as JobRecord,
    };
  }

  private isValidUrl(urlStr: string): boolean {
    try {
      const url = new URL(urlStr);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

