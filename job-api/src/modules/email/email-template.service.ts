import { Injectable } from '@nestjs/common';
import { JobRecord } from '../../common/interfaces/job.interface.js';

@Injectable()
export class EmailTemplateService {
  public formatSubject(job: JobRecord): string {
    return `New Job Opportunity: ${job.jobTitle} at ${job.companyName}`;
  }

  public renderPlainText(job: JobRecord): string {
    const skillsList = job.skills && job.skills.length > 0 ? job.skills.join(', ') : 'Not specified';
    return `
========================================
NEW JOB OPPORTUNITY: ${job.jobTitle}
========================================

Company:         ${job.companyName}
Location:        ${job.location}
Employment Type: ${job.employmentType}
Experience:      ${job.experience}
Salary:          ${job.salary}
Posted:          ${job.postedAt}
Source:          ${job.source}

Description:
${job.description}

Required Skills:
${skillsList}

Apply Now:
${job.applicationUrl}

----------------------------------------
Sent by Job Monitor Notification System
========================================
`.trim();
  }

  public renderHtml(job: JobRecord): string {
    const esc = this.escapeHtml;
    const skillsHtml =
      job.skills && job.skills.length > 0
        ? job.skills
            .map(
              (skill) =>
                `<span style="display:inline-block;background-color:#EEF2FF;color:#4F46E5;font-size:12px;font-weight:600;padding:4px 10px;border-radius:12px;margin:2px 4px 4px 0;">${esc(skill)}</span>`,
            )
            .join(' ')
        : '<span style="color:#6B7280;font-size:13px;">None specified</span>';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(job.jobTitle)} - ${esc(job.companyName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);border:1px solid #E5E7EB;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);padding:28px 32px;color:#FFFFFF;">
              <span style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#93C5FD;font-weight:700;">Job Alert System</span>
              <h1 style="margin:8px 0 0;font-size:24px;font-weight:800;color:#FFFFFF;line-height:1.25;">${esc(job.jobTitle)}</h1>
              <p style="margin:6px 0 0;font-size:16px;color:#DBEAFE;font-weight:500;">${esc(job.companyName)}</p>
            </td>
          </tr>
          <!-- Metadata Table -->
          <tr>
            <td style="padding:24px 32px;background-color:#F9FAFB;border-bottom:1px solid #E5E7EB;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding:6px 0;font-size:13px;color:#6B7280;"><strong>Location:</strong> <span style="color:#111827;">${esc(job.location)}</span></td>
                  <td width="50%" style="padding:6px 0;font-size:13px;color:#6B7280;"><strong>Work Mode:</strong> <span style="color:#111827;">${esc(job.workMode || job.employmentType)}</span></td>
                </tr>
                <tr>
                  <td width="50%" style="padding:6px 0;font-size:13px;color:#6B7280;"><strong>Experience:</strong> <span style="color:#111827;">${esc(job.experience)}</span></td>
                  <td width="50%" style="padding:6px 0;font-size:13px;color:#6B7280;"><strong>Salary:</strong> <span style="color:#111827;">${esc(job.salary)}</span></td>
                </tr>
                <tr>
                  <td width="50%" style="padding:6px 0;font-size:13px;color:#6B7280;"><strong>Source:</strong> <span style="color:#111827;">${esc(job.source)}</span></td>
                  <td width="50%" style="padding:6px 0;font-size:13px;color:#6B7280;"><strong>Posted:</strong> <span style="color:#111827;">${esc(job.postedAt)}</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Description -->
          <tr>
            <td style="padding:24px 32px;">
              <h2 style="margin:0 0 10px;font-size:15px;text-transform:uppercase;letter-spacing:0.5px;color:#4B5563;">Job Description</h2>
              <div style="font-size:14px;line-height:1.6;color:#374151;white-space:pre-line;">${esc(job.description)}</div>
            </td>
          </tr>
          <!-- Skills Badges -->
          <tr>
            <td style="padding:0 32px 24px;">
              <h2 style="margin:0 0 10px;font-size:15px;text-transform:uppercase;letter-spacing:0.5px;color:#4B5563;">Required Skills</h2>
              <div>${skillsHtml}</div>
            </td>
          </tr>
          <!-- Action Button -->
          <tr>
            <td align="center" style="padding:16px 32px 32px;">
              <a href="${esc(job.applicationUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#2563EB;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:16px;padding:14px 36px;border-radius:8px;box-shadow:0 4px 6px -1px rgba(37,99,235,0.3);letter-spacing:0.3px;">Apply Now</a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#F3F4F6;border-top:1px solid #E5E7EB;text-align:center;font-size:12px;color:#9CA3AF;">
              This notification was generated automatically by Folder Monitoring & Job Notification System.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
  }

  public escapeHtml(unsafe: string): string {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

