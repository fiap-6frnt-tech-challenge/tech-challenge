# Task 5 — Criar `apps/dashboard-mfe` (Rsbuild + Module Federation)

> ✅ **Status: Done**

|                        |                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md)                                   |
| **Owner**              | `Dev 3` (State & Integration)                                                                   |
| **Duração estimada**   | 1 dia                                                                                           |
| **Branch recomendada** | `dev3/create-dashboard-mfe`                                                                     |
| **Depende de**         | — (pode iniciar no dia 1; baseia-se no PoC validado no Sprint 0)                                |
| **PR só abre**         | Após `npm run dev -w @bytebank/dashboard-mfe` subir o MFE standalone em `:3002` com placeholder |

---

## Dependências

- **O que bloqueia esta tarefa**: Nada na Sprint 2. Reaproveita o setup do `hello-mfe` validado no Sprint 0 (Opção A — Rsbuild + `@module-federation/enhanced`).
- **O que esta tarefa desbloqueia**: Desbloqueia a **[Task 8 — Shell consome o `dashboard-mfe`](./08-shell-consume-mfe.md)** e, indiretamente, a **[Task 10 — Layout do Dashboard](./10-dashboard-layout-widgets.md)**.

---

## Contexto

Este é o primeiro MFE "de produto" da fase. Ele expõe `./Dashboard` via Module Federation e roda standalone em `:3002`. O shell o consome em runtime (Task 8). Compartilha singletons (`react`, `react-dom` e os pacotes `@bytebank/*`) para que store Redux e cache do React Query sejam **a mesma instância** entre shell e MFE.

> **Fallback Opção D:** Se o Sprint 0 tivesse acionado o fallback build-time, este MFE seria `packages/dashboard-mfe/` exportando `<Dashboard />`. Como a Opção A foi validada ([mfe-decision.md](../sprint-0/mfe-decision.md)), seguimos com remote Rsbuild.

---

## Pré-condições

- Estar na branch `dev3/create-dashboard-mfe`.
- `apps/hello-mfe` à mão como referência de configuração.
- Lembrar de adicionar o novo pacote ao `transpilePackages` do shell quando ele consumir pacotes `@bytebank/*` em TS cru (ver Gotcha 2).

---

## Implementação passo-a-passo

### 1. Scaffold do MFE

```bash
npm create rsbuild@latest apps/dashboard-mfe   # template React + TS
npm install @module-federation/enhanced @module-federation/rsbuild-plugin -w @bytebank/dashboard-mfe
```

### 2. `rsbuild.config.ts` (espelhar o `hello-mfe`)

```typescript
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'dashboard',
      exposes: {
        './Dashboard': './src/Dashboard.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        '@bytebank/design-system': { singleton: true, requiredVersion: false },
        '@bytebank/shared': { singleton: true, requiredVersion: false },
        '@bytebank/stores': { singleton: true, requiredVersion: false },
        '@bytebank/api-client': { singleton: true, requiredVersion: false },
      },
    }),
  ],
  server: { port: 3002 },
});
```

### 3. Tailwind v4 + tokens do DS

- Configurar PostCSS com `@tailwindcss/postcss` (mesmo do DS).
- Importar `tokens.css` e `globals.css` do `@bytebank/design-system` no entry para os tokens estarem disponíveis standalone.

### 4. Skeleton inicial (`apps/dashboard-mfe/src/Dashboard.tsx`)

```tsx
export default function Dashboard() {
  return <div className="p-lg">Dashboard placeholder</div>;
}
```

### 5. `package.json` do MFE

- `name: "@bytebank/dashboard-mfe"`, `private: true`.
- Workspace deps: `@bytebank/design-system`, `@bytebank/api-client`, `@bytebank/shared`, `@bytebank/stores`.
- Scripts: `dev` (`rsbuild dev`), `build` (`rsbuild build`), `lint`.

---

## Validação

- [x] `npm run dev -w @bytebank/dashboard-mfe` sobe o MFE em `http://localhost:3002` mostrando o placeholder.
- [x] `http://localhost:3002/mf-manifest.json` (ou `remoteEntry.js`) é servido corretamente.
- [x] `npm run build -w @bytebank/dashboard-mfe` gera o `remoteEntry.js` sem erros.
- [x] Importar `@bytebank/design-system` dentro do MFE renderiza um componente do DS standalone (prova de que os singletons resolvem).

---

## Gotchas

1. **Turbo build sob Bash falha** — usar `npm run build -w @bytebank/dashboard-mfe`, não `turbo run build` direto (ver memória de projeto `turbo-build-bash-limitation`).
2. **Shell precisa transpilar pacotes `@bytebank/*` em TS cru** — ao adicionar este MFE/pacotes ao shell, incluir no `transpilePackages` do `next.config.ts`, senão o `next build` quebra (memória `shell-transpile-raw-ts-packages`).
3. **`singleton: true` é obrigatório** para `react`, `react-dom` e `@bytebank/stores`/`@bytebank/api-client` — sem isso, shell e MFE teriam stores/caches divergentes (dois Reacts = "Invalid hook call").
4. **Porta `:3002` fixa** combina com o env `NEXT_PUBLIC_DASHBOARD_MFE_URL` que o shell usará na Task 8.

---

## Próximo passo

→ **Carregar o MFE no host com a [Task 8 — Shell consome o `dashboard-mfe`](./08-shell-consume-mfe.md).**
