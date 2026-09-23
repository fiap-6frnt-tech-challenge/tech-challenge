# Task 07 — README final

|                 |                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------ |
| **Sprint**      | [Sprint 4 — Auditoria e entrega](./README.md)                                                    |
| **Owner**       | Dev 3 (Performance & Plataforma)                                                                 |
| **Duração**     | 1 dia                                                                                            |
| **Prioridade**  | P0                                                                                               |
| **Branch**      | `dev3-perf/readme`                                                                               |
| **Depende de**  | Tasks 03, 04, 06                                                                                 |
| **Desbloqueia** | Task 09 (release)                                                                                |
| **Requisito**   | README com tecnologias utilizadas e passo a passo para rodar localmente (entregável obrigatório) |

---

## Contexto

O README da raiz descreve a Fase 2. A spec da Fase 4 exige explicitamente **tecnologias utilizadas** e **passo a passo para rodar localmente**, e as variáveis de ambiente novas (chaves de criptografia etc.) precisam estar documentadas, senão um clone limpo não sobe.

## Estrutura (atualizar o README existente)

1. **Sobre:** Bytebank — Fases 2 e 4; links para a aplicação e para o vídeo da Fase 4
2. **Funcionalidades:** as da Fase 2 + o que a Fase 4 trouxe (segurança, cache, reatividade, performance)
3. **Tecnologias** (tabela): Next.js 16, React 19, TypeScript, Turborepo, Module Federation (`@module-federation/enhanced` + Rsbuild), Redux Toolkit, TanStack Query, RxJS, Zod, NextAuth v5, Drizzle + Postgres, Vercel Blob, Recharts, Tailwind v4, Storybook, Vitest, Playwright, Docker, GitHub Actions, ferramentas de segurança (npm audit, Dependabot, CodeQL/Semgrep, gitleaks, Trivy, OWASP ZAP)
4. **Arquitetura:** resumo das camadas + links para `docs/phase-4/architecture.md` e os ADRs
5. **Pré-requisitos** (manter a nota do Visual C++ Redistributable no Windows)
6. **Passo a passo local:**
   - variáveis novas com o comando de geração: `DATA_ENCRYPTION_KEYS`, `DATA_ENCRYPTION_ACTIVE_KEY_ID`, `BLIND_INDEX_KEY`, `HIBP_ENABLED`, `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES`, `CSP_MODE`, `LOCAL_UPLOADS_DIR`, limites do rate limit
   - migrações, scripts de backfill e seed
   - `npm run dev` e o Docker Compose (portas novas dos MFEs)
7. **Testes:** unitários, Storybook, E2E, `arch:check`, varreduras de segurança locais (comando do ZAP)
8. **Segurança:** resumo dos controles + link para a auditoria OWASP
9. **Performance:** tabela antes/depois resumida + link para o relatório
10. **Estrutura do projeto:** árvore resumida

## Validação

- [ ] Outro membro do time, numa máquina (ou clone) limpa, sobe tudo seguindo **só** o README
- [ ] `.env.example` completo, com instrução de geração para cada chave
- [ ] Links (aplicação, vídeo, documentos) funcionando

## Gotchas

1. Nunca commitar chaves reais: só o `.env.example`.
2. Deixe claro que as chaves de criptografia precisam ser as mesmas entre reinícios; trocar a chave sem rotação torna anexos e e-mails ilegíveis.
3. Teste o README **de verdade** num clone limpo — é o que a banca faz.
