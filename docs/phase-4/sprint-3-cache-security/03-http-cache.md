# Task 03 — Cache HTTP: ETag/304 e `Cache-Control`

|                 |                                                                    |
| --------------- | ------------------------------------------------------------------ |
| **Sprint**      | [Sprint 3 — Cache e criptografia](./README.md)                     |
| **Owner**       | Dev 3 (Performance & Plataforma)                                   |
| **Duração**     | 1.5 dia                                                            |
| **Prioridade**  | P0                                                                 |
| **Branch**      | `dev3-perf/http-cache`                                             |
| **Depende de**  | S1-04 (rotas finas), S1-05 (índices)                               |
| **Desbloqueia** | S4-04                                                              |
| **Requisito**   | Cache para otimizar requisições                                    |
| **Embasamento** | Arquiteturas Avançadas — Aula 4 (Performance) e Aula 5 (cloud/CDN) |

---

## Contexto

Hoje nenhuma resposta da API tem `ETag` ou `Cache-Control`: toda revalidação baixa e processa o JSON inteiro. Nos MFEs, o `nginx.conf` marca só o `mf-manifest.json` como `no-cache`, e o `vercel.json` só define CORS — os chunks com hash não têm cache longo explícito.

## Implementação

1. **ETag por versão dos dados** — antes da consulta pesada, uma consulta barata (com índice) calcula a versão:
   ```sql
   SELECT max(updated_at), count(*) FROM transactions WHERE user_id = $1;
   ```
   ```ts
   export async function withETag(req: NextRequest, version: string, load: () => Promise<unknown>) {
     const etag = `W/"${version}"`;
     const headers = { ETag: etag, 'Cache-Control': 'private, no-cache', Vary: 'Cookie' };
     if (req.headers.get('if-none-match') === etag) {
       return new NextResponse(null, { status: 304, headers });
     }
     return NextResponse.json(await load(), { headers });
   }
   ```
   `version` = hash de `userId` + parâmetros da query + `max(updated_at)` + `count`. Aplicar em lista, overview e resumo.
2. **Anexo mexe na versão:** adicionar ou remover anexo atualiza o `updated_at` da transação (a lista inclui anexos).
3. **Assets dos MFEs na Vercel** (`vercel.json` de cada MFE):
   ```json
   {
     "headers": [
       {
         "source": "/static/(.*)",
         "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
       },
       {
         "source": "/(mf-manifest.json|remoteEntry.js)",
         "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
       }
     ]
   }
   ```
   (mantendo os headers de CORS já existentes)
4. **Docker (`nginx.conf`):** o mesmo para `/static/` (com `add_header ... always`) e `gzip on` para JS, CSS e JSON.

## Notas de implementação

- **Versão dos dados.** Nova porta `TransactionRepository.version(ownerId)` e caso de uso `GetTransactionsVersion`. O Drizzle devolve `max(updated_at)::text` + `:` + `count`. O texto mantém os microssegundos, que um `Date` perderia. O `updated_at` da edição passou a vir do `now()` do banco, como já era na criação. Antes vinha do `new Date()` da função: com várias instâncias, um relógio atrasado podia deixar o `max` igual e servir 304 com dado velho.
- **Índice `transactions_user_updated_idx (user_id, updated_at)`** (migração `0011`). Com ele, a consulta de versão vira Index Only Scan. Num usuário com 5 mil transações intercaladas com as de outros 19, foram 38 buffers e ~1 ms, contra 1.436 buffers e ~3 ms sem o índice (Postgres 16 local, cache quente). Num cache frio (Neon), a diferença de páginas pesa mais.
- **`route(handler, { version })`.** As três rotas só informam a versão. O `route()` monta a ETag com SHA-256 de deploy + `userId` + caminho + query ordenada + versão, então nenhuma rota precisa lembrar do `userId`. O 304 sai antes do caso de uso. A sessão é checada antes da versão. Na lista, a versão é lida antes de validar a query: o 422 continua igual e só custa a consulta barata.
- **Deploy no hash** (`VERCEL_DEPLOYMENT_ID`). Um deploy pode mudar o formato do JSON. Sem isso, o navegador receberia 304 e reaproveitaria o corpo antigo com o código novo. Fora da Vercel, o valor é vazio.
- **Anexos.** Criar, remover e cifrar legado (`markEncrypted`, que pode corrigir o `mimeType`) atualizam o `updated_at` da transação na mesma transação SQL. Na criação, o `UPDATE … RETURNING` também confere o dono e substitui o `SELECT` anterior.
- **A versão pode voltar a um valor anterior** quando os dados voltam ao mesmo estado (ex.: criar e excluir a única transação → `:0`). O 304 continua certo, porque o JSON é o mesmo.
- **`Vary: Cookie` com o NextAuth.** O proxy reemite o cookie de sessão a cada requisição (JWE com IV novo), então o `Cookie` nunca se repete. Mesmo assim, Chromium e Firefox revalidam com `If-None-Match` e recebem 304: com o `Vary` diferente, o Chromium só deixa de mandar o `If-Modified-Since`. O Next acrescenta os valores dele ao `Vary` (`rsc, next-router-state-tree, …, Cookie`).
- **Chromium mostra 200 para o JS e para o Playwright.** Depois do 304, o `fetch` recebe o 200 do cache. O DevTools e o CDP (`responseReceivedExtraInfo`) mostram o 304 da rede. O Firefox reporta o 304 direto.
- **nginx.**
  - O `nginx.conf` do HEAD não subia: `add_header` dentro de `if` no nível `server` é proibido, e o `nginx -t` falhava desde o `d50c8b2`. Agora o `if` só faz `return 204`, e os headers CORS do `server` (com `always`) saem no 204 do preflight.
  - `/static/` usa `immutable` **sem** `always`, um desvio do passo 4. Com `always`, um 404 de chunk ficaria um ano em cache. O CORS continua com `always`.
  - O manifest e o `remoteEntry.js` estão em `no-cache`. O build atual não gera `remoteEntry.js`: o remote entry é `static/js/<nome>.<hash>.js`, apontado pelo manifest, e por isso pode ser imutável. A regra fica por simetria com a Vercel.
  - O `gzip_types` inclui `text/javascript` além de `application/javascript` (o nginx 1.31 usa o segundo; versões novas podem mudar), com `gzip_vary on`.

## Testes

- [x] Core: a versão muda a cada criação, edição e exclusão (`InMemoryTransactionRepository`)
- [x] `dataVersion`: muda com usuário, query, rota e dados; a ordem dos parâmetros não importa
- [x] `withETag`: 200 com `W/"…"`, `private, no-cache` e `Vary: Cookie`; 304 sem carregar os dados para ETag fraca, forte, lista e `*`; ETag antiga → 200
- [x] `route()`: 304 sem chamar o handler; versão nova → 200; ETag de outro usuário nunca bate; 401 antes de ler a versão; erro mapeado sem ETag
- [x] Rotas de lista, overview e resumo: 304 na repetição; outra página ou outro período → 200
- [x] Integração: versão estável sem mudança; muda ao criar, editar e excluir; não muda com dados de outro usuário; muda quando um anexo entra ou sai; anexo recusado não mexe na versão
- [x] E2E `http-cache.spec.ts` (Chromium e Firefox): overview e lista revalidam com 304; depois de criar uma transação, a lista volta 200 com ETag nova e o item novo; nenhuma resposta de `/api/transactions*` com `public` ou `s-maxage`

## Validação

- [x] DevTools: segunda carga de uma lista → **304** (local, pelo CDP e pelo E2E; print para o vídeo pendente)
- [x] Depois de criar uma transação → 200 com os dados novos
- [x] `curl -I` nos chunks dos MFEs mostra `immutable`; no manifest, `no-cache` (nginx local; Vercel depois do deploy)
- [x] Nenhuma resposta de API com `public` ou `s-maxage`

## Gotchas

1. Dados por usuário são sempre `private` (nunca `public`/`s-maxage`): uma CDN poderia servir os dados de um usuário a outro. `Vary: Cookie` reforça.
2. O navegador revalida sozinho com `If-None-Match` quando há `ETag` + `no-cache`; o TanStack não precisa mudar nada.
3. No nginx, `add_header` dentro de um `location` não herda os do `server`: repita o CORS (o arquivo atual já faz isso no `location` do manifest).
4. ETag fraco (`W/`), porque a serialização do JSON pode variar sem mudar o significado.

## Evidências — 2026-10-20

| Validação                                                      | Resultado                                                                                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Testes unitários (core, shell)                                 | Aprovados: core 199, shell 233                                                                                                                                     |
| Integração com PostgreSQL 16 descartável e migrations          | 81 testes aprovados em 8 arquivos                                                                                                                                  |
| `EXPLAIN (ANALYZE, BUFFERS)` da versão, 5 mil transações       | Index Only Scan, 38 buffers, ~1 ms; sem o índice: Bitmap Heap Scan, 1.436 buffers, ~3 ms                                                                           |
| `next build` + E2E (`npx playwright test`, Chromium e Firefox) | 46 aprovados, incluindo o `http-cache.spec.ts`; reload da home → `wire 304` no CDP, mesma ETag; requisição direta com `If-None-Match` → 304                        |
| nginx:alpine 1.31.7 com o `dist` do transactions-mfe           | `nginx -t` ok; chunks JS/CSS: `public, max-age=31536000, immutable` + gzip; manifest: `no-cache` e 304 na revalidação; 404 sem `immutable`; OPTIONS → 204 com CORS |
| `npm run arch:check`                                           | Sem violações                                                                                                                                                      |
