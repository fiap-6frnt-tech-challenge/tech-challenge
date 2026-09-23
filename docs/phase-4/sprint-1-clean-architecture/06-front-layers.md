# Task 06 — Front em camadas: gateways, queries e estrutura dos MFEs

|                 |                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 1 — Clean Architecture](./README.md)                                                    |
| **Owner**       | Dev 2 (Arquitetura Front & Estado)                                                              |
| **Duração**     | 2 dias                                                                                          |
| **Prioridade**  | P0                                                                                              |
| **Branch**      | `dev2-arch/front-layers`                                                                        |
| **Depende de**  | Task 01                                                                                         |
| **Desbloqueia** | Task 07; S2-02, S2-07, S2-08                                                                    |
| **Requisito**   | Clean Architecture · arquitetura modular                                                        |
| **Embasamento** | Arquiteturas Avançadas — Aulas 1 e 2 · Princípios e Padrões — Aula 2 (Facade, Adapter) e Aula 3 |

---

## Contexto

- `packages/api-client/src/http.ts` mistura montagem de URL, `fetch` e tratamento de erro.
- `hooks.ts` normaliza parâmetros, duplicando o parsing que o servidor faz.
- Componentes dos MFEs importam hooks e serviços direto, e há orquestração dentro de componentes (`NewTransactionModal` cria a transação e depois envia os anexos).

A tarefa aplica as mesmas camadas no cliente.

## `@bytebank/api-client` — estrutura alvo

```
packages/api-client/src/
├── http/httpClient.ts                  fetch + base URL + JSON + AbortSignal + status → erros do core
│                                       (401 AuthenticationError · 404 NotFoundError ·
│                                        422 ValidationError · 429 RateLimitedError)
├── gateways/TransactionHttpGateway.ts  implementa a porta TransactionGateway do core
│                                       (list, get, create, update, remove, overview, summary)
├── gateways/AttachmentHttpGateway.ts
├── queries/                            hooks do TanStack (useTransactionsPage, useTransaction,
│                                       useAccountOverview, useDashboardSummary, mutations)
├── keys.ts · client.ts
└── index.ts                            reexporta os nomes antigos (ex.: usePaginatedTransactions) como alias
```

- `queryFn: ({ signal }) => gateway.list(filter, page, { signal })` — o TanStack cancela requisições obsoletas (usado no S2-02).
- Parâmetros da lista via `toSearchParams()` do core: o mesmo formato que o servidor valida.

## MFEs — estrutura alvo

```
apps/transactions-mfe/src/
├── presentation/     pages/TransactionsPage.tsx, components/*, AccountOverview.tsx
├── application/      hooks (view-models), use-cases/saveTransactionWithAttachments.ts
├── infrastructure/   UrlFilterStorage.ts
├── bootstrap.tsx     composition root (standalone)
└── index.tsx

apps/dashboard-mfe/src/
├── presentation/     Dashboard.tsx
└── application/      useDashboardViewModel.ts (Task 07)
```

Atualize os caminhos em `exposes` nos `rsbuild.config.ts`.

## Validação

- [ ] `api-client` separado em `http/`, `gateways/` e `queries/`, com testes do `httpClient` (mapeamento de status) e dos gateways (URL gerada)
- [ ] Hooks usam `signal` do TanStack
- [ ] MFEs reorganizados; `exposes` atualizados; shell carrega os remotes normalmente
- [ ] Testes existentes do `api-client` (`hooks.test.ts`, `http.test.ts`, `keys.test.ts`) migrados e verdes
- [ ] E2E verdes

## Gotchas

1. Ao mover arquivos, atualize `exposes`, mas **não** mude os nomes expostos (`./TransactionsPage`, `./AccountOverview`, `./Dashboard`): o shell continua carregando por eles.
2. MFEs não podem usar `next/*` (alias para `false` no rsbuild). Gateways e hooks do `api-client` também não podem importar `next`.
3. O `queryClient` é singleton compartilhado entre shell e MFEs. Não crie outro no MFE (só no bootstrap standalone).
4. Mantenha os aliases antigos até o fim do Sprint 2 e remova no Sprint 3, junto com o legado do `@bytebank/shared`.
