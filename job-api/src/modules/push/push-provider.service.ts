import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import type {
  NotificationProvider,
  SendNotificationInput,
  SendNotificationResult,
} from './notification-provider.interface.js';

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class PushProvider implements NotificationProvider {
  private readonly logger = new Logger(PushProvider.name);
  private cachedToken: CachedToken | null = null;

  async send(input: SendNotificationInput): Promise<SendNotificationResult> {
    const provider = (process.env.PUSH_PROVIDER || 'mock').toLowerCase();
    if (provider === 'fcm') {
      return this.sendFcm(input);
    }
    return this.sendMock(input);
  }

  private async sendMock(input: SendNotificationInput): Promise<SendNotificationResult> {
    const mockId = `mock-push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.logger.log(`Mock push dispatched to ${input.recipient}: "${input.title}" (${mockId})`);

    return {
      providerMessageId: mockId,
      isMock: true,
    };
  }

  private async sendFcm(input: SendNotificationInput): Promise<SendNotificationResult> {
    const projectId = process.env.FCM_PROJECT_ID;
    const clientEmail = process.env.FCM_CLIENT_EMAIL;
    const privateKey = process.env.FCM_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('FCM credentials not configured, falling back to mock provider');
      return this.sendMock(input);
    }

    const recipient = input.recipient.trim();
    if (!this.isFcmToken(recipient)) {
      this.logger.log(
        `Recipient "${recipient.slice(0, 18)}..." is a local device token. Delivering via simulated provider.`,
      );
      return this.sendMock(input);
    }

    const accessToken = await this.getAccessToken(clientEmail, privateKey);
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    const webUrl = process.env.WEB_URL || 'http://localhost:3000';

    const payload = {
      message: {
        token: recipient,
        notification: {
          title: input.title,
          body: input.body,
        },
        data: {
          idempotencyKey: input.idempotencyKey || '',
          title: input.title,
          body: input.body,
          ...(input.data || {}),
        },
        webpush: {
          headers: { Urgency: 'high' },
          notification: { icon: '/favicon.ico' },
          fcm_options: { link: input.data?.applicationUrl || webUrl },
        },
        android: {
          priority: 'high',
          notification: { sound: 'default' },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as {
      name?: string;
      error?: { status?: string; message?: string; details?: Array<{ errorCode?: string }> };
    };

    if (!response.ok) {
      const details = data?.error?.details?.[0];
      const errorCode = details?.errorCode || data?.error?.status || `HTTP_${response.status}`;
      const errorMessage = data?.error?.message || response.statusText;

      this.logger.error(`FCM error for ${recipient}: [${errorCode}] ${errorMessage}`);

      if (errorCode === 'INVALID_ARGUMENT') {
        this.logger.warn(`Invalid FCM token for ${recipient}. Falling back to mock delivery.`);
        return this.sendMock(input);
      }

      if (errorCode === 'UNREGISTERED') {
        throw new Error(`FCM permanent failure: Token is invalid or expired [${errorCode}]. ${errorMessage}`);
      }

      throw new Error(`FCM delivery failed: [${errorCode}] ${errorMessage}`);
    }

    const messageId = data?.name?.split('/').pop() || `fcm-${Date.now()}`;
    return {
      providerMessageId: messageId,
      isMock: false,
    };
  }

  private async getAccessToken(clientEmail: string, rawPrivateKey: string): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now) {
      return this.cachedToken.token;
    }

    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
    const iat = Math.floor(now / 1000);
    const exp = iat + 3600;

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claimSet = Buffer.from(
      JSON.stringify({
        iss: clientEmail,
        sub: clientEmail,
        aud: 'https://oauth2.googleapis.com/token',
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        iat,
        exp,
      }),
    ).toString('base64url');

    const unsignedJwt = `${header}.${claimSet}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedJwt);
    signer.end();

    const signature = signer.sign(privateKey, 'base64url');
    const assertion = `${unsignedJwt}.${signature}`;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    const tokenData = (await response.json().catch(() => ({}))) as {
      access_token?: string;
      error_description?: string;
      error?: string;
      expires_in?: number;
    };

    if (!response.ok || !tokenData?.access_token) {
      const err = tokenData?.error_description || tokenData?.error || response.statusText;
      throw new Error(`Google OAuth2 authentication failed for FCM: ${err}`);
    }

    const expiresIn = Number(tokenData.expires_in) || 3600;
    this.cachedToken = {
      token: tokenData.access_token,
      expiresAt: now + (expiresIn - 300) * 1000,
    };

    return this.cachedToken.token;
  }

  private isFcmToken(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    const t = token.trim();
    if (
      t.startsWith('device-') ||
      t.startsWith('mock-') ||
      t.startsWith('web-fcm-') ||
      t.startsWith('test-') ||
      t.startsWith('client-') ||
      t.includes('mock') ||
      t === 'test-device-token' ||
      t.length < 60
    ) {
      return false;
    }
    return true;
  }
}

