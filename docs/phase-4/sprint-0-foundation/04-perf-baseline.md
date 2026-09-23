# Task 04 — Baseline de performance (Lighthouse, bundle, API)

|                 |                                                                                       |
| --------------- | ------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 0 — Fundação](./README.md)                                                    |
| **Owner**       | Dev 3 (Performance & Plataforma)                                                      |
| **Duração**     | 1 dia                                                                                 |
| **Prioridade**  | P0                                                                                    |
| **Branch**      | `dev3-perf/perf-baseline`                                                             |
| **Depende de**  | Task 01                                                                               |
| **Desbloqueia** | Todas as tasks de performance (S1-05, S2-08, S2-09, S3-03, S3-04) e o relatório S4-04 |
| **Requisito**   | Performance e otimização · melhoria no tempo de resposta                              |
| **Embasamento** | Arquiteturas Avançadas — Aula 4 (Performance e Otimização de Aplicações Web)          |

---

## Contexto

Na Fase 2 a medição foi feita num build local, porque a produção ainda servia a Fase 1. Resultado final (best-of-3, local): `/` 97 desktop / **67 mobile**; `/transactions` 97 / **72**; `/login` 100 / 99. As metas mobile (≥ 85) não foram batidas; o gargalo apontado foi a cascata `ssr:false` + federação.

Agora a Fase 2 está em produção (https://tech-challenge-phase2.vercel.app), o que permite medir na nuvem real. Sem baseline, não há como provar a "melhoria no tempo de resposta" que a spec pede.

> A auditoria completa da Fase 2 foi apagada da pasta `docs/` no commit `2e9819e`, mas continua no histórico: `git show 2e9819e^:docs/phase-2/perf-audit.md`.

## Implementação

1. **Lighthouse** (best-of-3, desktop e mobile) em `/login`, `/` e `/transactions`, na **produção autenticada** e num **build local de produção**. O cookie de sessão vai por `--extra-headers`, num arquivo fora do repo:
   ```bash
   npx lighthouse https://tech-challenge-phase2.vercel.app/transactions \
     --only-categories=performance --preset=desktop \
     --extra-headers=./.secrets/headers.json \
     --output=json --output-path=./perf/tx-desktop-1.json
   ```
2. **Bundle:** shell com `next experimental-analyze`; MFEs com a opção `performance.bundleAnalyze` do Rsbuild. Anotar:
   - tamanho do chunk que carrega `lib/federation.ts` (hoje inclui o DS inteiro, com recharts)
   - onde aparecem `recharts` e `zod`
   - JS inicial de cada rota
3. **API:** script `apps/shell/src/db/seed-load.ts` que cria 5.000 transações para um usuário de teste, e `autocannon` (p50, p95, req/s) contra o build local em:
   - `GET /api/transactions?_page=1&_per_page=10`
   - `GET /api/transactions` (sem paginação — usado pela home)
   - `GET /api/transactions/summary`
   - `GET /api/transactions?q=mercado&_page=1&_per_page=10`
4. **Payload:** tamanho da resposta de `GET /api/transactions` sem paginação com 5 mil itens.
5. **Busca:** número de requisições ao digitar "supermercado" no filtro.
6. Registrar tudo em `docs/phase-4/perf/baseline.md`: data, máquina, rede, commit e os comandos para reproduzir.

## Validação

- [ ] Tabela Lighthouse (3 páginas × 2 presets × 2 ambientes) com Perf, LCP, TBT e CLS
- [ ] Tamanhos de bundle anotados, inclusive a localização do recharts
- [ ] p50/p95 dos 4 endpoints com 5 mil transações
- [ ] Metas do PLAN.md confirmadas ou ajustadas com base nos números reais
- [ ] Comandos reproduzíveis no documento

## Gotchas

1. Lighthouse local é ruidoso em CPU: sempre best-of-3 (lição da Fase 2). A produção é a fonte principal; o local serve para comparar mudanças antes do deploy.
2. `next start` local exige `AUTH_TRUST_HOST=true` (NextAuth v5) e um usuário real — não existe mais backdoor de senha.
3. O `@next/bundle-analyzer` não gera relatório com Turbopack (padrão do Next 16); use `next experimental-analyze`.
4. As transações do seed pertencem ao `userId` `joana`. Para medir com dados, use o script de carga no seu usuário de teste.
5. Nunca commitar o cookie de sessão: `.secrets/` no `.gitignore`.
6. Rode o `autocannon` contra o build local, nunca contra a produção (evita carga artificial na Vercel e no Neon).
