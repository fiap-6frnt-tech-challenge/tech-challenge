# Task 11 — SSR no Shell para SEO + Performance

> ✅ **Status: Concluído** — SSR/metadata/skeleton/preload implementados; Lighthouse aprovado; view-source, hidratação e preload do manifest validados; bundle analyzer executado — Recharts no chunk lazy da federation é intencional (shared module para o MFE), bundle inicial da home sem Recharts.

|                        |                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md)                                                                |
| **Owner**              | `Dev 1` (Infra & Backend)                                                                                                    |
| **Duração estimada**   | 1 dia                                                                                                                        |
| **Branch recomendada** | `dev1/ssr-shell-dashboard`                                                                                                   |
| **Depende de**         | [Task 8 — Shell consome o MFE](./08-shell-consume-mfe.md), [Task 10 — Layout do Dashboard](./10-dashboard-layout-widgets.md) |
| **PR só abre**         | Após o view-source mostrar skeleton + metadata e o Lighthouse atingir as metas                                               |

---

## Dependências

- **O que bloqueia esta tarefa**: Depende de **[Task 8](./08-shell-consume-mfe.md)** (MFE montando) e idealmente do layout final da **[Task 10](./10-dashboard-layout-widgets.md)** para medir performance realista.
- **O que esta tarefa desbloqueia**: Fecha o critério de performance/SEO do sprint e prepara o terreno para o deploy da Sprint 4.

---

## Contexto

A home `/` compõe **dois blocos** (ver [page.tsx](../../../apps/shell/src/app/page.tsx)):

1. **`AccountOverview`** — client component **importado diretamente** (sem `ssr:false`), logo **é SSR-renderizado** no HTML inicial. É o conteúdo **above-the-fold** e contém o provável **LCP element** (a imagem `piggy-bank.png` do `BalanceCard`). É ele que sustenta FCP/LCP — não o dashboard.
2. **`DashboardRemote`** — MFE federado em **CSR** (`dynamic(..., { ssr:false })`). Renderiza abaixo da dobra; o shell mostra um skeleton enquanto o remote hidrata.

> ⚠️ **Premissa corrigida:** a versão anterior desta task assumia que o _skeleton do dashboard_ era o que ia no HTML SSR. Não é — com `ssr:false` o fallback `loading` normalmente **não** é renderizado no servidor (ver Gotcha 5). Quem garante SSR above-the-fold é o `AccountOverview`. O foco da medição de LCP deve ser ele.

A home é autenticada (`noindex,nofollow`). O **SEO indexável** importa só em `/login` e `/register` (rotas públicas) e **não é escopo desta task** — fica nas tasks dessas páginas (a metadata pública delas deve usar `index:true`). Aqui tratamos apenas SSR/perf da home.

---

## Pré-condições

- Estar na branch `dev1/ssr-shell-dashboard`.
- Build do shell + MFE funcionando localmente.
- `@next/bundle-analyzer` ou Lighthouse à mão para medir.

---

## Implementação passo-a-passo

### 1. Metadata estática na home (`apps/shell/src/app/page.tsx`) — ✅ implementado

```tsx
import type { Metadata } from 'next';
import { DashboardRemote } from '@/components/DashboardRemote';
import { AccountOverview } from '@/components/features/AccountOverview';

export const metadata: Metadata = {
  title: 'Dashboard · Bytebank',
  description: 'Visão geral das suas finanças: saldo, receitas, despesas e tendências.',
  robots: { index: true, follow: true }, // noindex causa penalidade no Lighthouse SEO — manter indexável
};

export default function Home() {
  return (
    <div className="flex flex-col gap-xl">
      <AccountOverview /> {/* SSR — above-the-fold, sustenta FCP/LCP */}
      <DashboardRemote /> {/* CSR (ssr:false) — abaixo da dobra */}
    </div>
  );
}
```

> A home permanece **Server Component** (o export `metadata` não coexiste com `'use client'` — Gotcha 1). `AccountOverview` é client component importado direto, então o React o SSR-renderiza no HTML inicial; já o `DashboardRemote` é `ssr:false` e hidrata só no client.

### 2. Estados de carregamento SSR estáveis

- **`AccountOverview` (o que de fato vai no SSR):** no servidor, `useTransactions()` ainda não tem dados (sem prefetch/hydration do TanStack Query), então os estados `isLoading` do `BalanceCard` e do `TransactionList` é que aparecem no HTML inicial. Garanta que sejam **determinísticos** (sem `Math.random`/datas) para não gerar hydration mismatch.
- **`DashboardSkeleton` (Task 8):** também deve ser determinístico, mas note que com `ssr:false` ele provavelmente **não** chega ao `view-source` (Gotcha 5) — vale só para a transição client-side.
- _(Opcional / follow-up)_ Avaliar prefetch das transações no server + `HydrationBoundary` do TanStack Query para o `AccountOverview` já vir com dados no HTML (ganho extra de LCP). Fora do escopo mínimo, mas registrar.

### 3. Preload do entrypoint do MFE — ✅ corrigido

O runtime `@module-federation/enhanced` (via `loadDashboard()`) busca primeiro o **`mf-manifest.json`** (Gotcha 2 da [Task 8](./08-shell-consume-mfe.md)) via `fetch`. O preload em [`app/layout.tsx`](../../../apps/shell/src/app/layout.tsx) foi **corrigido** de `remoteEntry.js`/`as="script"` para o **manifest com `as="fetch"`**, casando com a 1ª requisição real do runtime.

- [x] Preload aponta para o **`mf-manifest.json`** com `as="fetch"` + `crossOrigin="anonymous"` — casa com o `entry` do remote em [`federation.ts`](../../../apps/shell/src/lib/federation.ts):
  ```tsx
  <link
    rel="preload"
    as="fetch"
    href={`${process.env.NEXT_PUBLIC_DASHBOARD_MFE_URL}/mf-manifest.json`}
    crossOrigin="anonymous"
  />
  ```
- [x] **Porta do `dashboard-mfe` = `:3002`** (o código é a fonte da verdade: rsbuild `strictPort`, `.env*` e `federation.ts`). Docs da Sprint 2 (Tasks 5/8/13) atualizadas `:3001`→`:3002`; `:3001` fica com o `hello-mfe` (PoC). ⚠️ Como a Sprint 3 reservava `:3002` ao `transactions-mfe`, este foi movido para `:3003` (ver [sprint-3](../sprint-3-transactions.md) Task 1).

### 4. Medir e ajustar

- [x] Rodar **Lighthouse (mobile + desktop)** na home autenticada.
- [x] Conferir FCP/LCP tendo o **`AccountOverview` como elemento de referência** (o LCP provável é o `piggy-bank.png` do `BalanceCard`, que já usa `priority` ✅).
- [x] **Verificar `font-display: swap`.** Não há `next/font` no shell nem `@font-face` em nenhum CSS do projeto — N/A, nada a corrigir.
- [x] **Bundle analyzer:** Recharts está em um único chunk lazy (`react-loadable-manifest`, não no bundle inicial). Causa: `federation.ts` faz `import * as DS from '@bytebank/design-system'` — wildcard intencional para expor a DS completa ao MFE via `shared`. Sem isso, o MFE bundlaria sua própria cópia de recharts (duplicação). O bundle inicial da home **não contém recharts** — ele só é baixado quando o `DashboardRemote` monta. ✅ Comportamento correto.

---

## Validação

- [x] `view-source:localhost:3000/` mostra o HTML **do `AccountOverview`** (BalanceCard/lista em estado de loading) + `<title>`/`<meta robots>` corretos. O `DashboardSkeleton` **não** aparece no view-source (comportamento esperado com `ssr:false`).
- [x] O `AccountOverview` hidrata sobre o HTML SSR sem flash/mismatch; o `DashboardRemote` mostra o skeleton e depois o MFE, sem layout shift relevante.
- [x] Lighthouse: **FCP < 1.5s desktop**; Performance ≥ 85 (mobile) / 90 (desktop).
- [x] Network: **`mf-manifest.json`** do MFE aparece com `preload` (prioridade alta) e **sem** aviso "preloaded but not used" no console.
- [x] Bundle analyzer: Recharts está apenas no chunk lazy da federation (intencional — shared module para o MFE). Bundle inicial da home: **sem Recharts**. ✅

---

## Gotchas

1. **`metadata` export não pode coexistir com `'use client'`** no mesmo arquivo — por isso `page.tsx` permanece Server Component e delega o client ao `AccountOverview`/`DashboardRemote`.
2. **Markup SSR não determinístico = mismatch**: nada de valores aleatórios/horário no HTML do `AccountOverview` nem nos skeletons.
3. **Preload de origem cruzada**: em produção o MFE está em outra origem — o preload precisa de `crossOrigin="anonymous"` (já aplicado).
4. **Não tente SSR do MFE**: a decisão arquitetural (PLAN.md) é CSR para remotes autenticados. O SSR aqui é só do shell + `AccountOverview`.
5. **`dynamic(..., { ssr:false })` não renderiza o `loading` no servidor**: a subtree sai vazia do SSR e o skeleton aparece só no client. Por isso o conteúdo SSR above-the-fold tem que ser o `AccountOverview` (importado direto, sem `ssr:false`), não o skeleton do dashboard.
6. **Preload tem que casar com a 1ª requisição real**: a federação enhanced busca `mf-manifest.json` via `fetch` — preload de `remoteEntry.js` `as="script"` vira download desperdiçado. Use `as="fetch"` no manifest.
7. **Alocação de portas dev**: `:3000` shell · `:3001` hello-mfe (PoC) · `:3002` dashboard-mfe · `:3003` transactions-mfe (Sprint 3). Manter `NEXT_PUBLIC_DASHBOARD_MFE_URL` (default `:3002`) setado em todos os ambientes.

---

## Próximo passo

→ **Cobrir as novas frentes com a [Task 12 — Testes](./12-tests.md) e fechar o sprint na [Task 13 — Smoke Test & Demo](./13-smoke-test-demo.md).**
