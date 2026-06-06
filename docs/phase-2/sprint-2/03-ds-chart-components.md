# Task 3 — Design System: Componentes de Gráfico + KpiCard + DashboardWidget

> ⏳ **Status: Pending**

|                        |                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md)                         |
| **Owner**              | `Dev 2` (DS & UI Pages)                                                               |
| **Duração estimada**   | 4 dias                                                                                |
| **Branch recomendada** | `dev2/ds-chart-components`                                                            |
| **Depende de**         | — (pode iniciar no dia 1, em paralelo)                                                |
| **PR só abre**         | Após os 5 componentes terem stories, passarem no a11y addon e publicarem no Chromatic |

---

## Dependências

- **O que bloqueia esta tarefa**: Nada. É **DS-first**: deve sair cedo para não bloquear a integração.
- **O que esta tarefa desbloqueia**: Desbloqueia a **[Task 10 — Layout do Dashboard + Widgets](./10-dashboard-layout-widgets.md)** (Dev 3). Entregue **1 componente por dia** (BarChart → LineChart → PieChart → KpiCard → DashboardWidget) para o Dev 3 integrar de forma incremental.

---

## Contexto

O Dashboard precisa de gráficos declarativos que respeitem os tokens do Design System. Usamos **Recharts** (decisão registrada no [PLAN.md](../PLAN.md)), que aceita cores via props — então alimentamos as cores a partir das CSS variables do DS (`var(--color-badge-deposit-bg)` etc.).

Cada componente segue o padrão do DS: pasta com `I{Name}.ts`, `{Name}.tsx`, `{Name}.stories.tsx`, `index.ts`, tokens DS, e acessibilidade (`role="img"` + `aria-label` descritivo nos gráficos).

---

## Pré-condições

- Estar na branch `dev2/ds-chart-components`.
- Storybook rodando: `npm run storybook -w @bytebank/design-system` (`:6006`).
- Instalar Recharts no DS:
  ```bash
  npm install recharts -w @bytebank/design-system
  ```

---

## Implementação passo-a-passo

> **Para cada componente:** `packages/design-system/src/components/{Name}/` com `I{Name}.ts`, `{Name}.tsx`, `{Name}.stories.tsx`, `index.ts`. Atualizar o barrel `packages/design-system/src/index.ts`. Stories cobrindo: **empty / loading / error / com dados / responsivo (mobile + desktop)**.

### 1. `BarChart` (dia 1)

- Props: `data`, `xKey`, `bars: Array<{ key: string; label: string; color: string }>`, `height?`.
- Caso de uso: receita vs despesa por mês.
- Cores via tokens: `var(--color-badge-deposit-bg)` (receita) e `var(--color-badge-withdraw-bg)` (despesa).
- Tooltip estilizado com tokens do DS; eixos com `formatCurrency` do `@bytebank/shared`.
- A11y: container com `role="img"` e `aria-label` que resume o gráfico (ex.: "Gráfico de barras de receita e despesa dos últimos 6 meses").

### 2. `LineChart` (dia 2)

- Props: `data`, `xKey`, `lines: Array<{ key; label; color }>`, `height?`.
- Caso de uso: evolução do saldo.
- Curva suavizada (`type="monotone"`), pontos com `aria-label`.

### 3. `PieChart` (dia 3)

- Props: `data: Array<{ label: string; value: number }>`, `colors?`, `height?`.
- Caso de uso: despesa por categoria (top 5 + "Outros").
- Legenda lateral acessível; cada segmento com rótulo.

### 4. `KpiCard` (dia 4, manhã)

- Props: `label`, `value`, `delta?`, `icon?`, `loading?`, `error?`.
- Usa o `Card` do DS como container; formata valores com `formatCurrency` do `@bytebank/shared`.
- `delta` positivo em verde, negativo em vermelho, com seta e `aria-label` ("variação de +R$ 200 vs mês anterior").
- Stories: positive delta / negative delta / no-delta / loading / error.

### 5. `DashboardWidget` (dia 4, tarde)

- Wrapper composable: `<DashboardWidget title loading error onRefresh>{children}</DashboardWidget>`.
- Header com título + botão de refresh (ícone) + status.
- Mostra `Skeleton` (já existe no DS) enquanto `loading`; `ErrorState` (já existe) interno quando `error`.
- Stories: loading / error / com children customizado.

### 6. Barrel export

```typescript
// packages/design-system/src/index.ts
export * from './components/BarChart';
export * from './components/LineChart';
export * from './components/PieChart';
export * from './components/KpiCard';
export * from './components/DashboardWidget';
```

---

## Validação

- [ ] Os 5 componentes aparecem no Storybook local com todos os states.
- [ ] `npm run lint -w @bytebank/design-system` sem erros.
- [ ] A11y addon do Storybook passa (sem violações) em todos os stories.
- [ ] Publicação no Chromatic aprovada (visual review).
- [ ] Charts renderizam cores derivadas dos tokens do DS (mude o tema e as cores acompanham).

---

## Gotchas

1. **Recharts + hydration**: Recharts mede o container no client. No MFE/SSR isso gera mismatch. Os componentes do DS devem ser puramente client (`'use client'`); o consumo no shell usa `dynamic(..., { ssr: false })` (tratado nas Tasks 8 e 11). Use `ResponsiveContainer` para evitar largura fixa.
2. **Tokens em props, não classes dinâmicas**: passe a cor como string (`getComputedStyle`/`var(--token)`), nunca monte classes Tailwind dinâmicas (`bg-${x}`) — elas não entram no build do CSS v4 (ver [tailwind-conventions](../../../.claude/tailwind-conventions.md)).
3. **`formatCurrency` é do shared**: não reimplemente formatação de moeda no DS; importe de `@bytebank/shared` (já existe em `lib/format.ts`).
4. **`aria-label` descritivo**: gráfico sem texto alternativo é inacessível para leitor de tela. Todo chart precisa de `role="img"` + `aria-label` que comunique a tendência, não só "gráfico".

---

## Próximo passo

→ **Integrar os componentes no MFE com a [Task 10 — Layout do Dashboard + Widgets](./10-dashboard-layout-widgets.md).**
