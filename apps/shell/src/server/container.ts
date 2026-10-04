import 'server-only';
import {
  AddAttachment,
  AuthenticateUser,
  CreateTransaction,
  DeleteTransaction,
  GetAccountOverview,
  GetDashboardSummary,
  GetTransaction,
  ListAttachments,
  ListTransactions,
  RegisterUser,
  RemoveAttachment,
  UpdateTransaction,
  type FileStorage,
} from '@bytebank/core/application';
import { db } from '@/db';
import { DrizzleAttachmentRepository } from './infrastructure/db/DrizzleAttachmentRepository';
import { DrizzleTransactionRepository } from './infrastructure/db/DrizzleTransactionRepository';
import { DrizzleUserRepository } from './infrastructure/db/DrizzleUserRepository';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher';
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
const passwords = new BcryptPasswordHasher(10);
const storage = resolveFileStorage();

export const container = {
  createTransaction: new CreateTransaction(transactions, clock, ids),
  updateTransaction: new UpdateTransaction(transactions),
  deleteTransaction: new DeleteTransaction(transactions),
  getTransaction: new GetTransaction(transactions),
  listTransactions: new ListTransactions(transactions),
  getAccountOverview: new GetAccountOverview(transactions),
  getDashboardSummary: new GetDashboardSummary(transactions, clock),
  addAttachment: new AddAttachment(transactions, attachments, storage, ids),
  listAttachments: new ListAttachments(attachments),
  removeAttachment: new RemoveAttachment(attachments, storage),
  registerUser: new RegisterUser(users, passwords, ids),
  authenticateUser: new AuthenticateUser(users, passwords),
};
