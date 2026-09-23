# Task 09 — Smoke final + merge `phase-4` → `main` + tag `v4.0.0`

|                |                                               |
| -------------- | --------------------------------------------- |
| **Sprint**     | [Sprint 4 — Auditoria e entrega](./README.md) |
| **Owner**      | Todos                                         |
| **Duração**    | 0.5 dia                                       |
| **Prioridade** | P0                                            |
| **Branch**     | PR final `phase-4` → `main`                   |
| **Depende de** | Tasks 01–08                                   |

---

## Contexto

Fecho da fase: smoke num clone limpo, deploy coordenado dos três projetos na Vercel, migrações de dados em produção na ordem certa e tag de release.

## Roteiro final (clone limpo)

1. `git clone` → seguir **só** o README → configurar `.env.local` → Postgres → migrações → seed
2. `npm install && npm run dev` → shell + MFEs sobem
3. Executar a [verificação end-to-end do PLAN.md](../PLAN.md#verificação-end-to-end-final) (17 itens)
4. `docker compose up --build` → mesmo roteiro resumido
5. Conferir o mapa de requisitos do [README do sprint](./README.md#mapa-requisito-da-spec--onde-está): 100% coberto

## Release em produção (ordem importa)

1. Cadastrar as variáveis novas no projeto do shell na Vercel (tipo Sensitive) **antes** do merge
2. Branch/backup do Neon
3. Migrações de expansão (colunas novas, índices, tabelas) no Neon
4. Merge `phase-4` → `main` (PR com merge commit) → deploy dos **três** projetos a partir do mesmo commit
5. Scripts de backfill (anexos e dados pessoais) → verificar
6. Migração de contração (remover colunas em claro) → deploy
7. Smoke em produção + Lighthouse final (anexar ao relatório do S4-04)

```bash
git checkout main && git pull
git tag -a v4.0.0 -m "Tech Challenge Fase 4 — Bytebank"
git push origin v4.0.0
```

## Checklist de entrega

- [ ] Repositório acessível à banca
- [ ] README completo (tecnologias + passo a passo)
- [ ] Vídeo (≤ 5 min) linkado
- [ ] Todos os requisitos da spec cobertos
- [ ] CI verde na `main`
- [ ] Tag `v4.0.0`

## Gotchas

1. Deixe este dia livre: não empurre features. Se algo escorregou, corte P2 e P1, nunca P0.
2. Os singletons compartilhados (`@bytebank/*`, `rxjs`) vêm do shell: publique os três projetos a partir do mesmo commit e valide antes num preview (shell de preview apontando para os previews dos MFEs).
3. Faça o backfill só com o backup do Neon pronto; a contração (drop das colunas) só depois de verificar os dados cifrados.
4. Teste o README num clone limpo de verdade — é o que a banca faz.
