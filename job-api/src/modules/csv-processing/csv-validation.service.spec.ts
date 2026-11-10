import { describe, it, expect } from 'vitest';
import { CsvValidationService } from './csv-validation.service.js';
import { CsvNormalizerService } from './csv-normalizer.service.js';

describe('CsvValidationService & Normalizer', () => {
  const validator = new CsvValidationService();
  const normalizer = new CsvNormalizerService();

  it('should validate and accept a complete job record', () => {
    const raw = {
      jobTitle: 'Frontend Engineer',
      companyName: 'Acme Corp',
      applicationUrl: 'https://acme.com/jobs/123',
    };
    const normalized = normalizer.normalizeRow(raw);
    const result = validator.validateRow(normalized, 2, raw);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.record?.jobId).toBeDefined();
  });

  it('should normalize and validate sample CSV schema from user prompt', () => {
    const raw = {
      'Job title': 'Sr.Reactjs Developer',
      Company: 'PositiveEdge Solutions',
      'Job URL': 'https://www.linkedin.com/jobs/view/4489472203/',
      Location: 'Bengaluru, Karnataka, India',
      'Required skills': 'JavaScript, ReactJS, Docker, MongoDB',
      'Match explanation': 'Strong skills match',
    };
    const normalized = normalizer.normalizeRow(raw);
    const result = validator.validateRow(normalized, 5, raw);

    expect(result.isValid).toBe(true);
    expect(result.record?.jobTitle).toBe('Sr.Reactjs Developer');
    expect(result.record?.companyName).toBe('PositiveEdge Solutions');
    expect(result.record?.skills).toEqual([
      'JavaScript',
      'ReactJS',
      'Docker',
      'MongoDB',
    ]);
  });

  it('should reject missing required fields and record line numbers', () => {
    const raw = {
      jobTitle: '',
      companyName: '',
      applicationUrl: 'invalid-url',
    };
    const normalized = normalizer.normalizeRow(raw);
    const result = validator.validateRow(normalized, 14, raw);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(3);
    expect(result.errors.find((e) => e.field === 'jobTitle')?.line).toBe(14);
    expect(result.errors.find((e) => e.field === 'companyName')?.line).toBe(14);
    expect(result.errors.find((e) => e.field === 'applicationUrl')?.line).toBe(14);
  });
});

