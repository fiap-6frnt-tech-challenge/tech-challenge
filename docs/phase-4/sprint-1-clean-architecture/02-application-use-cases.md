# Task 02 — Camada de aplicação: portas + casos de uso

|                 |                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 1 — Clean Architecture](./README.md)                                                         |
| **Owner**       | Dev 1 (Backend & Segurança)                                                                          |
| **Duração**     | 2 dias                                                                                               |
| **Prioridade**  | P0                                                                                                   |
| **Branch**      | `dev1-sec/use-cases`                                                                                 |
| **Depende de**  | Task 01 (esqueleto do core)                                                                          |
| **Desbloqueia** | Tasks 03, 04, 05; S2-05, S2-06                                                                       |
| **Requisito**   | Clean Architecture · autenticação segura (autorização)                                               |
| **Embasamento** | Arquiteturas Avançadas — Aula 1 · Princípios e Padrões — Aula 2 (Repository, injeção de dependência) |

---

## Contexto

Casos de uso descrevem **o que o sistema faz** (criar transação, listar, montar o resumo, anexar arquivo, registrar, autenticar), sem saber de HTTP, Next ou Drizzle. A **autorização mora aqui**: todo caso de uso recebe um `Actor` (id vindo da sessão) e só enxerga recursos do dono. Assim a regra do S0-02 deixa de depender de cada rota lembrar dela.

## Portas (`packages/core/src/application/ports/`)

Declare agora só as portas usadas neste sprint. `Cipher`, `CacheInvalidator`, `RateLimiter`, `PasswordBreachChecker` e `AuditLogger` entram nas tasks do S2–S4.

```ts
export interface Actor {
  userId: string;
}

export interface TransactionRepository {
  findById(id: string, ownerId: string): Promise<Transaction | null>;
  list(ownerId: string, filter: TransactionFilter, page: PageRequest): Promise<Page<Transaction>>;
  create(data: NewTransactionData, ownerId: string): Promise<Transaction>;
  update(id: string, ownerId: string, patch: TransactionPatch): Promise<Transaction | null>;
  delete(id: string, ownerId: string): Promise<boolean>;
  overview(ownerId: string, recentLimit: number): Promise<AccountOverview>;
  monthlyTotals(ownerId: string, range: DateRange): Promise<MonthlyAggregate[]>;
  categoryTotals(ownerId: string, range: DateRange): Promise<CategoryAggregate[]>;
  balanceSeries(ownerId: string, range: DateRange): Promise<BalancePoint[]>;
}

export interface AttachmentRepository {
  /* list, findById, create, delete — sempre com ownerId */
}
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(data: NewUser): Promise<User | null>;
}
export interface FileStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<StoredFile>;
  get(ref: string): Promise<Uint8Array>;
  delete(ref: string): Promise<void>;
}
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
export interface Clock {
  now(): Date;
  todayISO(): string;
}
export interface IdGenerator {
  next(): string;
}
```

## Casos de uso (`packages/core/src/application/use-cases/`)

| Caso de uso                                                  | Observação                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `CreateTransaction`                                          | Valida com `createTransactionSchema`; dono = actor                                                |
| `UpdateTransaction` / `DeleteTransaction` / `GetTransaction` | Recurso de outro usuário → `NotFoundError`                                                        |
| `ListTransactions`                                           | Usa o codec `TransactionFilter`; `perPage ≤ 100`                                                  |
| `GetAccountOverview`                                         | Saldo + 5 recentes (usado pela home no S1-05)                                                     |
| `GetDashboardSummary`                                        | Totais do repositório + `computeKpiDeltas` do domínio; devolve o mesmo `DashboardSummary` de hoje |
| `AddAttachment` / `ListAttachments` / `RemoveAttachment`     | Checa o dono da transação                                                                         |
| `RegisterUser`                                               | `ConflictError` para e-mail já cadastrado                                                         |
| `AuthenticateUser`                                           | Usado pelo `authorize()` do NextAuth                                                              |

Exemplo:

```ts
export class UpdateTransaction {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(actor: Actor, id: string, input: unknown): Promise<Transaction> {
    const patch = parseOrThrow(updateTransactionSchema, input);
    const updated = await this.transactions.update(id, actor.userId, patch);
    if (!updated) throw new NotFoundError('Transação');
    return updated;
  }
}
```

`parseOrThrow` converte a falha do Zod em `ValidationError` (domínio), para a camada HTTP não conhecer o Zod.

## Testes

Fakes em memória em `packages/core/src/application/testing/` (`InMemoryTransactionRepository`, `FakeClock`, `SequentialIdGenerator`):

- [ ] Autorização: actor B → `NotFoundError` em get/update/delete da transação de A
- [ ] Validação: entrada inválida → `ValidationError` com os issues
- [ ] Caminhos felizes de todos os casos de uso
- [ ] `GetDashboardSummary` devolve os mesmos números que a rota atual para um conjunto de dados fixo

## Validação

- [ ] Casos de uso com testes verdes, sem banco
- [ ] Nenhum tipo do Drizzle (`TransactionRow` etc.) no core
- [ ] Revisão do Dev 2 (portas conversam com os gateways do S1-06)

## Gotchas

1. Valide **dentro** do caso de uso, não só no controller: qualquer porta de entrada (rota, server action, script) herda a regra.
2. `AuthenticateUser` retorna `null` tanto para usuário inexistente quanto para senha errada (mesma resposta). É a base anti-enumeração do S2-05.
3. Não vaze tipos de infraestrutura para o core; o repositório converte linha ↔ entidade.
4. Portas pequenas e focadas (Interface Segregation): prefira duas portas a uma porta "faz-tudo".
