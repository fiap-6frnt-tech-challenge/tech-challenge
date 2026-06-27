# Stage 1: build — Rsbuild gera dist/ estático
FROM node:22-alpine AS build
WORKDIR /app
# MFE_ORIGIN entra como build arg → vira assetPrefix dos chunks federados
ARG MFE_ORIGIN=http://localhost:3002
ENV MFE_ORIGIN=$MFE_ORIGIN
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
COPY . .
RUN npm run build -w @bytebank/dashboard-mfe

# Stage 2: runtime — nginx servindo dist/
FROM nginx:alpine AS runtime
COPY --from=build /app/apps/dashboard-mfe/dist /usr/share/nginx/html
COPY apps/dashboard-mfe/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
