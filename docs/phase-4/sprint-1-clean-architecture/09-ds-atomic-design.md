# Task 09 — Design System em Atomic Design

|                 |                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| **Sprint**      | [Sprint 1 — Clean Architecture](./README.md)                                                           |
| **Owner**       | Dev 3 (Performance & Plataforma)                                                                       |
| **Duração**     | 1 dia                                                                                                  |
| **Prioridade**  | P1 (cortável: reduzir à hierarquia do Storybook, sem mover pastas)                                     |
| **Branch**      | `dev3-perf/ds-atomic-design`                                                                           |
| **Depende de**  | —                                                                                                      |
| **Desbloqueia** | S2-09 (subpath de gráficos)                                                                            |
| **Requisito**   | Arquitetura modular                                                                                    |
| **Embasamento** | Princípios e Padrões — Aula 5 (Arquiteturas CSS: Atomic Design, BEM, CSS Modules, Tailwind, CSS-in-JS) |

---

## Contexto

O DS tem cerca de 38 componentes numa pasta plana (`packages/design-system/src/components/`). O Atomic Design organiza a interface em átomos → moléculas → organismos → templates → páginas, deixando explícito o que compõe o quê. O custo é baixo porque todos os consumidores importam do barrel `@bytebank/design-system`.

## Classificação (proposta — ajustar no review)

| Camada     | Componentes                                                                                                                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Átomos     | Button, IconButton, Input, Label, HelperText, Badge, Skeleton, Tooltip, Card, ViewportFix                                                                                                                             |
| Moléculas  | FormField, SearchInput, CurrencyInput, DatePicker, Select, MultiSelect, RangeInput, CategorySelect, FileUpload, AttachmentList, EmptyState, ErrorState, Pagination, KpiCard, ChartTooltip, GoogleAuthButton, UserMenu |
| Organismos | Header, Sidebar, Modal, FeedbackModal, LoginForm, RegisterForm, DashboardWidget, BarChart, LineChart, PieChart, AccessibleChartData, AuthGuard                                                                        |
| Templates  | Opcional: `AuthTemplate` (login/registro) e `DashboardTemplate`; ou documentar que templates e páginas vivem no shell e nos MFEs                                                                                      |

## Implementação

1. Mover as pastas para `src/atoms/`, `src/molecules/`, `src/organisms/` e `src/templates/`. O barrel (`src/index.ts`) continua exportando tudo: nenhum import externo muda.
2. Stories com a nova hierarquia: `title: 'Atoms/Button'`, `'Molecules/FormField'` etc.
3. Página MDX "Arquitetura do Design System":
   - Atomic Design e as regras de dependência entre camadas
   - tokens (tema do Tailwind v4 em `styles/tokens.css`)
   - por que utility-first (Tailwind) e não BEM, CSS Modules ou CSS-in-JS: tabela curta com o conteúdo da aula (escopo, custo de runtime, consistência com tokens, tamanho do CSS)
4. Regra de lint (Task 08): átomo não importa molécula nem organismo; molécula não importa organismo.

## Validação

- [ ] Storybook sobe com a nova hierarquia e a página de arquitetura
- [ ] Testes de stories (`vitest --project storybook`) verdes
- [ ] Apps compilam sem alterar nenhum import
- [ ] Novos baselines do Chromatic aceitos

## Gotchas

1. Renomear o `title` das stories muda os ids no Chromatic: aceite os novos baselines num PR só, para evitar ruído.
2. Mantenha o `index.ts` de cada componente: o barrel depende deles.
3. A separação dos gráficos em subpath (`@bytebank/design-system/charts`) é do S2-09; aqui é só a reorganização.
