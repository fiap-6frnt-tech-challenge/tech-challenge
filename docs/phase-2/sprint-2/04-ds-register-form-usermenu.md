# Task 4 — Design System: `RegisterForm` + Revisão do `UserMenu` (botão Sair)

> ⏳ **Status: Pending**

|                        |                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md)                            |
| **Owner**              | `Dev 2` (DS & UI Pages)                                                                  |
| **Duração estimada**   | 1 dia                                                                                    |
| **Branch recomendada** | `dev2/ds-register-form`                                                                  |
| **Depende de**         | — (pode iniciar no dia 1, em paralelo)                                                   |
| **PR só abre**         | Após `RegisterForm` ter story + a11y ok e o `UserMenu` ter o estado de loading no logout |

---

## Dependências

- **O que bloqueia esta tarefa**: Nada. DS-first.
- **O que esta tarefa desbloqueia**: Desbloqueia a **[Task 9 — Página `/register` + Logout no Header](./09-register-page-logout-wiring.md)** (Dev 2). Cobre os tópicos faltantes **"área para cadastro"** (UI) e **"botão de logout"** (componente) apontados na Sprint 1.

---

## Contexto

A Sprint 1 entregou `LoginForm`, `GoogleAuthButton`, `UserMenu` e `AuthGuard` no Design System — mas **faltou um `RegisterForm`** (não havia cadastro) e o **`UserMenu` nunca foi conectado ao app** (por isso "não há botão de logout").

O componente `UserMenu` já existe ([packages/design-system/src/components/UserMenu/UserMenu.tsx](../../../packages/design-system/src/components/UserMenu/UserMenu.tsx)) e já tem o item "Sair" acessível com `onLogout`. Esta task **não recria** o UserMenu: apenas adiciona o `RegisterForm` e faz pequenos ajustes no UserMenu para suportar estado de logout em andamento. A **integração** no Header acontece na Task 9.

---

## Pré-condições

- Estar na branch `dev2/ds-register-form`.
- Storybook rodando (`:6006`).
- Idealmente, o schema `registerSchema` da [Task 2](./02-backend-register-endpoint.md) já exportado por `@bytebank/shared` (se ainda não estiver, defina os campos localmente e troque depois).

---

## Implementação passo-a-passo

### 1. Criar `RegisterForm` (`packages/design-system/src/components/RegisterForm/`)

Espelhe a estrutura do `LoginForm` existente:

- `IRegisterForm.ts` — props:
  ```typescript
  export interface RegisterFormFields {
    name: string;
    email: string;
    password: string;
  }
  export interface RegisterFormProps {
    onSubmit: (data: RegisterFormFields) => void | Promise<void>;
    isLoading?: boolean;
    errorMessage?: string | null;
  }
  ```
- `RegisterForm.tsx` — React Hook Form + `@hookform/resolvers/zod` validando com `registerSchema` (de `@bytebank/shared`). Campos: nome, e-mail, senha (com confirmação opcional).
  - Erros vinculados via `aria-describedby` e `aria-invalid`.
  - Região de erro de submit com `role="alert"` / `aria-live="polite"` exibindo `errorMessage` (ex.: "E-mail já cadastrado").
  - Botão principal desabilita e mostra spinner quando `isLoading`.
  - Link "Já tem conta? Entrar" apontando para `/login` (via prop `loginHref` ou slot, mantendo o DS desacoplado do Next Router).
- `RegisterForm.stories.tsx` — empty / filled / loading / error (e-mail duplicado) / disabled.
- `index.ts` — barrel.

### 2. Ajustar `UserMenu` para feedback de logout (opcional, pequeno)

O `UserMenu` já dispara `onLogout`. Adicione um estado visual de "saindo…" para cobrir o tempo do `signOut` assíncrono:

- `IUserMenu.ts`: adicionar `isLoggingOut?: boolean`.
- `UserMenu.tsx`: quando `isLoggingOut`, desabilitar o botão "Sair" e trocar o texto por "Saindo…" (mantendo o ícone). Não alterar a navegação por teclado já implementada.
- Atualizar `UserMenu.stories.tsx` com um story `loggingOut`.

### 3. Barrel export no DS

```typescript
// packages/design-system/src/index.ts
export * from './components/RegisterForm';
```

---

## Validação

- [ ] Story do `RegisterForm` renderiza todos os states no Storybook.
- [ ] Validação Zod dispara mensagens acessíveis (testar com Tab + leitor de tela).
- [ ] `errorMessage` aparece em região `aria-live`.
- [ ] `UserMenu` mostra "Saindo…" quando `isLoggingOut` e mantém Tab/Enter/Escape funcionando.
- [ ] `npm run lint -w @bytebank/design-system` limpo; a11y addon sem violações; Chromatic aprovado.

---

## Gotchas

1. **DS não conhece o Next Router**: não importe `next/navigation` no DS. Para o link "Entrar", receba `loginHref` por prop ou exponha um slot — o shell injeta o `<Link>` (Task 9).
2. **Mesmo contrato do backend**: use `registerSchema` de `@bytebank/shared` para que a validação do form bata 1:1 com a do endpoint (Task 2). Divergência = erro 422 confuso para o usuário.
3. **Não logar senha**: o `onSubmit` apenas repassa os campos; nada de `console.log(data)` com senha nos stories (use `@storybook/addon-actions`).
4. **Reuso, não duplicação**: aproveite os átomos existentes (`Input`, `Label`, `Button`, `HelperText`, `FormField`) — não recrie inputs.

---

## Próximo passo

→ **Montar a página de cadastro e plugar o logout no Header com a [Task 9 — Página `/register` + Logout no Header](./09-register-page-logout-wiring.md).**
