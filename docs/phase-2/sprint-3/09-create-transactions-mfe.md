# Task 09 — Criar `apps/transactions-mfe` (Rsbuild + Module Federation)

|                        |                                                                               |
| ---------------------- | ----------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md)     |
| **Owner**              | Dev 3 (State & Integration)                                                   |
| **Duração estimada**   | 1 dia                                                                         |
| **Branch recomendada** | `dev3/create-transactions-mfe`                                                |
| **Depende de**         | — (pode iniciar no dia 1; espelha `apps/dashboard-mfe` já validado)           |
| **Desbloqueia**        | [Task 10 — Mover features + Shell wiring](./10-move-features-shell-wiring.md) |

---

## Contexto

Segundo MFE de produto da fase. Espelha o setup do `dashboard-mfe` (Rsbuild + `@module-federation/enhanced`, porta `:3003`). Expõe dois módulos:

- `./TransactionsPage` — página completa de listagem/filtros/paginação.
- `./AccountOverview` — widget de saldo + últimas transações + atalho "nova transação" que vive na home (`/`).

---

## Implementação

### 1. Scaffold

```bash
npm create rsbuild@latest apps/transactions-mfe   # template React + TS
npm install @module-federation/enhanced @module-federation/rsbuild-plugin -w @bytebank/transactions-mfe
```

### 2. `rsbuild.config.ts`

```ts
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'transactions',
      exposes: {
        './TransactionsPage': './src/TransactionsPage.tsx',
        './AccountOverview': './src/components/AccountOverview.tsx',
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
  server: { port: 3003 },
});
```

### 3. Tailwind v4 + tokens do DS

- Configurar PostCSS com `@tailwindcss/postcss`.
- Importar `tokens.css` e `globals.css` do `@bytebank/design-system` no entry.

### 4. Skeletons iniciais

`apps/transactions-mfe/src/TransactionsPage.tsx`:

```tsx
export default function TransactionsPage() {
  return <div className="p-lg">Transactions placeholder</div>;
}
```

`apps/transactions-mfe/src/components/AccountOverview.tsx`:

```tsx
export default function AccountOverview() {
  return <div className="p-lg">AccountOverview placeholder</div>;
}
```

### 5. `package.json`

```json
{
  "name": "@bytebank/transactions-mfe",
  "private": true,
  "scripts": { "dev": "rsbuild dev", "build": "rsbuild build", "lint": "eslint src" },
  "dependencies": {
    "@bytebank/design-system": "*",
    "@bytebank/api-client": "*",
    "@bytebank/shared": "*",
    "@bytebank/stores": "*"
  }
}
```

### 6. Registrar no shell

Em `apps/shell/next.config.ts`, adicionar:

- `NEXT_PUBLIC_TRANSACTIONS_MFE_URL` (env var, default `http://localhost:3003`)
- MF remote: `transactions@${process.env.NEXT_PUBLIC_TRANSACTIONS_MFE_URL}/mf-manifest.json`
- `transpilePackages`: verificar se `@bytebank/transactions-mfe` precisa entrar (apenas se importado em TS cru).

---

## Validação

- [ ] `npm run dev -w @bytebank/transactions-mfe` sobe em `http://localhost:3003`
- [ ] `http://localhost:3003/mf-manifest.json` é servido
- [ ] `npm run build -w @bytebank/transactions-mfe` gera `remoteEntry.js` sem erros
- [ ] Componente do DS renderiza corretamente standalone no `:3003`

---

## Gotchas

1. **Porta `:3003`** — `dashboard-mfe` já ocupa `:3002`; não conflitar.
2. **`singleton: true` obrigatório** em todos os `@bytebank/*` e em `react`/`react-dom` — sem isso, duas instâncias do Redux causam "hook invalid".
3. **`turbo run build` pode falhar sob Bash** — usar `npm run build -w @bytebank/transactions-mfe` (ver memória `turbo-build-bash-limitation`).
