# Task 17 — Infra: Env Blob + CORS + verificação cross-origin

|                        |                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md)                                                |
| **Owner**              | Dev 1 (Infra & Backend)                                                                                                  |
| **Duração estimada**   | 0.5 dia                                                                                                                  |
| **Branch recomendada** | `dev1/infra-env-cors`                                                                                                    |
| **Depende de**         | [Task 02 — Vercel Blob Storage](./02-backend-blob-storage.md) (endpoints precisam estar prontos para validar os headers) |
| **Desbloqueia**        | [Task 18 — Testes](./18-tests.md) (testes E2E de upload precisam de CORS correto)                                        |

---

## Contexto

O `transactions-mfe` em `:3003` faz chamadas para o shell (`/api/transactions/[id]/attachments`) que está em `:3000`. Em dev isso já funciona porque ambos estão no mesmo host; em produção os MFEs ficam em domínios diferentes (ex: `transactions-mfe.vercel.app` → `shell.vercel.app`). Esta task garante que:

1. `BLOB_READ_WRITE_TOKEN` está nos ambientes corretos.
2. Os headers CORS do shell permitem requisições dos MFEs.
3. `NEXT_PUBLIC_TRANSACTIONS_MFE_URL` está configurado em todos os ambientes.

---

## Implementação

### 1. Variáveis de ambiente

**`apps/shell/.env.example`** — adicionar:

```
BLOB_READ_WRITE_TOKEN=...         # obrigatório em prod; mock OK em dev
NEXT_PUBLIC_TRANSACTIONS_MFE_URL=http://localhost:3003
```

**Vercel Dashboard:** configurar nos projetos `shell`, `dashboard-mfe` e `transactions-mfe`:

- `shell`: `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_TRANSACTIONS_MFE_URL` (URL de prod do transactions-mfe)
- `dashboard-mfe`: `NEXT_PUBLIC_SHELL_URL` (para chamadas API)
- `transactions-mfe`: `NEXT_PUBLIC_SHELL_URL`

### 2. CORS nas rotas de API

Next.js App Router não tem CORS global; adicionar por rota onde necessário:

```ts
// apps/shell/src/app/api/transactions/[id]/attachments/route.ts
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_TRANSACTIONS_MFE_URL ?? 'http://localhost:3003',
  process.env.NEXT_PUBLIC_DASHBOARD_MFE_URL ?? 'http://localhost:3002',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin')),
  });
}
```

Repetir o padrão em todas as rotas consumidas cross-origin pelos MFEs.

### 3. Verificar `remoteEntry.js` do transactions-mfe

Em `apps/shell/next.config.ts`, garantir que o remote está registrado:

```ts
const mfeUrl = process.env.NEXT_PUBLIC_TRANSACTIONS_MFE_URL ?? 'http://localhost:3003';
// dentro de withModuleFederation:
remotes: {
  dashboard:    `dashboard@${dashboardUrl}/mf-manifest.json`,
  transactions: `transactions@${mfeUrl}/mf-manifest.json`,
}
```

---

## Validação

- [ ] `npm run dev` local: shell em `:3000`, transactions-mfe em `:3003` — upload de arquivo funciona sem erro de CORS no console
- [ ] Vercel preview: shell faz request para `/api/transactions/[id]/attachments` a partir do domínio do transactions-mfe sem erro CORS
- [ ] `BLOB_READ_WRITE_TOKEN` ausente em dev → upload falha com mensagem de erro clara (não 500 silencioso)
- [ ] `OPTIONS` pré-flight retorna `204` com headers corretos

---

## Gotchas

1. **`Access-Control-Allow-Credentials: true` exige origem específica** — não pode usar `*` quando credentials são enviadas. Sempre especificar o domínio exato do MFE.
2. **Cookies de sessão cross-origin** — NextAuth usa cookies `httpOnly`. Em prod, o MFE (em domínio diferente) não consegue enviar os cookies automaticamente. Solução: chamadas API vão para o mesmo domínio do shell via proxy reverso (Vercel rewrites) ou o shell expõe um token CSRF. Avaliar na Sprint 4 se necessário.
3. **`BLOB_READ_WRITE_TOKEN` no CI** — adicionar como secret no GitHub Actions para que o CI não quebre builds que importam `@vercel/blob`.
