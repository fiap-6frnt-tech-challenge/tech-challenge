# Task 11 — Smoke Test Final & Vídeo Demo

> ⏳ **Status: Pending**

|                        |                                                                |
| ---------------------- | -------------------------------------------------------------- |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md) |
| **Owner**              | Todos (`Dev 1`, `Dev 2`, `Dev 3`)                              |
| **Duração estimada**   | 0.5 dia                                                        |
| **Branch recomendada** | — (Executado direto na branch de integração `phase-2`)         |
| **Depende de**         | Conclusão de todas as tarefas de 1 a 10 da Sprint 1            |
| **PR só abre**         | Não abre PR. É o fechamento oficial da Sprint 1                |

---

## Dependências

- **O que bloqueia esta tarefa**: Bloqueada por todas as tarefas da Sprint 1 (**Tasks 1 a 10**). O smoke test deve ser a última atividade executada, operando sobre o código integrado final de todas as frentes de trabalho.
- **O que esta tarefa desbloqueia**: Desbloqueia o início oficial da **Sprint 2 (Dashboard MFE)**, atestando que a fundação de segurança e estado da aplicação está completamente estável.

---

## Contexto

Esta é a etapa final da Sprint 1. O objetivo é validar que todas as frentes integradas em `phase-2` funcionam de forma coesa quando executadas em um ambiente limpo e sem resíduos de desenvolvimento local. A sprint só é considerada fechada quando a Matriz de Critérios de Aceite estiver 100% verde, o vídeo de demonstração gravado e a retrospectiva realizada.

---

## Passo-a-passo para Execução do Smoke Test

1. **Clone Limpo**: Em um diretório temporário fora do seu workspace diário, faça um novo clone do repositório:
   ```bash
   git clone https://github.com/fiap-6frnt-tech-challenge/tech-challenge.git test-sprint-1
   cd test-sprint-1
   git checkout phase-2
   ```
2. **Hidratação e Build**: Instale as dependências e compile todo o monorepo:

   ```bash
   npm install
   npm run build
   ```

   _Nenhum warning crítico ou erro de TypeScript ou bundling do Next.js deve acontecer._

3. **Execução Local**: Inicie a aplicação:
   ```bash
   npm run dev
   ```

---

## Matriz de Critérios de Aceite (Definição de Pronto)

Marque cada item à medida que validar em sua máquina local ou em ambiente de homologação:

- [ ] **Acesso Seguro**: Ao tentar abrir `http://localhost:3000/`, a aplicação redireciona você imediatamente para `/login`.
- [ ] **Login Credentials**: Preencher o e-mail fictício e a senha `senha123` faz o login com sucesso e envia você para a home `/`.
- [ ] **Login Google**: Clicar no botão do Google autentica com sucesso através da tela de consentimento e traz de volta para a home.
- [ ] **Persistência de Dados**: Crie uma transação de teste (ex: "Depósito PIX" no valor de R$ 150,00). Recarregue a página (F5) ou reinicie o terminal de execução. A transação continua listada na tela (provando a persistência no KV/Postgres).
- [ ] **Componentes no Storybook**: Execute `npm run storybook -w @bytebank/design-system` e confirme que `LoginForm`, `GoogleAuthButton`, `UserMenu` e `AuthGuard` estão listados com seus stories.
- [ ] **Context API Extinta**: Execute a busca `grep -rn "TransactionsContext" apps/shell/src/` e confirme que não há resquícios.
- [ ] **Suíte de Testes Verde**: A execução de `npx turbo run test` roda todos os testes unitários com 100% de sucesso.

---

## Diretrizes para a Gravação do Vídeo Demo (2 minutos)

A entrega da sprint exige um vídeo demonstrativo gravado pela equipe (com preferência de gravação pelo `Dev 3` e edição/revisão pelo `Dev 2`).

### Roteiro Recomendado:

1. **0:00 - 0:30**: Mostrar a tela de login vazia. Explicar brevemente que a aplicação agora está sob rotas protegidas pelo middleware do NextAuth.
2. **0:30 - 1:00**: Realizar o fluxo de autenticação com o Google OAuth. Mostrar o redirecionamento bem-sucedido para a home. Exibir no Header o componente `UserMenu` com as informações do usuário logado.
3. **1:00 - 1:30**: Criar uma transação nova na interface. Mostrar o feedback visual de sucesso gerenciado pelo Redux Toolkit.
4. **1:30 - 2:00**: Simular o logout do usuário através do menu dropdown, mostrando que ele retorna para a página `/login` impedindo novos acessos a rotas privadas.

---

## Retrospectiva da Sprint

Antes de iniciar a Sprint 2, os 3 membros do time devem se reunir por 45 minutos para alinhar:

- **O que funcionou bem?** (Ex: o spike inicial ajudou a alinhar o uso do Redux Toolkit?).
- **O que foi difícil?** (Ex: concorrência no git, problemas com cookies locais do NextAuth).
- **Ações corretivas para a Sprint 2** (Ex: melhorar o tempo de entrega do Design System para não bloquear as frentes de integração).

Gere um sumário desta retrospectiva em `docs/phase-2/sprint-1/retrospective.md`.
