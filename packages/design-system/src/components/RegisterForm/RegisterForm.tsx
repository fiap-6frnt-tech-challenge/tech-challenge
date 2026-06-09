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
          aria-live="assertive"
          className="rounded-default border border-feedback-danger bg-feedback-danger/10 px-md py-sm text-sm font-medium text-feedback-danger"
        >
          {errorMessage}
        </div>
      ) : null}

      <Controller
        name="name"
        control={control}
        render={({ field }) => {
          const { ...fieldProps } = field;

          return (
            <Input
              label="Nome"
              type="text"
              autoComplete="name"
              placeholder="Digite seu nome"
              disabled={isLoading}
              error={!!errors.name}
              helperText={errors.name?.message}
              {...fieldProps}
            />
          );
        }}
      />

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
            <Input
              label="Senha"
              type="password"
              autoComplete="new-password"
              placeholder="Crie uma senha"
              disabled={isLoading}
              error={!!errors.password}
              helperText={errors.password?.message}
              {...fieldProps}
            />
          );
        }}
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
