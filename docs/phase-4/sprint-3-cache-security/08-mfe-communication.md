# Task 08 — Comunicação entre MFEs: navegação e eventos

|                 |                                                                 |
| --------------- | --------------------------------------------------------------- |
| **Sprint**      | [Sprint 3 — Cache e criptografia](./README.md)                  |
| **Owner**       | Dev 2 (Arquitetura Front & Estado)                              |
| **Duração**     | 1.5 dia                                                         |
| **Prioridade**  | P1                                                              |
| **Branch**      | `dev2-arch/mfe-communication`                                   |
| **Depende de**  | S2-01 (barramento de eventos), S2-08 (helpers de preload)       |
| **Desbloqueia** | S4-06 (contratos entre MFEs)                                    |
| **Requisito**   | Arquitetura modular · programação reativa · pré-carregamento    |
| **Embasamento** | Princípios e Padrões — Aula 3 · Arquiteturas Avançadas — Aula 3 |

---

> **Notas do S0-06 (2026-09-30)** — evidências do [Spike A](../sprint-0-foundation/06-risk-spikes.md#spike-a--evidências-e-aprendizados) e do [Spike B](../sprint-0-foundation/06-risk-spikes.md#spike-b--evidências-e-aprendizados).
>
> - **Parte B:** o barramento singleton foi validado no Spike A. Em build de produção, um evento publicado no transactions-mfe chegou ao dashboard-mfe, sem precisar do fallback com `CustomEvent`.
> - **Parte A, `prefetch`:** em rota dinâmica sem `loading.tsx`, o `router.prefetch` não traz o RSC da página. No Spike B, o clique em `/transactions` dinâmica ainda esperou ~400 ms de roundtrip antes de o remote começar a carregar. O preload do remote (S2-08) só aparece no tempo total quando o carregamento passa de ~300 ms.

## Contexto

- No `AccountOverview.tsx` (transactions-mfe), "Todas as transações" é um `<a href="/transactions">` com um `<Button>` dentro: **recarrega a página inteira** (baixa e executa o shell de novo) e aninha elementos interativos (problema de acessibilidade). O MFE não pode usar `next/navigation` (alias para `false` no rsbuild).
- O dashboard não reage visualmente quando uma transação é criada em outro MFE: só atualiza os números quando o TanStack refaz a busca.

## Parte A — porta de navegação

```ts
// core: application/ports/NavigationPort.ts
export interface NavigationPort {
  navigate(path: string): void;
  prefetch(path: string): void;
}

// @bytebank/stores (singleton compartilhado): registro com fallback
let current: NavigationPort = {
  navigate: (path) => window.location.assign(path),
  prefetch: () => {},
};

export const navigation = {
  register: (impl: NavigationPort) => {
    current = impl;
  },
  navigate: (path: string) => current.navigate(path),
  prefetch: (path: string) => current.prefetch(path),
};
```

- O shell registra a implementação com o router do Next num componente `NavigationBridge`: `navigate → router.push`, `prefetch → router.prefetch` + preload do remote da rota (S2-08).
- No MFE, o link continua sendo um `<a href>` real (estilizado como botão, sem `<Button>` dentro): clique simples → `preventDefault` + `navigation.navigate(href)`; `onMouseEnter`/`onFocus` → `navigation.prefetch(href)`.
- No bootstrap standalone do MFE vale o fallback (`window.location`).

## Parte B — reações a eventos de domínio

- O dashboard assina `domainEvents$` (`transaction.*`) e anuncia "Dashboard atualizado" via `aria-live`, com destaque breve nos KPIs que mudaram (transição CSS respeitando `prefers-reduced-motion`).
- Os números continuam vindo do TanStack (invalidação): o evento só dispara a reação visual.
- **Contrato documentado** em `docs/phase-4/architecture.md` (S4-06): união de eventos `version: 1` + porta de navegação.

## Testes

- [ ] Registro de navegação: fallback, troca de implementação
- [ ] Link do MFE chama `navigate` no clique simples e deixa o navegador agir com Ctrl/Cmd+clique
- [ ] Dashboard reage a `transaction.created` (teste de render)

## Validação

- [ ] Home → "Todas as transações" sem recarregar a página (a aba Network não mostra um novo documento)
- [ ] Hover no link pré-carrega o remote de transações
- [ ] Criar transação na home anuncia e destaca a atualização no dashboard

## Gotchas

1. Nada de `next/navigation` no MFE (alias `false` no rsbuild); por isso a porta.
2. Mantenha o `href` real (acessível, funciona sem JS, abre em nova aba). Só intercepte clique simples sem modificadores (`metaKey`, `ctrlKey`, `shiftKey`, botão do meio).
3. Evento é notificação, não fonte de dados: quem atualiza os números é o TanStack.
4. Versionar o contrato (`version: 1`) permite evoluir os eventos sem quebrar um MFE publicado antes do outro.
