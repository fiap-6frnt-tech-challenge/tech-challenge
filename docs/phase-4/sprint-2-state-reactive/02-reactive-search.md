# Task 02 — Busca e filtros reativos + cancelamento

|                 |                                                                                    |
| --------------- | ---------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 2 — Estado e reatividade](./README.md)                                     |
| **Owner**       | Dev 3 (Performance & Plataforma)                                                   |
| **Duração**     | 1.5 dia                                                                            |
| **Prioridade**  | P0                                                                                 |
| **Branch**      | `dev3-perf/reactive-search`                                                        |
| **Depende de**  | Task 01, S1-06 (`signal` nos gateways), S1-07 (`useTransactionFilters` refatorado) |
| **Desbloqueia** | S4-04 (métrica de requisições)                                                     |
| **Requisito**   | Programação reativa · interface responsiva · otimização de requisições             |
| **Embasamento** | Arquiteturas Avançadas — Aulas 3 e 4                                               |

---

## Contexto

Hoje o `SearchInput` do DS faz debounce com `setTimeout` (300 ms) e o filtro de valor dispara a cada tecla. Não há descarte de termos repetidos, nem tamanho mínimo, nem cancelamento das requisições que ficaram obsoletas. A task troca isso por um pipeline declarativo, testável com marble tests.

## Implementação

1. **Pipeline puro** (`application/` do transactions-mfe):
   ```ts
   export function searchPipeline(
     input$: Observable<string>,
     scheduler: SchedulerLike = asyncScheduler
   ) {
     return input$.pipe(
       map((q) => q.trim()),
       debounceTime(300, scheduler),
       distinctUntilChanged(),
       filter((q) => q.length === 0 || q.length >= 2)
     );
   }
   ```
2. **Hook** `useSearchStream(onSearch)`: usa `useEventStream` (Task 01), aplica o pipeline e chama `onSearch(q)` → atualiza o filtro (e a URL, via `UrlFilterStorage`).
3. **Filtro de valor** (mínimo/máximo): mesmo padrão, com `debounceTime(400)`. Datas e selects continuam imediatos.
4. **DS:** o `SearchInput` mantém a prop `debounceMs` por compatibilidade, mas passa a ser usado com `debounceMs={0}` (o debounce vira responsabilidade da camada de aplicação).
5. **Cancelamento:** com o `signal` repassado ao `fetch` (S1-06), o TanStack aborta a requisição da chave antiga quando ela fica sem observadores. Conferir na aba Network: status "(canceled)".
6. **Medir:** requisições ao digitar "supermercado" — antes (baseline S0-04) e depois.

## Testes (marble, com `TestScheduler`)

- [x] Digitação rápida emite só o último termo
- [x] O mesmo termo com espaços extras não reemite
- [x] Termo de 1 caractere não emite
- [x] Limpar o campo emite `''` (volta para a lista completa)

## Validação

- [x] 1 requisição por termo estável
- [x] Requisições obsoletas canceladas (evento `requestfailed` anexado ao relatório Playwright; captura da aba Network pode ser feita durante o vídeo)
- [x] Filtros continuam refletidos na URL; recarregar a página restaura o estado
- [x] E2E de filtros verde

**Evidência (2026-10-12):** no build de produção, o E2E digitou `supermercado` em 120 ms/tecla e observou **1 requisição**, igual ao baseline S0-04. Em 400 ms/tecla observou **11 requisições**, uma por prefixo válido de 2 a 12 caracteres, contra **12** no baseline (que também enviava o termo de 1 caractere). Cada prefixo já ficou estável por mais de 300 ms; o resultado correto aqui é uma chamada por prefixo, não uma única chamada para a palavra inteira. Uma resposta retida artificialmente foi abortada ao trocar a chave da query; o E2E registra a falha de rede como anexo. O build e os 14 cenários E2E passaram em Chromium e Firefox, sem perda de caracteres. URL, reload e limpeza foram testados com busca e valor mínimo.

## Gotchas

1. O input é a fonte do stream e a URL é consequência. Inicialize o input a partir da URL uma única vez, para evitar o loop input → URL → input.
2. `distinctUntilChanged` vem **depois** do `trim`, senão "me" e "me " contam como termos diferentes.
3. O botão "Limpar filtros" reinicia as assinaturas dos streams imediatamente. Isso cancela debounces pendentes e limpa o histórico do `distinctUntilChanged`, permitindo digitar o mesmo termo ou valor após limpar.
4. O cancelamento só acontece se o `queryFn` repassar o `signal` ao `fetch` — confirme no gateway.
