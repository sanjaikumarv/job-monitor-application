import { describe, it, expect } from 'vitest';
import { CsvParserService } from './csv-parser.service.js';
import * as path from 'node:path';

describe('CsvParserService', () => {
  const parser = new CsvParserService();

  it('should parse standard CSV with quoted descriptions and commas', async () => {
    const csv = `jobId,jobTitle,companyName,location,employmentType,experience,salary,description,applicationUrl,postedAt,skills,source
JOB-1,"Senior Full Stack Developer","Tech Solutions Pvt Ltd","Remote - India",Full-time,"4-6 Years","12-18 LPA","We are looking for an experienced full-stack developer, with React, Next.js and Node.js.","https://example.com/job1","2026-11-10T10:30:00Z","React.js, Next.js, Node.js","Company Careers"`;

    const rows = await parser.parseCsvString(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].data.jobTitle).toBe('Senior Full Stack Developer');
    expect(rows[0].data.description).toContain('with React, Next.js');
    expect(rows[0].lineNumber).toBe(2);
  });

  it('should parse multiline descriptions accurately', async () => {
    const csv = `jobId,jobTitle,companyName,applicationUrl,description
JOB-2,"DevOps Engineer","Cloud Corp","https://example.com/devops","Line 1
Line 2 with comma, and details
Line 3"`;

    const rows = await parser.parseCsvString(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].data.description).toContain('Line 1\nLine 2 with comma, and details\nLine 3');
  });

  it('should parse the user provided sample CSV fixture file', async () => {
    const fixturePath = path.resolve(process.cwd(), 'test/fixtures/sample-jobs.csv');
    const rows = await parser.parseCsvFile(fixturePath);
    expect(rows).toHaveLength(1);
    expect(rows[0].data['Job title']).toBe('Sr.Reactjs Developer');
    expect(rows[0].data['Company']).toBe('PositiveEdge Solutions');
    expect(rows[0].data['Job URL']).toBe('https://www.linkedin.com/jobs/view/4489472203/');
    expect(rows[0].data['Required skills']).toContain('ReactJS, Docker, MongoDB');
  });
});

