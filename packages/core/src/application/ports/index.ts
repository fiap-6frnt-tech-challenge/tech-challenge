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
}

export interface AttachmentRepository {
  /** Returns null when the transaction is missing or not owned by ownerId. */
  list(transactionId: string, ownerId: string): Promise<AttachmentRecord[] | null>;
  findById(id: string, ownerId: string): Promise<AttachmentRecord | null>;
  create(transactionId: string, ownerId: string, data: NewAttachment): Promise<AttachmentRecord>;
  delete(id: string, ownerId: string): Promise<boolean>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(data: NewUser): Promise<User | null>;
}

export interface FileStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<StoredFile>;
  get(ref: string): Promise<Uint8Array>;
  delete(ref: string): Promise<void>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
export interface Clock {
  now(): Date;
  todayISO(): string;
}
export interface IdGenerator {
  next(): string;
}
