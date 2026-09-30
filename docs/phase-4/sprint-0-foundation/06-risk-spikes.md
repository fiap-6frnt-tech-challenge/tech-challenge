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

## Resultado

Executado em 2026-09-30, num único branch descartável, `spike/s0-06-risk-spikes`; os scripts de verificação estão em `scripts/spikes/s0-06/` nesse branch. Os previews da Vercel ficam atrás do Vercel Authentication (SSO da conta que hospeda os projetos) e não havia CLI nem token para contornar. Por isso B e C rodaram em **build de produção local**. Os limites da plataforma que decidem o Spike C foram confirmados **em produção**.

| Spike                         | Resultado                                                                                                                                                                                                                                                                                                                                                         | Decisão                                                                                                                                                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — RxJS/core singleton       | ✅ Passou em dev e em build de produção: o core foi avaliado uma única vez, e `publish`, `events$` e o `Subject` do rxjs têm a mesma referência no shell e nos 2 MFEs. Os 3 eventos do transactions-mfe chegaram ao dashboard-mfe (3/3, sem duplicar no StrictMode). Nenhum chunk de fallback de rxjs/core foi baixado dos MFEs.                                  | Seguir o S2-01 como planejado: singleton com `lib: () => Rx` no shell. A mitigação `CustomEvent` não é necessária. Custo: o rxjs inteiro entra no chunk da federação (+66 kB raw / ~+18 kB gzip).                                                                           |
| B — preload + hydration + CSP | ✅ com ressalvas. `preloadRemote` baixa o expose antes do clique (`loadRemote` cai de ~190 ms para 2 ms em Slow 4G), mas o tempo clique → conteúdo não muda nesta rota. `HydrationBoundary` elimina o `GET /api/transactions` da home. A CSP com nonce não gera violação no runtime do MF nem no recharts.                                                        | S2-08: `resourceCategory: 'sync'` e prefetch de dados no mesmo gatilho. S3-04: seguir o padrão validado. S3-05: `style-src` com `'unsafe-inline'` e sem nonce, `z.config({ jitless: true })`, e aceitar que o nonce deixa todas as páginas dinâmicas (custo medido abaixo). |
| C — cifra de anexos           | ✅ Cifrar/decifrar 5 MB custa ~7/6 ms e até ~40 MB de memória transitória por requisição. A volta completa com o Blob real chega íntegra (SHA-256), e adulteração e AAD de outro registro são rejeitados. O Blob privado existe em todos os planos, mas o store atual é **público**. **Achado:** a Vercel recusa corpo acima de 4,5 MB com `413` antes da função. | S3-01: cifra na aplicação e ciphertext no store público, com chave aleatória (a cifra resolve sozinha); store privado fica como reforço opcional. **O limite de anexo cai para 4 MB** (cliente e servidor). `bytea` não é necessário.                                       |

### Spike A — evidências e aprendizados

**Montagem:** `packages/core` provisório, com um `Subject` e um registro global que conta avaliações do módulo e guarda as referências de cada consumidor. O pacote e o `rxjs` foram declarados como `shared` no `lib/federation.ts` (`lib: () => Rx`, `lib: () => Core`) e nos dois `rsbuild.config.ts`. A página pública `/spike-a` carrega `transactions/SpikeEmitter` e `dashboard/SpikeReceiver`.

| Verificação (Playwright)                                               | dev                                                                   | produção             |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------- |
| Eventos emitidos → recebidos (dashboard-mfe / shell)                   | 3 → 3 / 3                                                             | 3 → 3 / 3            |
| Avaliações do módulo `@bytebank/core`                                  | 1                                                                     | 1                    |
| Mesma referência de `coreInstanceId`, `publish`, `events$` e `Subject` | sim (3 consumidores)                                                  | sim (3 consumidores) |
| Share scope de `rxjs` e `@bytebank/core`                               | `from: @bytebank/shell`, `loaded`, `useIn: [transactions, dashboard]` | idem                 |
| Chunks de fallback de rxjs/core baixados dos MFEs                      | nenhum                                                                | nenhum               |

**Bundle:**

- **MFEs:** o rxjs completo fica só no chunk de fallback do shared (`async/123.*.js`, 65 kB raw / 17,6 kB gzip), que só é usado no modo standalone. O core fica em dois fallbacks de 534 B.
- **Shell:** o chunk da federação foi de 516 → 582 kB raw, porque o namespace inteiro do rxjs entra nele.

1. O shell **precisa** prover com `lib: () => Modulo` síncrono. O runtime (`formatShare`) marca a entrada como `loaded: true`, e só uma entrada carregada resiste ao desempate. Com a mesma versão, o `register` substitui uma entrada não carregada comparando nomes (`'transactions' > '@bytebank/shell'`). Nesse caso o remote passaria a prover o módulo, e o shell ficaria com outra instância. Com `get: () => import(...)` a entrada nasce não carregada, então esse caminho está descartado.
2. Pelo código do runtime, a entrada carregada do shell também vence versões maiores vindas dos remotes: `findSingletonVersionOrderByVersion` mantém a anterior se ela estiver `loaded`. Isso não foi testado com versões diferentes. Mesmo assim, mantenha a `version` do `lib/federation.ts` igual à do lockfile; `rxjs/package.json` é exportado e pode ser lido.
3. Nos MFEs, importe só de `'rxjs'` (raiz), que exporta os operadores desde a 7.2. `rxjs/operators`, `rxjs/ajax` e `rxjs/internal/*` são outras chaves de shared e não pegam o singleton: num MFE, levariam uma segunda cópia dos internos do rxjs. Dentro de pacotes que o shell provê (`@bytebank/stores`, `@bytebank/api-client`) não há problema, porque o shell resolve `rxjs` e os subpaths no mesmo build — é o caso do `rxjs/ajax` do S2-03. **Regra preventiva, não testada no spike:** `no-restricted-imports` no lint dos MFEs (S2-01).
4. O objeto passado ao `shared` não sofre tree-shaking, então **todo** o rxjs vai para o chunk da federação, que já carrega o recharts (ver [baseline](../perf/baseline.md)). Isso entra na conta do S2-09.
5. No StrictMode (dev), com `unsubscribe` no cleanup do `useEffect`, cada evento chegou uma vez só.
6. O checklist de pacote novo se confirmou: `transpilePackages`, `shared` no shell e nos 2 rsbuild, `COPY packages/core/package.json` nos 3 Dockerfiles e `tsconfig` com `composite`. O projeto no Vitest não foi necessário porque o spike não tem testes.

### Spike B — evidências e aprendizados

**Preload (`preloadRemote`, runtime 2.5.0).** API: `ensureInstance().preloadRemote([{ nameOrAlias: 'transactions', exposes: ['TransactionsPage'], resourceCategory: 'sync' }])`.

- O expose é aceito com ou sem `./`.
- Os defaults são `resourceCategory: 'sync'`, `share: true` e `depsRemote: true`.
- JS e CSS entram como `<link rel="preload">`, e o remoteEntry é carregado e executado se ainda não estiver.
- Assets de shared que o shell provê via `lib` são filtrados, então o preload não baixa o rxjs de fallback.
- O gatilho usa delegação de `pointerover`/`focus` num wrapper do `Sidebar` no `AppShell`, com `import('@/lib/federation')` dinâmico. O DS não mudou.

Medição em Slow 4G via CDP (150 ms de latência, 1,6 Mbps), build de produção, 3 pares intercalados com hover e sem hover:

| Medida                                                 | com preload (hover) | sem preload |
| ------------------------------------------------------ | ------------------- | ----------- |
| Assets do transactions-mfe baixados no hover           | 1 (expose, 12,8 kB) | —           |
| Requests ao transactions-mfe depois do clique          | 0                   | 1           |
| `loadRemote('transactions/TransactionsPage')`          | 1–2 ms              | 185–214 ms  |
| Clique → heading, `/transactions` dinâmica (com nonce) | ~890 ms             | ~880 ms     |
| Clique → heading, `/transactions` estática (sem nonce) | ~370 ms             | ~360 ms     |

1. **O ganho não aparece ponta a ponta nesta rota.** Com a rota dinâmica, o `loadRemote` só começa ~400 ms depois do clique (roundtrip RSC), e a navegação só é commitada no fim do stream RSC. Mesmo com a rota estática, o `next/dynamic` sempre suspende no primeiro mount, e o React 19 segura o reveal de um Suspense até 300 ms depois do fallback (`globalMostRecentFallbackTime + 300` no `react-dom`). Ganhos abaixo de ~300 ms somem nessa janela. O preload compensa quando o carregamento passa disso: remote ainda não carregado (remoteEntry + chunks) ou expose pesado (dashboard, com o recharts de ~125 kB gzip).
2. `resourceCategory: 'all'` baixou **260 kB** em 8 assets, contra 12,8 kB do `'sync'`. Vieram chunks lazy de modais, o expose `AccountOverview` e até o CSS Tailwind do `bootstrap.tsx` standalone (37 kB), que ainda gera violação de CSP por vir da origem do MFE.
3. No `shareStrategy` padrão (`version-first`), abrir `/transactions` direto **não** carrega o remoteEntry do dashboard; só o manifest, que já vem do preload do `layout.tsx`.

**Prefetch no SSR + `HydrationBoundary`.** Em `app/page.tsx`: `auth()` → `new QueryClient()` por requisição → `prefetchQuery({ queryKey: transactionKeys.list({}), queryFn: () => getAllByUser(userId) })` → `<HydrationBoundary state={dehydrate(queryClient)}>` em volta dos remotes.

- O HTML da home já traz as transações.
- Depois do load houve **0** `GET /api/transactions`: o `useTransactions` do `AccountOverview` (remote) leu do cache.
- O resumo, que não foi pré-carregado, fez 1 `GET /api/transactions/summary` e serviu de controle.

1. `HydrationBoundary`, `dehydrate` e `QueryClient` importam no Server Component, porque os módulos do TanStack têm `'use client'`. O barrel do `@bytebank/api-client` também importa, já que usa só `useMemo`, que existe no build `react-server`. Mas importar o barrel **instancia o `queryClient` singleton no servidor**: nunca use esse objeto lá.
2. A home passa de estática para dinâmica (`○` → `ƒ`), o que já é esperado no S3-04.
3. O DTO precisa ser só JSON, como hoje: `doublePrecision` → `number`, `text` → `string`, nenhum `Date`. Se o SSR e a API serializarem diferente, a mesma chave guarda formatos diferentes.
4. O resumo ficou de fora de propósito. A chave dele vem de `getDefaultSummaryRange()`, que faz a conta de mês no fuso local e depois usa `toISOString()` (UTC). Por isso o `to` vira o dia seguinte entre 21h e 24h em Brasília. No servidor (UTC na Vercel) a chave divergiria e o remote refaria a busca, então ele depende da função com fuso fixo do S3-04 (gotcha 2).

**CSP Report-Only com nonce.**

- O `proxy.ts` gera o nonce por requisição e manda a política no header de **requisição** `content-security-policy-report-only`. O Next 16.1 também extrai o nonce desse header (`app-render.js`).
- A mesma política vai no header de resposta.
- `/api/csp-report` coleta os relatórios e foi liberado do auth no proxy.
- O `layout.tsx` chama `await connection()`.

A política foi estrita de propósito, para responder às perguntas do spike: `script-src 'self' 'nonce-…' 'strict-dynamic' <MFEs>` e `style-src 'self' 'nonce-…'`, sem `'unsafe-inline'`. O roteiro passou por `/login`, `/register`, `/` com 3 gráficos renderizados, o modal "Nova transação", `/transactions` e os filtros.

| Violação                                   | Origem                                                | Leitura                                                                                                                                                                               |
| ------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `script-src` — `eval`, em todas as páginas | sonda `allowsEval` do **zod v4** (`new Function("")`) | Em enforce é inofensiva (há try/catch e o zod cai no caminho sem JIT), mas gera um relatório por página. `z.config({ jitless: true })` antes de construir os schemas elimina a sonda. |
| `style-src-attr` — `color:transparent`     | `next/image` renderizado no SSR (logo)                | Exige `'unsafe-inline'` para estilos, ou `style-src-attr 'unsafe-inline'`.                                                                                                            |
| `style-src-attr` — `min-height:640px`      | `DeferUntilVisible` renderizado no SSR                | Idem.                                                                                                                                                                                 |
| `style-src-elem` — CSS da origem :3003     | runtime do MF, **só com preload `'all'`**             | É o Tailwind do bootstrap standalone. Com `'sync'` não acontece.                                                                                                                      |

Não houve violação em três pontos que o spike queria checar:

- **Scripts do Next:** 21/21 `<script>` do `/login` saíram com nonce.
- **Runtime do MF:** o remoteEntry, os chunks e o preload de script dos MFEs passaram graças ao `'strict-dynamic'`.
- **Recharts:** ele mede texto com `Object.assign(span.style, …)`, que é CSSOM e fica fora do alcance da CSP, e não injeta `<style>`.

1. **O nonce obriga renderização dinâmica em tudo.** É o `connection()` no layout; sem ele, as páginas estáticas saem sem nonce. Custo medido: a navegação SPA para `/transactions` vai de ~360 ms (estática) para ~870 ms (dinâmica) em Slow 4G. Com o S3-04, as páginas autenticadas ficam dinâmicas de qualquer forma. Vale testar um `loading.tsx` por rota para o clique mostrar o skeleton na hora (não testado).
2. Com nonce em `style-src`, o navegador **ignora** `'unsafe-inline'`. As opções são `style-src 'self' 'unsafe-inline'` sem nonce (proposta do S3-05) ou `style-src-elem 'self' 'nonce-…'` com `style-src-attr 'unsafe-inline'`, que é mais estrita para `<style>`.
3. Pela especificação da CSP, `frame-ancestors` não vale em Report-Only. Mantenha o `X-Frame-Options: DENY` do S3-05 até o enforce.
4. **Preview da Vercel:** a Vercel Toolbar é injetada por padrão nos previews. Ela precisa de `https://vercel.live` (script/connect/img/frame/style/font) e de `wss://ws-us3.pusher.com`; a alternativa é desligá-la com `VERCEL_PREVIEW_FEEDBACK_ENABLED=0`. Sem isso, o relatório do preview mistura violações da toolbar.
5. Os estilos dos MFEs vêm do build do shell, e hoje nenhum expose carrega CSS da própria origem. Se algum passar a carregar, o `style-src` precisará das origens dos MFEs.
6. O modo dev não foi testado. A política precisa de `'unsafe-eval'` (React Refresh) e `ws:` (HMR), que já estão na proposta, e provavelmente dos `<style>` inline do rsbuild em dev.

### Spike C — evidências e aprendizados

**Montagem:** `GET` e `POST /api/spike/attachment-crypto`, autenticadas. O arquivo é cifrado com AES-256-GCM no formato do S3-01 (`[versão][keyId][IV 12 B][tag 16 B][ciphertext]`, AAD `attachment:<uuid>`). Segue um `put` no Blob (chave `spike-s006/<uuid>`, `application/octet-stream`, sem o nome original), depois o download, a decifragem, a comparação de SHA-256 e o `del`.

| Medida (5 MB)                                         | Resultado                                                                                                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Só CPU: Node 22, i3-1115G4, mediana de 10             | cifra 7,3 ms · decifra 5,5 ms (~685 MB/s)                                                                                                                 |
| Rota local + Blob real (5 execuções)                  | parse do multipart 16–21 ms · cifra 6–39 ms · `put` 2,4–4,3 s · download 0,9–1,3 s · decifra 8–11 ms · `del` 0,4–0,8 s                                    |
| Memória                                               | maior incremento de `arrayBuffers` numa requisição: +40 MB (texto claro, ciphertext e cópias); pico do processo 45–70 MB de `arrayBuffers` e RSS ≤ 186 MB |
| Integridade                                           | volta íntegra; o blob guarda só ciphertext; overhead de 30 B; 1 byte adulterado → erro; AAD de outro registro → erro                                      |
| `put(…, { access: 'private' })` no store atual        | `Cannot use private access on a public store. The store must be configured with private access.`                                                          |
| Produção: POST de 4 MB / 5 MB em `/api/auth/register` | 4 MB chega à função (`gru1::iad1`, 422 do app) · 5 MB → **`413 FUNCTION_PAYLOAD_TOO_LARGE`** na borda, sem executar a função                              |

1. A cifra não pesa numa Function (Hobby: 2 GB / 1 vCPU, até 300 s). O tempo medido é quase todo rede, do Brasil até o store. Na Vercel a função roda em `iad1`, como mostra o `X-Vercel-Id` acima. Para medir no preview: faça push do branch do spike, abra `/api/spike/attachment-crypto?sizeMb=4` logado e veja duração e memória em Observability.
2. **O limite de 4,5 MB vale para o corpo da requisição e da resposta de toda Function** ([doc](https://vercel.com/docs/functions/limitations)). Hoje o anexo aceita 5 MB via route handler (multipart), então arquivos entre ~4,4 e 5 MB **já falham em produção** com o erro da plataforma. Upload direto do cliente para o Blob, que contorna o limite, não serve aqui: o arquivo chegaria em claro ao storage. Por isso o limite passa a ser **4 MB**. Se ele um dia subir, o download decifrado precisa sair em stream.
3. **Blob privado:** GA para todos os planos desde 2026-06-30, e o SDK ≥ 2.3 já suporta (temos 2.4.0). Só que o acesso é propriedade do **store**, e a doc não fala em converter um store público. Usar privado exige criar um store novo (dashboard ou `vercel blob create-store --access private`), conectá-lo aos projetos e ler com `get()` + stream na função. Isso depende de quem administra a conta Vercel.
4. A chave de objeto aleatória, sem o nome original, e a URL que nunca sai da API (download pela rota autenticada) tornam o store público aceitável para ciphertext, como prevê o ADR-004.

### Impacto nas tasks

Cada task abaixo recebeu uma nota no próprio documento, logo depois do cabeçalho.

| Task  | Ajuste                                                                                                                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1-01 | Checklist de pacote novo validado. `lib: () => Core` síncrono e com a `version` do pacote; declarar `@bytebank/core` nas dependências do shell e dos MFEs.                                                                                                                |
| S2-01 | Seguir o plano, com `lib: () => Rx` síncrono. Nos MFEs, importar só de `'rxjs'` e travar no lint. Anotar os +18 kB gzip do rxjs para o S2-09.                                                                                                                             |
| S2-03 | Validar 4 MB no cliente. O 413 da Vercel vem em `text/plain` e não pode ser retentado. `rxjs/ajax` no api-client é seguro.                                                                                                                                                |
| S2-07 | Corrigir a falha aberta do `proxy.ts` (achado colateral 1).                                                                                                                                                                                                               |
| S2-08 | Usar `resourceCategory: 'sync'`. O que muda o tempo clique → lista é o `prefetchQuery` no mesmo gatilho; medir `loadRemote` com `performance.mark`, além do tempo total. O preload rende mais no dashboard (recharts).                                                    |
| S2-09 | Somar o rxjs inteiro (~18 kB gzip) ao chunk da federação na comparação antes/depois.                                                                                                                                                                                      |
| S2-10 | Conferir o preload pela rede e pelo `loadRemote`, não pelo tempo clique → conteúdo.                                                                                                                                                                                       |
| S3-01 | Limite de **4 MB** (cliente e servidor). Store público + cifra; privado é opcional. Download em stream só se o limite subir.                                                                                                                                              |
| S3-04 | Padrão validado: `QueryClient` por requisição + `HydrationBoundary` acima dos remotes. Pré-carregar o resumo só depois do `defaultSummaryRange()` com fuso fixo. A Parte A (cache no servidor) não foi avaliada.                                                          |
| S3-05 | O Next lê o nonce do header de requisição da CSP, não do `x-nonce`. `style-src 'self' 'unsafe-inline'` sem nonce (ou separar attr/elem). `z.config({ jitless: true })`. Nonce ⇒ tudo dinâmico (custo medido). No preview, `vercel.live` na política ou toolbar desligada. |
| S3-08 | Barramento validado (Parte B). O `router.prefetch` de rota dinâmica não traz o RSC da página (Parte A).                                                                                                                                                                   |
| S4-03 | Upload ≤ 4 MB na tabela da auditoria.                                                                                                                                                                                                                                     |
| S4-09 | Previews com SSO: o shell de preview provavelmente não consegue buscar o manifest de um MFE de preview (não testado).                                                                                                                                                     |

### Achados colaterais

1. **O proxy falha aberto quando o Auth.js tem erro de configuração.** Em `next start` sem `AUTH_TRUST_HOST`/`AUTH_URL`, o Auth.js lança `UntrustedHost` e `req.auth` vira o objeto de erro (`{ message: … }`). Então `!!req.auth` é `true`: rotas privadas respondem 200 para anônimos, e `/login` redireciona para `/`. As rotas de API continuam protegidas porque checam `session?.user?.id`, e nenhum dado vaza, mas o bloqueio das páginas cai. Na Vercel (host confiável automático) e no Docker (`AUTH_TRUST_HOST=true`) isso não acontece. A correção é uma linha no `proxy.ts`: `const isLoggedIn = Boolean(req.auth?.user?.id);` (Dev 1, junto do S2-07).
2. Para subir o build de produção localmente, use `AUTH_TRUST_HOST=true npm run start -w @bytebank/shell`.

### Como reproduzir (branch `spike/s0-06-risk-spikes`)

```bash
docker compose up -d db
npm run build -w @bytebank/transactions-mfe && npm run build -w @bytebank/dashboard-mfe
npm run build -w @bytebank/shell
AUTH_TRUST_HOST=true npm run start -w @bytebank/shell   # :3000
npm run preview -w @bytebank/transactions-mfe           # :3003
npm run preview -w @bytebank/dashboard-mfe              # :3002

node scripts/spikes/s0-06/spike-a-check.mjs prod   # ou dev, com os dev servers
node scripts/spikes/s0-06/spike-b-check.mjs all    # cria spike.s006@bytebank.test com 12 transações
node scripts/spikes/s0-06/spike-c-check.mjs        # usa BLOB_READ_WRITE_TOKEN; cada execução apaga o próprio blob
```

## Gotchas

1. Spike é descartável: não refine o código. Anote o que aprendeu (APIs, pegadinhas) neste arquivo.
2. Pacote novo na federação tem pegadinhas conhecidas: `transpilePackages` no `next.config.ts`; `shared` no `lib/federation.ts` **e** nos `rsbuild.config.ts`; `COPY packages/<novo>/package.json` nos Dockerfiles; `tsconfig` com `composite` + `declaration` (exportar interfaces usadas em tipos públicos, senão TS4023).
3. No shell, o `shared` usa `lib: () => Modulo` **síncrono**, não `import()` — senão o módulo duplica (ver o comentário em `lib/federation.ts`).
4. O barrel do DS importado pelos MFEs puxa `next/*`; os `rsbuild.config.ts` já fazem alias de `next/image`, `next/link` e `next/navigation` para `false`. Um pacote novo não pode importar `next`.
