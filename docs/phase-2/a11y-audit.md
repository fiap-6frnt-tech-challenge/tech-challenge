# Relatório de Auditoria de Acessibilidade — Phase 2

**Data:** 2026-07-06  
**Padrão alvo:** WCAG 2.1 AA  
**Commit avaliado:** `aadc8db`  
**Escopo:** `/login`, `/`, `/transactions`, Design System no Storybook

## Resumo Executivo

A auditoria combinou validação automatizada e revisão orientada por teclado. O Design System foi validado com Storybook addon a11y/axe, e as páginas reais foram auditadas com Lighthouse Accessibility em build local de produção com shell e MFEs ativos.

Resultado final:

- Lighthouse Accessibility: `100` nas três páginas críticas.
- Storybook a11y gate: `PASS`, com `a11y.test` configurado como `error` e 0 violations bloqueantes.
- Navegação por teclado: skip link global validado em `/login`, `/` e `/transactions`.
- Componentes críticos revisados: modais, formulário de transação, paginação, menu mobile, charts e mensagens de erro.

## Ferramentas e Método

| Área                         | Ferramenta                                         | Critério                                                 |
| ---------------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Componentes do Design System | `@storybook/addon-a11y` + axe via Storybook/Vitest | 0 violations bloqueantes                                 |
| Páginas reais                | Lighthouse Accessibility                           | Score >= 95                                              |
| Teclado                      | Tab / Option+Tab / Enter / Escape                  | Ordem lógica, foco visível, sem armadilhas fora de modal |
| Leitor de tela               | Checklist manual orientado por VoiceOver/NVDA      | Charts e erros de formulário expostos por texto/ARIA     |

## Scores Lighthouse — Accessibility

| Página          | Antes | Depois | URL final auditada                   | Status |
| --------------- | ----: | -----: | ------------------------------------ | ------ |
| `/login`        |   100 |    100 | `http://localhost:3000/login`        | PASS   |
| `/`             |   100 |    100 | `http://localhost:3000/`             | PASS   |
| `/transactions` |   100 |    100 | `http://localhost:3000/transactions` | PASS   |

> Observação: as rotas privadas foram auditadas com perfil Chromium autenticado. Durante a validação local, o Postgres não estava disponível para criar sessão via cadastro, então foi usado um JWT temporário Auth.js para o usuário seed `joana`, conforme registrado em [`a11y-lighthouse-notes.md`](./a11y-lighthouse-notes.md).

## Storybook Addon A11y

| Verificação                | Resultado                                                                       |
| -------------------------- | ------------------------------------------------------------------------------- |
| Storybook Vitest a11y gate | PASS: 43 files, 199 tests, 0 violations bloqueantes                             |
| Storybook build            | PASS                                                                            |
| Modo de gate               | `a11y.test` configurado como `error`                                            |
| Link publicado             | [Storybook/Chromatic](https://phase-1--69d58ff921fbab085884a584.chromatic.com/) |

Notas conhecidas do build:

- `No story files found for the specified pattern: stories/**/*.mdx`: esperado, o DS usa `.stories.tsx`.
- Warnings de `"use client"` ignorado pelo bundle Vite: esperado para componentes React client-side no Storybook.
- Warnings de chunk acima de 500 kB: aviso de bundle, não violation de acessibilidade.

## Correções Aplicadas

| Item                | Componente/Página                         | Correção                                                                                         | Evidência/PR                                                                            |
| ------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Skip link           | Shell global                              | Adicionado link “Pular para o conteúdo principal” apontando para `#main`, visível ao foco.       | [Task 08 PR #105](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/105) |
| Landmarks           | Shell, login, register, auth error        | `main` recebeu `id="main"` e `tabIndex={-1}` para destino do skip link.                          | [Task 08 PR #105](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/105) |
| Modais              | `Modal`                                   | `aria-labelledby` passou a usar `useId`, evitando IDs duplicados. Focus trap/Escape preservados. | [Task 08 PR #105](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/105) |
| Menu mobile         | `Header`                                  | Drawer recebeu semântica de dialog com focus trap e fechamento por Escape.                       | [Task 08 PR #105](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/105) |
| Erros de formulário | `HelperText`, `Select`, `TransactionForm` | Erros usam `role="alert"` e campos recebem `aria-describedby`/`aria-invalid`.                    | [Task 08 PR #105](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/105) |
| Paginação           | `Pagination`, `TransactionsPage`          | `nav` mantém `aria-label`, página atual usa `aria-current`, e troca de página expõe `aria-busy`. | [Task 08 PR #105](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/105) |
| Charts              | Dashboard MFE                             | Wrappers mantêm descrição acessível e preservam `AccessibleChartData` para leitores de tela.     | [Task 08 PR #105](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/105) |
| Storybook gate      | Design System                             | Addon a11y configurado como gate de erro; stories validadas via Vitest/Playwright.               | [Task 04 PR #101](https://github.com/fiap-6frnt-tech-challenge/tech-challenge/pull/101) |

## Navegação por Teclado

Fluxo validado:

1. Usuário acessa `/login`.
2. Primeiro foco via navegação completa de teclado alcança o skip link “Pular para o conteúdo principal”.
3. `Enter` move o foco para `main#main`.
4. Login segue para campos, links e botões em ordem visual coerente.
5. Em rotas autenticadas, o skip link evita repetir header/sidebar antes do conteúdo.
6. Modais prendem foco enquanto abertas e fecham com `Escape`.
7. Paginação em `/transactions` é operável por botões com nomes acessíveis e estado atual.

Nota para macOS/Chrome: dependendo da configuração do sistema, links podem exigir `Option+Tab` para entrar na navegação de teclado. O skip link continua presente e focável para usuários com navegação completa/leitores de tela.

## Charts Acessíveis

Os gráficos visuais são acompanhados por dados textuais/tabela alternativa via `AccessibleChartData`, permitindo que leitores de tela acessem a mesma informação exibida visualmente. O dashboard evita esconder a tabela alternativa ao agrupar gráfico e dados acessíveis, preservando a leitura estruturada.

## Itens Conhecidos / Fora de Escopo

| Item                                             | Justificativa                                               | Acompanhamento                                                |
| ------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------- |
| Link de Chromatic atual pode mudar por PR        | O README atual aponta para o Storybook publicado existente. | Task 13 deve revisar links finais de documentação.            |
| Smoke NVDA/VoiceOver depende de validação humana | Lighthouse/axe não substituem leitor de tela real.          | Registrar no PR se a validação manual final foi feita.        |
| Avisos de bundle no Storybook                    | Não são violations de acessibilidade.                       | Pode ser tratado em task de performance/bundle se necessário. |

## Como Reproduzir

### Storybook

```bash
npm run build-storybook --workspace @bytebank/design-system
```

### Lighthouse local

```bash
NEXT_PUBLIC_DASHBOARD_MFE_URL=http://localhost:3002/mf-manifest.json NEXT_PUBLIC_TRANSACTIONS_MFE_URL=http://localhost:3003/mf-manifest.json NEXT_PUBLIC_API_URL=/api npm run build
npm run preview --workspace @bytebank/dashboard-mfe
npm run preview --workspace @bytebank/transactions-mfe
AUTH_TRUST_HOST=true AUTH_URL=http://localhost:3000 npm run start --workspace @bytebank/shell
npx lighthouse http://localhost:3000/login --only-categories=accessibility --chrome-flags="--headless --no-sandbox"
npx lighthouse http://localhost:3000/ --only-categories=accessibility --chrome-flags="--headless --no-sandbox"
npx lighthouse http://localhost:3000/transactions --only-categories=accessibility --chrome-flags="--headless --no-sandbox"
```

## Referências

- [Task 04 — A11y Storybook](./sprint-4/04-a11y-storybook.md)
- [Task 08 — Lighthouse A11y](./sprint-4/08-a11y-lighthouse.md)
- [Notas Storybook A11y](./a11y-storybook-notes.md)
- [Notas Lighthouse A11y](./a11y-lighthouse-notes.md)
