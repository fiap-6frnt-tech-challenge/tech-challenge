# Task 03 — Shared: Categorias + `suggestCategory` pura + Vitest

|                        |                                                                           |
| ---------------------- | ------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md) |
| **Owner**              | Dev 1 (Infra & Backend)                                                   |
| **Duração estimada**   | 1 dia                                                                     |
| **Branch recomendada** | `dev1/categories-suggest`                                                 |
| **Depende de**         | — (pode iniciar no dia 2, após Task 01 estar em andamento)                |
| **PR só abre**         | Após `suggestCategory` ter ≥20 casos Vitest passando                      |

---

## Dependências

- **O que bloqueia esta tarefa:** Nada (função pura, sem deps externas).
- **O que esta tarefa desbloqueia:** [Task 06 — DS CategorySelect](./06-ds-category-select.md) (precisa do tipo `Category`), [Task 14 — Integração CategorySelect no form](./14-integration-category-form.md), e [Task 16 — Zod avançado](./16-zod-validation.md).

---

## Contexto

`suggestCategory` é uma função **puramente estática** (zero deps externas, zero side effects) que mapeia a description de uma transação para a categoria mais provável. Vive em `packages/shared` para ser usada tanto no `transactions-mfe` quanto no shell sem duplicação. A heurística é conservadora: só sugere quando há match de substring exato em keywords; retorna `null` em casos ambíguos para que o usuário escolha manualmente.

---

## Implementação

### 1. Lista de categorias — `packages/shared/src/categories.ts`

```ts
export const CATEGORIES = [
  {
    id: 'food',
    label: 'Alimentação',
    keywords: ['restaurante', 'pizza', 'mercado', 'ifood', 'lanche', 'refeição', 'almoço'],
  },
  {
    id: 'transport',
    label: 'Transporte',
    keywords: [
      'uber',
      '99',
      'metrô',
      'ônibus',
      'combustível',
      'gasolina',
      'estacionamento',
      'táxi',
    ],
  },
  {
    id: 'leisure',
    label: 'Lazer',
    keywords: ['cinema', 'netflix', 'spotify', 'show', 'jogo', 'ingresso', 'steam'],
  },
  {
    id: 'health',
    label: 'Saúde',
    keywords: ['farmácia', 'médico', 'consulta', 'remédio', 'plano de saúde', 'dentista'],
  },
  {
    id: 'education',
    label: 'Educação',
    keywords: ['curso', 'livro', 'faculdade', 'escola', 'mensalidade', 'fiap'],
  },
  {
    id: 'housing',
    label: 'Moradia',
    keywords: ['aluguel', 'condomínio', 'luz', 'água', 'internet', 'energia', 'gás'],
  },
  {
    id: 'salary',
    label: 'Salário',
    keywords: ['salário', 'pagamento', 'pix recebido', 'holerite', 'freelance'],
  },
  {
    id: 'transfer',
    label: 'Transferência',
    keywords: ['transferência', 'pix enviado', 'ted', 'doc'],
  },
  { id: 'other', label: 'Outros', keywords: [] },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export type Category = (typeof CATEGORIES)[number];
```

### 2. Função `suggestCategory` — `packages/shared/src/lib/suggestCategory.ts`

```ts
import { CATEGORIES, type CategoryId } from '../categories';

function normalize(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function suggestCategory(description: string): CategoryId | null {
  if (!description || description.trim().length < 3) return null;

  const normalized = normalize(description);

  for (const category of CATEGORIES) {
    if (category.id === 'other') continue;
    for (const keyword of category.keywords) {
      if (normalized.includes(normalize(keyword))) {
        return category.id;
      }
    }
  }

  return null;
}
```

### 3. Exportar do barrel de `packages/shared`

Em `packages/shared/src/index.ts`:

```ts
export { CATEGORIES, type CategoryId, type Category } from './categories';
export { suggestCategory } from './lib/suggestCategory';
```

### 4. Testes Vitest — `packages/shared/src/lib/suggestCategory.test.ts`

Casos obrigatórios (≥20):

```ts
import { describe, it, expect } from 'vitest';
import { suggestCategory } from './suggestCategory';

describe('suggestCategory', () => {
  // food
  it('reconhece "mercado"', () => expect(suggestCategory('Compra no mercado')).toBe('food'));
  it('reconhece "iFood"', () => expect(suggestCategory('iFood pedido')).toBe('food'));
  it('reconhece "restaurante"', () => expect(suggestCategory('Restaurante italiano')).toBe('food'));

  // transport
  it('reconhece "Uber"', () => expect(suggestCategory('Uber Trip')).toBe('transport'));
  it('reconhece "gasolina"', () =>
    expect(suggestCategory('Posto gasolina Shell')).toBe('transport'));
  it('reconhece "metrô"', () => expect(suggestCategory('Recarga metrô SP')).toBe('transport'));

  // leisure
  it('reconhece "Netflix"', () => expect(suggestCategory('Netflix mensalidade')).toBe('leisure'));
  it('reconhece "cinema"', () => expect(suggestCategory('Cinema com amigos')).toBe('leisure'));

  // health
  it('reconhece "farmácia"', () => expect(suggestCategory('Farmácia remédios')).toBe('health'));
  it('reconhece "médico"', () => expect(suggestCategory('Consulta médico')).toBe('health'));

  // education
  it('reconhece "FIAP"', () => expect(suggestCategory('FIAP mensalidade')).toBe('education'));
  it('reconhece "curso"', () => expect(suggestCategory('Curso online Udemy')).toBe('education'));

  // housing
  it('reconhece "aluguel"', () => expect(suggestCategory('Pagamento aluguel')).toBe('housing'));
  it('reconhece "condomínio"', () => expect(suggestCategory('Boleto condomínio')).toBe('housing'));

  // salary
  it('reconhece "salário"', () => expect(suggestCategory('Salário mensal')).toBe('salary'));
  it('reconhece "pix recebido"', () => expect(suggestCategory('Pix recebido João')).toBe('salary'));

  // transfer
  it('reconhece "transferência"', () =>
    expect(suggestCategory('Transferência bancária')).toBe('transfer'));
  it('reconhece "pix enviado"', () =>
    expect(suggestCategory('Pix enviado Maria')).toBe('transfer'));

  // edge cases
  it('retorna null para string vazia', () => expect(suggestCategory('')).toBeNull());
  it('retorna null para string curta', () => expect(suggestCategory('ok')).toBeNull());
  it('retorna null para descrição ambígua', () =>
    expect(suggestCategory('Pagamento 123')).toBeNull());
  it('é case-insensitive', () => expect(suggestCategory('UBER viagem')).toBe('transport'));
  it('ignora acentos', () => expect(suggestCategory('metrô SP')).toBe('transport'));
});
```

---

## Validação

- [ ] `npx vitest run packages/shared` verde com ≥20 casos
- [ ] `suggestCategory('Uber Trip')` → `'transport'`
- [ ] `suggestCategory('')` → `null`
- [ ] Importar `{ suggestCategory, CATEGORIES, CategoryId }` de `@bytebank/shared` funciona no MFE

---

## Gotchas

1. **Acentos em keywords** — normalizar tanto a description quanto as keywords com `normalize('NFD')` + remoção de diacríticos para evitar falsos negativos.
2. **Ordem importa** — iterar categorias em ordem de especificidade. "Pix recebido" deve bater em `salary` antes de `transfer` — portanto, colocar `salary` antes de `transfer` no array `CATEGORIES`.
3. **Não usar IA/heurística complexa** — manter como match de substring simples; complexidade extra gera falsos positivos inaceitáveis para o produto.
