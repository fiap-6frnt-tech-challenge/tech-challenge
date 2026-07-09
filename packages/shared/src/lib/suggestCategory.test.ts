import { describe, expect, it } from 'vitest';

import { suggestCategory } from './suggestCategory';

describe('suggestCategory', () => {
  it.each([
    ['Compra no mercado', 'food'],
    ['iFood pedido', 'food'],
    ['Restaurante italiano', 'food'],
    ['ALMOÇO executivo', 'food'],
    ['Uber Trip', 'transport'],
    ['Posto gasolina Shell', 'transport'],
    ['Recarga metrô SP', 'transport'],
    ['Recarga metro SP', 'transport'],
    ['Netflix assinatura', 'leisure'],
    ['Cinema com amigos', 'leisure'],
    ['Compra Steam', 'leisure'],
    ['Farmácia remédios', 'health'],
    ['Consulta médico', 'health'],
    ['Farmacia Popular', 'health'],
    ['Curso online', 'education'],
    ['Mensalidade FIAP', 'education'],
    ['Compra de livro técnico', 'education'],
    ['Boleto aluguel', 'housing'],
    ['Conta de agua', 'housing'],
    ['CONDOMINIO residencial', 'housing'],
    ['Salário mensal', 'salary'],
    ['Pix recebido cliente', 'salary'],
    ['Holerite empresa', 'salary'],
    ['Transferência entre contas', 'transfer'],
    ['Pix enviado para Maria', 'transfer'],
    ['TED banco', 'transfer'],
  ])('recognizes "%s" as %s', (description, category) => {
    expect(suggestCategory(description)).toBe(category);
  });

  it.each([[''], ['  '], ['x'], ['Café'], ['Compra sem categoria conhecida']])(
    'returns null for unmatched description "%s"',
    (description) => {
      expect(suggestCategory(description)).toBeNull();
    }
  );

  it.each([
    ['Mercado com Uber'],
    ['Netflix e mensalidade FIAP'],
    ['Pix recebido e pix enviado'],
    ['Pagamento aluguel'],
  ])('returns null for ambiguous description "%s"', (description) => {
    expect(suggestCategory(description)).toBeNull();
  });
});
