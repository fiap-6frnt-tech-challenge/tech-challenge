# Task 11 — SSR no Shell para SEO + Performance

> ⏳ **Status: Pending**

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

O MFE renderiza em CSR (`ssr: false`). Para garantir bom **LCP** e SEO mínimo, o **shell** faz SSR do esqueleto (skeleton + metadata) enquanto o MFE hidrata no client. A home `/` é autenticada (`noindex,nofollow`), então o SEO real importa só em `/login` e `/register`; ainda assim, o SSR do skeleton melhora a percepção de carregamento.

---

## Pré-condições

- Estar na branch `dev1/ssr-shell-dashboard`.
- Build do shell + MFE funcionando localmente.
- `@next/bundle-analyzer` ou Lighthouse à mão para medir.

---

## Implementação passo-a-passo

### 1. `generateMetadata` na home (`apps/shell/src/app/page.tsx`)

```tsx
import type { Metadata } from 'next';
import { DashboardRemote } from '@/components/DashboardRemote';

export const metadata: Metadata = {
  title: 'Dashboard · Bytebank',
  description: 'Visão geral das suas finanças: saldo, receitas, despesas e tendências.',
  robots: { index: false, follow: false }, // rota autenticada
};

export default function Home() {
  return <DashboardRemote />;
}
```

> A home é Server Component; o `DashboardRemote` (`'use client'`, `ssr:false`) renderiza o skeleton no servidor via a prop `loading` do `dynamic`. O skeleton vai no HTML inicial.

### 2. Skeleton SSR estável

Garanta que o `DashboardSkeleton` (da Task 8) seja **determinístico** (sem `Math.random`/datas) para não gerar hydration mismatch e para aparecer no `view-source`.

### 3. Preload do `remoteEntry.js`

No `app/layout.tsx` (ou via `next/head` na home), adicione um preload do manifest/remoteEntry para o browser começar a baixar o MFE cedo:

```tsx
<link
  rel="preload"
  as="script"
  href={`${process.env.NEXT_PUBLIC_DASHBOARD_MFE_URL}/remoteEntry.js`}
/>
```

(ajustar para `mf-manifest.json` conforme o que o MFE serve).

### 4. Medir e ajustar

- [ ] Rodar Lighthouse (mobile + desktop) na home.
- [ ] Conferir FCP/LCP; aplicar `priority` em imagens above-the-fold (logo) e `font-display: swap`.
- [ ] Bundle analyzer: confirmar que Recharts está só no bundle do MFE (code-split), não no shell.

---

## Validação

- [ ] `view-source:localhost:3000/` mostra o HTML do skeleton + `<title>`/`<meta>` corretos.
- [ ] O MFE hidrata sobre o skeleton sem flash/mismatch.
- [ ] Lighthouse: **FCP < 1.5s desktop**; Performance ≥ 85 (mobile) / 90 (desktop).
- [ ] Network: `remoteEntry.js`/manifest aparece com `preload` (prioridade alta).

---

## Gotchas

1. **`metadata` export não pode coexistir com `'use client'`** no mesmo arquivo — por isso `page.tsx` permanece Server Component e delega o client ao `DashboardRemote`.
2. **Skeleton não determinístico = mismatch**: nada de valores aleatórios/horário no markup SSR.
3. **Preload de origem cruzada**: em produção, o MFE está em outra origem — o preload pode precisar de `crossOrigin="anonymous"`. Documentar para a Sprint 4.
4. **Não tente SSR do MFE**: a decisão arquitetural (PLAN.md) é CSR para remotes autenticados. O SSR aqui é só do shell/skeleton.

---

## Próximo passo

→ **Cobrir as novas frentes com a [Task 12 — Testes](./12-tests.md) e fechar o sprint na [Task 13 — Smoke Test & Demo](./13-smoke-test-demo.md).**
