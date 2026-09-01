export type VerificationStatus = 'pending' | 'sent' | 'failed' | 'confirmed';

export type VerificationRecord = {
  id: string;
  projectId: string;
  templateId: string;
  recipientEmail: string;
  tokenDigest: string;
  idempotencyKey: string;
  redirectUrl: string;
  status: VerificationStatus;
  expiresAt: string;
};

export type VerificationIssue = {
  record: VerificationRecord;
  isNew: boolean;
};

export type VerificationConsumeResult =
  | { status: 'confirmed'; redirectUrl: string }
  | { status: 'invalid' | 'expired' | 'alreadyUsed' };

export interface EmailVerificationStore {
  issue(record: VerificationRecord): Promise<VerificationIssue>;
  markSent(id: string): Promise<void>;
  markFailed(id: string): Promise<void>;
  consume(tokenDigest: string, now: Date): Promise<VerificationConsumeResult>;
}
