# E2E Playwright

Esta suite cobre os fluxos criticos da aplicacao usando Playwright contra builds
de producao locais do shell e dos MFEs.

## Fluxo do zero

1. Instale o browser do Playwright, se ainda nao tiver feito isso nesta maquina:

```bash
npx playwright install chromium firefox
```

2. Garanta que o Postgres local esta rodando e com as migrations aplicadas.

3. Rode a suite:

```bash
npm run e2e
```

Esse e o comando principal para desenvolvimento local. Ele faz o ciclo completo:

- builda shell, dashboard-mfe e transactions-mfe;
- forca as URLs locais dos remotes no build do Next.js;
- sobe os tres apps localmente via Playwright;
- cria/limpa os dados E2E no banco;
- executa os specs em `e2e/`.

## Banco usado por padrao

Quando `DATABASE_URL` nao e informado, os testes usam:

```txt
postgres://bytebank:bytebank@localhost:5432/bytebank
```

Por isso, no ambiente local padrao, nao precisa prefixar o comando com
`DATABASE_URL`.

Use override apenas quando quiser apontar para outro banco:

```bash
DATABASE_URL=postgres://usuario:senha@localhost:5432/outro_banco npm run e2e
```

Importante: o setup dos testes remove e recria os dados do usuario E2E. Use um
banco local/descartavel, nunca uma base compartilhada com dados importantes.

## URLs locais dos apps

Durante o E2E, os apps rodam nestes enderecos:

- shell: `http://localhost:3000`
- dashboard-mfe: `http://localhost:3002/mf-manifest.json`
- transactions-mfe: `http://localhost:3003/mf-manifest.json`

O script `e2e:build` injeta essas URLs durante o build para evitar que valores
locais de `apps/shell/.env.local` sejam embutidos por engano no bundle de
producao do Next.js.

## Rodar sem rebuild

Use somente quando voce ja rodou o build e sabe que ele esta atualizado:

```bash
npm run e2e:test
```

Com outro banco:

```bash
DATABASE_URL=postgres://usuario:senha@localhost:5432/outro_banco npm run e2e:test
```

## Reutilizar servidores ja abertos

Por padrao, o Playwright sobe servidores novos para evitar usar processos
antigos nas portas locais.

Se voce quiser reutilizar servidores que ja estao rodando:

```bash
E2E_REUSE_SERVERS=1 npm run e2e:test
```

## Relatorio HTML

Depois de uma execucao, abra o relatorio com:

```bash
npm run e2e:report
```

## CI GitHub Actions

O workflow de CI roda a suite E2E em pull requests e pushes para `phase-2` e
`main`. O job sobe um Postgres descartavel, instala os browsers do Playwright,
aplica as migrations e executa:

```bash
npm run e2e
```

A suite roda os projetos `chromium` e `firefox`. Qualquer falha reprova o PR.

Depois da execucao, o GitHub Actions publica os artifacts
`playwright-report` e `playwright-test-results`, com relatorio HTML, traces,
screenshots e videos retidos quando houver falha.

## Troubleshooting

Se o Playwright reclamar que o browser nao esta instalado:

```bash
npx playwright install chromium firefox
```

Se algum servidor falhar por porta ocupada, encerre o processo antigo em
`3000`, `3002` ou `3003` e rode novamente.

Se aparecer erro de tabela inexistente, o banco local precisa receber as
migrations antes de rodar a suite.

No CI, se precisar investigar uma falha, abra a execucao do workflow no GitHub
Actions e baixe os artifacts `playwright-report` e `playwright-test-results`.
O relatorio HTML mostra o spec que falhou, e os test results guardam traces,
screenshots e videos quando gerados pelo Playwright.
