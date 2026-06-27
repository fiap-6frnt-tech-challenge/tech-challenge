# Task 07 — Backend/Infra: CORS travado na origin do shell

|                        |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md) |
| **Owner**              | Dev 1 (Infra & Backend)                                           |
| **Duração estimada**   | 0.5 dia                                                           |
| **Branch recomendada** | `dev1/cors-lockdown`                                              |
| **Status**             | ⏳ Pendente                                                       |

---

## Dependências

- **O que bloqueia esta tarefa:** [Task 03 — Cloud deploy dos MFEs](./03-cloud-deploy-mfes.md). Só dá para travar o CORS na origin do shell depois que a **origin pública do shell** está definida.
- **O que esta tarefa desbloqueia:** [Task 10 — Perf audit](./10-perf-audit.md) (MFE carregando cross-origin de forma estável em prod) e o critério **Lighthouse Best Practices ≥ 95** (CORS aberto com `*` é apontado como má prática). Endurece a comunicação entre MFEs.

---

## Contexto

> ⚠️ **Estado atual:** `apps/dashboard-mfe/vercel.json` e `apps/transactions-mfe/vercel.json` já enviam `Access-Control-Allow-Origin: *`. Isso **funciona**, mas é permissivo demais para a entrega final. Esta task **restringe** o CORS à origin exata do shell (prod + previews) — em vez de criar CORS do zero.

---

## Implementação

### 1. `vercel.json` dos MFEs → origin do shell

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "https://bytebank-shell.vercel.app" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "*" },
        { "key": "Vary", "value": "Origin" }
      ]
    }
  ]
}
```

> Como `vercel.json` não casa múltiplas origins nativamente, manter a **origin de produção** fixa aqui. Para previews, documentar que se usa a URL de produção dos MFEs (decisão da Task 03), evitando o problema de origin dinâmica.

### 2. Replicar no `nginx.conf` (path Docker)

Trocar `Access-Control-Allow-Origin "*"` por `"http://localhost:3000"` (compose) / a origin do shell, com `Vary: Origin`, nos `nginx.conf` da [Task 02](./02-docker-mfes.md).

### 3. Verificação cross-origin

```bash
curl -I -H "Origin: https://bytebank-shell.vercel.app" \
  https://bytebank-dashboard.vercel.app/mf-manifest.json
# Access-Control-Allow-Origin deve refletir a origin do shell, não '*'
```

---

## Validação

- [ ] `mf-manifest.json` dos MFEs responde com `Access-Control-Allow-Origin` = origin do shell (não `*`).
- [ ] Shell de produção continua carregando os MFEs (sem erro de CORS no console).
- [ ] Uma origin **não autorizada** é bloqueada pelo navegador (teste manual rápido).
- [ ] `nginx.conf` do compose alinhado com a origin local do shell.

---

## Gotchas

1. **`Vary: Origin`** é necessário para caches/CDN não servirem o header de uma origin para outra.
2. **Preflight `OPTIONS`** dos chunks: garantir que os `add_header`/headers respondem em `OPTIONS` (no nginx, `always`).
3. **Previews da Vercel têm URL dinâmica** (`*-git-branch-*.vercel.app`). Travar em uma única origin quebra o CORS no preview do shell se ele tentar carregar um preview de MFE. Mitigação adotada: preview do shell → MFEs de **produção** (origin fixa). Documentar.
4. **Não confundir com a API do shell:** as rotas `/api/*` são same-origin (mesma app); este CORS é só para os assets federados dos MFEs.
