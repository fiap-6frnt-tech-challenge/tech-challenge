# Convenções de Gerenciamento de Estado (Zustand + TanStack Query)

Este documento estabelece os padrões e boas práticas para o gerenciamento de estado cliente (global e UI) com **Zustand** e o estado de servidor (cache e sincronização) com **TanStack Query** no projeto.

---

## 1. Zustand vs TanStack Query vs Local State

Para cada nova peça de estado, siga a seguinte árvore de decisão:

```
O estado vem do servidor?
 ├── Sim ──→ Use TanStack Query (useQuery / useMutation)
 └── Não
      ├── É compartilhado por múltiplos componentes distantes ou MFEs?
      │    ├── Sim ──→ Use Zustand Store (ex: auth, tema, global UI notifications)
      │    └── Não ──→ Use React useState / useReducer local (estado encapsulado)
```

> **Regra de Ouro:** Não duplique dados de requisições no Zustand. Se o dado vem de um endpoint, o TanStack Query é o dono da verdade. O Zustand armazena apenas estados puramente client-side.

---

## 2. Padrões do Zustand

### 2.1. Estrutura de uma Store

As stores do Zustand devem viver em `packages/stores` e seguir esta estrutura típica:

```typescript
import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  theme: 'light' | 'dark';
}

interface UIActions {
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

// Junta State e Actions em um único tipo
export type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  // 1. State inicial
  isSidebarOpen: false,
  theme: 'light',

  // 2. Actions (mutadores de estado)
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));
```

### 2.2. Acesso ao Estado via Seletores (Performance)

Para evitar re-renderizações desnecessárias em consumidores de stores amplos, **sempre acesse o estado por meio de seletores específicos**:

```typescript
// ❌ RUIM: Renderiza sempre que qualquer propriedade na store mudar
const { theme } = useUIStore();

// ✅ BOM: Só renderiza se a propriedade 'theme' mudar
const theme = useUIStore((state) => state.theme);
const toggleSidebar = useUIStore((state) => state.toggleSidebar);
```

### 2.3. Persistência

Use o middleware `persist` apenas quando estritamente necessário (ex: preferências locais do usuário como o tema, ou tokens de auth locais que não usem cookies seguros). Nunca persista dados transacionais.

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
