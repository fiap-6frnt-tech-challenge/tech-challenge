# Task 19 — Smoke Test Final + Vídeo Demo 4 min

|                        |                                                                           |
| ---------------------- | ------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 3 — Transactions MFE + Enhancements](../sprint-3-transactions.md) |
| **Owner**              | Todos (Dev 1 coordena, Dev 2 grava tela, Dev 3 edita)                     |
| **Duração estimada**   | 0.5 dia                                                                   |
| **Branch recomendada** | — (roda em `phase-2` após merge de todas as tasks)                        |
| **Depende de**         | [Task 18 — Testes](./18-tests.md) — todos os testes verdes + CI verde     |
| **Desbloqueia**        | Sprint 4 — Docker + Deploy + A11y + Demo final                            |

---

## Checklist de smoke test

Executar em sequência a partir de um clone limpo do branch `phase-2`:

```bash
git clone <repo> && cd tech-challenge
npm install
cp apps/shell/.env.example apps/shell/.env.local   # preencher DATABASE_URL + BLOB_READ_WRITE_TOKEN
npm run dev
```

### Shell + MFEs sobem

- [ ] `http://localhost:3000` redireciona para `/login`
- [ ] `http://localhost:3002/mf-manifest.json` → `dashboard-mfe` ok
- [ ] `http://localhost:3003/mf-manifest.json` → `transactions-mfe` ok

### Auth

- [ ] Login com credenciais funciona e redireciona para `/`
- [ ] Logout funciona e bloqueia rotas privadas

### Home (`/`)

- [ ] Dashboard MFE carrega (gráficos visíveis, Network mostra `remoteEntry.js` do `:3002`)
- [ ] `AccountOverview` carrega do `transactions-mfe` (Network mostra `remoteEntry.js` do `:3003`)
- [ ] Botão "Nova transação" abre modal

### Transações (`/transactions`)

- [ ] Lista carrega via Module Federation (Network: `remoteEntry.js` do `:3003`)
- [ ] Scroll até o final → carrega próxima página automaticamente
- [ ] Busca "uber" → filtra por description (debounce 300ms)
- [ ] Range R$ 0–200 → lista filtra
- [ ] Multi-select "Alimentação" + "Transporte" → lista filtra
- [ ] "Limpar filtros" → restaura lista completa

### Criar transação

- [ ] Abrir modal "Nova transação"
- [ ] Digitar "Uber Trip" em description → "Transporte" aparece com badge "Sugerido"
- [ ] Aceitar sugestão clicando em "Transporte"
- [ ] Preencher demais campos → submit cria a transação
- [ ] Selecionar PDF de 2MB antes do submit → após criar, aparece em `AttachmentList`
- [ ] Transação aparece na lista após criar

### Editar transação

- [ ] Abrir modal de edição
- [ ] `AttachmentList` exibe os anexos existentes
- [ ] Adicionar novo arquivo → upload imediato
- [ ] Remover anexo → spinner → removido da lista

### Validação de form

- [ ] Submeter com description de 2 chars → erro "Mínimo 3 caracteres"
- [ ] Submeter sem categoria → erro "Categoria é obrigatória"
- [ ] Submeter com data futura → erro "Data não pode ser futura"
- [ ] Upload de arquivo >5MB → feedback de erro, não envia

### CI

- [ ] `npx turbo run test` verde
- [ ] `npx turbo run build` verde
- [ ] Vercel preview (shell + 2 MFEs) verde

---

## Roteiro do vídeo (4 min)

| Tempo     | Cena                                                                                   |
| --------- | -------------------------------------------------------------------------------------- |
| 0:00–0:20 | Clone limpo + `npm run dev` + 3 terminais (shell, dashboard-mfe, transactions-mfe)     |
| 0:20–0:50 | Login → home com dashboard + `AccountOverview` do MFE (DevTools Network aberto)        |
| 0:50–1:20 | `/transactions` → paginação demonstrada (navegar 2 páginas; `page` na URL; F5 mantém)  |
| 1:20–2:00 | Busca "uber" (debounce) + filtro categoria "Transporte" + limpar tudo                  |
| 2:00–2:40 | Criar transação "Uber Trip" → sugestão "Transporte" → aceitar → upload PDF → confirmar |
| 2:40–3:10 | Editar transação → ver `AttachmentList` → adicionar novo arquivo → remover um          |
| 3:10–3:40 | Validação de form: erro de description curta + categoria vazia + data futura           |
| 3:40–4:00 | `npx turbo run test` rodando no terminal → todos verdes                                |

---

## Critério de encerramento do sprint

Todas as checkboxes do smoke test marcadas + vídeo gravado e disponível para a equipe.
