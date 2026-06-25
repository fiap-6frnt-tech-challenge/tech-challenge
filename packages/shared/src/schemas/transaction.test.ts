import { describe, expect, it } from 'vitest';

import { attachmentSchema, transactionFormSchema } from './transaction';

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
