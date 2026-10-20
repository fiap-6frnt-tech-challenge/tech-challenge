import 'server-only';
import { createHash } from 'node:crypto';
import {
  AddAttachment,
  AuthenticateUser,
  CreateTransaction,
  DeleteTransaction,
  DownloadAttachment,
  GetAccountOverview,
  GetDashboardSummary,
  GetTransaction,
  GetTransactionsSummary,
  ListAttachments,
  ListTransactions,
  RegisterUser,
  SessionLifecycle,
  RevokeSessions,
  ResolveOAuthUser,
  RemoveAttachment,
  UpdateTransaction,
  type Cipher,
  type FileStorage,
} from '@bytebank/core/application';
import { db } from '@/db';
import { DrizzleAttachmentRepository } from './infrastructure/db/DrizzleAttachmentRepository';
import { DrizzleTransactionRepository } from './infrastructure/db/DrizzleTransactionRepository';
import { DrizzleUserRepository } from './infrastructure/db/DrizzleUserRepository';
import { DrizzleSessionRepository } from './infrastructure/db/DrizzleSessionRepository';
import { PostgresRateLimiter } from './infrastructure/db/PostgresRateLimiter';
import { AesGcmCipher, parseEncryptionKeys } from './infrastructure/security/AesGcmCipher';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher';
import { CloudflareTurnstileVerifier } from './infrastructure/security/CloudflareTurnstileVerifier';
import { HibpBreachChecker } from './infrastructure/security/HibpBreachChecker';
import { HmacBlindIndex, parseBlindIndexKey } from './infrastructure/security/HmacBlindIndex';
import { HmacRateLimitKeyGenerator } from './infrastructure/security/HmacRateLimitKeyGenerator';
import { getRateLimitPolicies } from './infrastructure/security/rateLimitPolicy';
import { LocalFileStorage } from './infrastructure/storage/LocalFileStorage';
import { VercelBlobFileStorage } from './infrastructure/storage/VercelBlobFileStorage';
import { CryptoIdGenerator } from './infrastructure/system/CryptoIdGenerator';
import { SystemClock } from './infrastructure/system/SystemClock';

export function resolveFileStorage(): FileStorage {
  if (process.env.BLOB_READ_WRITE_TOKEN) return new VercelBlobFileStorage();
  if (process.env.LOCAL_UPLOADS_DIR) return new LocalFileStorage(process.env.LOCAL_UPLOADS_DIR);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN é obrigatório em produção (em Docker/CI, defina LOCAL_UPLOADS_DIR para gravar os anexos em disco)'
    );
  }
  return new LocalFileStorage('.uploads');
}

const DEVELOPMENT_KEY_ID = 0;

function requireInProduction(message: string) {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    throw new Error(message);
  }
}

const developmentKey = (label: string) => createHash('sha256').update(label).digest();

export function resolveCipher(): Cipher {
  const keys = process.env.DATA_ENCRYPTION_KEYS;
  if (keys) {
    return new AesGcmCipher(
      parseEncryptionKeys(keys),
      Number(process.env.DATA_ENCRYPTION_ACTIVE_KEY_ID)
    );
  }
  requireInProduction(
    'DATA_ENCRYPTION_KEYS e DATA_ENCRYPTION_ACTIVE_KEY_ID são obrigatórios em produção'
  );
  return new AesGcmCipher(
    new Map([[DEVELOPMENT_KEY_ID, developmentKey('bytebank-development-data-key')]]),
    DEVELOPMENT_KEY_ID
  );
}

export function resolveBlindIndex(): HmacBlindIndex {
  const key = process.env.BLIND_INDEX_KEY;
  if (key) return new HmacBlindIndex(parseBlindIndexKey(key));
  requireInProduction('BLIND_INDEX_KEY é obrigatório em produção');
  return new HmacBlindIndex(developmentKey('bytebank-development-blind-index-key'));
}

const cipher = resolveCipher();
const blindIndex = resolveBlindIndex();
const transactions = new DrizzleTransactionRepository(db, cipher);
const attachments = new DrizzleAttachmentRepository(db, cipher);
const users = new DrizzleUserRepository(db, cipher, blindIndex);
const clock = new SystemClock('America/Sao_Paulo');
const ids = new CryptoIdGenerator();
const passwords = new BcryptPasswordHasher(12);
const breachChecker = new HibpBreachChecker();
const rateLimitKeys = new HmacRateLimitKeyGenerator(blindIndex);
const rateLimiter = new PostgresRateLimiter(db, getRateLimitPolicies(), clock);
const turnstileVerifier = new CloudflareTurnstileVerifier();
const storage = resolveFileStorage();

export const container = {
  sessionLifecycle: new SessionLifecycle(new DrizzleSessionRepository(db), clock, ids),
  revokeSessions: new RevokeSessions(new DrizzleSessionRepository(db)),
  resolveOAuthUser: new ResolveOAuthUser(users, ids),
  createTransaction: new CreateTransaction(transactions, clock, ids),
  updateTransaction: new UpdateTransaction(transactions),
  deleteTransaction: new DeleteTransaction(transactions),
  getTransaction: new GetTransaction(transactions),
  getTransactionsSummary: new GetTransactionsSummary(transactions),
  listTransactions: new ListTransactions(transactions),
  getAccountOverview: new GetAccountOverview(transactions),
  getDashboardSummary: new GetDashboardSummary(transactions, clock),
  addAttachment: new AddAttachment(transactions, attachments, storage, cipher, ids),
  listAttachments: new ListAttachments(attachments),
  downloadAttachment: new DownloadAttachment(attachments, storage, cipher),
  removeAttachment: new RemoveAttachment(attachments, storage),
  registerUser: new RegisterUser(users, passwords, ids, rateLimiter, rateLimitKeys, breachChecker),
  authenticateUser: new AuthenticateUser(
    users,
    passwords,
    rateLimiter,
    rateLimitKeys,
    turnstileVerifier
  ),
  turnstileVerifier,
};
