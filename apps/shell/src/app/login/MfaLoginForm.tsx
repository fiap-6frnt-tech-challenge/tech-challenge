'use client';

import { useState } from 'react';
import { Button } from '@bytebank/design-system';

export function MfaLoginForm({
  onSubmit,
  onBack,
  pending,
  error,
}: {
  onSubmit: (code: string) => void;
  onBack: () => void;
  pending: boolean;
  error?: string;
}) {
  const [code, setCode] = useState('');
  return (
    <form
      className="flex flex-col gap-md"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(code.trim());
      }}
    >
      <h2 className="text-xl font-semibold text-content-primary">Verificação em duas etapas</h2>
      <p id="mfa-login-help" className="text-content-secondary">
        Informe o código do seu aplicativo autenticador ou um código de recuperação.
      </p>
      <label className="flex flex-col gap-xs label-semibold" htmlFor="mfa-login-code">
        Código de autenticação
        <input
          id="mfa-login-code"
          name="totp"
          autoFocus
          autoComplete="one-time-code"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={128}
          value={code}
          disabled={pending}
          onChange={(event) => setCode(event.target.value)}
          aria-describedby="mfa-login-help"
          className="rounded-default border border-border bg-surface px-md py-sm text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        />
      </label>
      {error && (
        <p role="alert" className="text-content-primary">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending || !code.trim()} loading={pending}>
        Verificar código
      </Button>
      <Button type="button" variant="secondary" disabled={pending} onClick={onBack}>
        Voltar ao login
      </Button>
    </form>
  );
}
