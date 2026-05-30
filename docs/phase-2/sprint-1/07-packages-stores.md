# Task 7 — Criar slices Redux Toolkit em packages/stores

> ⏳ **Status: Pending**

|                        |                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)                          |
| **Owner**              | `Dev 3`                                                                                 |
| **Duração estimada**   | 1 dia                                                                                   |
| **Branch recomendada** | `dev3/packages-stores`                                                                  |
| **Depende de**         | [Task 3 — NextAuth Setup](./03-nextauth-setup.md)                                       |
| **PR só abre**         | Após todos os testes unitários do Vitest para os dois slices passarem com sucesso em CI |

---

## Contexto

Para desacoplar as regras de estado puramente cliente da UI e garantir que os Microfrontends possam ler/escrever em dados comuns, migraremos o estado de autenticação (vindo do NextAuth) e o estado global de componentes da interface (como o painel de filtros e os modais de feedback) para o **Redux Toolkit**.

Esses slices viverão no pacote compartilhado `@bytebank/stores`, garantindo tipagem consistente em todo o monorepo. O shell instancia o `store` (`configureStore`) e envolve a aplicação em `<Provider store={store}>`; os MFEs consomem o mesmo store como singleton compartilhado via Module Federation.

> Convenções de uso (slices, seletores, hooks tipados) em [state-conventions.md](../state-conventions.md).

---

## Dependências

- **O que bloqueia esta tarefa**: Bloqueada pela **Task 3 (NextAuth Setup)** entregue pelo Dev 2. O `authSlice` necessita importar callbacks e estruturas de sessão do NextAuth local para sincronizar e disparar o `signOut`.
- **O que esta tarefa desbloqueia**: Desbloqueia a **Task 9 (Migração Context)**, pois a remoção do `FeedbackContext` depende diretamente da importação do `uiSlice` e dos hooks tipados fornecidos por este pacote.

---

## Pré-condições

- Estar na branch `dev3/packages-stores`.
- Instalar as dependências de execução e testes em `packages/stores`:
  ```bash
  npm install @reduxjs/toolkit react-redux -w @bytebank/stores
  npm install -D vitest @testing-library/react -w @bytebank/stores
  ```

---

## Implementação passo-a-passo

### 1. Criar `authSlice` (`packages/stores/src/authSlice.ts`)

Este slice sincroniza a sessão do NextAuth com o estado cliente e disponibiliza utilitários de logout. Como `signOut` é uma operação assíncrona, ela é modelada como um `createAsyncThunk`; a limpeza síncrona do estado fica no reducer `clearSession`:

```typescript
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
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

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
};

// Invalida cookies no NextAuth e redireciona para /login
export const logout = createAsyncThunk('auth/logout', async () => {
  await signOut({ callbackUrl: '/login' });
});

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<UserSession | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearSession: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
    });
  },
});

export const { setSession, clearSession } = authSlice.actions;

// Selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;

export default authSlice.reducer;
```

---

### 2. Criar `uiSlice` (`packages/stores/src/uiSlice.ts`)

Este slice controla a exibição de barras de controle, painéis laterais de filtro e o sistema global de alertas/erros:

```typescript
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface FeedbackMessage {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface UIState {
  filterPanelOpen: boolean;
  feedback: FeedbackMessage | null;
}

const initialState: UIState = {
  filterPanelOpen: false,
  feedback: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setFilterPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.filterPanelOpen = action.payload;
    },
    toggleFilterPanel: (state) => {
      state.filterPanelOpen = !state.filterPanelOpen;
    },
    showFeedback: (state, action: PayloadAction<FeedbackMessage>) => {
      state.feedback = action.payload;
    },
    hideFeedback: (state) => {
      state.feedback = null;
    },
  },
});

export const { setFilterPanelOpen, toggleFilterPanel, showFeedback, hideFeedback } =
  uiSlice.actions;

// Selectors
export const selectFilterPanelOpen = (state: { ui: UIState }) => state.ui.filterPanelOpen;
export const selectFeedback = (state: { ui: UIState }) => state.ui.feedback;

export default uiSlice.reducer;
```

---

### 3. Configurar o store (`packages/stores/src/store.ts`)

Combine os reducers via `configureStore` e exporte os tipos `RootState`/`AppDispatch`:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 4. Hooks tipados (`packages/stores/src/hooks.ts`)

```typescript
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

### 5. Configurar exports em `packages/stores/src/index.ts`

Substitua o stub existente no barrel export pelo conteúdo:

```typescript
export * from './authSlice';
export * from './uiSlice';
export * from './store';
export * from './hooks';
```

---

### 6. Escrever Testes Unitários

Como reducers do Redux Toolkit são funções puras (`(state, action) => newState`), os testes não precisam montar componente nem provider — basta importar o reducer e as actions:

##### `packages/stores/src/uiSlice.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import uiReducer, {
  setFilterPanelOpen,
  toggleFilterPanel,
  showFeedback,
  hideFeedback,
} from './uiSlice';

const initialState = { filterPanelOpen: false, feedback: null };

describe('uiSlice', () => {
  it('deve inicializar com valores padrão', () => {
    const state = uiReducer(undefined, { type: '@@INIT' });
    expect(state.filterPanelOpen).toBe(false);
    expect(state.feedback).toBeNull();
  });

  it('deve alternar o painel de filtros', () => {
    let state = uiReducer(initialState, toggleFilterPanel());
    expect(state.filterPanelOpen).toBe(true);

    state = uiReducer(state, setFilterPanelOpen(false));
    expect(state.filterPanelOpen).toBe(false);
  });

  it('deve gerenciar feedbacks com sucesso', () => {
    const feedbackPayload = { type: 'success' as const, title: 'Sucesso', message: 'Tudo OK' };

    let state = uiReducer(initialState, showFeedback(feedbackPayload));
    expect(state.feedback).toEqual(feedbackPayload);

    state = uiReducer(state, hideFeedback());
    expect(state.feedback).toBeNull();
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

1. **Testes do NextAuth no Vitest**: Ao testar o `logout` thunk que importa `signOut` de `next-auth/react`, o Vitest pode dar erro de importação devido a restrições de ESM. Mockerize a dependência no topo do teste usando `vi.mock('next-auth/react', () => ({ signOut: vi.fn() }))`.
2. **Store singleton entre MFEs**: O `store` do Redux é um singleton em memória. Garanta que o pacote `@reduxjs/toolkit`/`react-redux` seja compartilhado como `singleton: true` na config de Module Federation, para que shell e MFEs compartilhem a MESMA instância de store (e não cópias divergentes).
3. **Reducers são puros — teste-os direto**: Não monte componentes nem `<Provider>` para testar reducers; chame `reducer(state, action)` diretamente. Isso mantém os testes rápidos e isolados, sem risco de vazamento de estado entre casos.

---

## Próximo passo

→ **Estruturar a camada de consultas e mutações assíncronas em TanStack Query com a [Task 8 — Criar hooks em packages/api-client](./08-packages-api-client.md).**
