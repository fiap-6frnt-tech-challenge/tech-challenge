# Task 04 — Relatório de performance antes/depois

|                 |                                                           |
| --------------- | --------------------------------------------------------- |
| **Sprint**      | [Sprint 4 — Auditoria e entrega](./README.md)             |
| **Owner**       | Dev 3 (Performance & Plataforma)                          |
| **Duração**     | 1 dia                                                     |
| **Prioridade**  | P0                                                        |
| **Branch**      | `dev3-perf/perf-report`                                   |
| **Depende de**  | Sprint 3 inteiro, S0-04 (baseline), Task 10 (LCP mobile)  |
| **Desbloqueia** | Task 07 (seção de performance do README), Task 08 (vídeo) |
| **Requisito**   | Performance e otimização · melhoria no tempo de resposta  |
| **Embasamento** | Arquiteturas Avançadas — Aula 4                           |

---

## Contexto

A spec pede "melhorias no tempo de resposta da aplicação". O relatório prova com números, comparando três pontos: o fim da Fase 2, a baseline do S0-04 e o estado final da Fase 4.

## Implementação

`docs/phase-4/perf/report.md` com:

1. **Lighthouse** (best-of-3, produção e local), páginas `/login`, `/` e `/transactions`, desktop e mobile: Perf, LCP, TBT, CLS.
2. **Bundle:** chunk da federação (com e sem recharts), JS inicial por rota, onde está o zod.
3. **API** (5 mil transações): p50/p95 de lista, busca, overview e resumo; efeito do cache (304 e cache do servidor). Para a lista paginada, as metas são o tempo de resposta (p95 com 1 conexão) e a vazão (req/s com 10 conexões, comparada com a baseline na mesma máquina); o `api-bench.mjs` mede as duas. O p95 com 10 conexões não serve de meta, porque mede a fila do servidor ([s1-05 § 5](../perf/s1-05-db-response-time.md#5-reavaliação-da-meta-da-lista-paginada-s1-10)).
4. **Payload da home:** lista completa → overview.
5. **Busca:** requisições por termo; requisições canceladas.
6. **Navegação:** tempo clique → conteúdo em "Transações" (com e sem preload).
7. **Causalidade:** para cada otimização, qual métrica ela moveu e quanto:

   | Otimização                      | Task  | Métrica                            | Antes → Depois                                                                                                                                                                       |
   | ------------------------------- | ----- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | Índices + agregação em SQL      | S1-05 | p95 do resumo                      |                                                                                                                                                                                      |
   | Overview na home                | S1-05 | payload da home                    |                                                                                                                                                                                      |
   | Preload de remotes e dados      | S2-08 | clique → conteúdo                  |                                                                                                                                                                                      |
   | Gráficos fora do shell          | S2-09 | JS de `/transactions`, TBT         |                                                                                                                                                                                      |
   | ETag/304                        | S3-03 | bytes transferidos na revalidação  |                                                                                                                                                                                      |
   | Prefetch no SSR                 | S3-04 | remote carregado → conteúdo pronto | 278 → 126 ms (`/`), 294 → 144 ms (`/transactions`); LCP mobile sem mudança ([S3-04](../sprint-3-cache-security/04-server-cache-ssr-prefetch.md#evidências--2026-10-20))              |
   | Elemento de LCP fora da cascata | S4-10 | LCP mobile                         | Local (A/B 10 × 10): 4.132 → 2.512 ms (`/`), 4.633 → 2.507 ms (`/transactions`); FCP +14 ms (TTFB da sessão); produção pendente ([S4-10](./10-mobile-lcp.md#evidências--2026-10-29)) |
   | Série de saldo por dia          | S4-10 | HTML da home                       | 13,6 → 11,6 kB transferidos (1.250 → 168 pontos para o `perf.user`), abaixo dos 14,6 kB da 1ª ida e volta ([S4-10](./10-mobile-lcp.md#notas-de-implementação))                       |

8. **Metas do PLAN.md:** atingida / não atingida, com explicação.

## Validação

- [x] Relatório completo e reproduzível (comandos incluídos): [perf/report.md](../perf/report.md). O Lighthouse de produção do estado final fica para depois do deploy (Task 09)
- [x] Prints para o vídeo: Network com preload, 304, requisições canceladas, comparação do Lighthouse ([`assets/perf/`](../assets/perf/), gerados por `scripts/perf/video-prints.mjs`)

## Gotchas

1. Mesma máquina, mesma rede e best-of-3 em todas as medições comparadas.
2. Se uma meta não for atingida, explique o motivo e o próximo passo — relatório honesto vale mais que número maquiado.

## Notas de implementação

- **Fontes.** O fim da Fase 2 vem do `perf-audit.md` da Fase 2 (03/07) e a baseline do [baseline.md](../perf/baseline.md). O estado final foi medido para o relatório, na mesma máquina do S0-04, com 5 mil transações num Postgres descartável.
- **Produção não foi remedida.** A produção ainda serve a Fase 2, e a conta `perf.user@bytebank.test` recusou a senha padrão. O relatório usa os números de produção do S0-04 e deixa o comando para a Task 09.
- **`lighthouse-batch.mjs`.** Com o Chrome 156 do sistema, 17 das 18 execuções falharam com `NO_NAVSTART`. O script passou a usar o Chromium 149 do Playwright e a repetir execuções com `runtimeError`.
- **`api-bench.mjs`.** Ganhou os cenários de revalidação (304) e do resumo sem cache do servidor, com bytes por resposta na tabela.
- **`search-requests.mjs`.** Ganhou `PERF_LATENCY_MS`. Sem latência, o servidor local responde antes da próxima busca e não há o que cancelar.
- **Prefetch da página seguinte (correção).** O `usePrefetchNextTransactionsPage` do `@bytebank/api-client` agora espera a página atual ficar estável por 1 s antes de pré-buscar a página n + 1 e cancela o agendamento se a chave mudar. Assim, os termos intermediários da busca não geram mais prefetch. Testes novos em `prefetch.integration.test.tsx`; o `preload-nav.mjs checks` confirmou que a página 2 continua pré-carregada no clique.
- **Scripts novos.** `bundle-report.mjs` (tamanhos por chunk e onde estão recharts, zod e o runtime do MF, inclusive nos scripts de um relatório do Lighthouse) e `video-prints.mjs` (DevTools real ligado à página para os prints do Network e relatórios do Lighthouse a partir do JSON).

## Evidências — 2026-11-05

| Item                        | Resultado                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lighthouse local, best-of-3 | Mobile 83 (`/`), 74 (`/transactions`), 83 (`/login`); desktop 100 nas três; CLS 0. LCP mobile 2,08 s e 2,79 s, contra 4,62 s e 4,53 s em produção no S0-04                           |
| Bundle                      | Chunk da federação 138 → 45,7 KiB gzip, sem recharts; 0 scripts com recharts ou zod em `/` e `/transactions`; JS inicial 486 → 306 kB (`/`) e 469 → 345 kB (`/transactions`)         |
| API (5 mil, 10 conexões)    | p95 do resumo 1.622 → 62 ms; lista 245 → 89 ms e 80 → 156 req/s; p95 da lista com 1 conexão 12 ms                                                                                    |
| Cache                       | 304: 31,7 → 1,7 kB por resposta no resumo; cache do servidor: p95 do resumo 32 → 14 ms                                                                                               |
| Home                        | 0 requisições de dados na carga; HTML de 11,3 kB                                                                                                                                     |
| Busca                       | 1 requisição por termo estável; 10 de 10 obsoletas canceladas com 600 ms de latência; a regressão do prefetch da página 2 (12 → 22 requisições na digitação lenta) foi corrigida: 12 |
| Navegação (Slow 4G)         | Clique → lista 634 → 331 ms com preload; clique → dashboard 977 → 664 ms (o dashboard aparece ~330 ms depois da visão geral, causa a investigar)                                     |
| Metas do PLAN.md            | 8 atingidas, 2 pendentes de produção (mobile ≥ 85)                                                                                                                                   |
