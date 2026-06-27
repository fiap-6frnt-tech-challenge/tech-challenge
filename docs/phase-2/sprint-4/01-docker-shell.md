# Task 01 — Docker: `Dockerfile` do shell (Next.js standalone) + `.dockerignore`

|                        |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md) |
| **Owner**              | Dev 1 (Infra & Backend)                                           |
| **Duração estimada**   | 1 dia                                                             |
| **Branch recomendada** | `dev1/docker-shell`                                               |
| **Status**             | ⏳ Pendente                                                       |

---

## Dependências

- **O que bloqueia esta tarefa:** **Nada.** Começa no dia 1. O shell já builda com `npm run build -w @bytebank/shell` (Sprint 0–3).
- **O que esta tarefa desbloqueia:** [Task 06 — docker-compose](./06-docker-compose.md) (precisa da imagem do shell pronta) e fornece o requisito técnico de **containerização** da Fase 2. Também serve de referência de multi-stage para os [Dockerfiles dos MFEs (Task 02)](./02-docker-mfes.md).

---

## Contexto

A Fase 2 exige **containerização (front + back)**. O shell é um app Next.js 16 (App Router) que também hospeda as API Route Handlers (`/api/transactions/*`) — ou seja, é o "back" da aplicação. A estratégia é gerar uma imagem mínima usando o **output `standalone`** do Next, que empacota só o necessário (server + node_modules tracados) em vez de copiar todo o monorepo.

> ⚠️ **Estado atual:** `apps/shell/next.config.ts` **não** tem `output: 'standalone'` hoje (só `transpilePackages` + `optimizePackageImports` + `bundle-analyzer`). Esta task adiciona o `output` e o `outputFileTracingRoot` (obrigatório em monorepo).

---

## Implementação

### 1. Habilitar `standalone` no `next.config.ts`

```ts
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Em monorepo, o tracing precisa enxergar a raiz para incluir os workspaces
  // (@bytebank/*) no bundle standalone — senão o server.js sobe sem os pacotes.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@bytebank/shared',
    '@bytebank/design-system',
    '@bytebank/api-client',
    '@bytebank/stores',
  ],
  experimental: {
    optimizePackageImports: ['@hookform/resolvers', 'lucide-react', '@bytebank/design-system'],
  },
};
```

### 2. `apps/shell/Dockerfile` (multi-stage)

```dockerfile
# Stage 1: deps — instala o workspace inteiro (precisa dos packages @bytebank/*)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/shell/package.json apps/shell/
COPY apps/dashboard-mfe/package.json apps/dashboard-mfe/
COPY apps/transactions-mfe/package.json apps/transactions-mfe/
COPY apps/hello-mfe/package.json apps/hello-mfe/
COPY packages/shared/package.json packages/shared/
COPY packages/design-system/package.json packages/design-system/
COPY packages/api-client/package.json packages/api-client/
COPY packages/stores/package.json packages/stores/
RUN npm ci

# Stage 2: build — gera o output standalone do shell
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w @bytebank/shell

# Stage 3: runtime — imagem mínima, só o standalone server
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# O standalone já inclui um node_modules tracado; copiamos a árvore inteira.
COPY --from=build /app/apps/shell/.next/standalone ./
COPY --from=build /app/apps/shell/.next/static ./apps/shell/.next/static
COPY --from=build /app/apps/shell/public ./apps/shell/public
EXPOSE 3000
CMD ["node", "apps/shell/server.js"]
```

### 3. `.dockerignore` na raiz

```
node_modules
**/node_modules
.next
**/.next
dist
**/dist
.turbo
**/.turbo
.git
*.log
coverage
**/coverage
.env*.local
storybook-static
```

---

## Validação

```bash
# Build da imagem a partir da raiz do monorepo
docker build -f apps/shell/Dockerfile -t bytebank-shell .

# Sobe apontando para um Postgres acessível e os MFEs (locais por enquanto)
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgres://bytebank:bytebank@host.docker.internal:5432/bytebank \
  -e NEXTAUTH_SECRET=dev-secret -e NEXTAUTH_URL=http://localhost:3000 \
  bytebank-shell
```

- [ ] `docker build` conclui sem erro (standalone inclui os `@bytebank/*`).
- [ ] Container sobe e `http://localhost:3000` redireciona para `/login`.
- [ ] Login com credenciais (`qualquer@email` + `senha123` em dev) funciona contra o Postgres.
- [ ] Imagem final < ~250 MB (alpine + standalone).

---

## Gotchas

1. **`outputFileTracingRoot` é obrigatório em monorepo.** Sem ele, o `.next/standalone/server.js` sobe sem os pacotes `@bytebank/*` (que são transpilados) e quebra em runtime.
2. **Copiar `static` e `public` à parte** — o `standalone` **não** os inclui automaticamente; o caminho replica a estrutura `apps/shell/.next/static`.
3. **`host.docker.internal`** para alcançar o Postgres do host no Windows/Mac; no compose (Task 06) usaremos o nome do serviço `db`.
4. **Secrets em runtime, não em build.** `DATABASE_URL`, `NEXTAUTH_SECRET`, `BLOB_READ_WRITE_TOKEN` entram como `-e`/env do compose — nunca no `Dockerfile`.
5. **Node 22-alpine** alinha com o CI (`ci.yml` usa Node 22; Rspack exige ≥20.19/≥22.12).
