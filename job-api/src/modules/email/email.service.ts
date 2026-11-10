import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { JobRecord } from '../../common/interfaces/job.interface.js';
import { EmailTemplateService } from './email-template.service.js';

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly defaultRecipient: string;

  constructor(
    private readonly config: ConfigService,
    private readonly templateService: EmailTemplateService,
  ) {
    this.defaultRecipient =
      this.config.get<string>('NOTIFICATION_EMAIL') || 'admin@example.com';
    this.initTransporter();
  }

  private initTransporter(): void {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT')) || 587;
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: { user, pass },
      });
      this.logger.log(`SMTP transporter configured for host: ${host}:${port}`);
    } else {
      // In local dev/test without credentials, use stream transport (logs to memory/console safely)
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows',
      });
      this.logger.warn(
        'No SMTP credentials found in environment. Using stream transport fallback.',
      );
    }
  }

  public async sendJobNotification(
    job: JobRecord,
    recipientEmail?: string,
  ): Promise<EmailDispatchResult> {
    const recipient = recipientEmail || this.defaultRecipient;
    const subject = this.templateService.formatSubject(job);
    const html = this.templateService.renderHtml(job);
    const text = this.templateService.renderPlainText(job);

    try {
      const from =
        this.config.get<string>('SMTP_FROM') || 'noreply@jobmonitor.local';
      const info = await this.transporter.sendMail({
        from: `"Job Notification Alert" <${from}>`,
        to: recipient,
        subject,
        text,
        html,
      });

      this.logger.log(
        `Email successfully dispatched to ${recipient}: ${subject}`,
      );
      return {
        success: true,
        messageId: info.messageId || `msg-${Date.now()}`,
        recipient,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to send email notification to ${recipient}: ${errorMsg}`,
      );
      return {
        success: false,
        recipient,
        error: errorMsg,
      };
    }
  }
}
