# Task 7 — Criar stores Zustand em packages/stores

> ⏳ **Status: Pending**

|                        |                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)                          |
| **Owner**              | `Dev 3`                                                                                 |
| **Duração estimada**   | 1 dia                                                                                   |
| **Branch recomendada** | `dev3/packages-stores`                                                                  |
| **Depende de**         | [Task 3 — NextAuth Setup](./03-nextauth-setup.md)                                       |
| **PR só abre**         | Após todos os testes unitários do Vitest para as duas stores passarem com sucesso em CI |

---

## Contexto

Para desacoplar as regras de estado puramente cliente da UI e garantir que os Microfrontends possam ler/escrever em dados comuns, migraremos o estado de autenticação (vindo do NextAuth) e o estado global de componentes da interface (como o painel de filtros e os modais de feedback) para o **Zustand**.

Essas stores viverão no pacote compartilhado `@bytebank/stores`, garantindo tipagem consistente em todo o monorepo.

---

## Dependências

- **O que bloqueia esta tarefa**: Bloqueada pela **Task 3 (NextAuth Setup)** entregue pelo Dev 2. A store `useAuthStore` necessita importar callbacks e estruturas de sessão do NextAuth local para sincronizar e disparar o `signOut`.
- **O que esta tarefa desbloqueia**: Desbloqueia a **Task 9 (Migração Context)**, pois a remoção do `FeedbackContext` depende diretamente da importação do `useUIStore` fornecido por este pacote.

---

## Pré-condições

- Estar na branch `dev3/packages-stores`.
- Instalar as dependências de execução e testes em `packages/stores`:
  ```bash
  npm install zustand -w @bytebank/stores
  npm install -D vitest @testing-library/react -w @bytebank/stores
  ```

---

## Implementação passo-a-passo

### 1. Criar `useAuthStore` (`packages/stores/src/useAuthStore.ts`)

Esta store sincroniza a sessão do NextAuth com o estado cliente e disponibiliza utilitários de logout:

```typescript
import { create } from 'zustand';
import { signOut } from 'next-auth/react';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface AuthState {
  user: UserSession | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setSession: (user: UserSession | null) => void;
  logout: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,

  setSession: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),

  logout: async () => {
    set({ user: null, isAuthenticated: false });
    // Executa a invalidação de cookies no NextAuth
    await signOut({ callbackUrl: '/login' });
  },
}));
```

---

### 2. Criar `useUIStore` (`packages/stores/src/useUIStore.ts`)

Esta store controla a exibição de barras de controle, painéis laterais de filtro e o sistema global de alertas/erros:

```typescript
import { create } from 'zustand';

export interface FeedbackMessage {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface UIState {
  filterPanelOpen: boolean;
  feedback: FeedbackMessage | null;
}

interface UIActions {
  setFilterPanelOpen: (open: boolean) => void;
  toggleFilterPanel: () => void;
  showFeedback: (feedback: FeedbackMessage) => void;
  hideFeedback: () => void;
}

export type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  filterPanelOpen: false,
  feedback: null,

  setFilterPanelOpen: (open) => set({ filterPanelOpen: open }),
  toggleFilterPanel: () => set((state) => ({ filterPanelOpen: !state.filterPanelOpen })),
  showFeedback: (feedback) => set({ feedback }),
  hideFeedback: () => set({ feedback: null }),
}));
```

---

### 3. Configurar exports em `packages/stores/src/index.ts`

Substitua o stub existente no barrel export pelo conteúdo:

```typescript
export * from './useAuthStore';
export * from './useUIStore';
```

---

### 4. Escrever Testes Unitários

Crie a pasta de testes para validar o funcionamento estático das stores usando Vitest:

##### `packages/stores/src/useUIStore.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset da store antes de cada teste
    useUIStore.setState({ filterPanelOpen: false, feedback: null });
  });

  it('deve inicializar com valores padrão', () => {
    const state = useUIStore.getState();
    expect(state.filterPanelOpen).toBe(false);
    expect(state.feedback).toBeNull();
  });

  it('deve alternar o painel de filtros', () => {
    useUIStore.getState().toggleFilterPanel();
    expect(useUIStore.getState().filterPanelOpen).toBe(true);

    useUIStore.getState().setFilterPanelOpen(false);
    expect(useUIStore.getState().filterPanelOpen).toBe(false);
  });

  it('deve gerenciar feedbacks com sucesso', () => {
    const feedbackPayload = { type: 'success' as const, title: 'Sucesso', message: 'Tudo OK' };

    useUIStore.getState().showFeedback(feedbackPayload);
    expect(useUIStore.getState().feedback).toEqual(feedbackPayload);

    useUIStore.getState().hideFeedback();
    expect(useUIStore.getState().feedback).toBeNull();
  });
});
```

Adicione o script de teste ao `packages/stores/package.json`:

```json
"scripts": {
  "test": "vitest run"
}
```

Rode os testes localmente:

```bash
npm run test -w @bytebank/stores
```

---

## Validação

- [ ] A execução de `npm run test -w @bytebank/stores` completa com 100% dos testes passando.
- [ ] O monorepo compila com sucesso usando `npm run build` na raiz.

---

## Gotchas

1. **Testes do NextAuth no Vitest**: Ao testar a `useAuthStore` que importa `signOut` de `next-auth/react`, o Vitest pode dar erro de importação devido a restrições de ESM. Mockerize a dependência no topo do teste usando `vi.mock('next-auth/react', () => ({ signOut: vi.fn() }))`.
2. **Estado Compartilhado (State Leaks)**: O Zustand mantém o estado em singleton em memória. Sempre limpe o estado no `beforeEach` dos arquivos de teste para evitar vazamentos de testes que afetam asserções subsequentes.

---

## Próximo passo

→ **Estruturar a camada de consultas e mutações assíncronas em TanStack Query com a [Task 8 — Criar hooks em packages/api-client](./08-packages-api-client.md).**
