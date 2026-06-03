'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@bytebank/shared';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../Button';
import { Input } from '../Input';
import { Label } from '../Label';
import type { LoginFormFields, LoginFormProps } from './ILoginForm';
import { loginFormSchema, type LoginFormSchemaValues } from './schema';

export function LoginForm({
  onSubmit,
  isLoading = false,
  forgotPasswordHref = '#',
  className,
}: LoginFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormSchemaValues>({
    mode: 'onSubmit',
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const submit = (data: LoginFormSchemaValues) => {
    const fields: LoginFormFields = {
      email: data.email,
      password: data.password,
    };

    return onSubmit(fields);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className={cn('flex flex-col gap-md', className)}>
      <Controller
        name="email"
        control={control}
        render={({ field }) => {
          const { ...fieldProps } = field;

          return (
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              disabled={isLoading}
              error={!!errors.email}
              helperText={errors.email?.message}
              {...fieldProps}
            />
          );
        }}
      />

      <Controller
        name="password"
        control={control}
        render={({ field }) => {
          const { ...fieldProps } = field;

          return (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">Senha</Label>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                disabled={isLoading}
                error={!!errors.password}
                helperText={errors.password?.message}
                {...fieldProps}
              />
              <a
                href={forgotPasswordHref}
                className={cn(
                  'text-sm font-medium self-end text-brand-primary underline-offset-4 transition-colors',
                  'hover:text-brand-primary-hover hover:underline',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary'
                )}
              >
                Esqueci minha senha
              </a>
            </div>
          );
        }}
      />

      <Button type="submit" fullWidth loading={isLoading} disabled={isLoading}>
        {isLoading ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  );
}
