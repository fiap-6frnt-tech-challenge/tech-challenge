# Task 05 — ADRs da arquitetura alvo

|                 |                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 0 — Fundação](./README.md)                                                                          |
| **Owner**       | Dev 2 (Arquitetura Front & Estado)                                                                          |
| **Duração**     | 1 dia                                                                                                       |
| **Prioridade**  | P0                                                                                                          |
| **Branch**      | `dev2-arch/adrs`                                                                                            |
| **Depende de**  | —                                                                                                           |
| **Desbloqueia** | Task 06, Sprint 1 inteiro                                                                                   |
| **Requisito**   | Arquitetura modular · Clean Architecture · state management · cache · criptografia                          |
| **Embasamento** | Princípios e Padrões — Aulas 1 e 6 · Arquiteturas Avançadas — Aulas 1 e 2 · Desenvolvimento Seguro — Aula 1 |

---

## Contexto

A fase mexe em todas as camadas. Sem decisões registradas, cada dev inventa um padrão diferente. ADRs curtos (uma página cada) fixam as regras antes do Sprint 1 e depois alimentam o README e o vídeo.

## ADRs a escrever (`docs/phase-4/adr/`)

| ADR | Tema                            | Decisão a registrar                                                                                                                                                                                                                                                                |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001 | Camadas e pacotes               | `@bytebank/core` (domínio + aplicação, TS puro) · infraestrutura no shell (`src/server/infrastructure`) e no `api-client` (gateways) · apresentação = rotas finas, páginas, componentes, view-models · regra de dependência · strangler do `@bytebank/shared` · GraphQL descartado |
| 002 | Taxonomia de estado             | Servidor (TanStack) · global do cliente (Redux: entity adapter, seletores, listeners) · URL (filtros) · formulários (RHF) · fluxos (máquina de estados) · streams (RxJS) · local (`useState`)                                                                                      |
| 003 | Programação reativa             | RxJS onde há **stream de eventos** (input, upload, inatividade, eventos entre MFEs); **não** substitui o TanStack para dados do servidor                                                                                                                                           |
| 004 | Criptografia de dados sensíveis | O que cifrar: arquivos de anexo, nome e referência do anexo, e-mail e nome do usuário. O que não cifrar: descrição e valor (busca e filtros em SQL). AES-256-GCM + AAD por registro · blind index HMAC · chaves versionadas em env · rotação                                       |
| 005 | Cache em camadas                | ETag/304 + `private, no-cache` · cache no servidor por usuário com tags · TanStack por tipo de dado · assets `immutable` · **não** persistir dado financeiro no navegador                                                                                                          |

O ADR-006 (Sessão e autenticação) é escrito no S2-07.

O ADR-001 traz o diagrama Mermaid da arquitetura alvo; pode partir do diagrama do [PLAN.md](../PLAN.md#arquitetura-alvo).

## Formato (template do S0-01)

- **Status:** proposto / aceito / substituído por ADR-NNN
- **Contexto:** o problema, com referência ao código atual
- **Decisão:** frase direta ("Usaremos X para Y")
- **Alternativas consideradas:** 2–3, com o motivo de não escolha
- **Consequências:** positivas e negativas (trade-offs honestos)
- **Referências:** aulas da fase, docs oficiais

## Validação

- [ ] 5 ADRs num PR, revisados pelo Dev 1 e pelo Dev 3
- [ ] Diagrama da arquitetura alvo renderizando no GitHub
- [ ] Aprovados no gate (status "aceito")

## Gotchas

1. ADR não é documentação exaustiva: uma página, decisão clara. O detalhe vai nas tasks.
2. Registre trade-offs honestos (o ADR-004 aceita a descrição em claro para manter a busca). Decisão justificada vale mais que decisão "perfeita".
3. Escreva pensando no reaproveitamento: os ADRs viram seções da documentação de arquitetura (S4-06), do README (S4-07) e falas do vídeo (S4-08).
