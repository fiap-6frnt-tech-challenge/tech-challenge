# S3-11 — Testes e smoke integrado

**Data:** 28/10/2026 · **Código de produto:** `d768f6fca031a13bbc3503f36b800a6d358a5066` (`phase-4`, após o merge da S3-10).

**Resultado:** roteiro local aprovado, com LCP mobile registrado. O gate de migração em preview com backup do Neon permanece pendente. Esta execução não autoriza declarar o ambiente externo validado.

[Task](../sprint-3-cache-security/11-tests-smoke.md) · [JSON sanitizado](./s3-11-smoke.json)

## Ambiente e alcance

Builds de produção dos três workspaces, Node 22.23.3/npm 10.9.9, Darwin arm64, Postgres 16 descartável na porta 55442. Shell/MFEs em 3400/3402/3403, chaves de teste de `e2e/keys.ts`, uploads em disco local cifrado e CSP em `enforce`. O banco recebeu as 13 migrations até `0012_mfa_totp.sql` a partir do zero.

Não foram utilizadas credenciais, dados ou storage de produção. HIBP externo ficou desabilitado. Os doze cenários opcionais da S2-10, que incluem HIBP real e rede lenta, não foram reexecutados nesta task; sua validação anterior está no [relatório da S2-10](./s2-10-smoke.md).

## Roteiro e evidências

| Item                   | Evidência                                                                                                                                                                                                    | Resultado                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI e segurança         | [CI do commit-base](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/actions/runs/40772336254) e [Security](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/actions/runs/40772336393) | Ambos `success`; Chromatic também aprovado                                                                                                                    |
| Anexos e PII           | `sprint3-smoke.spec.ts`, `attachment.spec.ts` e integração dos repositórios                                                                                                                                  | SQL contém PII e metadados cifrados; arquivo bruto sem assinatura PDF nem marcador em claro; decifragem independente e download reproduzem os bytes originais |
| Tipo de arquivo e dono | Anexo de executável disfarçado de PNG; download anônimo e por segunda conta                                                                                                                                  | 400, 401 e 404 respectivamente; DTO público contém somente a rota de download                                                                                 |
| Cache e SSR            | `http-cache.spec.ts`, `ssr-prefetch.spec.ts` e smoke complementar                                                                                                                                            | 304 real sem corpo; mutação altera ETag e conteúdo; SSR sem fetch duplicado da primeira página; duas contas isoladas e invalidação sem vazamento              |
| Borda                  | Headers da resposta, eventos `securitypolicyviolation`, relatórios CSP e três mutações cross-site                                                                                                            | Headers presentes, CSP em enforce com nonce e sem unsafe-eval; zero violações observadas no fluxo; POST/PATCH/DELETE retornam 403 sem mudar dados             |
| Estado e MFEs          | `optimistic-ui.spec.ts`, `transaction-flow.spec.ts` e link “Todas as transações”                                                                                                                             | Atualização otimista/rollback e fluxo de anexos aprovados; link entre MFEs preserva o documento, sem nova requisição de navegação                             |
| Regressão              | Login/logout, CRUD, filtros, busca, dashboard, anexos, sessões, cache, SSR e MFA                                                                                                                             | 72 E2Es aprovados em Chromium/Firefox; 12 opcionais desativados; zero falhas                                                                                  |

O smoke complementar tem três cenários em dois navegadores: seis aprovações. Depois do ajuste de limpeza para sempre tentar remover a transação, esses seis foram reexecutados e passaram novamente. `playwright.config.ts` agora exige CSP em `enforce` também quando o Playwright inicia o servidor na CI.

A prova SQL de PII usa a conta semeada pelo `globalSetup` através de `DrizzleUserRepository`; a regressão existente cobre cadastro/login. A prova de arquivo bruto usa `LocalFileStorage`, não uma chamada direta ao Vercel Blob. A observação explícita de CSP cobre login, home e a navegação para a lista de transações, não toda interação possível da aplicação. Em HTTP local foi conferida a presença do header HSTS; isso não valida a infraestrutura HTTPS externa.

## Qualidade local

- `npx turbo run test --force`: 13 tarefas e 1.225 testes unitários/stories aprovados.
- `npm run test:integration -w @bytebank/shell`: 92/92 testes aprovados em Postgres.
- `npm run lint`: 13 tarefas aprovadas, sem erros; avisos existentes de imports/navegação/imagens permanecem.
- `npx turbo run type-check --force`: 13 tarefas aprovadas. O smoke novo e o config do Playwright também passaram em verificação TypeScript estrita específica e ESLint.
- `npm run arch:check`: 563 módulos e 1.674 dependências, sem violações.
- Builds diretos de shell, dashboard e transactions aprovados, com os manifests locais corretos.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilidades.
- Semgrep 1.181.0 com os três conjuntos de regras da CI: 120 regras em 814 arquivos, zero achados.

## LCP mobile e SSR

Lighthouse 12.8.2, três navegações autenticadas com cache frio por rota, carga conhecida de **5.000 transações**, viewport 412 × 823/DPR 1,75 e throttling simulado: RTT de 150 ms, throughput de 1.638,4 Kbps e CPU 4×. A medição ocorreu após o fim dos testes, sem suítes concorrentes. O script confere sessão reconhecida, duração de sessão de até oito horas, rota final correta, ausência de erro de runtime e scripts carregados com sucesso.

| Rota       | LCP nas três amostras    | LCP mediano | Notas        | TBT mediano | JS transferido no Lighthouse |
| ---------- | ------------------------ | ----------: | ------------ | ----------: | ---------------------------: |
| Home       | 3.705 / 3.702 / 3.704 ms | **3,704 s** | 90 / 90 / 90 |       13 ms |                    301,4 KiB |
| Transações | 4.003 / 4.008 / 4.006 ms | **4,006 s** | 87 / 87 / 87 |        9 ms |                    340,8 KiB |

Na captura de rede separada, antes de abrir formulário ou rolar até gráficos, nenhuma das duas rotas carregou scripts de Recharts ou Zod. Os scripts capturados totalizaram 291,9 KiB gzip na home e 330,0 KiB gzip em transações. Esses valores são gzip local dos corpos JS, uma medida diferente dos bytes transferidos do Lighthouse; incluem o preload ocioso existente de outros remotes.

Os testes de SSR confirmam dados presentes no HTML e ausência de busca duplicada após montar os remotes, com isolamento entre contas. O LCP acima mede o produto integrado com esse prefetch habilitado. **Não foi executado um controle equivalente sem SSR/prefetch**, portanto não atribuímos uma diferença de LCP exclusivamente à S3-04. As referências históricas anteriores permanecem nos relatórios S2-09/S2-10; esta task registra as amostras atuais e não define um limite numérico de aprovação de LCP.

## Gate externo pendente

- [ ] Backup ou branch recuperável do Neon confirmado antes da migração.
- [ ] Migrations/backfill executados e conferidos em um preview com as configurações do ambiente externo.
- [ ] Anexo bruto conferido no Vercel Blob e aberto pela aplicação desse preview.

O projeto de deploy não está acessível pela conexão Vercel disponível e não há acesso ao banco/backup do ambiente. Aplicar DDL em um Postgres vazio local ou no serviço temporário da CI não comprova migração de dados preexistentes no preview. Nenhum comando foi executado contra Neon ou produção.

## Reprodução

Em um banco **descartável**, com dependências e navegadores Playwright instalados:

```bash
export DATABASE_URL=postgres://bytebank:bytebank@localhost:55442/bytebank
npm run db:migrate -w @bytebank/shell
npm run test:integration -w @bytebank/shell
npm run e2e
```

O comando padrão recompila e sobe os apps em 3000/3002/3003. Para repetir somente os cenários novos depois de compilar: `npx playwright test e2e/sprint3-smoke.spec.ts`. Na execução registrada, os builds foram feitos por workspace com URLs 3400/3402/3403; os servidores foram iniciados manualmente com as chaves de `e2e/keys.ts`, `AUTH_MAX_FAILURES=5`, `HIBP_ENABLED=false`, `CSP_MODE=enforce`, `LOCAL_UPLOADS_DIR` absoluto e `BLOB_READ_WRITE_TOKEN` vazio. Os testes receberam as URLs equivalentes em `E2E_BASE_URL`, `E2E_DASHBOARD_MFE_URL`, `E2E_TRANSACTIONS_MFE_URL` e `E2E_REUSE_SERVERS=1`.

Para performance, exportar as mesmas chaves de teste, `DATABASE_URL` e uma `PERF_USER_PASSWORD` exclusiva do banco descartável; iniciar os três builds e executar:

```bash
PERF_COUNT=5000 npm run db:seed-load -w @bytebank/shell
node scripts/perf/lazy-loading.mjs s311 http://localhost:3400
```

O seed existente imprime a senha de teste; mantenha sua saída somente em log local ignorado. Nesta execução, ela foi gerada aleatoriamente e não entrou nos arquivos versionados. O script de performance reaproveitado grava os relatórios brutos em `perf/s2-09/s311/`; o nome da pasta é histórico da ferramenta. Cookies, relatórios completos e capturas permanecem em caminhos ignorados. Somente este relatório e o JSON sanitizado são versionados.

## Revisão das evidências

Revisão independente conferiu os seis Lighthouse brutos contra o JSON sanitizado, logs de testes, condições, rotas finais, medianas e unidades. Sem bloqueadores restantes; ajuste de limpeza dos testes aplicado e revalidado. Cookies e senha do banco de teste não constam dos arquivos versionáveis.
