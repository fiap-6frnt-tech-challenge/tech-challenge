# Task 04 — Relatório de performance antes/depois

|                 |                                                           |
| --------------- | --------------------------------------------------------- |
| **Sprint**      | [Sprint 4 — Auditoria e entrega](./README.md)             |
| **Owner**       | Dev 3 (Performance & Plataforma)                          |
| **Duração**     | 1 dia                                                     |
| **Prioridade**  | P0                                                        |
| **Branch**      | `dev3-perf/perf-report`                                   |
| **Depende de**  | Sprint 3 inteiro, S0-04 (baseline)                        |
| **Desbloqueia** | Task 07 (seção de performance do README), Task 08 (vídeo) |
| **Requisito**   | Performance e otimização · melhoria no tempo de resposta  |
| **Embasamento** | Arquiteturas Avançadas — Aula 4                           |

---

## Contexto

A spec pede "melhorias no tempo de resposta da aplicação". O relatório prova com números, comparando três pontos: o fim da Fase 2, a baseline do S0-04 e o estado final da Fase 4.

## Implementação

`docs/phase-4/perf/report.md` com:

1. **Lighthouse** (best-of-3, produção e local), páginas `/login`, `/` e `/transactions`, desktop e mobile: Perf, LCP, TBT, CLS.
2. **Bundle:** chunk da federação (com e sem recharts), JS inicial por rota, onde está o zod.
3. **API** (5 mil transações): p50/p95 de lista, busca, overview e resumo; efeito do cache (304 e cache do servidor).
4. **Payload da home:** lista completa → overview.
5. **Busca:** requisições por termo; requisições canceladas.
6. **Navegação:** tempo clique → conteúdo em "Transações" (com e sem preload).
7. **Causalidade:** para cada otimização, qual métrica ela moveu e quanto:

   | Otimização                 | Task  | Métrica                           | Antes → Depois |
   | -------------------------- | ----- | --------------------------------- | -------------- |
   | Índices + agregação em SQL | S1-05 | p95 do resumo                     |                |
   | Overview na home           | S1-05 | payload da home                   |                |
   | Preload de remotes e dados | S2-08 | clique → conteúdo                 |                |
   | Gráficos fora do shell     | S2-09 | JS de `/transactions`, TBT        |                |
   | ETag/304                   | S3-03 | bytes transferidos na revalidação |                |
   | Prefetch no SSR            | S3-04 | LCP mobile                        |                |

8. **Metas do PLAN.md:** atingida / não atingida, com explicação.

## Validação

- [ ] Relatório completo e reproduzível (comandos incluídos)
- [ ] Prints para o vídeo: Network com preload, 304, requisições canceladas, comparação do Lighthouse

## Gotchas

1. Mesma máquina, mesma rede e best-of-3 em todas as medições comparadas.
2. Se uma meta não for atingida, explique o motivo e o próximo passo — relatório honesto vale mais que número maquiado.
