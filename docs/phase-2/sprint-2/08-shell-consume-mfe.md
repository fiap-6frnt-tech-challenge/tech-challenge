# Task 8 — Shell consome o `dashboard-mfe` em `/` (Module Federation runtime)

> ⏳ **Status: Pending**

|                        |                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md)                                  |
| **Owner**              | `Dev 3` (State & Integration)                                                                  |
| **Duração estimada**   | 1 dia                                                                                          |
| **Branch recomendada** | `dev3/shell-consume-dashboard`                                                                 |
| **Depende de**         | [Task 5 — Criar `apps/dashboard-mfe`](./05-create-dashboard-mfe.md)                            |
| **PR só abre**         | Após `localhost:3000/` renderizar o MFE federado e o DevTools Network mostrar `remoteEntry.js` |

---

## Dependências

- **O que bloqueia esta tarefa**: Bloqueada pela **[Task 5](./05-create-dashboard-mfe.md)** — precisa do MFE expondo `./Dashboard` em `:3001`.
- **O que esta tarefa desbloqueia**: Desbloqueia a **[Task 10 — Layout do Dashboard](./10-dashboard-layout-widgets.md)** (o MFE passa a renderizar dentro do host) e a **[Task 11 — SSR no Shell](./11-ssr-shell.md)** (que otimiza esse carregamento).

---

## Contexto

O shell Next.js 16 consome o remote em **runtime** via `dynamic import`, seguindo o padrão validado no PoC do Sprint 0 (rota `/poc` + `RemoteHello`). A home `/` deixa de renderizar conteúdo local e passa a montar o `Dashboard` federado, com skeleton enquanto o remote carrega. O MFE roda em CSR (`ssr: false`) — aceitável porque a home é autenticada (`noindex`), conforme decisão no [PLAN.md](../PLAN.md).

---

## Pré-condições

- Estar na branch `dev3/shell-consume-dashboard`.
- MFE da Task 5 rodando em `:3001`.
- Revisar como o `next.config.ts` do shell registra o remote do PoC (`hello-mfe`) e replicar para `dashboard`.

---

## Implementação passo-a-passo

### 1. Registrar o remote no `next.config.ts` do shell

Adicione `dashboard` aos remotes do `@module-federation/enhanced` (espelhando a config do `hello-mfe`), parametrizando a URL por env:

```typescript
// next.config.ts (trecho)
remotes: {
  dashboard: `dashboard@${process.env.NEXT_PUBLIC_DASHBOARD_MFE_URL ?? 'http://localhost:3001'}/mf-manifest.json`,
},
```

- [ ] Adicionar `NEXT_PUBLIC_DASHBOARD_MFE_URL` ao `.env.example` e `.env.local`.
- [ ] Garantir que `@bytebank/dashboard-mfe` (e demais pacotes em TS cru) estejam em `transpilePackages`.

### 2. Wrapper client que carrega o MFE (`apps/shell/src/components/DashboardRemote.tsx`)

```tsx
'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@bytebank/design-system';

const Dashboard = dynamic(() => import('dashboard/Dashboard'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

function DashboardSkeleton() {
  return (
    <div className="grid gap-lg p-lg" aria-busy="true" aria-label="Carregando dashboard">
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
    </div>
  );
}

export function DashboardRemote() {
  return <Dashboard />;
}
```

### 3. Reescrever a home (`apps/shell/src/app/page.tsx`)

Mantém-se Server Component (para metadata/SEO via [Task 11](./11-ssr-shell.md)); o MFE entra pelo wrapper client:

```tsx
import { DashboardRemote } from '@/components/DashboardRemote';

export default function Home() {
  return <DashboardRemote />;
}
```

### 4. Tipos do remote (`apps/shell/src/types/remotes.d.ts`)

```typescript
declare module 'dashboard/Dashboard' {
  const Dashboard: React.ComponentType;
  export default Dashboard;
}
```

---

## Validação

- [ ] `localhost:3000/` (autenticado) renderiza o placeholder/Dashboard do MFE.
- [ ] DevTools → Network mostra o `remoteEntry.js`/`mf-manifest.json` vindo de `:3001`.
- [ ] DevTools → Components mostra **um único** React (singletons OK; sem "Invalid hook call").
- [ ] `npm run build -w @bytebank/shell` passa (transpilePackages correto).
- [ ] Derrubar o MFE (`:3001`) mostra o skeleton/fallback graceful, não uma tela branca quebrada.

---

## Gotchas

1. **`ssr: false` é obrigatório** para o Dashboard — Recharts e o remote são client-only; sem isso há hydration mismatch.
2. **`mf-manifest.json` vs `remoteEntry.js`**: o `@module-federation/enhanced` mais novo usa manifest. Confirme qual o MFE serve (Task 5) e aponte o remote para o arquivo correto.
3. **CORS do remote em produção**: em prod o MFE estará em outra origem; o deploy precisa liberar CORS no `remoteEntry`. Documentar para a Sprint 4; em dev `localhost` não bloqueia.
4. **Providers compartilhados**: o MFE assume que `QueryClientProvider`/`Provider store`/`SessionProvider` já estão no shell (estão, em `providers.tsx`). Não recriar providers dentro do MFE.

---

## Próximo passo

→ **Preencher o MFE com os widgets reais na [Task 10 — Layout do Dashboard + Widgets](./10-dashboard-layout-widgets.md)** e otimizar o carregamento na [Task 11 — SSR no Shell](./11-ssr-shell.md).
