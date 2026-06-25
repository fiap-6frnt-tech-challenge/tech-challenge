# Task 02 — Docker: `Dockerfile`s dos MFEs (Rsbuild build → nginx static) + `nginx.conf`

|                        |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md) |
| **Owner**              | Dev 1 (Infra & Backend)                                           |
| **Duração estimada**   | 1 dia                                                             |
| **Branch recomendada** | `dev1/docker-mfes`                                                |
| **Status**             | ⏳ Pendente                                                       |

---

## Dependências

- **O que bloqueia esta tarefa:** **Nada.** Começa no dia 1. `dashboard-mfe` e `transactions-mfe` já buildam com `rsbuild build` (saída em `dist/`).
- **O que esta tarefa desbloqueia:** [Task 06 — docker-compose](./06-docker-compose.md) (precisa das imagens dos MFEs). O `nginx.conf` desta task é o gabarito de CORS que a [Task 07](./07-cors-cross-origin.md) endurece para a origin do shell.

---

## Contexto

Os MFEs (`dashboard` na porta **3002**, `transactions` na **3003**) são apps **Rsbuild + `@module-federation/enhanced`** que produzem **assets estáticos** (`dist/` com `mf-manifest.json`, `remoteEntry`/`static/*`). Em produção eles não precisam de Node — basta um servidor estático. Usamos **nginx alpine**.

> ⚠️ **Gotcha de Module Federation:** o `assetPrefix` dos MFEs vem de `MFE_ORIGIN` **em build time** (ver `apps/dashboard-mfe/rsbuild.config.ts`). A imagem precisa receber `MFE_ORIGIN` como **build arg** apontando para a origin pública onde o MFE será servido, senão os chunks federados resolvem para `localhost` e o shell quebra ao carregar o remote. O default é `http://localhost:3002` / `http://localhost:3003`.

---

## Implementação

### 1. `apps/dashboard-mfe/Dockerfile`

```dockerfile
# Stage 1: build — Rsbuild gera dist/ estático
FROM node:22-alpine AS build
WORKDIR /app
# MFE_ORIGIN entra como build arg → vira assetPrefix dos chunks federados
ARG MFE_ORIGIN=http://localhost:3002
ENV MFE_ORIGIN=$MFE_ORIGIN
COPY package.json package-lock.json ./
COPY apps/dashboard-mfe/package.json apps/dashboard-mfe/
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
```

### 2. `apps/dashboard-mfe/nginx.conf`

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;

  # CORS para o shell consumir remoteEntry/mf-manifest cross-origin.
  # ⚠️ Task 07 troca o '*' pela origin exata do shell em prod.
  add_header Access-Control-Allow-Origin  "*" always;
  add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
  add_header Access-Control-Allow-Headers "*" always;

  # mf-manifest.json e chunks não devem ser cacheados de forma agressiva
  location = /mf-manifest.json { add_header Cache-Control "no-cache"; }

  location / {
    try_files $uri $uri/ =404;
  }
}
```

### 3. `apps/transactions-mfe/Dockerfile` + `nginx.conf`

Idêntico, trocando `dashboard` → `transactions` e o default `MFE_ORIGIN=http://localhost:3003`.

---

## Validação

```bash
docker build -f apps/dashboard-mfe/Dockerfile \
  --build-arg MFE_ORIGIN=http://localhost:3002 -t bytebank-dashboard-mfe .
docker run --rm -p 3002:80 bytebank-dashboard-mfe
```

- [ ] `http://localhost:3002/mf-manifest.json` retorna o manifest do `dashboard`.
- [ ] Resposta traz os headers `Access-Control-Allow-Origin`.
- [ ] Idem para `transactions` em `:3003`.
- [ ] Os caminhos dentro do manifest apontam para o `MFE_ORIGIN` informado (não `localhost` se buildado para prod).

---

## Gotchas

1. **`MFE_ORIGIN` é build-time, não runtime.** Trocar a origin exige rebuild da imagem. Em prod (Task 03), o build arg recebe a URL pública do MFE.
2. **`always` nos `add_header`** — sem ele, nginx omite os headers em respostas 4xx/3xx, e o preflight do shell falha.
3. **Não confundir com o shell:** MFEs **não** têm backend; toda API mora no shell. nginx só serve estático.
4. **`hello-mfe` fica de fora** do Docker/deploy — é PoC da Sprint 0, não entra na entrega.
5. **SPA fallback não é necessário** aqui (o MFE é consumido via federation, não navegado por rota própria), por isso `try_files ... =404` em vez de cair no `index.html`.
