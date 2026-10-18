import 'server-only';
import {
  AddAttachment,
  AuthenticateUser,
  CreateTransaction,
  DeleteTransaction,
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
  type FileStorage,
} from '@bytebank/core/application';
import { db } from '@/db';
import { DrizzleAttachmentRepository } from './infrastructure/db/DrizzleAttachmentRepository';
import { DrizzleTransactionRepository } from './infrastructure/db/DrizzleTransactionRepository';
import { DrizzleUserRepository } from './infrastructure/db/DrizzleUserRepository';
import { DrizzleSessionRepository } from './infrastructure/db/DrizzleSessionRepository';
import { PostgresRateLimiter } from './infrastructure/db/PostgresRateLimiter';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher';
import { CloudflareTurnstileVerifier } from './infrastructure/security/CloudflareTurnstileVerifier';
import { HibpBreachChecker } from './infrastructure/security/HibpBreachChecker';
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

const transactions = new DrizzleTransactionRepository(db);
const attachments = new DrizzleAttachmentRepository(db);
const users = new DrizzleUserRepository(db);
const clock = new SystemClock('America/Sao_Paulo');
const ids = new CryptoIdGenerator();
const passwords = new BcryptPasswordHasher(12);
const breachChecker = new HibpBreachChecker();
const rateLimitKeys = new HmacRateLimitKeyGenerator(
  () =>
    process.env.BLIND_INDEX_KEY ??
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === 'production' ? '' : 'bytebank-local-rate-limit-secret')
);
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
  addAttachment: new AddAttachment(transactions, attachments, storage, ids),
  listAttachments: new ListAttachments(attachments),
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
