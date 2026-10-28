import 'server-only';
import { createHash } from 'node:crypto';
import {
  AccessAudit,
  AddAttachment,
  AuthenticateUser,
  CachedGetTransactionsSummary,
  CreateTransaction,
  DeleteTransaction,
  DownloadAttachment,
  GetAccountOverview,
  GetDashboardSummary,
  GetTransaction,
  GetTransactionsSummary,
  GetTransactionsVersion,
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
import { NextCacheInvalidator } from './infrastructure/cache/NextCacheInvalidator';
import { NextResultCache } from './infrastructure/cache/NextResultCache';
import { DrizzleAttachmentRepository } from './infrastructure/db/DrizzleAttachmentRepository';
import { DrizzleTransactionRepository } from './infrastructure/db/DrizzleTransactionRepository';
import { DrizzleUserRepository } from './infrastructure/db/DrizzleUserRepository';
import { DrizzleResourceOwnership } from './infrastructure/db/DrizzleResourceOwnership';
import { DrizzleSessionRepository } from './infrastructure/db/DrizzleSessionRepository';
import { PostgresRateLimiter } from './infrastructure/db/PostgresRateLimiter';
import { JsonAuditLogger } from './infrastructure/logging/JsonAuditLogger';
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
import { currentRequestContext } from './http/requestContext';

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
const SUMMARY_CACHE_SECONDS = 300;

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
const summaryCache = new NextResultCache(SUMMARY_CACHE_SECONDS);
const cacheInvalidator = new NextCacheInvalidator();
const auditLogger = new JsonAuditLogger(blindIndex, clock, currentRequestContext);
const access = new AccessAudit(new DrizzleResourceOwnership(db), auditLogger);

export const container = {
  auditLogger,
  sessionLifecycle: new SessionLifecycle(new DrizzleSessionRepository(db), clock, ids),
  revokeSessions: new RevokeSessions(new DrizzleSessionRepository(db), auditLogger),
  resolveOAuthUser: new ResolveOAuthUser(users, ids),
  createTransaction: new CreateTransaction(transactions, clock, ids, cacheInvalidator),
  updateTransaction: new UpdateTransaction(transactions, cacheInvalidator, access),
  deleteTransaction: new DeleteTransaction(transactions, cacheInvalidator, access),
  getTransaction: new GetTransaction(transactions, access),
  getTransactionsSummary: new CachedGetTransactionsSummary(
    new GetTransactionsSummary(transactions),
    transactions,
    summaryCache
  ),
  getTransactionsVersion: new GetTransactionsVersion(transactions),
  listTransactions: new ListTransactions(transactions),
  getAccountOverview: new GetAccountOverview(transactions),
  getDashboardSummary: new GetDashboardSummary(transactions, clock),
  addAttachment: new AddAttachment(transactions, attachments, storage, cipher, ids, access),
  listAttachments: new ListAttachments(attachments, access),
  downloadAttachment: new DownloadAttachment(attachments, storage, cipher, access, auditLogger),
  removeAttachment: new RemoveAttachment(attachments, storage, access),
  registerUser: new RegisterUser(
    users,
    passwords,
    ids,
    rateLimiter,
    rateLimitKeys,
    breachChecker,
    auditLogger
  ),
  authenticateUser: new AuthenticateUser(
    users,
    passwords,
    rateLimiter,
    rateLimitKeys,
    auditLogger,
    turnstileVerifier
  ),
  turnstileVerifier,
};
