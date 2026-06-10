# Task 8 — Shell consome o `dashboard-mfe` em `/` (Module Federation runtime)

> ✅ **Status: Done** — implementado e verificado em 2026-06-10. Federação via **runtime** Module Federation (ver _Implementação real_ no passo 1).

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

> ⚠️ **Implementação real:** o shell registra o remote em **runtime** via `@module-federation/enhanced/runtime` em [`apps/shell/src/lib/federation.ts`](../../../apps/shell/src/lib/federation.ts) (padrão validado no PoC), **não** em `next.config.ts` — o `next.config.ts` do shell não tem plugin de MF, então o snippet acima não se aplica e um `import('dashboard/Dashboard')` estático não resolveria. Foi adicionado o remote `dashboard` + a função `loadDashboard()`, e habilitados os singletons compartilhados (`@bytebank/design-system`, `@bytebank/shared`, `@bytebank/stores`, `@bytebank/api-client`) espelhando o `rsbuild.config.ts` do MFE — é o que satisfaz a gotcha #4 (providers do host).

- [x] `NEXT_PUBLIC_DASHBOARD_MFE_URL` adicionado ao `.env.example` e `.env.local`.
- [x] ~~`@bytebank/dashboard-mfe` em `transpilePackages`~~ — **N/A**: o shell carrega o MFE por HTTP em runtime, nunca importa o pacote como source; adicioná-lo quebraria a resolução. Os pacotes `@bytebank/*` que o shell de fato importa já estão em `transpilePackages`.

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

> ✅ **Implementação real:** o [`DashboardRemote.tsx`](../../../apps/shell/src/components/DashboardRemote.tsx) carrega o remote via `loadDashboard()` do `lib/federation.ts` (runtime) e envolve o `dynamic` num `MFErrorBoundary` (espelhando o `RemoteHello` do PoC) — é o que garante o fallback gracioso quando `:3001` cai, em vez de tela branca.

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

> ✅ **Implementação real:** declaração adicionada ao arquivo já existente [`apps/shell/src/types/federation.d.ts`](../../../apps/shell/src/types/federation.d.ts) (que já declarava `hello/Hello`), em vez de criar um `remotes.d.ts` novo — segue a convenção do repo.

---

## Validação

- [x] `localhost:3000/` (autenticado) renderiza o Dashboard do MFE — verificado via Playwright (badge "MFE :3001", heading "Dashboard" e botão do DS presentes).
- [x] Network mostra `mf-manifest.json` + chunks de federação (`dashboard.js`, `__federation_expose_Dashboard.js`) vindos de `:3001`.
- [x] **Um único** React — zero erros de console/page e nenhum "Invalid hook call"; os componentes do DS renderizam (React singleton OK).
- [x] `npm run build -w @bytebank/shell` passa (`/` sai como rota estática; `tsc --noEmit` e ESLint limpos).
- [x] Derrubar o MFE (`:3001`) mostra o fallback gracioso — card "Dashboard indisponível" via `MFErrorBoundary` dentro do AppShell, não tela branca.

---

## Gotchas

1. **`ssr: false` é obrigatório** para o Dashboard — Recharts e o remote são client-only; sem isso há hydration mismatch.
2. **`mf-manifest.json` vs `remoteEntry.js`**: o `@module-federation/enhanced` mais novo usa manifest. Confirme qual o MFE serve (Task 5) e aponte o remote para o arquivo correto.
3. **CORS do remote em produção**: em prod o MFE estará em outra origem; o deploy precisa liberar CORS no `remoteEntry`. Documentar para a Sprint 4; em dev `localhost` não bloqueia.
4. **Providers compartilhados**: o MFE assume que `QueryClientProvider`/`Provider store`/`SessionProvider` já estão no shell (estão, em `providers.tsx`). Não recriar providers dentro do MFE.

---

## Próximo passo

→ **Preencher o MFE com os widgets reais na [Task 10 — Layout do Dashboard + Widgets](./10-dashboard-layout-widgets.md)** e otimizar o carregamento na [Task 11 — SSR no Shell](./11-ssr-shell.md).
