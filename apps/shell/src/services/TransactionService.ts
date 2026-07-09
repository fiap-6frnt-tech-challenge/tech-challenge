import { configureApiBaseUrl } from '@bytebank/api-client';

configureApiBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? '/api');

export {
  TransactionService,
  TRANSACTIONS_PER_PAGE,
  type PaginatedResponse,
  type GetPaginatedParams,
} from '@bytebank/api-client';
