# Task 1 — Bootstrap monorepo (Turborepo + npm workspaces)

> 🔗 **Esta task é bundled com [Task 2 — Migrar shell](./02-migrate-shell.md) num único PR atômico.**
> Razão: Task 1 isolada deixa `phase-2` em estado quebrado (sem deps do Next no root). Task 2 conclui a transição. As duas commits separadas, mas o PR é único — abre apenas no fim da Task 2.

|                          |                                                                  |
| ------------------------ | ---------------------------------------------------------------- |
| **Sprint**               | [Sprint 0 — Foundation](../sprint-0-foundation.md)               |
| **Owner**                | `dev1-infra`                                                     |
| **Duração estimada**     | 1 dia (parte 1 de 2 dias do bundle)                              |
| **Branch compartilhada** | `phase-2/dev1-infra/monorepo-migration` (cobre Tasks 1 e 2)      |
| **Depende de**           | Branch `phase-2` (já existe em `origin`)                         |
| **PR só abre**           | Após Task 2 completar e validar `npm run dev -w @bytebank/shell` |

---

## Contexto

Hoje `tech-challenge/` é um repositório single-app Next.js 16 (Fase 1). A Fase 2 transforma isso em **monorepo Turborepo + npm workspaces**, com `apps/` (shell + microfrontends) e `packages/` (Design System + libs compartilhadas).

Esta task cria **apenas os arquivos de raiz** que definem o monorepo:

- `package.json` raiz (workspace manifest)
- `turbo.json` (pipelines de build/test/dev)
- `.gitignore` atualizado

A migração do código Next.js atual para `apps/shell/` é feita na [Task 2](./README.md). Entre Task 1 e Task 2 o repositório fica em **estado intermediário** — não rode `npm install` ou `npm run dev` no meio.

## Por que Turborepo + npm workspaces?

- **npm workspaces** (nativo do npm 7+): dependency hoisting, links simbólicos entre packages, sem ferramenta extra
- **Turborepo**: orquestra tasks com grafo de dependências (`^build`), cacheia outputs, paraleliza builds em CI
- **Por que não pnpm/Yarn:** projeto já usa npm na Fase 1; trocar gerenciador adiciona atrito para 5 devs sem ganho proporcional ([memória](../../../.claude/projects/-Users-feliperosa-studies-fiap-frontend-engineering/memory/feedback_use_npm_not_pnpm.md))

## Pré-condições

- [x] Branch `phase-2` já existe em `origin` (long-lived integration branch da Fase 2)
- [ ] Você está na feature branch **compartilhada com Task 2**:
  ```bash
  git checkout phase-2
  git pull origin phase-2
  git checkout -b phase-2/dev1-infra/monorepo-migration
  ```
- [ ] Working tree limpa (`git status` zerado — sem changes pendentes)
- [ ] Node 20+ e npm 10+ (`node -v && npm -v`)

## Implementação passo-a-passo

### 1. Backup local do package.json atual

A Task 2 vai mover o conteúdo atual para `apps/shell/package.json`. Por segurança, faça uma cópia local que **não vai entrar no git** (já será coberta pelo `.gitignore` no passo 5):

```bash
cd tech-challenge
cp package.json .package.json.fase1.bak
```

### 2. Criar diretórios `apps/` e `packages/`

Git não rastreia diretórios vazios, então adicione um `.gitkeep` em cada para garantir a estrutura no commit:

```bash
mkdir -p apps packages
touch apps/.gitkeep packages/.gitkeep
```

> Os `.gitkeep` serão removidos automaticamente quando `apps/shell/` (Task 2) e `packages/design-system/` (Task 3) forem criados.

### 3. Substituir `package.json` raiz pelo workspace manifest

Substitua o conteúdo atual de `tech-challenge/package.json` por:

```json
{
  "name": "bytebank-monorepo",
  "version": "0.1.0",
  "private": true,
  "description": "Bytebank — monorepo Fase 2 (shell + microfrontends + design system)",
  "engines": {
    "node": ">=20",
    "npm": ">=10"
  },
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "storybook": "turbo run storybook",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "prepare": "husky"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "prettier": "^3.8.1",
    "husky": "^9.1.7",
    "lint-staged": "^16.3.2"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,mjs,json,css,md}": ["prettier --write"]
  }
}
```

**Pontos importantes:**

- `private: true` impede publicação acidental do root
- `workspaces: ["apps/*", "packages/*"]` cobre todos os futuros workspaces
- Scripts delegam ao Turbo, que descobre tasks de cada workspace via dependency graph
- `prettier`, `husky`, `lint-staged` ficam no root (configs compartilhadas pelos workspaces)
- `turbo` fica como devDep do root porque é o orquestrador

### 4. Criar `turbo.json`

Criar `tech-challenge/turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "globalDependencies": ["**/.env.*local", "tsconfig.json"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", "storybook-static/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "storybook": {
      "cache": false,
      "persistent": true
    },
    "build-storybook": {
      "dependsOn": ["^build"],
      "outputs": ["storybook-static/**"]
    }
  }
}
```

**O que cada parte faz:**

- `dependsOn: ["^build"]` — antes de buildar um package, builda suas dependências de workspace primeiro (ex: `design-system` antes do `shell`). O `^` indica "dependências de workspace upstream".
- `outputs` — Turbo cacheia esses diretórios e reusa em CI quando inputs não mudam
- `cache: false` + `persistent: true` em `dev` e `storybook` — comandos long-running não devem ser cacheados
- `globalDependencies` — invalida cache global se esses arquivos mudarem
- `ui: "tui"` — interface terminal nova do Turbo 2.x (mostra logs por task em painéis)

> **Atenção:** Turbo 2.x usa `tasks` (não `pipeline` como Turbo 1.x). Se você encontrar tutoriais antigos, ajuste.

### 5. Atualizar `.gitignore`

Append ao final do `tech-challenge/.gitignore`:

```gitignore

# === Monorepo (Fase 2) ===

# Turborepo
.turbo
**/.turbo

# Build outputs em qualquer workspace
**/dist
**/storybook-static
**/.next
**/coverage

# Backup local da migração (não versionar)
.package.json.fase1.bak
```

### 6. Limpar node_modules atual (vai ser recriado)

```bash
rm -rf node_modules
```

> **Não delete `package-lock.json` ainda.** Vamos preservar como referência até a Task 2 finalizar e regenerar com `npm install`.

### 7. Verificação visual

A estrutura agora deve ser:

```
tech-challenge/
├── .gitignore              ← atualizado
├── apps/
│   └── .gitkeep
├── packages/
│   └── .gitkeep
├── package.json            ← novo workspace manifest
├── turbo.json              ← novo
├── package-lock.json       ← antigo, será regenerado na Task 2
├── .package.json.fase1.bak ← backup local (não vai pro git)
├── app/                    ← código Fase 1, ainda no root (Task 2 move)
├── components/             ← idem
├── context/                ← idem
└── ... (todo o resto da Fase 1)
```

### 8. Commit local (NÃO abrir PR ainda)

Como Tasks 1 e 2 saem como **PR único atômico**, esta task só faz commit local — o `git push` e `gh pr create` rodam apenas no fim da Task 2.

```bash
git add package.json turbo.json .gitignore apps/.gitkeep packages/.gitkeep
git status   # confirmar que SÓ esses arquivos entram (e que o .bak NÃO está)
git commit -m "chore(monorepo): bootstrap Turborepo + npm workspaces

- Substitui package.json single-app por workspace manifest
- Adiciona turbo.json com pipelines build/dev/lint/test/storybook
- Cria estrutura apps/ e packages/ vazia (preenchida nas próximas tasks)
- Atualiza .gitignore para .turbo e outputs de workspaces

Parte 1/2 do monorepo migration bundle (continua em Task 2).
Refs: docs/phase-2/sprint-0/01-bootstrap-monorepo.md"
```

> **Não rode `git push` ainda.** Mantenha o commit local; Task 2 adiciona seu commit em cima e o `git push -u origin phase-2/dev1-infra/monorepo-migration` acontece só no fim.

## Validação

Não há validação executável nesta task — `phase-2` fica em estado intermediário e a validação completa é feita na Task 2 (que finaliza com `npm run dev -w @bytebank/shell` funcionando). Mas confirme localmente:

- [ ] `cat tech-challenge/package.json | grep workspaces` retorna `"workspaces": ["apps/*", "packages/*"]`
- [ ] `cat tech-challenge/turbo.json | jq '.tasks | keys'` lista `build`, `dev`, `lint`, `test`, `storybook`, `build-storybook`
- [ ] `ls -la tech-challenge/apps tech-challenge/packages` mostra ambos diretórios com `.gitkeep`
- [ ] `grep '.turbo' tech-challenge/.gitignore` retorna match
- [ ] `git log --oneline -1` mostra o commit "bootstrap Turborepo + npm workspaces"
- [ ] Branch atual é `phase-2/dev1-infra/monorepo-migration`
- [ ] **Nada foi pushed para origin ainda**

## Gotchas

1. **Não rode `npm install` ainda.** O workspace `apps/shell/` ainda é vazio. Rodar agora vai apagar `package-lock.json` e quebrar o estado intermediário. Espere a Task 2.
2. **Não rode `git push` ainda.** PR só abre no fim da Task 2 com os dois commits juntos.
3. **Husky `prepare` script vai falhar** se você rodar `npm install` agora — sem `.husky/` no root configurado, daria erro. Por isso o passo 6 só remove `node_modules` sem reinstalar.
4. **Turbo 2.x sintaxe.** Se você vir tutoriais com `pipeline` (não `tasks`), são do Turbo 1.x. Use a doc oficial 2.x: https://turborepo.com/docs.
5. **`.gitkeep` é convenção, não comando do git.** Você pode usar `.placeholder` ou qualquer nome — convenção `.gitkeep` é a mais reconhecida.
6. **Backup `.package.json.fase1.bak`** — confirme com `git status` que ele NÃO aparece em "Untracked files" (deve estar coberto pelo `.gitignore`).

## Próximo passo

→ **Continuar na mesma branch `phase-2/dev1-infra/monorepo-migration` com [Task 2 — Migrar shell](./02-migrate-shell.md).**

A Task 2 fará o segundo commit (`chore(shell): migrate Next.js app to apps/shell workspace`), validará que tudo funciona (`npm run dev -w @bytebank/shell` em `:3000`) e só **então** abrirá o PR único cobrindo as duas tasks.

Após o PR mergear em `phase-2`:

- `apps/shell/` terá todo o código Next.js da Fase 1
- `npm install` na raiz funcionará e o shell rodará igual a antes
- Tasks 3, 4, 5 e 6 podem começar em paralelo
