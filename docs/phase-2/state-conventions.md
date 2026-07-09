# Convenções de Gerenciamento de Estado (Redux Toolkit + TanStack Query)

Este documento estabelece os padrões e boas práticas para o gerenciamento de estado cliente (global e UI) com **Redux Toolkit** e o estado de servidor (cache e sincronização) com **TanStack Query** no projeto.

> **Por que Redux Toolkit + TanStack Query?** A spec do Tech Challenge lista "Redux, Recoil ou NgRx" para gestão de estado complexa — adotamos **Redux Toolkit** (a abordagem oficial e moderna do Redux, com `createSlice` + Immer, eliminando o boilerplate clássico de actions/reducers). Para estado de servidor (cache, refetch, optimistic updates), mantemos **TanStack Query**, que é especializado nisso e evita guardar dados de requisição no store global.

---

## 1. Redux Toolkit vs TanStack Query vs Local State

Para cada nova peça de estado, siga a seguinte árvore de decisão:

```
O estado vem do servidor?
 ├── Sim ──→ Use TanStack Query (useQuery / useMutation)
 └── Não
      ├── É compartilhado por múltiplos componentes distantes ou MFEs?
      │    ├── Sim ──→ Use um slice Redux Toolkit (ex: auth, tema, global UI notifications)
      │    └── Não ──→ Use React useState / useReducer local (estado encapsulado)
```

> **Regra de Ouro:** Não duplique dados de requisições no Redux. Se o dado vem de um endpoint, o TanStack Query é o dono da verdade. O store Redux armazena apenas estados puramente client-side.

---

## 2. Padrões do Redux Toolkit

### 2.1. Estrutura de um Slice

Os slices do Redux Toolkit devem viver em `packages/stores` e seguir esta estrutura típica. Graças ao Immer (embutido no `createSlice`), os reducers podem "mutar" o estado diretamente — o RTK produz a atualização imutável por baixo:

```typescript
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isSidebarOpen: boolean;
  theme: 'light' | 'dark';
}

const initialState: UIState = {
  isSidebarOpen: false,
  theme: 'light',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // "Mutação" segura via Immer
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
  },
});

export const { toggleSidebar, setTheme } = uiSlice.actions;
export default uiSlice.reducer;
```

O store raiz combina os slices via `configureStore` e exporta os tipos `RootState`/`AppDispatch`:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 2.2. Hooks tipados + Acesso via Seletores (Performance)

Exporte hooks tipados em vez de usar `useDispatch`/`useSelector` crus, e **sempre selecione a menor fatia de estado possível** para evitar re-renderizações desnecessárias:

```typescript
// packages/stores/src/hooks.ts
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

```typescript
// ❌ RUIM: seleciona o objeto inteiro — renderiza a cada mudança em qualquer campo de ui
const ui = useAppSelector((state) => state.ui);

// ✅ BOM: só renderiza se 'theme' mudar
const theme = useAppSelector((state) => state.ui.theme);
const dispatch = useAppDispatch();
dispatch(toggleSidebar());
```

> Para seletores derivados/custosos, use `createSelector` do Reselect (reexportado pelo RTK) para memoizar.

### 2.3. Provider e Persistência

O `<Provider store={store}>` (de `react-redux`) envolve a aplicação no shell, e o shell expõe o store aos MFEs como singleton compartilhado. Use `redux-persist` apenas quando estritamente necessário (ex: preferências locais do usuário como o tema, ou tokens de auth locais que não usem cookies seguros). Nunca persista dados transacionais.

---

## 3. Padrões do TanStack Query

### 3.1. Nomenclatura e Estrutura de Query Keys

Todas as Query Keys devem ser centralizadas e estruturadas usando arrays consistentes, evitando strings soltas:

```typescript
// Padrão de chaves: ['recurso', { ...filtros ou modificadores }]
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};
```

### 3.2. Encapsulamento em Custom Hooks

Mantenha a lógica de fetches encapsulada em hooks customizados exportados por `packages/api-client`. O componente UI apenas consome o hook:

```typescript
// packages/api-client/src/hooks/useTransactions.ts
import { useQuery } from '@tanstack/react-query';
import { transactionKeys } from '../keys';
import { TransactionService } from '../services/transactions';

export function useTransactions(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => TransactionService.getAll(filters),
    staleTime: 1000 * 60, // 1 minuto padrão
    gcTime: 1000 * 60 * 5, // 5 minutos de cache em memória
  });
}
```

### 3.3. Configuração do QueryClient

O `QueryClient` na raiz deve ser instanciado com defaults sensatos para evitar requisições em excesso:

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Evita spam ao alternar abas
      retry: 1, // Falha rápido em rede instável
      staleTime: 60 * 1000, // 1 minuto considerado "fresh"
    },
  },
});
```

### 3.4. Optimistic Updates em Mutations

Para interações altamente responsivas (ex: favoritar ou deletar uma transação), implemente atualizações otimistas no cache do Query Client. No erro, faça o rollback usando o contexto retornado pelo hook:

```typescript
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => TransactionService.delete(id),

    // Quando a mutação começa
    onMutate: async (idToDelete) => {
      // Cancela queries de saída para não sobrescrever nosso update otimista
      await queryClient.cancelQueries({ queryKey: transactionKeys.all });

      // Salva o snapshot do estado anterior
      const previousTransactions = queryClient.getQueryData(transactionKeys.all);

      // Otimisticamente remove o item do cache
      queryClient.setQueryData(transactionKeys.all, (old: any) =>
        old ? old.filter((item: any) => item.id !== idToDelete) : []
      );

      // Retorna o snapshot para rollback
      return { previousTransactions };
    },

    // Se falhar, usa o contexto salvo para reverter o estado
    onError: (err, id, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(transactionKeys.all, context.previousTransactions);
      }
    },

    // Sempre invalida o cache para sincronizar com o banco real de forma definitiva
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}
```
