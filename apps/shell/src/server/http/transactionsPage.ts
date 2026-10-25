import type { Transaction } from '@bytebank/core';
import type { Page } from '@bytebank/core/application';

export function publicTransactionsPage(page: Page<Transaction>) {
  return { data: page.items, pages: page.totalPages, items: page.total };
}
