# Task 03 — Auditoria OWASP + varredura com OWASP ZAP

|                 |                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 4 — Auditoria e entrega](./README.md)                                                                        |
| **Owner**       | Dev 1 (Backend & Segurança) — Dev 2 apoia nas correções                                                              |
| **Duração**     | 1.5 dia                                                                                                              |
| **Prioridade**  | P0                                                                                                                   |
| **Branch**      | `dev1-sec/owasp-audit`                                                                                               |
| **Depende de**  | Sprint 3 inteiro, Tasks 01 e 02                                                                                      |
| **Desbloqueia** | Task 07 (seção de segurança do README), Task 08 (vídeo)                                                              |
| **Requisito**   | Segurança no desenvolvimento · autenticação segura · criptografia                                                    |
| **Embasamento** | Desenvolvimento Seguro — Aula 4 (OWASP Top 10, ZAP, ASVS, Cheat Sheets) e Aula 7 (ferramentas estáticas e dinâmicas) |

---

## Contexto

A banca precisa ver que a segurança foi verificada, não só implementada. A auditoria mapeia cada categoria do OWASP para o que foi feito, com evidência, e o ZAP testa a aplicação rodando (DAST).

## Implementação

1. **`docs/phase-4/security/owasp-top10.md`** — use a edição mais recente do OWASP Top 10 disponível, mais o **API Security Top 10 (2023)** e os itens citados na aula (XSS, CSRF). Colunas: Categoria · Risco no Bytebank · Controle implementado · Evidência (teste, arquivo, print) · Status.

   Linhas já conhecidas:

   | Categoria                         | Controle                                                                                 | Evidência                         |
   | --------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------- |
   | Broken Access Control / API1 BOLA | Autorização por dono nos casos de uso; 404 para recurso alheio                           | S0-02, testes de autorização, E2E |
   | API3 BOPLA (mass assignment)      | `z.strictObject`; `userId` só da sessão                                                  | S0-03                             |
   | Falhas criptográficas             | AES-256-GCM (anexos, dados pessoais), HSTS, bcrypt 12                                    | S3-01, S3-02, S2-06               |
   | Injeção                           | Drizzle parametrizado (inclusive o `ilike` da busca)                                     | revisão + Semgrep                 |
   | XSS                               | Escape do React + CSP com nonce                                                          | S3-05                             |
   | Configuração insegura             | Headers, CORS só em dev, containers não-root, Postgres local                             | S3-05, Task 02                    |
   | Componentes vulneráveis           | `npm audit` como gate, Dependabot, Trivy                                                 | S3-09                             |
   | Falhas de autenticação            | Rate limit/bloqueio, HIBP, expiração/revogação, MFA (se feito)                           | S2-05 → S2-07, S3-10              |
   | Integridade de software e dados   | Lockfile, actions fixadas por SHA, tag do GCM                                            | S3-09, S3-01                      |
   | Falhas de log e monitoramento     | Logs de segurança com redação                                                            | Task 01                           |
   | SSRF                              | A rota de download só busca referências do próprio storage, nunca URLs vindas do usuário | S3-01                             |
   | CSRF                              | Checagem de `Origin`/`Sec-Fetch-Site`, `SameSite=Lax`, token do NextAuth                 | S3-05                             |
   | API4 consumo de recursos          | `perPage ≤ 100`, limite de corpo, upload ≤ 5 MB, rate limit                              | S0-03, S2-05                      |

2. **ZAP baseline** (passivo) contra o build local de produção (compose):
   ```bash
   docker run --rm --add-host=host.docker.internal:host-gateway \
     -v "$PWD/docs/phase-4/security:/zap/wrk:rw" -t zaproxy/zap-stable \
     zap-baseline.py -t http://host.docker.internal:3000 -r zap-baseline.html -J zap-baseline.json
   ```
   Para cobrir páginas autenticadas, injete o cookie de sessão com o replacer do ZAP (`-z "-config replacer.full_list(0)..."`, header `Cookie`).
3. **Corrigir** achados High e Medium; justificar Low e Informational (ex.: `style-src 'unsafe-inline'`).
4. **Checklist ASVS nível 1 (subconjunto):** V2 Autenticação, V3 Sessão, V4 Controle de acesso, V5 Validação, V6 Criptografia, V7 Logs, V12 Arquivos, V14 Configuração.

## Validação

- [ ] `owasp-top10.md` completo, com evidência em cada linha
- [ ] Relatório do ZAP salvo em `docs/phase-4/security/`, sem achados High
- [ ] Checklist ASVS preenchido
- [ ] Correções dos achados mergeadas

## Gotchas

1. **Nunca** rode varredura ativa (`zap-full-scan`) contra a produção (Vercel/Neon): só contra o ambiente local.
2. No Linux, `host.docker.internal` precisa do `--add-host=host.docker.internal:host-gateway` (já no comando acima).
3. O ZAP costuma apontar headers ausentes nos assets dos MFEs servidos pelo nginx: resolva no `nginx.conf` (Task 02).
4. Registre também o que foi **encontrado e corrigido** durante a fase (o IDOR do S0-02): isso demonstra processo, não só resultado.
