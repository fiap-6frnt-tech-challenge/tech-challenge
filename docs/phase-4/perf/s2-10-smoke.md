# S2-10 — Smoke do Sprint 2

**Data:** 20/10/2026 · **Resultado:** aprovado no ambiente local de produção.

**Código validado:** `de5d07c70a9414807c535b4973f4efbfd737bb9e` da `phase-4`, após os merges das tasks S2-01–09. Inclui também os anexos criptografados e a criptografia de dados pessoais já integrados nessa base. Esta entrega acrescenta testes, evidências e um ajuste na identificação de bundles da ferramenta de medição.

Task: [10-tests-smoke.md](../sprint-2-state-reactive/10-tests-smoke.md). Dados sanitizados: [s2-10-smoke.json](./s2-10-smoke.json).

## Ambiente e execução

- Worktree `s2-10-smoke`, branch `test/s2-10-smoke`, criada da base acima.
- Apple M4, macOS 27.0, Node 22.23.3, npm 10.9.9; Playwright em Chromium e Firefox.
- Builds reais: Next.js standalone na porta 3200, dashboard em 3202 e transações em 3203.
- PostgreSQL 16 descartável em `127.0.0.1:55440`, migrações até 0010; storage local exclusivo e chaves públicas de teste de `e2e/keys.ts`.
- `AUTH_MAX_FAILURES=5`, durações padrão do bloqueio, `HIBP_ENABLED=true`, inatividade padrão de 15 minutos. Turnstile sem credenciais no ambiente local.
- O relógio do navegador avança nos testes de inatividade; a revogação usa cookies locais de teste com a fronteira de cinco minutos vencida. As regras do servidor continuam reais.

## Matriz do roteiro

| Item            | Resultado | Evidência                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI              | ✅        | [CI da base, execução 39456787461](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/actions/runs/39456787461): ambos os jobs concluídos com sucesso, incluindo lint, arquitetura, tipos, build, testes, integração e E2E.                                                                                                                                                      |
| Qualidade local | ✅        | Testes, type-check e lint: 13/13 tarefas Turbo aprovadas em cada comando. Arquitetura: 499 módulos/1428 dependências, sem violações. Três builds de produção aprovados. Avisos legados de lint/Turbo, nenhum erro.                                                                                                                                                                        |
| Integração      | ✅        | 77/77 testes em oito arquivos, contra o PostgreSQL descartável.                                                                                                                                                                                                                                                                                                                           |
| Busca           | ✅        | Digitação rápida gera uma requisição; busca obsoleta é abortada; filtro de valor e URL permanecem sincronizados. Digitação de `supermercado` a 400 ms/tecla gera 11 requisições, uma por termo estável. `reactive-search.spec.ts`.                                                                                                                                                        |
| Upload lento    | ✅        | Três PDFs de 1 MiB; CDP com latência de 150 ms, upload de 128 KiB/s e download de 1 MiB/s. Estado inicial `uploading, uploading, queued`; barras visíveis por arquivo e progresso intermediário na UI e no Redux. Cancelar o primeiro gera `ERR_ABORTED`; os outros dois terminam e persistem. Máximo observado de dois ativos, três POSTs iniciados e um abort. `sprint2-smoke.spec.ts`. |
| Estado          | ✅        | Store real inspecionado pelo registro compartilhado de Module Federation: `ids/entities` normalizados; notificações FIFO; logout limpa Redux, queries e mutations do TanStack, aborta os uploads e impede trabalho pendente de repovoar dados. `redux-patterns.spec.ts`.                                                                                                                  |
| DevTools        | ✅        | Desabilitado no build de produção, conforme S2-04. A normalização foi inspecionada diretamente no store real; não foi aberta uma extensão Redux DevTools nesse build.                                                                                                                                                                                                                     |
| Cinco falhas    | ✅        | Quatro falhas deixam contador 1–4 e nenhum bloqueio; a quinta cria bloqueio e incrementa `lock_count`. O contador reinicia em zero para a próxima janela, conforme implementação. Senha correta é recusada durante o bloqueio com mensagem genérica na UI.                                                                                                                                |
| Senhas          | ✅        | HIBP range retorna 200 e confirma a senha pública de teste `password1234`; cadastro real pela UI retorna 422 e exibe a mensagem de senha vazada, nos dois navegadores. Senha curta é recusada; os testes de autenticação e do hasher cobrem custo bcrypt 12 e rehash.                                                                                                                     |
| Cadastro por IP | ✅        | Dez tentativas inválidas retornam 422; a seguinte retorna 429, mensagem genérica e `Retry-After: 3600`. IPs de documentação isolam os casos no ambiente local.                                                                                                                                                                                                                            |
| Sessões         | ✅        | Aviso aos 14 minutos, foco em continuar, renovação da atividade e logout aos 15 minutos; retorno pelo histórico sem dados privados. Logout global rejeita outra sessão; logout individual invalida cópia de cookie; refresh tardio não restaura login. Falhas de revogação não anunciam sucesso. `session-hardening.spec.ts`.                                                             |
| Preload         | ✅        | Ociosidade desligada no cenário para isolar hover. Um download de `TransactionsPage` e uma requisição da primeira página; nenhuma repetição no clique. Chromium e Firefox aprovados.                                                                                                                                                                                                      |
| Lazy loading    | ✅        | Transações sem scripts de Recharts/Zod; home sem Zod antes da intenção de abrir formulário. Gráficos inferiores carregam ao rolar/focar, tabelas acessíveis preservadas, retry de download funciona. `lazy-loading.spec.ts`.                                                                                                                                                              |
| Fase 2          | ✅        | Login, dashboard, criação, edição, exclusão, filtros e anexos. Novo CRUD pela UI confirma PATCH 200, DELETE 204 e ausência da transação após reload, nos dois navegadores.                                                                                                                                                                                                                |
| Marble tests    | ✅        | Pipelines de eventos, busca/filtros, fila de upload e inatividade cobertos por `TestScheduler` nas suítes existentes, todas aprovadas.                                                                                                                                                                                                                                                    |
| ADR-006         | ✅        | [0006-sessao-e-autenticacao.md](../adr/0006-sessao-e-autenticacao.md) presente na base, integrado pelo PR #187.                                                                                                                                                                                                                                                                           |

### Contagem dos E2E

1. Execução conjunta: **53 aprovados, um ignorado**, sem falhas ou testes instáveis. Contém os 44 casos de regressão e nove casos complementares aprovados.
2. Após acrescentar o CRUD completo, execução final do arquivo de smoke: **11 aprovados, um ignorado**, sem falhas ou testes instáveis. A revisão reforçou a espera por dados da lista após reload; esse refinamento foi revalidado em mais **2/2 casos CRUD**, nos dois navegadores.
3. Total de cenários distintos validados: **55 aprovados** (44 de regressão + 11 de smoke). O caso ignorado é exclusivamente a emulação CDP de rede lenta no Firefox, que não suporta essa API; ela foi executada no Chromium. Anexos, cancelamento no logout e demais fluxos continuam cobertos também no Firefox.

Os cenários complementares são opt-in com `SPRINT2_SMOKE=1`: dependem de HIBP externo e da política padrão de cinco falhas. A suíte comum permanece independente da disponibilidade desse serviço. Durante a preparação, foram corrigidos os próprios testes: consulta HMAC em Base64URL, contador reiniciado no bloqueio, seletor da mensagem de erro e entrada explícita do cursor no hover. Nenhuma correção de comportamento do aplicativo foi necessária.

## Performance do conjunto integrado

Lighthouse **12.8.2**, mobile com CPU simulada em 4x, três execuções por rota, 5.000 transações de usuário exclusivo. Seleção da melhor nota; empate preserva a primeira amostra, como na S2-09. Sessão autenticada verificada antes da medição; contextos sem cache, sem redirecionamento ou script com erro. O JSON contém todas as amostras.

| Medida                                 | Antes histórico `5b7dd3e` | Depois S2-09 `1cbb6ee` | Conjunto `de5d07c` |
| -------------------------------------- | ------------------------: | ---------------------: | -----------------: |
| Chunk do host de federação, gzip local |                 152,2 KiB |               48,1 KiB |       **48,4 KiB** |
| Home: JS transferido                   |                 554,9 KiB |              306,7 KiB |      **319,0 KiB** |
| Home: TBT                              |                    224 ms |                   5 ms |           **5 ms** |
| Home: nota                             |                        53 |                     88 |             **88** |
| Transações: JS transferido             |                 502,6 KiB |              310,3 KiB |      **355,4 KiB** |
| Transações: TBT                        |                     46 ms |                   6 ms |           **5 ms** |
| Transações: nota                       |                        81 |                     88 |             **87** |

Referência histórica: [S2-09](./s2-09-lazy-loading.md), com hashes e dados em seu JSON. As colunas antigas não foram medidas novamente; esta rodada verifica o conjunto integrado e não isola o efeito causal de cada task. Os bytes transferidos do Lighthouse incluem overhead; gzip local do chunk é uma medida separada.

| Rota       | Notas nas três execuções | TBT nas três execuções |
| ---------- | ------------------------ | ---------------------- |
| Home       | 87 / 88 / 88             | 22 / 5 / 4 ms          |
| Transações | 87 / 86 / 87             | 5 / 5 / 4 ms           |

A captura de rede atual confirma zero scripts de Recharts e Zod nas duas rotas antes de scroll/foco no formulário/gráfico. O preload ocioso da S2-08 está habilitado na medição: na home também baixa `TransactionsPage`; em Transações também baixa `AccountOverview` e `Dashboard`. Por isso os bytes incluem antecipação de outra rota. O aumento em relação à S2-09 isolada não equivale à volta das dependências pesadas.

A identificação do chunk na ferramenta foi adaptada ao marcador `mf:loadRemote`, introduzido pela S2-08. O identificador antigo dependia de uma mensagem de erro literal que passou a ser interpolada. Conferência nos assets reais: exatamente um chunk de **188.240 bytes raw / 49.576 bytes gzip**, em ambas as rotas. Os resultados de Lighthouse não foram alterados por essa correção de classificação.

### Intenção de navegação

| Navegador | Remote no hover / repetição no clique | Primeira página / repetição | loadRemote | Clique → lista |
| --------- | ------------------------------------- | --------------------------- | ---------: | -------------: |
| Chromium  | 1 / 0                                 | 1 / 0                       |     1,1 ms |       319,5 ms |
| Firefox   | 1 / 0                                 | 1 / 0                       |       7 ms |         330 ms |

São amostras funcionais sem throttling de rede para esse cenário. A comparação controlada anterior com Slow 4G continua em [S2-08](./s2-08-preload.md); não se devem comparar diretamente os tempos de condições diferentes.

## Reprodução

Em um banco local descartável, com portas padrão 3000/3002/3003 livres e navegadores Playwright instalados:

```bash
npm ci
export DATABASE_URL=postgres://bytebank:bytebank@localhost:55440/bytebank
npm run db:migrate -w @bytebank/shell
npm run test:integration -w @bytebank/shell
AUTH_MAX_FAILURES=5 HIBP_ENABLED=true SPRINT2_SMOKE=1 npm run e2e
```

`playwright.config.ts` fornece as chaves de teste ao servidor. Na execução registrada, os três apps foram compilados diretamente por workspace com URLs 3200/3202/3203; os servidores foram iniciados manualmente, usando as mesmas chaves de `e2e/keys.ts`, diretório absoluto de uploads e `E2E_REUSE_SERVERS=1`. Isso evita colisão com outros checkouts. `HIBP_ENABLED=true` e `AUTH_MAX_FAILURES=5` precisam estar definidos no servidor, além do processo que chama os testes.

Qualidade: `npm test`, `npx turbo run type-check`, `npm run lint`, `npm run arch:check`. Apenas o smoke complementar: `SPRINT2_SMOKE=1 npx playwright test e2e/sprint2-smoke.spec.ts` no mesmo ambiente.

Para performance, criar o usuário/carga com `apps/shell/src/db/seed-load.ts` (5.000 transações, chaves de teste exportadas e `--tsconfig apps/shell/tsconfig.scripts.json`). Servir os três builds e executar:

```bash
PERF_USER_PASSWORD='senha-local-do-usuario-de-carga' node scripts/perf/lazy-loading.mjs s210 http://localhost:3200
```

Relatórios completos, vídeos, cookies e capturas permanecem ignorados em `perf/`, `playwright-report/`, `test-results/` e `.secrets/`. O JSON versionado contém resultados, métricas e evidências selecionadas, sem credenciais ou cookies. Esta validação usa produção local; não substitui a verificação de um deploy externo com seus próprios serviços e configuração.

## Revisão

Revisão independente identificou três pontos nos testes: fallback de banco inconsistente, falta de assert de progresso visível e necessidade de esperar a lista com dados antes de verificar ausência após reload. Todos corrigidos e revalidados. Métricas e contagens foram conferidas na revisão; após as correções, nenhum bloqueio permaneceu.
