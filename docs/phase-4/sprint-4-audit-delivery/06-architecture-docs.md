# Task 06 — Documentação de arquitetura

|                 |                                                                                       |
| --------------- | ------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 4 — Auditoria e entrega](./README.md)                                         |
| **Owner**       | Dev 2 (Arquitetura Front & Estado)                                                    |
| **Duração**     | 1.5 dia                                                                               |
| **Prioridade**  | P0                                                                                    |
| **Branch**      | `dev2-arch/architecture-docs`                                                         |
| **Depende de**  | Sprint 3 inteiro, ADRs 001–006, grafo do S1-08                                        |
| **Desbloqueia** | Task 07 (README), Task 08 (vídeo)                                                     |
| **Requisito**   | Arquitetura modular · Clean Architecture · state management · reatividade (evidência) |
| **Embasamento** | Princípios e Padrões — Aulas 1, 3, 4 e 6 · Arquiteturas Avançadas — Aulas 1 e 3       |

---

## Contexto

A banca avalia arquitetura olhando o código e a documentação. Um documento único, com diagramas que renderizam no GitHub, explica as decisões da fase e serve de base para o README e o vídeo.

## Conteúdo de `docs/phase-4/architecture.md`

1. **Visão geral:** navegador → shell (Vercel) → MFEs (Vercel) → Postgres (Neon) e Blob (diagrama Mermaid)
2. **Camadas e regra de dependência:** diagrama + tabela "pasta → camada"
3. **Grafo de dependências entre pacotes:** `docs/phase-4/assets/dependency-graph.mmd` (S1-08)
4. **Sequência "criar transação com anexo":** UI → máquina de estados → caso de uso de cliente → gateway → rota → caso de uso → repositório / cipher / storage → evento de domínio → invalidação de cache (`sequenceDiagram`)
5. **Estado:** taxonomia (ADR-002) + os padrões em uso (entity adapter, seletores, listeners, otimista, máquina de estados — com o diagrama do S3-07)
6. **Reatividade:** busca, uploads, inatividade e eventos entre MFEs, com o fluxo de operadores de cada stream
7. **Cache em camadas** (ADR-005)
8. **Segurança:** controles por camada + link para `security/owasp-top10.md`
9. **Contratos entre MFEs:** eventos de domínio `version: 1` e porta de navegação
10. **ADRs:** índice com links

## Validação

- [x] Todos os diagramas renderizam com Mermaid 10.9 e 11.4 (os 11 blocos); conferir no GitHub depois do push
- [ ] Revisado pelo Dev 1 e pelo Dev 3
- [x] Linkado a partir do README e do `docs/phase-4/README.md`

## Gotchas

1. Mermaid renderiza no GitHub sem ferramenta extra; evite imagens exportadas que ficam desatualizadas.
2. Gere o grafo de dependências de novo (`npm run arch:graph`) logo antes de fechar o documento.
3. Escreva para quem não participou do projeto: a banca lê sem contexto.

## Implementação e evidências — 2026-11-01

- **Documento:** [`docs/phase-4/architecture.md`](../architecture.md), com as 10 seções pedidas, um glossário curto para a banca, um mapa de padrões de projeto e os comandos de verificação. Cada afirmação aponta para o arquivo de código correspondente.
- **Grafo regenerado** (`npm run arch:graph`) logo antes de fechar o documento. Desde o S1-08 surgiram `stores → core`, `api-client → stores` e `dashboard-mfe → stores/shared`; a direção continua para dentro e o grafo não tem ciclos. `npm run arch:check`: 585 módulos, 1761 dependências, 0 violações.
- **Diagramas:** 11 blocos Mermaid, sem imagens exportadas. Cada bloco foi parseado e renderizado num Chromium (Playwright) com Mermaid 10.9.1 e 11.4.1, que cobrem a faixa de versões do GitHub: 0 falhas. Os diagramas de camadas e da fila de uploads foram redesenhados depois de conferir a legibilidade nas imagens renderizadas.
- **Links:** todos os links relativos resolvem, exceto `security/owasp-top10.md`, que é a entrega da S4-03 e passa a resolver quando ela for mergeada.
- **Pendente:** revisão do Dev 1 (seção 8) e do Dev 3 (seções 1 e 7).
