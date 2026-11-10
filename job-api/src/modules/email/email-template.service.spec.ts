import { describe, it, expect } from 'vitest';
import { EmailTemplateService } from './email-template.service.js';
import { JobRecord } from '../../common/interfaces/job.interface.js';

describe('EmailTemplateService', () => {
  const service = new EmailTemplateService();

  const mockJob: JobRecord = {
    jobId: 'JOB-2026-001',
    jobTitle: 'Senior Full Stack Developer <script>alert(1)</script>',
    companyName: 'Tech Solutions & Partners',
    location: 'Remote - India',
    employmentType: 'Full-time',
    experience: '4-6 Years',
    salary: '12-18 LPA',
    description: 'Looking for a developer with React & Node experience.',
    applicationUrl: 'https://example.com/jobs/senior-full-stack',
    postedAt: '2026-11-10T10:30:00Z',
    skills: ['React.js', 'Next.js', 'Node.js', 'TypeScript'],
    source: 'Company Careers',
    createdAt: '2026-11-10T10:30:00Z',
    updatedAt: '2026-11-10T10:30:00Z',
  };

  it('should format subject line correctly', () => {
    const subject = service.formatSubject(mockJob);
    expect(subject).toContain('New Job Opportunity: Senior Full Stack Developer');
    expect(subject).toContain('Tech Solutions & Partners');
  });

  it('should escape HTML characters to prevent XSS injection', () => {
    const html = service.renderHtml(mockJob);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Tech Solutions &amp; Partners');
  });

  it('should render skills badges and CTA button in HTML', () => {
    const html = service.renderHtml(mockJob);
    expect(html).toContain('React.js');
    expect(html).toContain('Next.js');
    expect(html).toContain('href="https://example.com/jobs/senior-full-stack"');
    expect(html).toContain('Apply Now');
  });

  it('should generate complete plain text fallback', () => {
    const text = service.renderPlainText(mockJob);
    expect(text).toContain('NEW JOB OPPORTUNITY: Senior Full Stack Developer');
    expect(text).toContain('Salary:          12-18 LPA');
    expect(text).toContain('Required Skills:\nReact.js, Next.js, Node.js, TypeScript');
    expect(text).toContain('Apply Now:\nhttps://example.com/jobs/senior-full-stack');
  });
});

