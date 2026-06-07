# DS RegisterForm + UserMenu Logout State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable `RegisterForm` to `@bytebank/design-system` and update `UserMenu` to expose a logout loading state for Sprint 2 Task 4.

**Architecture:** Keep this task entirely inside the Design System. `RegisterForm` owns only form UI, validation, loading/error states, and navigation hrefs; the shell will handle route actions in Task 9. `UserMenu` keeps its existing behavior and gains an optional `isLoggingOut` prop that disables the logout action and communicates progress.

**Tech Stack:** React, TypeScript, React Hook Form, Zod, `@hookform/resolvers/zod`, Storybook, Vitest browser/story tests, Tailwind utilities/tokens.

---

## File Structure

- Create `packages/design-system/src/components/RegisterForm/IRegisterForm.ts`
  - Public field and props contract for app consumers.
- Create `packages/design-system/src/components/RegisterForm/schema.ts`
  - Local fallback register schema until `@bytebank/shared` exports `registerSchema` from Sprint 2 Task 2.
- Create `packages/design-system/src/components/RegisterForm/RegisterForm.tsx`
  - Client component with RHF, accessible fields, submit error region, loading state, and login link.
- Create `packages/design-system/src/components/RegisterForm/RegisterForm.stories.tsx`
  - Stories for default, loading, submit error, validation errors, and successful submit.
- Create `packages/design-system/src/components/RegisterForm/index.ts`
  - Barrel export.
- Modify `packages/design-system/src/components/index.ts`
  - Export `RegisterForm`.
- Modify `packages/design-system/src/components/UserMenu/IUserMenu.ts`
  - Add optional `isLoggingOut?: boolean`.
- Modify `packages/design-system/src/components/UserMenu/UserMenu.tsx`
  - Disable logout button and show `Saindo...` while logout is pending.
- Modify `packages/design-system/src/components/UserMenu/UserMenu.stories.tsx`
  - Add `LoggingOut` story and keep keyboard behavior covered.

---

### Task 1: Add RegisterForm Contract and Schema

**Files:**

- Create: `packages/design-system/src/components/RegisterForm/IRegisterForm.ts`
- Create: `packages/design-system/src/components/RegisterForm/schema.ts`

- [ ] **Step 1: Create the public RegisterForm types**

Create `packages/design-system/src/components/RegisterForm/IRegisterForm.ts`:

```ts
export interface RegisterFormFields {
  name: string;
  email: string;
  password: string;
}

export interface RegisterFormProps {
  onSubmit: (data: RegisterFormFields) => void | Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
  loginHref?: string;
  className?: string;
}
```

- [ ] **Step 2: Create a local schema fallback**

Create `packages/design-system/src/components/RegisterForm/schema.ts`:

```ts
import { z } from 'zod';

export const registerFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  email: z.string().trim().min(1, 'Informe seu email').email('Informe um email válido'),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
});

export type RegisterFormSchemaValues = z.infer<typeof registerFormSchema>;
```

- [ ] **Step 3: Run type-check to confirm new files are valid**

Run:

```bash
npm run type-check --workspace @bytebank/design-system
```

Expected: command exits `0`.

---

### Task 2: Implement RegisterForm

**Files:**

- Create: `packages/design-system/src/components/RegisterForm/RegisterForm.tsx`

- [ ] **Step 1: Implement the component**

Create `packages/design-system/src/components/RegisterForm/RegisterForm.tsx`:

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@bytebank/shared';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../Button';
import { Input } from '../Input';
import type { RegisterFormFields, RegisterFormProps } from './IRegisterForm';
import { registerFormSchema, type RegisterFormSchemaValues } from './schema';

export function RegisterForm({
  onSubmit,
  isLoading = false,
  errorMessage = null,
  loginHref = '/login',
  className,
}: RegisterFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormSchemaValues>({
    mode: 'onSubmit',
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const submit = (data: RegisterFormSchemaValues) => {
    const fields: RegisterFormFields = {
      name: data.name,
      email: data.email,
      password: data.password,
    };

    return onSubmit(fields);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className={cn('flex flex-col gap-md', className)}>
      {errorMessage ? (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-default border border-feedback-danger bg-feedback-danger/10 px-md py-sm text-sm font-medium text-feedback-danger"
        >
          {errorMessage}
        </div>
      ) : null}

      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <Input
            label="Nome"
            type="text"
            autoComplete="name"
            placeholder="Digite seu nome"
            disabled={isLoading}
            error={!!errors.name}
            helperText={errors.name?.message}
            {...field}
          />
        )}
      />

      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            disabled={isLoading}
            error={!!errors.email}
            helperText={errors.email?.message}
            {...field}
          />
        )}
      />

      <Controller
        name="password"
        control={control}
        render={({ field }) => (
          <Input
            label="Senha"
            type="password"
            autoComplete="new-password"
            placeholder="Crie uma senha"
            disabled={isLoading}
            error={!!errors.password}
            helperText={errors.password?.message}
            {...field}
          />
        )}
      />

      <Button type="submit" fullWidth loading={isLoading} disabled={isLoading}>
        {isLoading ? 'Criando conta...' : 'Criar conta'}
      </Button>

      <p className="text-center text-sm text-content-secondary">
        Já tem conta?{' '}
        <a
          href={loginHref}
          className={cn(
            'font-medium text-brand-primary underline-offset-4 transition-colors',
            'hover:text-brand-primary-hover hover:underline',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary'
          )}
        >
          Entrar
        </a>
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Run lint and type-check**

Run:

```bash
npm run lint --workspace @bytebank/design-system
npm run type-check --workspace @bytebank/design-system
```

Expected: both commands exit `0`.

---

### Task 3: Export RegisterForm

**Files:**

- Create: `packages/design-system/src/components/RegisterForm/index.ts`
- Modify: `packages/design-system/src/components/index.ts`

- [ ] **Step 1: Create RegisterForm barrel**

Create `packages/design-system/src/components/RegisterForm/index.ts`:

```ts
export * from './IRegisterForm';
export * from './RegisterForm';
```

- [ ] **Step 2: Export from components barrel**

Add this line to `packages/design-system/src/components/index.ts` after `LoginForm`:

```ts
export * from './RegisterForm';
```

- [ ] **Step 3: Verify public import compiles**

Run:

```bash
npm run type-check --workspace @bytebank/design-system
```

Expected: command exits `0`.

---

### Task 4: Add RegisterForm Stories and Interaction Checks

**Files:**

- Create: `packages/design-system/src/components/RegisterForm/RegisterForm.stories.tsx`

- [ ] **Step 1: Create stories**

Create `packages/design-system/src/components/RegisterForm/RegisterForm.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { action } from 'storybook/actions';
import { expect, userEvent, within } from 'storybook/test';
import { RegisterForm } from './RegisterForm';

const meta: Meta<typeof RegisterForm> = {
  title: 'Auth/RegisterForm',
  component: RegisterForm,
  tags: ['autodocs'],
  args: {
    onSubmit: action('register-submit'),
    isLoading: false,
    errorMessage: null,
    loginHref: '/login',
  },
  argTypes: {
    onSubmit: { control: false },
    isLoading: { control: 'boolean' },
    errorMessage: { control: 'text' },
    loginHref: { control: 'text' },
    className: { control: 'text' },
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Accessible account registration form with name, email, password, submit error state, and login navigation link.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof RegisterForm>;

export const Default: Story = {
  render: (args) => (
    <div className="w-96">
      <RegisterForm {...args} />
    </div>
  ),
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
  render: (args) => (
    <div className="w-96">
      <RegisterForm {...args} />
    </div>
  ),
};

export const SubmitError: Story = {
  args: {
    errorMessage: 'E-mail já cadastrado.',
  },
  render: (args) => (
    <div className="w-96">
      <RegisterForm {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('E-mail já cadastrado.');
  },
};

export const ValidationErrors: Story = {
  render: (args) => (
    <div className="w-96">
      <RegisterForm {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /criar conta/i }));

    await expect(canvas.getByLabelText(/nome/i)).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByLabelText(/senha/i)).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByText('Informe seu nome')).toBeInTheDocument();
    await expect(canvas.getByText('Informe seu email')).toBeInTheDocument();
    await expect(canvas.getByText('A senha deve ter no mínimo 8 caracteres')).toBeInTheDocument();
  },
};

export const SuccessfulSubmit: Story = {
  args: {
    onSubmit: action('register-submit-success'),
  },
  render: (args) => (
    <div className="w-96">
      <RegisterForm {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/nome/i), 'Ana Souza');
    await userEvent.type(canvas.getByLabelText(/email/i), 'ana@bytebank.com');
    await userEvent.type(canvas.getByLabelText(/senha/i), 'segredo123');
    await userEvent.click(canvas.getByRole('button', { name: /criar conta/i }));

    await expect(canvas.queryByText('Informe seu nome')).not.toBeInTheDocument();
    await expect(canvas.queryByText('Informe seu email')).not.toBeInTheDocument();
    await expect(
      canvas.queryByText('A senha deve ter no mínimo 8 caracteres')
    ).not.toBeInTheDocument();
  },
};
```

- [ ] **Step 2: Run design-system tests**

Run:

```bash
npm run test --workspace @bytebank/design-system
```

Expected: all existing stories/tests pass, including the new `RegisterForm` story interactions.

---

### Task 5: Add UserMenu Logout Loading State

**Files:**

- Modify: `packages/design-system/src/components/UserMenu/IUserMenu.ts`
- Modify: `packages/design-system/src/components/UserMenu/UserMenu.tsx`
- Modify: `packages/design-system/src/components/UserMenu/UserMenu.stories.tsx`

- [ ] **Step 1: Extend UserMenu props**

Modify `packages/design-system/src/components/UserMenu/IUserMenu.ts`:

```ts
export interface UserMenuUser {
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface UserMenuProps {
  user: UserMenuUser | null;
  onLogout: () => void | Promise<void>;
  isLoggingOut?: boolean;
  className?: string;
}
```

- [ ] **Step 2: Update UserMenu implementation**

Modify the component signature in `packages/design-system/src/components/UserMenu/UserMenu.tsx`:

```tsx
export function UserMenu({ user, onLogout, isLoggingOut = false, className }: UserMenuProps) {
```

Then replace the logout button block with:

```tsx
<button
  ref={logoutRef}
  type="button"
  role="menuitem"
  onClick={onLogout}
  disabled={isLoggingOut}
  aria-busy={isLoggingOut || undefined}
  className={cn(
    'flex w-full items-center gap-sm rounded-default px-sm py-sm text-left label-semibold text-content-primary',
    'transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
    'disabled:cursor-not-allowed disabled:opacity-60'
  )}
>
  <LogOut aria-hidden="true" size={16} />
  {isLoggingOut ? 'Saindo...' : 'Sair'}
</button>
```

- [ ] **Step 3: Add a LoggingOut story**

Append to `packages/design-system/src/components/UserMenu/UserMenu.stories.tsx`:

```tsx
export const LoggingOut: Story = {
  args: {
    user: {
      name: 'Joana da Silva',
      email: 'joana@bytebank.com',
    },
    isLoggingOut: true,
  },
  render: (args) => (
    <div className="flex h-48 items-start justify-end p-lg">
      <UserMenu {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /abrir menu do usuário/i }));

    const logout = canvas.getByRole('menuitem', { name: /saindo/i });
    await expect(logout).toBeDisabled();
    await expect(logout).toHaveAttribute('aria-busy', 'true');
  },
};
```

If the story file already defines a `Default` `args.user`, reuse the same user shape; keep this story self-contained.

- [ ] **Step 4: Run UserMenu stories/tests**

Run:

```bash
npm run test --workspace @bytebank/design-system
```

Expected: all `UserMenu` keyboard stories still pass and `LoggingOut` passes.

---

### Task 6: Final Verification

**Files:**

- All files touched in Tasks 1-5.

- [ ] **Step 1: Run design-system validation**

Run:

```bash
npm run lint --workspace @bytebank/design-system
npm run type-check --workspace @bytebank/design-system
npm run test --workspace @bytebank/design-system
```

Expected: all commands exit `0`.

- [ ] **Step 2: Run shell type-check as consumer smoke**

Run:

```bash
npm run type-check --workspace @bytebank/shell
```

Expected: command exits `0`; existing shell imports from `@bytebank/design-system` remain valid.

- [ ] **Step 3: Start Storybook for manual a11y/visual check**

Run:

```bash
npm run storybook --workspace @bytebank/design-system
```

Manual checks:

- `Auth/RegisterForm/Default` renders name, email, password, submit, and "Já tem conta? Entrar".
- `Auth/RegisterForm/ValidationErrors` shows accessible helper messages under the right fields.
- `Auth/RegisterForm/SubmitError` shows a `role="alert"` region.
- `Auth/UserMenu/LoggingOut` opens with "Saindo..." disabled.
- Existing `UserMenu` keyboard flow still opens with Enter/Space and closes with Escape.

- [ ] **Step 4: Commit**

Run:

```bash
git add packages/design-system/src/components/RegisterForm packages/design-system/src/components/index.ts packages/design-system/src/components/UserMenu
git commit -m "feat(ds): add register form and logout loading state"
```

Expected: commit succeeds after lint-staged hooks.

---

## Self-Review

- **Spec coverage:** `RegisterForm` contract, UI, validation, submit error, login link, stories, DS export, and `UserMenu.isLoggingOut` are all covered. Task 9 integration remains out of scope as requested by the task doc.
- **Placeholder scan:** No implementation step uses unresolved placeholders. The only future dependency, `registerSchema` from `@bytebank/shared`, is intentionally isolated behind `RegisterForm/schema.ts` so Task 4 can ship before Task 2.
- **Type consistency:** `RegisterFormFields`, `RegisterFormProps`, `isLoggingOut`, and `loginHref` are consistently named across implementation, stories, and exports.
