# Task 6 — Schema de Transação Evoluído & Mock Data

> ⏳ **Status: Pending**

|                        |                                                                        |
| ---------------------- | ---------------------------------------------------------------------- |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)         |
| **Owner**              | `Dev 1`                                                                |
| **Duração estimada**   | 1.5 dia                                                                |
| **Branch recomendada** | `dev1/evolved-schema`                                                  |
| **Depende de**         | [Task 2 — Integração Backend Pós](./02-real-persistence.md)            |
| **PR só abre**         | Após todos os tipos TypeScript compilarem sem erros em todo o monorepo |

---

## Dependências

- **O que bloqueia esta tarefa**: Bloqueada pela **Task 2 (Integração Backend Pós)**.
- **O que esta tarefa desbloqueia**: Desbloqueia os hooks de Query (**Task 8**) do Dev 3, as páginas do shell (**Task 4**) do Dev 2 e a Context API migration (**Task 9**), porque todas elas precisam dos tipos TypeScript atualizados no `@bytebank/shared` contendo `accountId`, `type`, `value`, `from`, `to` e `anexo`.

---

## Pré-condições

- Estar na branch `dev1/evolved-schema`.
- Ter rodado `npm install` e garantir que o monorepo compila.

---

## Implementação passo-a-passo

### 1. Evolução dos tipos do Shared

Edite o arquivo [transaction.ts](file:///c:/Users/rclau/tech-challenge/packages/shared/src/types/transaction.ts):

```typescript
export interface Transaction {
  id: string;
  accountId: string; // Conta vinculada
  type: 'Credit' | 'Debit';
  value: number; // Negativo para Debit, Positivo para Credit
  from?: string; // Origem (opcional)
  to?: string; // Destino (opcional)
  anexo?: string; // URL do comprovante (Vercel Blob)
  date: string; // ISO data-hora: "2024-12-16T18:29:08.734Z"
}

export interface Account {
  id: string;
  type: 'Credit' | 'Debit';
  userId: string;
}

export type NewTransaction = Omit<Transaction, 'id' | 'date'>;
export type UpdateTransaction = Partial<NewTransaction>;
```

Rode o build do pacote compartilhado para verificar erros de tipagem locais:

```bash
npm run build -w @bytebank/shared
```

---

## 2. Migração do arquivo de Mock Data (`apps/shell/data/transactions.json`)

Como em ambiente local dev podemos rodar sem a API ativa ou para testes offline, ajuste o arquivo de mock `data/transactions.json` para refletir o mesmo contrato de campos.

Exemplo de transação no formato antigo:

```json
{
  "id": "txn-001",
  "type": "deposit",
  "amount": 5000,
  "date": "2026-01-05",
  "description": "January salary"
}
```

Exemplo migrado em `data/transactions.json`:

```json
{
  "id": "txn-001",
  "accountId": "acc-default",
  "type": "Credit",
  "value": 5000,
  "from": "Pix recebido",
  "to": "Aluno Carequinha",
  "anexo": "",
  "date": "2026-01-05T12:00:00.000Z"
}
```

---

## Validação

- [ ] Execute `npm run build` na raiz do monorepo e certifique-se de que nenhuma compilação falhe devido aos novos campos obrigatórios nas assinaturas de transação.
- [ ] O arquivo `data/transactions.json` foi completamente convertido e o mock local roda perfeitamente sem quebrar a renderização inicial.

---

## Gotchas

1. **Assinatura do Valor**: No formato antigo do Bytebank, havia o campo `amount` (positivo) e a propriedade `type` definia se era ganho ou gasto. Na API da pós-tech, a propriedade `value` armazena o número negativo em caso de débito e positivo em caso de crédito. Mapeie essa lógica no helper de formatação (`formatCurrency`).

---

## Próximo passo

→ **Iniciar a integração de autenticação no servidor com a [Task 3 — NextAuth Setup](./03-nextauth-setup.md).**
