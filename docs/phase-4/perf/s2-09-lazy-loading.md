# S2-09 — Lazy loading e code splitting

> Evidências de 2026-10-19. Task: [09-lazy-loading.md](../sprint-2-state-reactive/09-lazy-loading.md). Dados sanitizados: [s2-09-lazy-loading.json](./s2-09-lazy-loading.json).

## Método

- Baseline: `5b7dd3e` (`phase-4`, com S2-07 integrada). Candidato: produto desta branch após a integração; hash registrado no JSON.
- Apple M4, macOS 27, Node 22.23.3, npm 10.9.9, Chromium 149 e Lighthouse 12.8.2.
- Builds de produção do shell e dos dois MFEs; PostgreSQL 16 descartável, 5.000 transações do mesmo usuário nos dois casos. Portas 3100/3102/3103.
- Lighthouse mobile 412×823, CPU 4×, RTT 150 ms e throughput 1638,4 Kbps simulados. Três execuções por rota e candidato; a tabela usa o TBT/LCP/JS da execução com maior nota, conforme S0-04. Empates mantêm a primeira execução.
- Rede capturada em contextos novos autenticados, sem hover/foco em ações de criação. O script verifica sessão válida com duração de até 8h e rejeita redirects, erros de página e downloads de scripts malsucedidos.
- Build de cada workspace executado diretamente, com origens explícitas dos MFEs. Capturas com origem incorreta ou artefato antigo de cache foram descartadas.
- O baseline histórico do S0-04 foi medido em outra máquina. A variação desta task usa o mesmo M4 e a mesma base atualizada.

## Bundle e grafo síncrono

| Medida                        | Antes | Depois |
| ----------------------------- | ----: | -----: |
| Chunk da federação raw (KiB)  | 567.5 |  182.9 |
| Chunk da federação gzip (KiB) | 152.2 |   48.1 |
| Módulos síncronos distintos   |  1167 |    671 |
| Módulos Recharts síncronos    |   201 |      0 |
| Módulos Zod síncronos         |    78 |      0 |

Redução gzip do chunk da federação: **68.4%**. Gzip calculado sobre os corpos dos scripts com `node:zlib`. O RxJS continua compartilhado de forma síncrona, conforme o Spike A.

O grafo usa `next experimental-analyze --output` e a tabela oficial de dependências síncronas. O dashboard mantém gráficos em chunks assíncronos locais; emissão de fallbacks pesados pelos MFEs não significa download. A captura de rede complementa o grafo.

## Carregamento inicial e Lighthouse mobile

| Rota            | Nota antes → depois | TBT antes → depois | LCP antes → depois | JS transferido antes → depois (KiB) | Redução de JS |
| --------------- | ------------------: | -----------------: | -----------------: | ----------------------------------: | ------------: |
| `/`             |             53 → 88 |      224 ms → 5 ms |      6.01s → 4.00s |                       554.9 → 306.7 |         44.7% |
| `/transactions` |             81 → 88 |       46 ms → 6 ms |      5.16s → 4.00s |                       502.6 → 310.3 |         38.3% |

JS transferido vem de `network-requests.transferSize` do Lighthouse e inclui overhead de transferência. Os tamanhos gzip da seção anterior usam compressão local dos corpos; as medidas têm definições diferentes.

### Todas as amostras

| Rota            | Notas antes  | Notas depois | TBT antes (ms)  | TBT depois (ms) |
| --------------- | ------------ | ------------ | --------------- | --------------- |
| `/`             | 51 / 53 / 53 | 87 / 88 / 88 | 257 / 224 / 214 | 10 / 5 / 4      |
| `/transactions` | 81 / 81 / 81 | 88 / 88 / 88 | 46 / 52 / 37    | 6 / 5 / 4       |

## Navegador e acessibilidade

- `/transactions` carrega zero scripts com Recharts ou Zod. A home carrega zero scripts com Zod antes da abertura do formulário.
- O modal de nova transação só é importado na primeira abertura; permanece montado depois para preservar o fluxo de fechamento e uploads. O teste usa um contexto novo, evitando resultado falso por cache do login.
- Cada gráfico usa React.lazy, Suspense e skeleton do DashboardWidget. Os widgets inferiores carregam na visibilidade (`rootMargin: 0px`) ou ao receber foco pelo teclado.
- Regiões nomeadas e focáveis permitem Tab → Atualizar → próximo gráfico. Captions e tabelas acessíveis continuam disponíveis após o carregamento.
- Ausência de IntersectionObserver tem fallback de renderização; falha de download de gráfico mostra aviso e oferece nova tentativa com importação nova.

## Validação final

- Testes, type-check e lint: 13/13 tarefas Turbo aprovadas em cada comando; lint com avisos legados e nenhum erro.
- Arquitetura: 477 módulos/1307 dependências, sem violações.
- Build de produção aprovado para os três apps, com migration 0007 aplicada no banco descartável.
- E2E de produção: 42/42 em Chromium e Firefox, incluindo sessão/inatividade da S2-07, CRUD, uploads, pesquisa, logout, downloads de gráficos, retry, Tab e formulário sob demanda.
- `git diff --check` sem erros; configurações pessoais continuam ignoradas.

## Revisão e decisões

- Revisão independente encontrou um problema importante de teclado e nenhum crítico ou menor. A regressão falhou antes da correção (tabIndex −1), passou depois, e a navegação real por Tab foi verificada nos dois navegadores.
- Medições e checklists estavam em andamento durante a revisão; a evidência final é esta execução do autor. O revisor manteve builds/testes desligados para preservar a medição e não revisou novamente o patch de teclado; ele foi validado pelas regressões e pela suíte completa.
- A remoção dos exports de valor de gráficos/formulários do barrel principal é o contrato previsto na S2-09. Os consumidores foram migrados; os três apps devem ser publicados na mesma versão para que um remote antigo não espere exports removidos do host.
- Fallbacks assíncronos emitidos são mantidos pelo Module Federation; a ausência de download foi comprovada na rede. Um futuro preload com categoria `all` poderia voltar a antecipá-los; a S2-08 usa `sync`.
- Comportamento anterior de datas no formulário e aliases legados foi preservado. A validação mantém uma fonte única para codec de URL e adapter Zod.
- Protótipos customizados e arrays esparsos não chegam às entradas HTTP de produção, normalizadas por URLSearchParams. A decisão preserva esse escopo; novos consumidores diretos devem manter validação equivalente.
- A inspeção da home encontrou o modal ainda estático; adiá-lo até a abertura foi necessário para cumprir a retirada do Zod do caminho inicial. Regressões de rede em contexto novo confirmam o corte e a abertura do formulário.

## Integração com S2-08

A branch da S2-08 continua separada. A simulação de merge detectou conflito em `apps/dashboard-mfe/src/presentation/Dashboard.tsx`: preservar os imports dos widgets lazy desta task e acrescentar `useEffect`/`markContentReady` da S2-08. O modal da home também passou a ser lazy nesta task; ao integrar, manter os handlers de preload e os marcadores da S2-08 junto da montagem condicional. O Shared deve conservar os novos helpers de prefetch/navigationTiming e os schemas fora do barrel principal. Repetir as medições do conjunto quando a S2-08 for integrada.

## Reprodução

Definir `DATABASE_URL`, `AUTH_SECRET` e `PERF_USER_PASSWORD` para um banco local descartável. Aplicar migrations e carregar 5.000 transações com `npm run db:seed-load -w @bytebank/shell` (PERF_COUNT=5000). Usar as mesmas credenciais e dados nos dois builds.

```bash
NEXT_PUBLIC_DASHBOARD_MFE_URL=http://localhost:3102/mf-manifest.json NEXT_PUBLIC_TRANSACTIONS_MFE_URL=http://localhost:3103/mf-manifest.json NEXT_PUBLIC_API_URL=/api LOCAL_UPLOADS_DIR=.uploads npm run build -w @bytebank/shell
MFE_ORIGIN=http://localhost:3102 npm run build -w @bytebank/dashboard-mfe
MFE_ORIGIN=http://localhost:3103 npm run build -w @bytebank/transactions-mfe
npx next experimental-analyze --output apps/shell
node scripts/perf/federation-graph.mjs
```

Servir shell/remote nas portas 3100/3102/3103, com AUTH_URL=http://localhost:3100 e o mesmo banco. Rodar o helper no checkout da task enquanto o baseline 5b7dd3e é servido; depois repetir com os apps desta branch:

```bash
node scripts/perf/lazy-loading.mjs before
node scripts/perf/lazy-loading.mjs after
```

Relatórios brutos, imagens e cookies ficam em `perf/s2-09/` e `.secrets/`, ignorados pelo Git. O JSON versionado contém apenas métricas, contagens e hashes.
