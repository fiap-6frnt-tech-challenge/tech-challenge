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
# NextAuth v5 bloqueia o host em produção sem isto (na Vercel é automático);
# como esta imagem é self-hosted atrás de um proxy conhecido, confiamos no Host.
ENV AUTH_TRUST_HOST=true
# O standalone já inclui um node_modules tracado; copiamos a árvore inteira.
COPY --from=build /app/apps/shell/.next/standalone ./
COPY --from=build /app/apps/shell/.next/static ./apps/shell/.next/static
COPY --from=build /app/apps/shell/public ./apps/shell/public
EXPOSE 3000
CMD ["node", "apps/shell/server.js"]
