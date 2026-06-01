# Bytebank — Gerenciamento Financeiro

Frontend de gestão financeira pessoal construído como monorepo (Turborepo) com Next.js 16, Design System próprio e persistência em PostgreSQL via Drizzle ORM, desenvolvido como tech challenge da pós-graduação FIAP Frontend Engineering.

🚀 **[Acessar aplicação →](https://fiap-6frnt-tech-challenge.vercel.app/)**

![Home — desktop](docs/screenshots/home-desktop.png)

---

## Funcionalidades

- **Dashboard** — saldo da conta com toggle de visibilidade e lista das transações mais recentes
- **Lista de transações** — filtros por tipo, intervalo de datas e ordenação; paginação server-side via Next.js API Routes; estado persiste na URL via query params
- **CRUD completo** — adicionar, editar e excluir transações com modais de confirmação e feedback visual
- **Design System** — biblioteca de componentes documentada no Storybook com tokens de cor, tipografia e espaçamento
- **Persistência real** — PostgreSQL + Drizzle ORM; seed de dados iniciais incluído

---

## Pré-requisitos

| Ferramenta | Versão mínima |
| ---------- | ------------- |
| Node.js    | 20+           |
| npm        | 10+           |
| Docker     | 24+           |

> **Atenção:** Se você tiver um PostgreSQL instalado localmente rodando na porta **5432**, ele vai conflitar com o container Docker. Pare o serviço antes de subir o projeto:
>
> - **Windows (serviço):** `Stop-Service postgresql-x64-*` (PowerShell como administrador)
> - **macOS/Linux:** `brew services stop postgresql` ou `sudo systemctl stop postgresql`

---

## Instalação e execução

### 1. Clonar o repositório

```bash
git clone git@github.com:fiap-6frnt-tech-challenge/tech-challenge.git
cd tech-challenge
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp apps/shell/.env.example apps/shell/.env.local
```

O arquivo `.env.example` já contém os valores corretos para desenvolvimento local.
Apenas crie um novo arquivo `.env.local` copiando os valores do `.env.example`
Nenhuma edição é necessária se você estiver rodando com Docker.

### 4. Subir o banco de dados

```bash
docker compose up -d db
```

Aguarde o container ficar `healthy` (alguns segundos). Você pode verificar com:

```bash
docker compose ps
```

### 5. Executar as migrations

```bash
npm run db:migrate -w @bytebank/shell
```

### 6. Popular o banco com dados iniciais

```bash
npm run db:seed -w @bytebank/shell
```

### 7. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Abre o shell (Next.js) em `http://localhost:3000`. A API é servida pelo próprio Next.js em `/api/transactions`.

---

## Scripts disponíveis

### Raiz do monorepo

| Comando          | Descrição                                    |
| ---------------- | -------------------------------------------- |
| `npm run dev`    | Inicia todos os apps em paralelo (Turborepo) |
| `npm run build`  | Build de produção de todos os pacotes e apps |
| `npm run lint`   | Executa o ESLint em todo o monorepo          |
| `npm run test`   | Executa todos os testes (Vitest)             |
| `npm run format` | Formata todos os arquivos com Prettier       |

### Shell (`-w @bytebank/shell`)

| Comando                                        | Descrição                                     |
| ---------------------------------------------- | --------------------------------------------- |
| `npm run dev -w @bytebank/shell`               | Inicia o Next.js em `http://localhost:3000`   |
| `npm run build -w @bytebank/shell`             | Build de produção                             |
| `npm run db:generate -w @bytebank/shell`       | Gera arquivos de migration a partir do schema |
| `npm run db:migrate -w @bytebank/shell`        | Aplica as migrations no banco                 |
| `npm run db:seed -w @bytebank/shell`           | Popula o banco com dados iniciais             |
| `npm run storybook -w @bytebank/design-system` | Abre o Storybook em `http://localhost:6006`   |

---

## Variáveis de ambiente

Todas as variáveis ficam em `apps/shell/.env.local` (criado no passo 3).

| Variável                    | Obrigatória | Descrição                             | Padrão (local)                                         |
| --------------------------- | ----------- | ------------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`              | **Sim**     | Connection string do PostgreSQL       | `postgres://bytebank:bytebank@localhost:5432/bytebank` |
| `NEXT_PUBLIC_API_URL`       | Não         | URL base da API interna               | `/api`                                                 |
| `NEXT_PUBLIC_HELLO_MFE_URL` | Não         | URL do manifest do MFE hello (PoC MF) | `http://localhost:3001/mf-manifest.json`               |

---

## Estrutura do monorepo

```
tech-challenge/
├── apps/
│   ├── shell/          # Next.js 16 — app principal (porta 3000)
│   └── hello-mfe/      # Rsbuild — PoC Module Federation (porta 3001)
│
├── packages/
│   ├── design-system/  # Componentes, tokens e Storybook
│   ├── shared/         # Tipos, constantes e utilitários compartilhados
│   ├── stores/         # Redux Toolkit slices e RTK Query
│   └── api-client/     # Cliente HTTP tipado para a API do shell
│
├── docker-compose.yml  # PostgreSQL 16 para desenvolvimento local
└── turbo.json          # Configuração do Turborepo
```

---

## Tech stack

| Preocupação          | Escolha                    | Motivo                                                      |
| -------------------- | -------------------------- | ----------------------------------------------------------- |
| Monorepo             | Turborepo + npm workspaces | Build incremental, execução paralela de tasks               |
| Framework            | Next.js 16 (App Router)    | Exigência do challenge                                      |
| Linguagem            | TypeScript                 | Type safety, melhor DX e autocompletar                      |
| Estilização          | Tailwind CSS v4            | Utility-first, integração nativa com Design System          |
| Design System        | Custom + Storybook         | Exigência do challenge; tokens CSS para consistência visual |
| Banco de dados       | PostgreSQL 16 (Docker)     | Persistência real em desenvolvimento                        |
| ORM                  | Drizzle ORM                | Type-safe, migrations versionadas, zero overhead            |
| Gerenciamento estado | Redux Toolkit + RTK Query  | Estado global tipado e cache de dados do servidor           |
| Formulários          | React Hook Form + Zod      | Validação leve com inferência de tipos a partir do schema   |
| API                  | Next.js API Routes         | REST API integrada ao Next.js, sem servidor externo         |
| Ícones               | Lucide React               | Consistente, tree-shakeable                                 |
| Testes               | Vitest                     | Testes unitários e de componente                            |
| Commit hooks         | Husky + lint-staged        | Garante lint e formatação em todo commit                    |

---

## Design System

Biblioteca de componentes documentada com variantes, props, acessibilidade e exemplos interativos.

📖 **[Acessar Storybook →](https://phase-1--69d58ff921fbab085884a584.chromatic.com/)**

Destaques:

- **Tokens de design** — cores, espaçamento, tipografia e sombras via CSS custom properties
- **Acessibilidade** — WCAG 2.1 AA: ARIA, navegação por teclado, foco gerenciado nos modais
- **Responsivo** — mobile-first: 375px · 768px · 1024px+

---

## Screenshots

### Home — desktop (1280px)

![Home desktop](docs/screenshots/home-desktop.png)

### Home — mobile (375px)

![Home mobile](docs/screenshots/home-mobile.png)

### Transações — desktop (1280px)

![Transactions page](docs/screenshots/transactions-desktop.png)

### Modal — Confirmar nova transação

![Confirm transaction modal](docs/screenshots/modal-new-transaction.png)

### Modal — Transação adicionada com sucesso

![Success feedback modal](docs/screenshots/modal-success.png)
