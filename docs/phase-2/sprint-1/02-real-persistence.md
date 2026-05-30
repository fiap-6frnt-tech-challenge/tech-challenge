# Task 2 — Integração com o Backend Oficial da Pós

> ⏳ **Status: Pending**

|                        |                                                                       |
| ---------------------- | --------------------------------------------------------------------- |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)        |
| **Owner**              | `Dev 1`                                                               |
| **Duração estimada**   | 2 dias                                                                |
| **Branch recomendada** | `dev1/backend-integration`                                            |
| **Depende de**         | [Task 1 — Spike Redux Toolkit/Query](./01-spike-redux-query.md)       |
| **PR só abre**         | Após validar o fluxo de proxy BFF de usuários e transações localmente |

---

## Dependências

- **O que bloqueia esta tarefa**: Bloqueada pela **Task 1 (Spike Técnico)**.
- **O que esta tarefa desbloqueia**: Desbloqueia a **Task 6 (Schema Evoluído)** e fornece as rotas do BFF para a **Task 3 (NextAuth Setup)**.

---

## Contexto

A pós-tech disponibilizou o repositório [israelmeinert/tech-challenge-2](https://github.com/israelmeinert/tech-challenge-2) contendo o backend oficial em Node/Express com persistência no MongoDB, suportando cadastro, autenticação JWT, busca de transações por conta e criação de transações.

Para evitar CORS, simplificar o roteamento e manter o token de acesso seguro no servidor, usaremos o **Next.js Shell como BFF (Backend-For-Frontend)**. Esta tarefa consiste em configurar a execução do backend (localmente via Docker) e implementar as rotas BFF Proxy locais no shell Next.js (`apps/shell/src/app/api/*`).

---

## Pré-condições

- Estar na branch `dev1/backend-integration`.
- Ter o Docker instalado localmente na máquina de desenvolvimento.
- Clonar o repositório do backend: `git clone https://github.com/israelmeinert/tech-challenge-2.git`.

---

## Implementação passo-a-passo

### 1. Executar o Backend da Pós Localmente

No diretório onde o backend oficial foi clonado, execute:

```bash
# Via Docker
docker build -t tech-challenge-backend .
docker run -d -p 3000:3000 --name bytebank-backend tech-challenge-backend
```

_(Nota: Certifique-se de que a porta 3000 está livre ou mapeie para outra porta e configure no env. Caso execute sem docker, rode `npm install` e `npm run dev` após subir uma instância local do MongoDB)._

### 2. Configurar Variáveis de Ambiente no Shell

No arquivo `apps/shell/.env.local`, configure a URL base do backend oficial:

```env
NEXT_PUBLIC_BACKEND_API_URL="http://localhost:3000"
```

### 3. Implementar as Rotas BFF Proxy no Shell Next.js

As rotas da API local do shell (`apps/shell/src/app/api/*`) devem encaminhar as requisições para o backend da pós anexando o JWT da sessão do usuário logado.

#### 3.1. BFF de Cadastro de Usuário (`apps/shell/src/app/api/user/route.ts`)

```typescript
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ message: 'Erro ao conectar ao backend' }, { status: 500 });
  }
}
```

#### 3.2. BFF de Transações (`apps/shell/src/app/api/transactions/route.ts`)

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/auth'; // NextAuth v5 helper para ler sessão no servidor

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:3000';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    // Busca a conta e transações associadas
    const res = await fetch(`${BACKEND_URL}/account`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const data = await res.json();
    // O backend retorna as transações dentro do result.transactions
    const transactions = data.result?.transactions ?? [];

    return NextResponse.json(transactions, { status: res.status });
  } catch (error) {
    return NextResponse.json({ message: 'Erro ao buscar transações' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    // Envia a transação vinculando a conta do usuário
    const res = await fetch(`${BACKEND_URL}/account/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        accountId: session.user.accountId, // Adicionado no token JWT no login
        type: body.type, // 'Credit' | 'Debit'
        value: body.value, // Negativo para Debit, Positivo para Credit
        from: body.from ?? 'default',
        to: body.to ?? 'default',
        anexo: body.anexo ?? '', // URL do anexo no Vercel Blob
      }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ message: 'Erro ao criar transação' }, { status: 500 });
  }
}
```

---

## Validação

- [ ] Execute o container do backend da pós: `docker ps` mostra o container ativo na porta 3000.
- [ ] Execute `npm run dev -w @bytebank/shell` e valide as rotas do BFF usando ferramentas HTTP (Postman/cURL):
  - Criar um usuário via `POST http://localhost:3000/user` (direto) ou pelo BFF `POST http://localhost:3000/api/user`.
  - Simular o login obtendo o token JWT.
  - Chamar `GET http://localhost:3000/api/transactions` passando a sessão mockada (ou autenticado no navegador) e verificar se retorna a lista de transações corretamente do MongoDB da pós.
- [ ] Tipos TypeScript definidos em `@bytebank/shared` estão sincronizados com a resposta da API oficial.

---

## Gotchas

1. **Formatos de Valor**: No backend oficial, valores de débito devem ser criados e retornados como números negativos (ex: `-200`), e depósitos/créditos como positivos (ex: `200`). Garanta que os inputs e a UI lidem corretamente com esse padrão.
2. **CORS no Backend**: Como o shell Next.js realiza as chamadas a partir de seu código de servidor (Server Components ou API Routes/BFF), não há bloqueios de CORS do browser ao bater no backend da pós.

---

## Próximo passo

→ **Prosseguir para a alteração estrutural do payload de transações na [Task 3 — Schema de Transação Evoluído](./06-evolved-schema.md).**
