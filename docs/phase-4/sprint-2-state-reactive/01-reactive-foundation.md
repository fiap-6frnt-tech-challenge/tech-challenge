# Task 01 — Fundação reativa: RxJS, barramento de eventos, hooks

|                 |                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------ |
| **Sprint**      | [Sprint 2 — Estado e reatividade](./README.md)                                                   |
| **Owner**       | Dev 2 (Arquitetura Front & Estado)                                                               |
| **Duração**     | 1.5 dia                                                                                          |
| **Prioridade**  | P0                                                                                               |
| **Branch**      | `dev2-arch/reactive-foundation`                                                                  |
| **Depende de**  | S1-01 (eventos de domínio no core), S0-06 (Spike A)                                              |
| **Desbloqueia** | Tasks 02, 03, 04, 07; S3-08                                                                      |
| **Requisito**   | Programação reativa · comunicação entre MFEs                                                     |
| **Embasamento** | Arquiteturas Avançadas — Aula 3 (Programação Reativa) · Princípios e Padrões — Aula 2 (Observer) |

---

## Contexto

Hoje não há nenhuma programação reativa no projeto: o `rxjs` 7.8.2 só existe como dependência transitiva. Esta task cria a base que as demais usam: o barramento de eventos de domínio (compartilhado entre shell e MFEs) e os hooks que ligam Observables ao React.

## Implementação

1. **Dependência e federação**
   - `rxjs@^7.8` como dependência direta de `@bytebank/stores` (e dos MFEs, se usarem operadores diretamente).
   - Singleton no shell (`lib/federation.ts`: `lib: () => Rx`) e nos dois `rsbuild.config.ts`.
2. **Barramento de eventos** — `packages/stores/src/events/domainEvents.ts`:

   ```ts
   import { Subject, filter, type Observable } from 'rxjs';
   import type { DomainEvent } from '@bytebank/core';

   const bus = new Subject<DomainEvent>();

   export const domainEvents$: Observable<DomainEvent> = bus.asObservable();
   export const publish = (event: DomainEvent) => bus.next(event);
   export const ofType = <T extends DomainEvent['type']>(type: T) =>
     filter(
       (event: DomainEvent): event is Extract<DomainEvent, { type: T }> => event.type === type
     );
   ```

3. **Publicação:** as mutations do `api-client` publicam o evento no `onSuccess` (`transaction.created`, `transaction.updated`, `transaction.deleted`, `attachment.added`, `attachment.removed`).
4. **Hooks** — `packages/stores/src/reactive/`:

   ```ts
   export function useObservable<T>(source$: Observable<T>, initial: T): T {
     const [value, setValue] = useState(initial);
     useEffect(() => {
       const subscription = source$.subscribe(setValue);
       return () => subscription.unsubscribe();
     }, [source$]);
     return value;
   }

   export function useSubscription<T>(source$: Observable<T>, next: (value: T) => void): void;
   export function useEventStream<T>(): [emit: (value: T) => void, stream$: Observable<T>];
   ```

   `useEventStream` transforma um handler do React (`onChange`) num stream estável — base da busca reativa (Task 02).

## Testes

- Marble tests com o `TestScheduler` do RxJS para `ofType` e para os hooks (com `@testing-library/react`).
- Teste de integração: evento publicado pelo api-client chega a um assinante.

## Validação

- [ ] `rxjs` aparece uma vez no bundle (shell provê, MFEs consomem)
- [ ] Evento emitido no transactions-mfe chega ao dashboard-mfe (build de produção)
- [ ] Hooks com teardown correto (sem vazamento em StrictMode)

## Gotchas

1. `source$` precisa de referência estável (`useMemo`), senão o hook reassina a cada render.
2. O StrictMode monta e desmonta duas vezes em dev: toda assinatura precisa de teardown (`unsubscribe`).
3. `Subject` não guarda o último valor: quem assina depois não recebe eventos antigos. Isso é o correto para eventos; para estado atual use `BehaviorSubject`.
4. Não use RxJS para buscar dados do servidor — o TanStack continua dono (ADR-003).
