# Task 09 — Pipeline de segurança na CI

|                 |                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 3 — Cache e criptografia](./README.md)                                                                                                             |
| **Owner**       | Dev 1 (Backend & Segurança)                                                                                                                                |
| **Duração**     | 1 dia                                                                                                                                                      |
| **Prioridade**  | P0                                                                                                                                                         |
| **Branch**      | `dev1-sec/ci-security`                                                                                                                                     |
| **Depende de**  | —                                                                                                                                                          |
| **Desbloqueia** | S4-02 (Trivy nas imagens endurecidas), S4-03                                                                                                               |
| **Requisito**   | Segurança no desenvolvimento                                                                                                                               |
| **Embasamento** | Desenvolvimento Seguro — Aula 7 (Dependabot, Snyk/Dependency-Check, Trivy, SonarQube; gates de segurança no CI/CD) e Aula 4 (A06: componentes vulneráveis) |

---

## Contexto

A CI roda lint, type-check, testes, build e E2E, mas nada verifica dependências vulneráveis, segredos commitados, padrões inseguros no código ou vulnerabilidades nas imagens Docker. Achado já conhecido: o script `chromatic` em `packages/design-system/package.json` tem o project token do Chromatic em claro.

## Implementação

1. **Workflow** `.github/workflows/security.yml`:

   ```yaml
   name: Security
   on:
     pull_request: { branches: [phase-4, main] }
     push: { branches: [phase-4, main] }
     schedule: [{ cron: '0 6 * * 1' }]

   jobs:
     dependencies:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v5
         - uses: actions/setup-node@v6
           with: { node-version: '22', cache: 'npm' }
         - run: npm ci
         - run: npm audit --omit=dev --audit-level=high

     secrets:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v5
           with: { fetch-depth: 0 }
         - run: docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source /repo --redact -v

     sast:
       runs-on: ubuntu-latest
       container: semgrep/semgrep
       steps:
         - uses: actions/checkout@v5
         - run: semgrep scan --config p/owasp-top-ten --config p/typescript --config p/react --error

     images:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v5
         - run: docker build -f apps/shell/Dockerfile -t bytebank-shell .
         - uses: aquasecurity/trivy-action@<versão fixada por SHA>
           with:
             image-ref: bytebank-shell
             severity: 'CRITICAL,HIGH'
             exit-code: '1'
             ignore-unfixed: true
   ```

   (repetir o job `images` para os dois MFEs, ou usar matriz)

2. **Dependabot** — `.github/dependabot.yml`:
   ```yaml
   version: 2
   updates:
     - package-ecosystem: npm
       directory: /
       target-branch: phase-4
       schedule: { interval: weekly }
       open-pull-requests-limit: 5
       groups:
         minor-and-patch: { update-types: [minor, patch] }
     - package-ecosystem: github-actions
       directory: /
       target-branch: phase-4
       schedule: { interval: weekly }
     - package-ecosystem: docker
       directories: ['/apps/shell', '/apps/dashboard-mfe', '/apps/transactions-mfe']
       target-branch: phase-4
       schedule: { interval: weekly }
   ```
3. **CodeQL:** se o repositório for público, ativar o "Code scanning — default setup" nas configurações (sem YAML). Se for privado, o Semgrep cobre o SAST.
4. **Token do Chromatic:** trocar o script para `chromatic --project-token=$CHROMATIC_PROJECT_TOKEN`, criar o secret no GitHub, **gerar um token novo** no Chromatic e registrar o antigo como já rotacionado no `.gitleaks.toml` (ele continua no histórico).
5. **Proteção de branch:** incluir o workflow `Security` como check obrigatório na `phase-4`.

## Validação

- [ ] Workflow verde na `phase-4`
- [ ] Num branch de teste, uma dependência vulnerável faz o job `dependencies` falhar; um segredo falso é detectado pelo gitleaks (apagar o branch depois)
- [ ] Dependabot abrindo PRs contra a `phase-4`
- [ ] Token do Chromatic fora do código e rotacionado

## Gotchas

1. Em monorepo, `npm audit` roda na raiz (lockfile único). `--omit=dev` foca no que vai para produção; achados em devDependencies ficam como aviso, não como gate.
2. A GitHub Action oficial do gitleaks pede licença (gratuita) para repositórios de organização; a CLI via Docker não pede.
3. Credenciais de dev conhecidas (`bytebank:bytebank` no compose, `AUTH_SECRET` de teste no `ci.yml`) entram na allowlist do `.gitleaks.toml` com comentário.
4. Fixe actions de terceiros por SHA, não por tag (proteção de supply chain).
5. CodeQL só é gratuito em repositório público.
