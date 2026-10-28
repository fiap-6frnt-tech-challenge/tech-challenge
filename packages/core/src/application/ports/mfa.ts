export interface MfaState {
  userId: string;
  enabled: boolean;
  sessionVersion: number;
  secretEnc: string | null;
  pendingSecretEnc: string | null;
  pendingExpiresAt: Date | null;
  lastUsedStep: number | null;
  passwordHash: string;
  recoveryCodesRemaining: number;
}
export interface MfaRecoveryHash {
  id: string;
  hash: string;
}
export interface MfaRepository {
  find(userId: string): Promise<MfaState | null>;
  stage(
    userId: string,
    secretEnc: string,
    expiresAt: Date,
    expectedPasswordHash: string
  ): Promise<boolean>;
  activate(
    userId: string,
    expectedPendingEnc: string,
    now: Date,
    step: number,
    codes: MfaRecoveryHash[],
    expectedPasswordHash: string,
    secretEnc: string,
    expectedSessionVersion: number
  ): Promise<boolean>;
  disable(
    userId: string,
    expectedSecretEnc: string,
    expectedPasswordHash: string
  ): Promise<boolean>;
  consumeTotp(
    userId: string,
    expectedSecretEnc: string,
    step: number,
    expectedPasswordHash: string
  ): Promise<boolean>;
  findRecovery(userId: string, id: string): Promise<string | null>;
  consumeRecovery(
    userId: string,
    id: string,
    expectedHash: string,
    expectedSecretEnc: string,
    expectedPasswordHash: string
  ): Promise<boolean>;
}
export interface TotpProvider {
  create(label: string): { secret: string; uri: string };
  verify(secret: string, token: string, now: Date): number | null;
}
