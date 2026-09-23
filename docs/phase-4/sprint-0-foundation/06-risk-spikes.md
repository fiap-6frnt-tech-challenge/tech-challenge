# Task 06 — Spikes de risco

|                 |                                                           |
| --------------- | --------------------------------------------------------- |
| **Sprint**      | [Sprint 0 — Fundação](./README.md)                        |
| **Owner**       | Todos — um spike por dev (Dev 2: A · Dev 3: B · Dev 1: C) |
| **Duração**     | 0.5 dia cada                                              |
| **Prioridade**  | P0                                                        |
| **Branch**      | `spike/<nome>` — descartável, **não mergeia**             |
| **Depende de**  | Task 05 (rascunho dos ADRs)                               |
| **Desbloqueia** | S2-01 (A), S2-08 / S3-04 / S3-05 (B), S3-01 (C)           |

---

## Contexto

Três pontos podem derrubar o plano se forem descobertos tarde. Cada dev valida um em até meio dia, num branch descartável, e registra o resultado no fim deste arquivo.

## Spike A — Dev 2 — estado reativo compartilhado entre MFEs

- Criar um pacote provisório `@bytebank/core` com um `Subject` do RxJS.
- Declarar `rxjs` e `@bytebank/core` como singletons no shell (`lib/federation.ts`) e nos dois `rsbuild.config.ts`.
- Emitir um evento no transactions-mfe e recebê-lo no dashboard-mfe, em dev e num build de produção.
- **Critério:** uma única instância (mesma referência) e nenhum rxjs duplicado no bundle.
- **Mitigação se falhar:** barramento via `window` (`CustomEvent`), exposto como Observable com `fromEvent` — funciona entre bundles sem singleton.

## Spike B — Dev 3 — pré-carregamento, prefetch no SSR e CSP

- `preloadRemote` (runtime do MF 2.5.0) disparado no hover do link "Transações": conferir na aba Network que o `remoteEntry` e os chunks do expose baixam antes do clique.
- `HydrationBoundary`: uma página do shell (Server Component) faz o prefetch de uma query com um `QueryClient` **por requisição**; o remote, ao montar, lê do cache sem nova requisição.
- CSP `Report-Only` com nonce num preview da Vercel: o runtime do MF injeta os scripts dos remotes sem violação? O recharts gera violação de `style-src`?
- **Mitigações:** `<link rel="modulepreload">` manual para os chunks; prefetch só no cliente (idle); CSP com `'unsafe-inline'` em `style-src`, documentado.

## Spike C — Dev 1 — criptografia de anexos

- Route handler que cifra um arquivo de 5 MB com AES-256-GCM, envia ao Vercel Blob, baixa e decifra — num **preview da Vercel** (medir tempo e memória da função).
- Verificar se o plano atual do Vercel Blob oferece acesso privado. Se sim, usar junto com a cifra; se não, a cifra resolve sozinha.
- **Mitigação:** guardar o arquivo cifrado em `bytea` no Postgres (≤ 5 MB, aceitável na escala da demo).

## Resultado (preencher)

| Spike                         | Resultado | Decisão |
| ----------------------------- | --------- | ------- |
| A — RxJS/core singleton       |           |         |
| B — preload + hydration + CSP |           |         |
| C — cifra de anexos           |           |         |

## Gotchas

1. Spike é descartável: não refine o código. Anote o que aprendeu (APIs, pegadinhas) neste arquivo.
2. Pacote novo na federação tem pegadinhas conhecidas: `transpilePackages` no `next.config.ts`; `shared` no `lib/federation.ts` **e** nos `rsbuild.config.ts`; `COPY packages/<novo>/package.json` nos Dockerfiles; `tsconfig` com `composite` + `declaration` (exportar interfaces usadas em tipos públicos, senão TS4023).
3. No shell, o `shared` usa `lib: () => Modulo` **síncrono**, não `import()` — senão o módulo duplica (ver o comentário em `lib/federation.ts`).
4. O barrel do DS importado pelos MFEs puxa `next/*`; os `rsbuild.config.ts` já fazem alias de `next/image`, `next/link` e `next/navigation` para `false`. Um pacote novo não pode importar `next`.
