export interface SendNotificationInput {
  recipient: string;
  title: string;
  body: string;
  idempotencyKey?: string;
  data?: Record<string, string>;
}

export interface SendNotificationResult {
  providerMessageId: string;
  isMock: boolean;
  error?: string;
}

export interface NotificationProvider {
  send(input: SendNotificationInput): Promise<SendNotificationResult>;
}

export interface FcmDispatchResult {
  accepted: number;
  failed: number;
  invalidTokens: string[];
}

