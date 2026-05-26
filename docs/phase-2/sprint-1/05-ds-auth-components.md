# Task 5 — Componentes de Autenticação no Design System

> ⏳ **Status: Pending**

|                        |                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| **Sprint**             | [Sprint 1 — Auth + State Migration](../sprint-1-auth-state.md)                                   |
| **Owner**              | `dev3-ds`                                                                                        |
| **Duração estimada**   | 2 dias                                                                                           |
| **Branch recomendada** | `dev3-ds/ds-auth-components`                                                                     |
| **Depende de**         | — (Independente, pode começar em paralelo no dia 1)                                              |
| **PR só abre**         | Após todos os novos componentes possuírem Stories e passarem no teste local de a11y do Storybook |

---

## Contexto

Para suprir o fluxo de login e o controle de perfil do usuário logado, o Design System deve fornecer quatro blocos fundamentais de interface reutilizáveis. Esses componentes devem seguir o padrão estrito de styling do DS, acessibilidade (WCAG AA) e possuir cobertura de testes visuais via Chromatic (através de Stories).

Os componentes são:

1. `LoginForm`: Formulário acessível de login por e-mail/senha.
2. `GoogleAuthButton`: Botão com a marca e o logo do Google.
3. `UserMenu`: Dropdown com avatar, informações do usuário logado e opção de logout.
4. `AuthGuard`: Componente wrapper client que lida com estados de carregamento da sessão.

---

## Pré-condições

- Estar na branch `dev3-ds/ds-auth-components`.
- Garantir que o Storybook roda no local: `npm run storybook -w @bytebank/design-system` na porta `:6006`.

---

## Implementação passo-a-passo

### 1. Criar `LoginForm`

Crie a pasta `packages/design-system/src/components/LoginForm/` com os seguintes arquivos:

- `ILoginForm.ts`: Interface de props.
- `LoginForm.tsx`: Componente visual que utiliza Zod e React Hook Form para validação simples.
- `LoginForm.stories.tsx`: Casos de Storybook.

#### Especificação técnica:

- Deve possuir campos `email` e `password`.
- Deve disparar a prop callback `onSubmit(data: LoginFormFields)`.
- Deve indicar erros de acessibilidade usando `aria-invalid` e exibir mensagens de validação vinculadas via `aria-describedby`.
- Deve suportar prop `isLoading` (desabilita campos e exibe spinner de loading no botão principal).

---

### 2. Criar `GoogleAuthButton`

Crie a pasta `packages/design-system/src/components/GoogleAuthButton/` com:

- `IGoogleAuthButton.ts`: Propriedades (`onClick: () => void; isLoading?: boolean; disabled?: boolean`).
- `GoogleAuthButton.tsx`: Botão estilizado seguindo o manual de marca do Google (fundo branco ou azul escuro, borda leve, ícone oficial do Google e fonte coerente).
- `GoogleAuthButton.stories.tsx`.

#### SVG Oficial do Google:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18px" height="18px">
  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
</svg>
```

---

### 3. Criar `UserMenu`

Crie a pasta `packages/design-system/src/components/UserMenu/` com:

- `IUserMenu.ts`: Props para receber dados do usuário (`user: { name: string; email: string; avatarUrl?: string } | null; onLogout: () => void`).
- `UserMenu.tsx`: Dropdown acessível. Ele mostra o avatar (ou iniciais) do usuário. Ao clicar ou apertar Enter/Space, abre um menu contendo nome completo, email e um botão com a ação "Sair".
- `UserMenu.stories.tsx`.

#### Acessibilidade do Dropdown (Crucial!):

- Use elementos semânticos (`button` para controle e `ul`/`li` para itens de menu).
- Adicione atributos ARIA: `aria-haspopup="true"`, `aria-expanded={isOpen}`, `role="menu"` na lista de itens e `role="menuitem"` nos botões de ação internos.
- Suporte para navegação por teclado: ao abrir o menu, colocar o foco no primeiro item de menu. Fechar o menu se a tecla `Escape` for pressionada.

---

### 4. Criar `AuthGuard`

Crie a pasta `packages/design-system/src/components/AuthGuard/` com:

- `IAuthGuard.ts`: Props (`children: React.ReactNode; isLoading: boolean; isAuthenticated: boolean; fallbackSkeleton?: React.ReactNode`).
- `AuthGuard.tsx`: Se `isLoading` for `true`, renderiza o `fallbackSkeleton` ou um Skeleton padrão. Se não estiver autenticado (`isAuthenticated === false`), pode renderizar um estado de erro ou não renderizar nada. Se autenticado, renderiza o `children`.
- `AuthGuard.stories.tsx` mockando os estados de carregamento e erro visualmente.

---

### 5. Barrel Export no Design System

Atualize o arquivo [packages/design-system/src/index.ts](file:///c:/Users/rclau/tech-challenge/packages/design-system/src/index.ts) para exportar os novos componentes:

```typescript
export * from './components/LoginForm';
export * from './components/GoogleAuthButton';
export * from './components/UserMenu';
export * from './components/AuthGuard';
```

---

## Validação

- [ ] Todos os stories aparecem e funcionam na interface do Storybook local (`npm run storybook -w @bytebank/design-system`).
- [ ] Rodar o comando de lint e typecheck no pacote:
  ```bash
  npm run lint -w @bytebank/design-system
  ```
- [ ] Testar a navegação do `UserMenu` com teclado (Tab, Space, Escape) e verificar se o foco se comporta conforme o padrão WAI-ARIA.

---

## Gotchas

1. **Tailwind v4 Dinâmico**: Ao estilizar o avatar com iniciais geradas dinamicamente com cores aleatórias por usuário, evite construir strings de classe de Tailwind (ex: `bg-${color}-500`). Isso faz com que as classes não sejam incluídas no build final do CSS. Defina uma lista de cores seguras e estáticas ou use estilos inline (`style={{ backgroundColor: color }}`).
2. **Storybook Actions**: Sempre passe o helper `@storybook/addon-actions` nos stories de `LoginForm` e `UserMenu` para capturar os disparos de submit/logout na tela interativa.

---

## Próximo passo

→ **Construir as páginas de exibição de login do shell usando a [Task 4 — Páginas de Auth](./04-auth-pages.md).**
