import type { Transaction, NewTransaction } from '@/types';

// Mutations are in-memory only — they reset on serverless cold starts.
const store: Transaction[] = [];

export function getAll(): Transaction[] {
  return store;
}

export function getById(id: string): Transaction | undefined {
  return store.find((t) => t.id === id);
}

export function create(data: NewTransaction): Transaction {
  const transaction: Transaction = { id: crypto.randomUUID(), ...data };
  store.push(transaction);
  return transaction;
}

export function update(id: string, data: Partial<NewTransaction>): Transaction | null {
  const index = store.findIndex((t) => t.id === id);
  if (index === -1) return null;
  store[index] = { ...store[index], ...data };
  return store[index];
}

export function remove(id: string): boolean {
  const index = store.findIndex((t) => t.id === id);
  if (index === -1) return false;
  store.splice(index, 1);
  return true;
}
