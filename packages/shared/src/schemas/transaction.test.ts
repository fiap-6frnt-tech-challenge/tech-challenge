import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  attachmentSchema,
  createTransactionSchema,
  listTransactionsQuerySchema,
  transactionFormSchema,
  updateTransactionSchema,
} from './transaction';

const validInput = {
  type: 'withdrawal',
  category: 'food',
  amount: 42.5,
  date: '2026-01-15',
  description: 'Mercado da esquina',
  attachments: [],
};

const validAttachment = {
  id: 'att-1',
  url: 'https://blob.test/recibo.pdf',
  name: 'recibo.pdf',
  size: 1024,
  mimeType: 'application/pdf',
};

describe('transactionFormSchema (casos válidos)', () => {
  it('valida um input completo', () => {
    expect(transactionFormSchema.parse(validInput)).toMatchObject(validInput);
  });

  it('aceita ausência de attachments (campo opcional)', () => {
    const { attachments, ...withoutAttachments } = validInput;
    void attachments;
    expect(() => transactionFormSchema.parse(withoutAttachments)).not.toThrow();
  });

  it('aceita description com exatamente 3 caracteres (limite inferior)', () => {
    expect(() => transactionFormSchema.parse({ ...validInput, description: 'abc' })).not.toThrow();
  });

  it('aceita description com exatamente 140 caracteres (limite superior)', () => {
    expect(() =>
      transactionFormSchema.parse({ ...validInput, description: 'a'.repeat(140) })
    ).not.toThrow();
  });

  it('aceita até 5 attachments', () => {
    const attachments = Array.from({ length: 5 }, (_, i) => ({
      ...validAttachment,
      id: `att-${i}`,
    }));
    expect(() => transactionFormSchema.parse({ ...validInput, attachments })).not.toThrow();
  });

  it.each(['deposit', 'withdrawal', 'transfer'])('aceita o tipo %s', (type) => {
    expect(() => transactionFormSchema.parse({ ...validInput, type })).not.toThrow();
  });
});

describe('transactionFormSchema (casos inválidos)', () => {
  it('rejeita category vazia', () => {
    expect(() => transactionFormSchema.parse({ ...validInput, category: '' })).toThrow();
  });

  it('rejeita category desconhecida', () => {
    expect(() => transactionFormSchema.parse({ ...validInput, category: 'inexistente' })).toThrow();
  });

  it('rejeita description com menos de 3 caracteres', () => {
    expect(() => transactionFormSchema.parse({ ...validInput, description: 'ab' })).toThrow();
  });

  it('rejeita description com mais de 140 caracteres', () => {
    expect(() =>
      transactionFormSchema.parse({ ...validInput, description: 'a'.repeat(141) })
    ).toThrow();
  });

  it('rejeita byte NUL na descrição do formulário', () => {
    expect(
      transactionFormSchema.safeParse({ ...validInput, description: 'Compra\u0000extra' }).success
    ).toBe(false);
  });

  it('rejeita data futura', () => {
    expect(() => transactionFormSchema.parse({ ...validInput, date: '2099-01-01' })).toThrow();
  });

  it('rejeita data vazia', () => {
    expect(() => transactionFormSchema.parse({ ...validInput, date: '' })).toThrow();
  });

  it('rejeita amount negativo', () => {
    expect(() => transactionFormSchema.parse({ ...validInput, amount: -10 })).toThrow();
  });

  it('rejeita amount igual a zero', () => {
    expect(() => transactionFormSchema.parse({ ...validInput, amount: 0 })).toThrow();
  });

  it('rejeita amount acima do limite da API', () => {
    expect(
      transactionFormSchema.safeParse({ ...validInput, amount: 1_000_000_000.01 }).success
    ).toBe(false);
  });

  it('rejeita amount não numérico', () => {
    expect(() =>
      transactionFormSchema.parse({ ...validInput, amount: 'dez' as unknown as number })
    ).toThrow();
  });

  it('rejeita type inválido', () => {
    expect(() => transactionFormSchema.parse({ ...validInput, type: 'pix' })).toThrow();
  });

  it('rejeita mais de 5 attachments', () => {
    const attachments = Array.from({ length: 6 }, (_, i) => ({
      ...validAttachment,
      id: `att-${i}`,
    }));
    expect(() => transactionFormSchema.parse({ ...validInput, attachments })).toThrow();
  });

  it('reporta o campo inválido via safeParse', () => {
    const result = transactionFormSchema.safeParse({ ...validInput, category: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('category'))).toBe(true);
    }
  });
});

describe('attachmentSchema', () => {
  it('valida um anexo bem-formado', () => {
    expect(() => attachmentSchema.parse(validAttachment)).not.toThrow();
  });

  it('rejeita url inválida', () => {
    expect(() => attachmentSchema.parse({ ...validAttachment, url: 'not-a-url' })).toThrow();
  });

  it('rejeita size não positivo', () => {
    expect(() => attachmentSchema.parse({ ...validAttachment, size: 0 })).toThrow();
  });
});

const validApiInput = {
  type: 'withdrawal',
  category: 'food',
  amount: 42.5,
  date: '2026-01-15',
  description: 'Mercado da esquina',
};

afterEach(() => vi.useRealTimers());

describe('transaction API schemas', () => {
  it('aceita a criação com os campos públicos', () => {
    expect(createTransactionSchema.parse(validApiInput)).toEqual(validApiInput);
  });

  it.each(['userId', 'id', 'attachments', 'createdAt'])(
    'rejeita o campo extra %s na criação',
    (field) => {
      expect(
        createTransactionSchema.safeParse({ ...validApiInput, [field]: 'injetado' }).success
      ).toBe(false);
    }
  );

  it.each([0, -1, '42', 1_000_000_001])('rejeita amount inválido %s', (amount) => {
    expect(createTransactionSchema.safeParse({ ...validApiInput, amount }).success).toBe(false);
  });

  it('rejeita descrição com mais de 140 caracteres após trim', () => {
    expect(
      createTransactionSchema.safeParse({ ...validApiInput, description: 'x'.repeat(141) }).success
    ).toBe(false);
  });

  it('rejeita byte NUL na descrição e na busca', () => {
    expect(
      createTransactionSchema.safeParse({ ...validApiInput, description: 'Compra\u0000extra' })
        .success
    ).toBe(false);
    expect(updateTransactionSchema.safeParse({ description: 'Compra\u0000extra' }).success).toBe(
      false
    );
    expect(listTransactionsQuerySchema.safeParse({ q: 'Compra\u0000extra' }).success).toBe(false);
  });

  it('rejeita datas futuras no calendário de São Paulo', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-28T02:30:00.000Z'));
    expect(
      createTransactionSchema.safeParse({ ...validApiInput, date: '2026-09-27' }).success
    ).toBe(true);
    expect(
      createTransactionSchema.safeParse({ ...validApiInput, date: '2026-09-28' }).success
    ).toBe(false);
  });

  it('aceita PATCH parcial válido e rejeita objeto vazio', () => {
    expect(updateTransactionSchema.parse({ description: '  Nova descrição  ' })).toEqual({
      description: 'Nova descrição',
    });
    expect(updateTransactionSchema.safeParse({}).success).toBe(false);
  });

  it.each(['userId', 'id', 'attachments'])('rejeita o campo extra %s no PATCH', (field) => {
    expect(updateTransactionSchema.safeParse({ description: 'Nova', [field]: 'x' }).success).toBe(
      false
    );
  });

  it('aceita filtros válidos e limita a paginação', () => {
    expect(listTransactionsQuerySchema.parse({ _page: '2', _per_page: '100' })).toMatchObject({
      _page: 2,
      _per_page: 100,
      _sort: '-date',
      category: [],
    });
    expect(listTransactionsQuerySchema.safeParse({ _per_page: '100000' }).success).toBe(false);
  });

  it.each([
    { _page: '0' },
    { _page: '1.5' },
    { _sort: 'userId' },
    { category: ['unknown'] },
    { category: Array(21).fill('food') },
    { q: 'q'.repeat(101) },
  ])('rejeita filtro inválido %j', (query) => {
    expect(listTransactionsQuerySchema.safeParse(query).success).toBe(false);
  });
});
