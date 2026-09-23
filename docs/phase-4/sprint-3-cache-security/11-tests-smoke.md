# Task 11 — Testes + smoke

|                |                                                |
| -------------- | ---------------------------------------------- |
| **Sprint**     | [Sprint 3 — Cache e criptografia](./README.md) |
| **Owner**      | Todos                                          |
| **Duração**    | 0.5 dia                                        |
| **Prioridade** | P0                                             |
| **Branch**     | — (validação conjunta na `phase-4`)            |
| **Depende de** | Tasks 01–09 (e 10, se feita)                   |

---

## Roteiro

1. CI verde, incluindo o workflow `Security`
2. **Criptografia:** subir um anexo → baixar o blob direto pelo storage (ilegível) → abrir pela aplicação (ok); arquivo com extensão falsa recusado; `psql` mostra e-mail e nome cifrados
3. **Cache:** 304 na segunda carga; dados novos depois de uma mutação; home e `/transactions` sem requisição de dados depois do mount; teste com 2 usuários
4. **Borda:** headers presentes; CSP em enforce sem violações; POST cross-site → 403
5. **Estado e MFEs:** criar transação (otimista + rollback simulado); fluxo com anexos pela máquina de estados; "Todas as transações" sem recarregar a página
6. Regressão da Fase 2 (login, CRUD, filtros, dashboard)

## Critérios

- [ ] Todos os itens do roteiro ✅
- [ ] Migrações de dados rodadas num preview com backup do Neon
- [ ] LCP mobile anotado (efeito do prefetch no SSR)
