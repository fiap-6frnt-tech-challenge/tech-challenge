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

- [x] Todos os itens do roteiro ✅ no ambiente local isolado (limites abaixo)
- [ ] Migrações de dados rodadas num preview com backup do Neon
- [x] LCP mobile anotado, com prefetch SSR habilitado e sem atribuição causal isolada

## Evidências — 28/10/2026

- Base validada: `d768f6f` da `phase-4`, após o merge da S3-10 (PR #201). CI e Security desse commit aprovados.
- Testes/stories: 1.225 aprovados; integração Postgres: 92; lint e tipos: 13 tarefas cada; arquitetura sem violações; três builds aprovados; audit de produção sem vulnerabilidades.
- Regressão: 72 E2Es aprovados em Chromium/Firefox, incluindo os seis cenários complementares da S3-11. Doze cenários opcionais externos da S2-10 permaneceram desativados.
- Cipher conferido independentemente no SQL e nos bytes do arquivo local; download autenticado reproduz o original, arquivo disfarçado é recusado e outro usuário não acessa o anexo.
- 304 real, invalidação e isolamento de cache/SSR; CSP em enforce sem violações observadas no fluxo exercitado; CSRF recusa três métodos sem alterar dados; navegação entre MFEs sem recarga de documento.
- LCP mobile mediano: home **3,704 s**, transações **4,006 s**, em três amostras por rota e carga de 5.000 transações. A medição não isola causalmente o efeito do SSR.
- [Relatório, limites e reprodução](../perf/s3-11-smoke.md) · [JSON sanitizado](../perf/s3-11-smoke.json).

**Gate externo pendente:** backup/branch do Neon e migração de dados em preview não foram executados por falta de acesso ao ambiente. A prova de storage foi local; Vercel Blob externo e HTTPS do preview ainda precisam ser conferidos. Portanto esta task registra o smoke local e não fecha o gate de implantação.
