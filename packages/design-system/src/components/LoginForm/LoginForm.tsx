'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@bytebank/shared';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../Button';
import { Input } from '../Input';
import type { LoginFormFields, LoginFormProps } from './ILoginForm';
import { loginFormSchema, type LoginFormSchemaValues } from './schema';

export function LoginForm({ onSubmit, isLoading = false, className }: LoginFormProps) {
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
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="voce@email.com"
        disabled={isLoading}
        error={!!errors.email}
        helperText={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Senha"
        type="password"
        autoComplete="current-password"
        placeholder="Digite sua senha"
        disabled={isLoading}
        error={!!errors.password}
        helperText={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" fullWidth loading={isLoading} disabled={isLoading}>
        {isLoading ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  );
}
