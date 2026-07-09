# Task 14 — Vídeo demo (roteiro 6 min + gravação + edição)

|                        |                                                                   |
| ---------------------- | ----------------------------------------------------------------- |
| **Sprint**             | [Sprint 4 — Deploy + Polish + Demo](../sprint-4-deploy-polish.md) |
| **Owner**              | Dev 3 (gravação + edição);                                        |
| **Duração estimada**   | 1 dia                                                             |
| **Branch recomendada** | — (entregável; link adicionado no README via PR)                  |
| **Status**             | ⏳ Pendente                                                       |

---

## Dependências

- **O que bloqueia esta tarefa:** **tudo funcional** — [Task 03 deploy](./03-cloud-deploy-mfes.md), [Task 06 compose](./06-docker-compose.md) e as features das Sprints 1–3. O **roteiro** pode (e deve) começar cedo, em paralelo; a **gravação** só com tudo de pé.
- **O que esta tarefa desbloqueia:** o **entregável obrigatório "vídeo demo público"** e o link no [README (Task 13)](./13-readme-docs.md). Sem ele a entrega da Fase 2 não conta.

---

## Contexto

Vídeo de ~6 min cobrindo todos os requisitos da spec, com ênfase em **microfrontends federados** (a evidência que diferencia a Fase 2): mostrar no DevTools Network os `mf-manifest.json`/chunks vindos de origins distintas.

---

## Roteiro (6 min)

| Tempo     | Cena                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| 0:00–0:30 | Intro: Bytebank, Fase 2, time (3 devs) e stack.                                           |
| 0:30–1:30 | Login (Credentials/Google) → home com dashboard.                                          |
| 1:30–2:30 | Tour pelos widgets: KPIs, charts, lista recente; mencionar acessibilidade dos charts.     |
| 2:30–3:30 | `/transactions`: busca textual (debounce), filtros, paginação (`page` na URL, F5 mantém). |
| 3:30–4:30 | Criar transação → categoria sugerida → anexar PDF → confirmar persistência.               |
| 4:30–5:00 | **DevTools Network → MFEs federados** (`mf-manifest.json` de origins diferentes).         |
| 5:00–5:30 | Storybook + Chromatic; A11y (skip link, navegação por teclado).                           |
| 5:30–6:00 | Outro: 3 deploys Vercel independentes, `docker compose up`, repo + README.                |

---

## Implementação

- [ ] Roteiro fechado com o time (insumo: smoke test da Sprint 3 + features).
- [ ] Dados de seed completos (charts e lista cheios) no ambiente gravado.
- [ ] Gravação OBS/Loom em 1080p, throttling de rede normal (mostra o federation carregando de verdade).
- [ ] Edição: cortes secos, sem áudio agressivo, legendas dos passos-chave.
- [ ] Upload + link no README (Task 13).

---

## Validação (entregável da Fase 2)

- [ ] Vídeo público/acessível, ~6 min.
- [ ] Cobre **todos** os requisitos: home com charts, filtros/busca/paginação, validação + categoria sugerida + anexo, MFEs federados, deploy, A11y.
- [ ] Link no README e em `sprint-4-deploy-polish.md`.

---

## Gotchas

1. **Federation "trava" na demo** se gravar com cache frio + throttling agressivo — usar rede normal e dar um warm-up antes.
2. **Não mostrar segredos** — `.env`, tokens, DATABASE_URL com credencial real fora de quadro.
3. **Gravar contra produção** (deploys da Task 03) para evidência real do deploy independente; ter o `docker compose up` como plano B.
4. **Roteiro antes da gravação** evita retakes — alinhar quem narra o quê.
5. **Se algo quebrar na gravação**, o buffer (Task 15) cobre o retake.
