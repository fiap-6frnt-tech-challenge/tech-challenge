import { config } from 'dotenv';
import { hash } from 'bcryptjs';
import { eq, inArray } from 'drizzle-orm';
import { CATEGORIES, TRANSACTION_TYPE } from '@bytebank/shared';

config({ path: '.env.local' });

const COUNT = Number(process.env.PERF_COUNT ?? 5000);
const USER_ID = process.env.PERF_USER_ID ?? 'perf-user';
const USER_NAME = process.env.PERF_USER_NAME ?? 'Perf User';
const USER_EMAIL = process.env.PERF_USER_EMAIL ?? 'perf.user@bytebank.test';
const USER_PASSWORD = process.env.PERF_USER_PASSWORD ?? 'Senha123!';

const MONTHS_BACK = 24;
const CHUNK_SIZE = 500;

function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORY_IDS = CATEGORIES.map((category) => category.id);
const TYPES = Object.values(TRANSACTION_TYPE);

const DESCRIPTIONS: Record<string, string[]> = {
  food: ['Supermercado Pão de Açúcar', 'Mercado do bairro', 'iFood almoço', 'Restaurante japonês'],
  transport: [
    'Uber para o trabalho',
    'Gasolina posto Shell',
    'Estacionamento shopping',
    'Bilhete metrô',
  ],
  leisure: ['Netflix assinatura', 'Cinema ingresso', 'Spotify Premium', 'Steam jogo'],
  health: ['Farmácia remédio', 'Consulta dentista', 'Plano de saúde', 'Exame laboratorial'],
  education: ['Mensalidade FIAP', 'Livro técnico', 'Curso online', 'Material escolar'],
  housing: ['Aluguel do apartamento', 'Conta de luz', 'Internet fibra', 'Condomínio'],
  salary: ['Salário mensal', 'Pagamento freelance', 'Pix recebido', 'Bônus trimestral'],
  transfer: ['Transferência para poupança', 'Pix enviado', 'TED para corretora', 'DOC family'],
  other: ['Compra diversa', 'Assinatura anual', 'Reembolso', 'Taxa bancária'],
};

function amountFor(type: string, random: () => number) {
  if (type === TRANSACTION_TYPE.DEPOSIT) return Math.round((2000 + random() * 6000) * 100) / 100;
  if (type === TRANSACTION_TYPE.TRANSFER) return Math.round((100 + random() * 1900) * 100) / 100;
  return Math.round((15 + random() * 985) * 100) / 100;
}

function dateFor(index: number, random: () => number) {
  const now = new Date();
  const monthsAgo = Math.floor((index / COUNT) * MONTHS_BACK);
  const base = new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1 - monthsAgo), 1);
  const day = 1 + Math.floor(random() * 28);
  const iso = new Date(base.getFullYear(), base.getMonth(), day);
  return iso.toISOString().slice(0, 10);
}

async function seedLoad() {
  const { db } = await import('./index');
  const { attachments, transactions, users } = await import('./schema');

  const existing = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.userId, USER_ID));

  if (existing.length > 0) {
    const ids = existing.map((row) => row.id);
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      await db
        .delete(attachments)
        .where(inArray(attachments.transactionId, ids.slice(i, i + CHUNK_SIZE)));
    }
    await db.delete(transactions).where(eq(transactions.userId, USER_ID));
    console.log(`Carga: ${ids.length} transações antigas de ${USER_ID} removidas.`);
  }

  const user = await db.select({ id: users.id }).from(users).where(eq(users.id, USER_ID));
  if (user.length === 0) {
    await db.insert(users).values({
      id: USER_ID,
      name: USER_NAME,
      email: USER_EMAIL,
      passwordHash: await hash(USER_PASSWORD, 10),
    });
    console.log(`Carga: usuário ${USER_EMAIL} criado (senha: ${USER_PASSWORD}).`);
  }

  const random = createRandom(20260927);
  const rows = Array.from({ length: COUNT }, (_, index) => {
    const type = TYPES[Math.floor(random() * TYPES.length)];
    const category =
      type === TRANSACTION_TYPE.DEPOSIT
        ? 'salary'
        : type === TRANSACTION_TYPE.TRANSFER
          ? 'transfer'
          : CATEGORY_IDS[Math.floor(random() * CATEGORY_IDS.length)];
    const options = DESCRIPTIONS[category] ?? DESCRIPTIONS.other;
    const description = `${options[Math.floor(random() * options.length)]} #${index + 1}`;

    return {
      id: `perf-${String(index + 1).padStart(6, '0')}`,
      userId: USER_ID,
      category,
      type,
      amount: amountFor(type, random),
      date: dateFor(index, random),
      description,
    };
  });

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    await db.insert(transactions).values(rows.slice(i, i + CHUNK_SIZE));
  }

  console.log(`Carga: ${rows.length} transações inseridas para ${USER_ID} (${USER_EMAIL}).`);
}

seedLoad()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Carga falhou:', err);
    process.exit(1);
  });
