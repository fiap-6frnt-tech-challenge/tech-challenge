import type {
  BalancePoint,
  CategoryAggregate,
  MonthlyAggregate,
  PageRequest,
  Transaction,
  TransactionFilter,
  DashboardSummary,
  Attachment,
  NewTransaction,
  UpdateTransaction,
} from '../../domain';
import type {
  AccountOverview,
  AttachmentRecord,
  DateRange,
  LegacyAttachment,
  LegacyUser,
  NewAttachment,
  NewTransactionData,
  NewUser,
  Page,
  StoredFile,
  TransactionPatch,
  User,
} from '../types';

export interface Actor {
  userId: string;
}

export interface GatewayRequestOptions {
  signal?: AbortSignal;
}

export interface TransactionGatewayPage {
  data: Transaction[];
  pages: number;
  items: number;
}

/** Client-side port implemented by HTTP adapters in @bytebank/api-client. */
export interface TransactionGateway {
  list(
    filter: Partial<TransactionFilter>,
    page: PageRequest,
    options?: GatewayRequestOptions
  ): Promise<TransactionGatewayPage>;
  get(id: string, options?: GatewayRequestOptions): Promise<Transaction>;
  create(data: NewTransaction): Promise<Transaction>;
  update(id: string, data: UpdateTransaction): Promise<Transaction>;
  remove(id: string): Promise<void>;
  overview(options?: GatewayRequestOptions): Promise<AccountOverview>;
  summary(range?: Partial<DateRange>, options?: GatewayRequestOptions): Promise<DashboardSummary>;
}

export interface AttachmentGateway {
  list(transactionId: string, options?: GatewayRequestOptions): Promise<Attachment[]>;
  upload(transactionId: string, file: File): Promise<Attachment>;
  remove(transactionId: string, attachmentId: string): Promise<void>;
}

export interface TransactionRepository {
  findById(id: string, ownerId: string): Promise<Transaction | null>;
  list(ownerId: string, filter: TransactionFilter, page: PageRequest): Promise<Page<Transaction>>;
  create(data: NewTransactionData, ownerId: string): Promise<Transaction>;
  update(id: string, ownerId: string, patch: TransactionPatch): Promise<Transaction | null>;
  delete(id: string, ownerId: string): Promise<boolean>;
  overview(ownerId: string, recentLimit: number): Promise<AccountOverview>;
  monthlyTotals(ownerId: string, range: Partial<DateRange>): Promise<MonthlyAggregate[]>;
  categoryTotals(ownerId: string, range: Partial<DateRange>): Promise<CategoryAggregate[]>;
  balanceSeries(ownerId: string, range: Partial<DateRange>): Promise<BalancePoint[]>;
  version(ownerId: string): Promise<string>;
}

export interface AttachmentRepository {
  /** Returns null when the transaction is missing or not owned by ownerId. */
  list(transactionId: string, ownerId: string): Promise<AttachmentRecord[] | null>;
  findById(id: string, ownerId: string): Promise<AttachmentRecord | null>;
  create(transactionId: string, ownerId: string, data: NewAttachment): Promise<AttachmentRecord>;
  delete(id: string, ownerId: string): Promise<boolean>;
}

export interface LegacyAttachmentRepository {
  listLegacy(limit: number, afterId?: string): Promise<LegacyAttachment[]>;
  markEncrypted(id: string, data: Omit<LegacyAttachment, 'id'>): Promise<boolean>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(data: NewUser): Promise<User | null>;
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;
}

export interface LegacyUserRepository {
  listLegacy(limit: number, afterId?: string): Promise<LegacyUser[]>;
  markEncrypted(user: LegacyUser): Promise<boolean>;
}

export interface SessionRepository {
  create(userId: string, sid: string, expiresAt: Date): Promise<number | null>;
  find(userId: string, sid: string): Promise<{ version: number; expiresAt: Date } | null>;
  revokeCurrent(userId: string, sid: string): Promise<void>;
  revokeAll(userId: string): Promise<boolean>;
}

export interface FileStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<StoredFile>;
  get(ref: string): Promise<Uint8Array>;
  delete(ref: string): Promise<void>;
}

export interface Cipher {
  encrypt(plain: Uint8Array, context: string): Uint8Array;
  decrypt(payload: Uint8Array, context: string): Uint8Array;
  encryptText(plain: string, context: string): string;
  decryptText(payload: string, context: string): string;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
  verifyDummy(plain: string): Promise<void>;
  needsRehash(hash: string): boolean;
}

export interface PasswordBreachChecker {
  isBreached(plain: string): Promise<boolean>;
}

export interface RateLimiter {
  check(key: string): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
  failureCount(key: string): Promise<number>;
  registerFailure(key: string): Promise<void>;
  reset(key: string): Promise<void>;
}

export interface CaptchaVerifier {
  isEnabled(): boolean;
  verify(token: string): Promise<boolean>;
}

export interface RateLimitKeyGenerator {
  loginEmail(email: string): string;
  loginIp(ipAddress: string): string;
  registerIp(ipAddress: string): string;
}
export interface CacheEntry {
  key: readonly string[];
  tags: readonly string[];
}

export interface ResultCache {
  remember<T>(entry: CacheEntry, load: () => Promise<T>): Promise<T>;
}

export interface CacheInvalidator {
  invalidateUser(userId: string): Promise<void>;
}

export type AuditEventName =
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.login.locked'
  | 'auth.register'
  | 'auth.session.revoked'
  | 'authz.denied'
  | 'attachment.download'
  | 'rate_limit.hit'
  | 'csp.violation';

export type AuditOutcome = 'success' | 'failure' | 'denied';

/** Already redacted: `email` is masked, and passwords, tokens and request bodies never get here. */
export interface AuditEvent {
  event: AuditEventName;
  outcome: AuditOutcome;
  userId?: string;
  email?: string;
  reason?: string;
  resource?: string;
}

export interface AuditLogger {
  record(event: AuditEvent): void;
}

export type OwnedResource = 'transaction' | 'attachment';

export interface ResourceOwnership {
  ownerOf(resource: OwnedResource, id: string): Promise<string | null>;
}

export interface Clock {
  now(): Date;
  todayISO(): string;
}
export interface IdGenerator {
  next(): string;
}
