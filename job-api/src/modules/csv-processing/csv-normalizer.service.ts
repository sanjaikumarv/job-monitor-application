import { Injectable } from '@nestjs/common';
import { JobRecord } from '../../common/interfaces/job.interface.js';
import { FileHasherUtil } from '../../common/utils/file-hasher.util.js';

@Injectable()
export class CsvNormalizerService {
  public normalizeRow(
    raw: Record<string, string>,
    metadata?: { folderId?: string; fileName?: string },
  ): Partial<JobRecord> {
    const getVal = (...keys: string[]): string => {
      for (const k of keys) {
        if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== '') {
          return String(raw[k]).trim();
        }
      }
      return '';
    };

    const title = getVal('jobTitle', 'Job title', 'title', 'Title', 'Role', 'role');
    const company = getVal('companyName', 'Company', 'company', 'Company Name', 'Organization');
    const location = getVal('location', 'Location', 'City', 'Job Location') || 'Not specified';
    const appUrl = getVal('applicationUrl', 'Job URL', 'url', 'URL', 'Link', 'applyUrl');
    const experience = getVal('experience', 'Experience required', 'Experience', 'exp') || 'Not specified';
    const salary = getVal('salary', 'Salary', 'Compensation', 'CTC') || 'Not disclosed';
    const employmentType = getVal('employmentType', 'Work mode (Remote/Hybrid/Office)', 'type') || 'Full-time';
    const description = getVal('description', 'Match explanation', 'Job Description', 'summary') || 'No description provided';
    const postedAt = getVal('postedAt', 'Posted date', 'Date and time discovered', 'date') || new Date().toISOString();
    const source = getVal('source', 'Platform', 'Source', 'platform') || 'CSV Import';

    // Parse skills
    const rawSkills = getVal('skills', 'Required skills', 'Skills', 'techStack');
    const skills = this.parseSkills(rawSkills);

    let jobId = getVal('jobId', 'Job ID', 'id', 'ID');
    if (!jobId && title && company) {
      jobId = FileHasherUtil.computeCompositeJobId(company, title, appUrl);
    }

    const now = new Date().toISOString();

    return {
      jobId,
      jobTitle: title,
      companyName: company,
      location,
      employmentType,
      experience,
      salary,
      description,
      applicationUrl: appUrl,
      postedAt,
      skills,
      source,
      platform: getVal('Platform', 'platform'),
      workMode: getVal('Work mode (Remote/Hybrid/Office)', 'workMode'),
      matchScore: getVal('Match score', 'matchScore'),
      matchExplanation: getVal('Match explanation'),
      discoveredAt: getVal('Date and time discovered'),
      applicationStatus: getVal('Application status') || 'Not Applied',
      sourceFolderId: metadata?.folderId,
      sourceFileName: metadata?.fileName,
      createdAt: now,
      updatedAt: now,
    };
  }

  private parseSkills(rawSkills: string): string[] {
    if (!rawSkills) return [];
    try {
      if (rawSkills.startsWith('[') && rawSkills.endsWith(']')) {
        const parsed = JSON.parse(rawSkills);
        if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      // fallback to comma separated
    }
    return rawSkills
      .split(/[,;|]/)
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter((s) => s.length > 0);
  }
}

