declare module 'nodemailer' {
  export interface Transporter {
    sendMail(opts: Record<string, unknown>): Promise<{ messageId?: string }>;
  }
  export function createTransport(opts: Record<string, unknown>): Transporter;
}

declare module 'firebase-admin' {
  const admin: {
    initializeApp(opts?: Record<string, unknown>): unknown;
    credential: {
      cert(serviceAccount: Record<string, unknown>): unknown;
    };
    messaging(): {
      sendEachForMulticast(payload: Record<string, unknown>): Promise<{
        successCount: number;
        failureCount: number;
        responses: Array<{ success: boolean; error?: { code?: string } }>;
      }>;
    };
  };
  export default admin;
}

