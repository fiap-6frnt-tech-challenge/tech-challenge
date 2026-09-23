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

## Validação

- [ ] DevTools: segunda carga de uma lista → **304** (print para o vídeo)
- [ ] Depois de criar uma transação → 200 com os dados novos
- [ ] `curl -I` nos chunks dos MFEs mostra `immutable`; no manifest, `no-cache`
- [ ] Nenhuma resposta de API com `public` ou `s-maxage`

## Gotchas

1. Dados por usuário são sempre `private` (nunca `public`/`s-maxage`): uma CDN poderia servir os dados de um usuário a outro. `Vary: Cookie` reforça.
2. O navegador revalida sozinho com `If-None-Match` quando há `ETag` + `no-cache`; o TanStack não precisa mudar nada.
3. No nginx, `add_header` dentro de um `location` não herda os do `server`: repita o CORS (o arquivo atual já faz isso no `location` do manifest).
4. ETag fraco (`W/`), porque a serialização do JSON pode variar sem mudar o significado.
