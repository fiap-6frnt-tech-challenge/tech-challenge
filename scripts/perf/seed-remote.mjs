import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = (process.argv[2] ?? '').replace(/\/$/, '');
if (!baseUrl) {
  console.error('Informe a URL base: node scripts/perf/seed-remote.mjs https://<app>.app [n]');
  process.exit(1);
}

const clear = process.argv.includes('--limpar');
const count = Number(process.argv[3] ?? 60);
const cookiePath = resolve(process.cwd(), '.secrets/cookie.txt');
if (!existsSync(cookiePath)) {
  console.error(`Falta ${cookiePath}. Rode: node scripts/perf/session-cookie.mjs ${baseUrl}`);
  process.exit(1);
}

const cookie = readFileSync(cookiePath, 'utf-8').trim();

const api = (path, init) =>
  fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { Cookie: cookie, 'Content-Type': 'application/json', ...init?.headers },
  });

async function listAll() {
  const items = [];
  for (let page = 1; ; page += 1) {
    const { data, pages } = await api(`/api/transactions?_page=${page}&_per_page=100`).then(
      (response) => response.json()
    );
    items.push(...data);
    if (page >= pages) return items;
  }
}

const existing = await listAll();
console.log(`Conta tem ${existing.length} transações em ${baseUrl}.`);

if (clear) {
  let removed = 0;
  for (const transaction of existing) {
    const response = await api(`/api/transactions/${transaction.id}`, { method: 'DELETE' });
    if (response.ok) removed += 1;
  }
  console.log(`Removidas ${removed} transações.`);
  process.exit(0);
}

const PRESETS = [
  { type: 'deposit', category: 'salary', description: 'Salário mensal', amount: [4200, 5200] },
  { type: 'withdrawal', category: 'food', description: 'Supermercado do mês', amount: [180, 520] },
  { type: 'withdrawal', category: 'food', description: 'Mercado da esquina', amount: [25, 90] },
  {
    type: 'withdrawal',
    category: 'housing',
    description: 'Aluguel do apartamento',
    amount: [1400, 1400],
  },
  { type: 'withdrawal', category: 'housing', description: 'Conta de luz', amount: [90, 210] },
  {
    type: 'withdrawal',
    category: 'transport',
    description: 'Uber para o trabalho',
    amount: [18, 45],
  },
  {
    type: 'withdrawal',
    category: 'leisure',
    description: 'Netflix assinatura',
    amount: [39.9, 39.9],
  },
  { type: 'withdrawal', category: 'health', description: 'Farmácia remédio', amount: [30, 160] },
  {
    type: 'withdrawal',
    category: 'education',
    description: 'Mensalidade FIAP',
    amount: [600, 600],
  },
  {
    type: 'transfer',
    category: 'transfer',
    description: 'Transferência para poupança',
    amount: [200, 900],
  },
];

let created = 0;
for (let index = 0; index < count; index += 1) {
  const preset = PRESETS[index % PRESETS.length];
  const [min, max] = preset.amount;
  const monthsAgo = Math.floor(index / 5);
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(1 + ((index * 7) % 27));

  const response = await api('/api/transactions', {
    method: 'POST',
    body: JSON.stringify({
      type: preset.type,
      category: preset.category,
      description: `${preset.description} (perf)`,
      amount: Math.round((min + Math.random() * (max - min)) * 100) / 100,
      date: date.toISOString().slice(0, 10),
    }),
  });

  if (!response.ok) {
    console.error(`Falhou em ${index + 1}: HTTP ${response.status} ${await response.text()}`);
    break;
  }
  created += 1;
}

console.log(`Criadas ${created} transações de perf em ${baseUrl}.`);
