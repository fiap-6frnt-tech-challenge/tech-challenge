# Task 6 — PoC Module Federation (Opção A: Rsbuild + `@module-federation/enhanced`)

|                          |                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**               | [Sprint 0 — Foundation](../sprint-0-foundation.md)                                                                                        |
| **Owners**               | `dev4-dashboard` (remote) + `dev5-transactions` (shell consumer) — em paralelo                                                            |
| **Duração estimada**     | 3 dias (timebox rigoroso)                                                                                                                 |
| **Branch compartilhada** | `phase-2/dev4+5/poc-module-federation` (ambos devs commitam aqui)                                                                         |
| **Depende de**           | [Bundle Tasks 1+2](./02-migrate-shell.md) mergeado (recomendável também ter Task 4 DS, mas não obrigatório — pode usar React puro no PoC) |
| **Desbloqueia**          | Sprint 2 (`dashboard-mfe`) e Sprint 3 (`transactions-mfe`) — copiam o padrão validado aqui                                                |
| **Gate de decisão**      | [Task 7 — Gate decisório](./README.md) no **dia 5 do Sprint 0**                                                                           |

> ⚠️ **Esta é a task de maior risco do Sprint 0.** Se falhar, aciona fallback automático para [opção D](#fallback-opção-d) (build-time MFE via workspace packages). Documentar resultado vai pra `docs/phase-2/mfe-decision.md`.

---

## Contexto

A spec da Fase 2 exige **microfrontends com Module Federation ou Single SPA**. A [decisão arquitetural do PLAN.md](../PLAN.md#decisão-module-federation--opção-a-final) foi Opção A: shell Next.js 16 App Router + remotes Rsbuild/Rspack com `@module-federation/enhanced`.

O risco: `@module-federation/nextjs-mf` (plugin original) **não suporta Next 16 App Router**. Precisamos validar que a integração `Next 16 + Rsbuild remote` funciona de ponta a ponta antes de comprometer Sprints 2 e 3 nessa arquitetura. Esta task é o PoC que valida (ou refuta) essa decisão.

### A pergunta que estamos respondendo

> "Conseguimos carregar um componente React federado de um app Rsbuild dentro de um shell Next.js 16 App Router, em runtime, com React/DS singletons compartilhados, hot reload funcional, e build de produção verde?"

Se sim → seguimos Opção A; Sprints 2/3 usam esse padrão.
Se não, e fallback é necessário → aplicamos [Opção D](#fallback-opção-d) (workspace packages build-time).

### O que NÃO é objetivo

- Implementar o dashboard ou transactions MFE (Sprints 2 e 3)
- SSR de remotes (decidido: remotes são CSR; ver [PLAN.md](../PLAN.md#decisão-module-federation--opção-a-final))
- Otimizações de performance (lazy chunks, preload) — fica para Sprint 4
- Auth entre shell e remote — Sprint 1

## Arquitetura validada pelo PoC

```
┌──────────────────────────────────────────────────────────────┐
│ apps/shell (Next.js 16 App Router) — :3000                   │
│                                                              │
│  src/app/poc/page.tsx ('use client')                         │
│    └── <RemoteHello />                                       │
│         └── dynamic(() => loadHello(), { ssr: false })       │
│              └── @module-federation/enhanced/runtime         │
│                   └── loadRemote('hello/Hello')              │
│                        ⇣ HTTP                                │
└──────────────────────────────────────────────────────────────┘
                              ⇣
                              ⇣ http://localhost:3001/mf-manifest.json
                              ⇣
┌──────────────────────────────────────────────────────────────┐
│ apps/hello-mfe (Rsbuild + React 19) — :3001                  │
│                                                              │
│  src/Hello.tsx                                               │
│    import { Button, Badge } from '@bytebank/design-system'   │
│    export default function Hello() { ... }                   │
│                                                              │
│  rsbuild.config.ts:                                          │
│    pluginModuleFederation({                                  │
│      name: 'hello',                                          │
│      exposes: { './Hello': './src/Hello' },                  │
│      shared: { react, react-dom, design-system, shared }     │
│    })                                                        │
└──────────────────────────────────────────────────────────────┘

Singletons compartilhados (1 instância na árvore):
  - react, react-dom (críticos — evita "two Reacts" bug)
  - @bytebank/design-system, @bytebank/shared (workspace deps)
```

## Pré-condições

- [ ] Bundle Tasks 1+2 mergeado em `phase-2` (`apps/shell/` operacional)
- [ ] **Recomendado:** Tasks 3 e 4 também mergeadas (DS extraído) — o PoC valida `@bytebank/design-system` consumido pelo remote. Se ainda não estiverem, dá pra fazer com React puro e validar DS depois.
- [ ] Tasks 6 começa **logo no dia 1 do Sprint 0** em paralelo com Tasks 1-5 — `dev4-dashboard` e `dev5-transactions` não esperam o monorepo migrar; trabalham em branch própria e fazem rebase quando necessário
- [ ] Branch compartilhada criada (uma só, ambos devs commitam):
  ```bash
  git checkout phase-2 && git pull origin phase-2
  git checkout -b phase-2/dev4+5/poc-module-federation
  git push -u origin phase-2/dev4+5/poc-module-federation
  ```
- [ ] Pair session de kickoff de 1h (dia 1 manhã) — alinhar API entre Tracks A e B
- [ ] Daily check-ins ao fim de cada dia (3 daily standups durante o PoC)

## Plano de 3 dias

### Dia 1 — Stubs + branches independentes

| Quem                            | O quê                                                                                                                                | Saída esperada                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Track A** (dev4-dashboard)    | Criar `apps/hello-mfe` Rsbuild template; configurar `pluginModuleFederation`; criar `Hello.tsx` mínimo (sem DS)                      | `npm run dev -w @bytebank/hello-mfe` sobe `:3001` com manifest acessível                                |
| **Track B** (dev5-transactions) | Adicionar `@module-federation/enhanced` runtime no shell; criar `src/lib/federation.ts`; criar route `/poc` com placeholder dinâmico | `localhost:3000/poc` renderiza placeholder "Carregando MFE..." e tenta fetchar `:3001/mf-manifest.json` |
| **Daily fim do dia**            | Compartilhar URLs, conferir CORS, listar bloqueios                                                                                   | Decidir: dia 2 conecta as duas pontas?                                                                  |

### Dia 2 — Conexão runtime + singletons

| Quem                 | O quê                                                                                                                                          | Saída esperada                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Track A**          | Atualizar `Hello.tsx` para usar `@bytebank/design-system` (Button + Badge); declarar DS como `shared` no MF config                             | Hello renderiza em isolation (`:3001`) com tokens do DS aplicados                       |
| **Track B**          | Configurar `init()` do MF runtime no shell para apontar para remote `:3001`; finalizar `loadRemote('hello/Hello')`; verificar singletons React | `localhost:3000/poc` renderiza `<Hello />` do remote com mesmos tokens visuais do shell |
| **Daily fim do dia** | DevTools Network: mostrar `mf-manifest.json` carregado; DevTools React: árvore única                                                           | **Critério de avanço:** componente federado aparece visualmente correto no shell        |

### Dia 3 — Polimento + validação de produção

| Quem               | O quê                                                                                                                                             | Saída esperada                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Ambos**          | Build de produção em ambos apps (`npm run build`); testar `npm start` no shell apontando para `npm preview` do hello-mfe                          | Build prod passa em ambos; render igual em prod                          |
| **Ambos**          | Deploy preview Vercel — shell + hello-mfe deployed em projetos separados                                                                          | Shell prod consumindo hello-mfe prod via URL pública                     |
| **Ambos**          | Preencher [matriz de validação](#matriz-de-validação) abaixo; commitar evidências (screenshots, logs) em `docs/phase-2/sprint-0/poc-mf-evidence/` | Matriz 100% verde → seguir para PR; qualquer ❌ → escalar pro Gate dia 5 |
| **Final do dia 3** | Abrir PR único cobrindo ambas tracks (mesma branch)                                                                                               | PR aguarda merge na `phase-2`                                            |

## Track A — Setup do remote `hello-mfe` (Rsbuild)

> **Owner:** `dev4-dashboard`

### A1. Bootstrap Rsbuild

```bash
cd tech-challenge

# Cria app a partir do template oficial
npm create rsbuild@latest apps/hello-mfe -- --template react-ts

# Renomear no package.json
# "name": "hello-mfe" → "name": "@bytebank/hello-mfe"
```

Edite `apps/hello-mfe/package.json` ajustando name e workspace deps:

```json
{
  "name": "@bytebank/hello-mfe",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "rsbuild dev",
    "build": "rsbuild build",
    "preview": "rsbuild preview",
    "lint": "eslint src",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@bytebank/design-system": "*",
    "@bytebank/shared": "*",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@module-federation/enhanced": "^0.16.0",
    "@module-federation/rsbuild-plugin": "^0.16.0",
    "@rsbuild/core": "^1.4.0",
    "@rsbuild/plugin-react": "^1.4.0",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5"
  }
}
```

> **Versões:** confirme as latest no `npm view @module-federation/rsbuild-plugin version` antes de instalar. Os números aqui são placeholders prováveis para a janela 2026-05.

### A2. Configurar `rsbuild.config.ts`

```ts
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'hello',
      filename: 'remoteEntry.js',
      manifest: { filePath: '', fileName: 'mf-manifest.json' },
      exposes: {
        './Hello': './src/Hello.tsx',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^19.0.0',
          eager: false,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^19.0.0',
          eager: false,
        },
        '@bytebank/design-system': {
          singleton: true,
          requiredVersion: '*',
        },
        '@bytebank/shared': {
          singleton: true,
          requiredVersion: '*',
        },
      },
    }),
  ],
  server: {
    port: 3001,
  },
  // CORS para o shell consumir em dev
  dev: {
    setupMiddlewares: [
      (middlewares) => {
        middlewares.unshift((_req, res, next) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', '*');
          next();
        });
      },
    ],
  },
});
```

**Pontos críticos:**

- **`singleton: true`** em `react`, `react-dom`, `@bytebank/design-system`, `@bytebank/shared` — garante 1 instância na árvore (sem dupla árvore React)
- **`requiredVersion: '*'`** para workspace deps — evita warning de version mismatch entre dev e prod
- **CORS em dev** — `:3001` precisa permitir cross-origin do `:3000`. Em prod, configurar via Vercel headers ou nginx.
- **`mf-manifest.json`** — Module Federation v2 usa manifest (mais robusto que `remoteEntry.js` legado). Runtime auto-detecta.

### A3. Criar `apps/hello-mfe/src/Hello.tsx`

```tsx
import { Button, Badge } from '@bytebank/design-system';
import { formatCurrency } from '@bytebank/shared';

export default function Hello() {
  return (
    <div className="flex flex-col gap-lg p-lg border border-border rounded-default bg-surface">
      <h2 className="heading">👋 Hello from MFE (port 3001)</h2>
      <p className="body-default">
        Federado em runtime via Module Federation. Consumindo Design System tokens:
      </p>
      <div className="flex gap-md items-center">
        <Button variant="primary" onClick={() => alert('clicked from MFE!')}>
          Clique aqui
        </Button>
        <Badge variant="income" size="md">
          Depósito
        </Badge>
        <span className="body-semibold">{formatCurrency(1500)}</span>
      </div>
    </div>
  );
}
```

**O que isso valida:**

- Workspace dep `@bytebank/design-system` é consumida pelo Rsbuild (transpila TS source)
- Tokens DS (`p-lg`, `bg-surface`, `heading`) aplicam corretamente (Tailwind v4 + tokens)
- `formatCurrency` de `@bytebank/shared` funciona
- `onClick` funciona (evento dispara no host shell — sem dupla árvore React)

### A4. Storybook? (Não nesta task)

Hello-mfe é descartável após o PoC. Sem stories. Sprint 2 (`dashboard-mfe`) que faz isso.

### A5. Validação local do remote isolado

```bash
npm install   # da raiz, resolve workspace
npm run dev -w @bytebank/hello-mfe

# Em outro terminal:
curl http://localhost:3001/mf-manifest.json | head -20
# Esperado: JSON com {"name":"hello","exposes":[{"id":"./Hello",...}]}

curl -I http://localhost:3001/static/js/async/__federation_expose_Hello.js
# Esperado: 200 OK (chunk do exposed module)
```

Abrir `http://localhost:3001` no browser:

- Deve mostrar o `<Hello />` renderizado em standalone (Rsbuild auto-monta um root)
- Tokens DS aplicados (cores roxo `#6841f2`, fonte Inter)

## Track B — Setup do shell consumindo o remote (Next.js 16)

> **Owner:** `dev5-transactions`

### B1. Instalar runtime no shell

```bash
npm install @module-federation/enhanced -w @bytebank/shell
```

> **Não** instale `@module-federation/nextjs-mf` — ele não suporta App Router. Vamos usar o runtime API direto, bypassando o plugin de webpack/turbopack.

### B2. Criar `apps/shell/src/lib/federation.ts`

```ts
'use client';

import { init, loadRemote } from '@module-federation/enhanced/runtime';

let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;
  init({
    name: '@bytebank/shell',
    remotes: [
      {
        name: 'hello',
        entry: process.env.NEXT_PUBLIC_HELLO_MFE_URL ?? 'http://localhost:3001/mf-manifest.json',
      },
    ],
    shared: {
      react: {
        version: '19.2.3',
        scope: 'default',
        lib: () => import('react'),
        shareConfig: { singleton: true, requiredVersion: '^19.0.0' },
      },
      'react-dom': {
        version: '19.2.3',
        scope: 'default',
        lib: () => import('react-dom'),
        shareConfig: { singleton: true, requiredVersion: '^19.0.0' },
      },
    },
  });
}

export async function loadHello() {
  ensureInit();
  const mod = await loadRemote<{ default: React.ComponentType }>('hello/Hello');
  if (!mod) throw new Error('Failed to load remote hello/Hello');
  return mod.default;
}
```

**Por que esta abordagem (runtime API)?**

- **Não depende de webpack/turbopack plugin** — funciona em qualquer bundler
- **App Router compatible** — runtime é puro client-side, integra com `dynamic(..., { ssr: false })`
- **Singletons declarados explicitamente** — React/ReactDOM do shell são compartilhados via `lib: () => import(...)`

### B3. Criar wrapper `apps/shell/src/components/RemoteHello.tsx`

```tsx
'use client';

import dynamic from 'next/dynamic';

const RemoteHello = dynamic(
  async () => {
    const { loadHello } = await import('@/lib/federation');
    const Hello = await loadHello();
    return { default: Hello };
  },
  {
    ssr: false,
    loading: () => <div className="p-lg border border-border rounded-default">Carregando MFE…</div>,
  }
);

export { RemoteHello };
```

### B4. Criar rota temporária `/poc` no shell

`apps/shell/src/app/poc/page.tsx`:

```tsx
import { RemoteHello } from '@/components/RemoteHello';

export default function PoCPage() {
  return (
    <div className="flex flex-col gap-xl p-xl">
      <h1 className="heading">PoC Module Federation</h1>
      <p className="body-default text-content-secondary">
        Este componente abaixo é carregado em runtime do app <code>hello-mfe</code> rodando em{' '}
        <code>:3001</code>:
      </p>
      <RemoteHello />
    </div>
  );
}
```

> **Nota:** esta rota é **descartável**. Será removida após o PoC validar — Sprint 2 substitui pelo `dashboard-mfe` consumido em `/`.

### B5. Env vars (opcional para dev local)

`apps/shell/.env.local` ganha:

```
NEXT_PUBLIC_HELLO_MFE_URL=http://localhost:3001/mf-manifest.json
```

> Em prod (Vercel preview/production), apontar para a URL deployada do `hello-mfe`.

### B6. Configurar TypeScript para módulos remotos

Crie `apps/shell/src/types/federation.d.ts`:

```ts
declare module 'hello/Hello' {
  const Hello: React.ComponentType;
  export default Hello;
}
```

> Sem isso, TS reclama de "Cannot find module 'hello/Hello'" no `dynamic(import('hello/Hello'))`. Embora estejamos usando `loadRemote` (string), o type declaration ajuda intellisense futuro.

### B7. Atualizar `apps/shell/next.config.ts`

Garantir que workspace deps são transpiladas (deveria já estar das Tasks 3/4):

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@bytebank/design-system', '@bytebank/shared'],
  experimental: {
    optimizePackageImports: ['@hookform/resolvers', 'lucide-react'],
  },
};

export default nextConfig;
```

> **Não** precisa adicionar `@module-federation/enhanced` em `transpilePackages` — ele é uma dep regular Node/ESM.

## Integração + validação final (Dia 3)

### I1. Subir os dois apps em paralelo

```bash
# Terminal 1
npm run dev -w @bytebank/hello-mfe

# Terminal 2
npm run dev -w @bytebank/shell

# Abrir http://localhost:3000/poc
```

### I2. Matriz de validação

Preencher esta matriz no PR (copiar/colar com ✅/❌):

| #   | Critério                                                                      | Como validar                                                                                                  | Status |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | `hello-mfe` sobe em `:3001`                                                   | `curl http://localhost:3001/mf-manifest.json` retorna JSON com `exposes`                                      | ⬜     |
| 2   | Shell sobe em `:3000` e route `/poc` carrega                                  | Browser → home renderiza, navegar pra `/poc`                                                                  | ⬜     |
| 3   | `<RemoteHello />` aparece dentro do shell                                     | Componente Hello (com Button + Badge) renderiza em `localhost:3000/poc`                                       | ⬜     |
| 4   | DevTools Network: `mf-manifest.json` carregado                                | Aba Network filtrada por `mf-manifest` mostra 200 OK                                                          | ⬜     |
| 5   | DevTools Network: chunks remotos carregados                                   | Filtro `__federation_expose_Hello` mostra JS chunk 200 OK                                                     | ⬜     |
| 6   | DevTools React: árvore única (sem duplicação)                                 | React DevTools → root → Hello aparece como filho normal; sem segunda root                                     | ⬜     |
| 7   | Singletons React: `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` aponta para 1 React | DevTools Console: `[...document.querySelectorAll('*')].filter(n => n._reactRootContainer)` retorna 1 elemento | ⬜     |
| 8   | Tokens DS aplicados igualmente                                                | Hello no shell e em standalone (`:3001`) com mesmos `#6841f2`, fonte Inter                                    | ⬜     |
| 9   | `onClick` no botão do remote funciona                                         | Clicar "Clique aqui" → alert dispara                                                                          | ⬜     |
| 10  | Hot reload no remote reflete no shell                                         | Editar texto em `Hello.tsx` → shell atualiza sem reload manual em `<5s`                                       | ⬜     |
| 11  | `npm run build -w @bytebank/hello-mfe` passa                                  | Comando termina código 0; gera `dist/` com `mf-manifest.json`                                                 | ⬜     |
| 12  | `npm run build -w @bytebank/shell` passa                                      | Comando termina código 0; produz `.next/`                                                                     | ⬜     |
| 13  | Build de produção integra                                                     | `npm run preview -w hello-mfe` + `npm start -w shell` → `/poc` renderiza correto                              | ⬜     |
| 14  | Deploy Vercel preview verde                                                   | Shell + hello-mfe deployed em 2 projetos Vercel; shell consome via URL pública                                | ⬜     |
| 15  | Sem warnings de version mismatch                                              | Console do browser sem mensagens `react version mismatch` ou `shared version`                                 | ⬜     |
| 16  | Sem erros de hydration                                                        | Console sem `Hydration failed` ou `Text content did not match`                                                | ⬜     |

**Critério de aprovação:** ≥ 14/16 verde, sendo obrigatório verde em #3, #6, #11-#13. Itens #14 (Vercel) e #10 (hot reload) podem ficar amarelos se documentados como follow-up — não bloqueiam decisão A.

Salvar screenshots/logs de evidência em `docs/phase-2/sprint-0/poc-mf-evidence/`:

- `1-mfe-standalone.png` (Hello rodando em :3001 puro)
- `2-mfe-in-shell.png` (Hello dentro do shell em :3000/poc)
- `3-devtools-network.png` (manifest + chunks carregados)
- `4-devtools-react.png` (árvore única)
- `5-prod-build-logs.txt` (build outputs)

## Gate de decisão (Dia 5 do Sprint 0)

> Conduzido pelo time todo na reunião de 30 min do dia 5.

### Cenário A — PoC verde (≥14/16)

1. Aprovar PR `phase-2/dev4+5/poc-module-federation` → merge em `phase-2`
2. Atualizar [PLAN.md](../PLAN.md) marcando "Opção A confirmada via PoC"
3. Criar `docs/phase-2/sprint-0/poc-mf-evidence/` com screenshots commitados
4. Sprint 2 (`dev4-dashboard`) e Sprint 3 (`dev5-transactions`) copiam padrão Rsbuild + runtime API
5. Time celebra 🎉

### Cenário B — PoC vermelho (<14/16 OU bloqueio crítico em #3/#6/#11-13)

1. **Não mergear** o PR (mantém branch como referência)
2. Acionar [Fallback Opção D](#fallback-opção-d) abaixo
3. Documentar motivo do fail em `docs/phase-2/sprint-0/mfe-decision.md` (criar)
4. Atualizar PLAN.md marcando "Opção A descartada — usando D"
5. Sprint 2 e Sprint 3 ajustam plano para build-time MFE

## Fallback Opção D

Se PoC falhar, MFEs viram **workspace packages consumidos em build-time** pelo shell:

```diff
- apps/dashboard-mfe/  (Rsbuild, federated runtime)
+ packages/dashboard-mfe/  (workspace package, build-time)
```

### Implementação resumida

1. Criar `packages/hello-mfe/` (estrutura igual `@bytebank/design-system` — TS source, sem build)
2. Mover `<Hello />` lá; remover Rsbuild
3. No shell, `import { Hello } from '@bytebank/hello-mfe'` direto (sem `dynamic` / sem federation)
4. Cada MFE continua deployable independentemente (se quiser deploy isolado, mantém Rsbuild + Storybook para visualização, mas o **consumo em prod é build-time**)
5. Documentar a decisão no README raiz: "Adotamos build-time MFE — atende requisito acadêmico de 'desenvolvimento isolado por módulo' via workspace packages independentes"

### O que se perde

- Federação **em runtime** (não conseguimos demonstrar `remoteEntry.js` carregando ao vivo)
- Deploy independente de MFE **sem rebuild do shell**

### O que se mantém

- Code splitting por dynamic import
- Storybook por MFE
- CI por MFE
- "Microfrontend" arquiteturalmente — múltiplos times trabalhando isoladamente

## Gotchas

1. **`@module-federation/nextjs-mf` NÃO funciona em Next 16 App Router.** Tentação grande de instalar; resista. Usar **runtime API direto** (`@module-federation/enhanced/runtime`) é o caminho.

2. **Singletons mal configurados causam "two Reacts" bug.** Sintoma: hooks no Hello quebram com "Invalid hook call" ou estado não persiste. Solução: garantir `singleton: true` em ambos lados (remote `shared` config + shell `init.shared`).

3. **`requiredVersion` strict pode bloquear workspace deps.** Workspace deps têm version `0.1.0` (placeholder); se `requiredVersion: '^0.1.0'` em prod, falha. Use `'*'` ou ranges abertos para deps internas.

4. **CORS em dev:** Rsbuild dev server NÃO envia `Access-Control-Allow-Origin: *` por padrão. O shell em `:3000` falha ao fetchar manifest. **Solução:** middleware em `rsbuild.config.ts` (incluído no exemplo A2) OU usar `chrome://flags/#block-insecure-private-network-requests` desabilitado (não recomendado).

5. **Turbopack + dynamic remote:** Next 16 usa Turbopack por default. Funciona com `loadRemote` runtime, mas chunks lazy podem ter behavior diferente de webpack. Se ver problemas, force `next dev --webpack` (deprecated mas ainda funciona em Next 16) durante o PoC e depois investigar.

6. **`'use client'` no `lib/federation.ts` é OBRIGATÓRIO.** Runtime do MF acessa `window` e usa `document`. Sem `'use client'`, Next tenta SSR e falha.

7. **Tailwind do remote precisa achar os sources do DS.** Rsbuild não usa o `@source` do shell. Configure PostCSS no `apps/hello-mfe/` com Tailwind v4 + `@source` apontando para `node_modules/@bytebank/design-system/src/**/*.{ts,tsx}` (ou tools/scripts auto-detectam).

8. **Dependency hoisting em workspaces:** `npm install` na raiz hoista as deps. `@module-federation/enhanced` deve aparecer só uma vez em `node_modules/`. Validar com `npm ls @module-federation/enhanced`.

9. **Build de produção do hello-mfe gera `dist/`** com sourcemap, JS chunks, e `mf-manifest.json`. Para Vercel preview, configurar Output Directory = `apps/hello-mfe/dist` e Build Command = `npm run build -w @bytebank/hello-mfe`.

10. **Hot reload entre apps:** `@bytebank/design-system` editado deve refletir nos 2 apps. Funciona se `transpilePackages` no shell + `source.include` no Rsbuild apontam para o package. Se quebrar, fallback é `npm run dev` em ambos.

## Pull Request

> **PR único cobrindo Tracks A + B**, com commits separados por dev:

```bash
git push origin phase-2/dev4+5/poc-module-federation
gh pr create --base phase-2 --title "feat(mfe): PoC Module Federation — Rsbuild remote + Next 16 shell consumer" \
  --body "$(cat <<'EOF'
## Sumário

PoC de Module Federation seguindo **Opção A** ([PLAN.md](../docs/phase-2/PLAN.md#decisão-module-federation--opção-a-final)):
- **Remote** `@bytebank/hello-mfe` em Rsbuild + Rspack expondo `<Hello />`
- **Shell** Next 16 App Router consumindo via `@module-federation/enhanced/runtime` (sem plugin webpack — usa runtime API)
- Singletons `react`, `react-dom`, `@bytebank/design-system`, `@bytebank/shared` compartilhados
- Rota `/poc` no shell renderiza componente federado em runtime

### Commits

1. dev4-dashboard: `feat(hello-mfe): bootstrap Rsbuild remote with MF plugin` — Track A (criação do remote)
2. dev5-transactions: `feat(shell): runtime federation consumer + /poc route` — Track B (consumer no shell)

### Matriz de validação

[ver `docs/phase-2/sprint-0/06-poc-module-federation.md#matriz-de-validação`]

| # | Critério | Status |
|---|---|---|
| 1-16 | (copiar matriz preenchida aqui) | (✅/❌) |

Evidências: `docs/phase-2/sprint-0/poc-mf-evidence/*.png`

## Decisão de arquitetura

- [ ] ✅ PoC verde → seguir Opção A em Sprints 2 e 3
- [ ] ❌ PoC vermelho → acionar fallback Opção D ([06-poc-module-federation.md#fallback-opção-d])

## Tasks relacionadas

- [Task 7 — Gate decisório](./README.md) decidirá no dia 5 do Sprint 0
- Sprints 2 e 3 dependem do resultado deste PoC
- Doc: [docs/phase-2/sprint-0/06-poc-module-federation.md](../sprint-0/06-poc-module-federation.md)
EOF
)"
```

## Próximo passo

→ **Task 7 — Gate decisório MF** (`todo time`, dia 5 do Sprint 0) — reunião de 30 min para revisar a matriz de validação e decidir Opção A vs Opção D. Não tem doc próprio (é uma reunião) — o desfecho fica no `mfe-decision.md`.

Após Task 7:

- Se A → Sprint 2/3 já têm padrão para copiar (`apps/dashboard-mfe/`, `apps/transactions-mfe/`)
- Se D → atualizar Sprint 2/3 docs para workspace packages
