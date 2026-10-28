'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@bytebank/design-system';
import { httpRequest, jsonBody } from '@bytebank/api-client';
import { logout, useAppDispatch } from '@bytebank/stores';
import { beginMfaRecoveryDelivery } from '@/app/mfaRecoveryDelivery';
import { RateLimitedError } from '@bytebank/core';

type Status = { enabled: boolean; canEnroll: boolean; recoveryCodesRemaining: number };
type Setup = { secret: string; uri: string };
const inputClass =
  'rounded-default border border-border bg-surface px-md py-sm text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary';

export function SecuritySettings({ initialStatus }: { initialStatus: Status }) {
  const dispatch = useAppDispatch();
  const releaseDelivery = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => releaseDelivery.current?.(), []);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [qr, setQr] = useState<string>();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    if (!setup) return;
    let active = true;
    void import('qrcode')
      .then((module) => module.toDataURL(setup.uri, { width: 240, margin: 2 }))
      .then((image) => {
        if (active) setQr(image);
      })
      .catch(() => {
        if (active) setError('Não foi possível gerar o QR code. Use a chave manual abaixo.');
      });
    return () => {
      active = false;
    };
  }, [setup]);

  async function perform(action: () => Promise<void>) {
    setPending(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
    } catch (failure) {
      setError(
        failure instanceof RateLimitedError
          ? 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
          : 'Não foi possível concluir. Confira sua senha e o código; use um código novo e tente novamente.'
      );
    } finally {
      setPending(false);
    }
  }
  async function finish() {
    setPassword('');
    setCode('');
    setSetup(null);
    setRecovery([]);
    setQr(undefined);
    releaseDelivery.current?.();
    releaseDelivery.current = undefined;
    await dispatch(logout());
  }
  async function begin() {
    const result = await httpRequest<Setup>('/auth/mfa/setup', {
      method: 'POST',
      ...jsonBody({ password }),
    });
    setPassword('');
    setQr(undefined);
    setCode('');
    setSetup(result);
  }
  async function enable() {
    releaseDelivery.current = beginMfaRecoveryDelivery();
    try {
      const result = await httpRequest<{ recoveryCodes: string[] }>('/auth/mfa/enable', {
        method: 'POST',
        ...jsonBody({ code: code.trim() }),
      });
      setCode('');
      setSetup(null);
      setQr(undefined);
      setRecovery(result.recoveryCodes);
    } catch (failure) {
      releaseDelivery.current?.();
      releaseDelivery.current = undefined;
      throw failure;
    }
  }
  async function disable() {
    await httpRequest<void>('/auth/mfa/disable', {
      method: 'POST',
      ...jsonBody({ password, code: code.trim() }),
    });
    await finish();
  }
  async function revokeAll() {
    await httpRequest<void>('/auth/sessions/revoke', { method: 'POST' });
    await finish();
  }

  if (recovery.length)
    return (
      <section
        aria-label="Códigos de recuperação"
        className="flex w-full max-w-[42rem] flex-col gap-lg rounded-default border border-border bg-surface p-lg"
      >
        <h2 className="text-xl font-semibold">MFA ativado. Salve seus códigos de recuperação</h2>
        <p>
          Estes dez códigos aparecem apenas uma vez. Guarde-os em um local seguro. Cada código
          funciona uma única vez, caso você perca o acesso ao autenticador.
        </p>
        <ul className="grid grid-cols-1 gap-sm sm:grid-cols-2">
          {recovery.map((item) => (
            <li key={item}>
              <code className="break-all font-mono">{item}</code>
            </li>
          ))}
        </ul>
        <Button
          variant="secondary"
          onClick={() =>
            void perform(async () => {
              await navigator.clipboard.writeText(recovery.join('\n'));
              setNotice('Códigos copiados. Guarde-os em um local seguro.');
            })
          }
        >
          Copiar códigos
        </Button>
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{error}</p>}
        <p>
          Todas as sessões foram encerradas. Após salvar os códigos, entre novamente para verificar
          seu novo fator.
        </p>
        <Button disabled={pending} onClick={() => void perform(finish)}>
          Salvei os códigos. Entrar novamente
        </Button>
      </section>
    );

  return (
    <div className="flex w-full max-w-[42rem] flex-col gap-lg">
      <section
        className="flex flex-col gap-md rounded-default border border-border bg-surface p-lg"
        aria-labelledby="mfa-settings-heading"
      >
        <h2 id="mfa-settings-heading" className="text-xl font-semibold">
          Verificação em duas etapas
        </h2>
        <p>Adicione um código temporário ao login para proteger sua conta.</p>
        {initialStatus.enabled ? (
          <>
            <p role="status">
              MFA ativado. Códigos de recuperação restantes: {initialStatus.recoveryCodesRemaining}.
            </p>
            <form
              className="flex flex-col gap-md"
              onSubmit={(event) => {
                event.preventDefault();
                void perform(disable);
              }}
            >
              <p>
                Para desativar, confirme sua senha e um código novo do autenticador ou um código de
                recuperação.
              </p>
              <label className="flex flex-col gap-xs" htmlFor="mfa-password">
                Senha atual
                <input
                  id="mfa-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={password}
                  disabled={pending}
                  className={inputClass}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-xs" htmlFor="mfa-disable-code">
                Código de autenticação
                <input
                  id="mfa-disable-code"
                  autoComplete="one-time-code"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={128}
                  value={code}
                  disabled={pending}
                  className={inputClass}
                  onChange={(event) => setCode(event.target.value)}
                />
              </label>
              <Button
                type="submit"
                variant="secondary"
                disabled={pending || !password || !code.trim()}
                loading={pending}
              >
                Desativar MFA e encerrar sessões
              </Button>
            </form>
          </>
        ) : !initialStatus.canEnroll ? (
          <p>
            Esta conta usa login por provedor e não possui uma senha local para configurar o MFA.
            Gerencie a verificação em duas etapas nas configurações do seu provedor.
          </p>
        ) : setup ? (
          <form
            className="flex flex-col gap-md"
            onSubmit={(event) => {
              event.preventDefault();
              void perform(enable);
            }}
          >
            <p>
              Escaneie o QR code no Google Authenticator, Authy ou outro aplicativo compatível. A
              configuração expira em 10 minutos.
            </p>
            {qr ? (
              <img src={qr} alt="QR code para configurar o autenticador" width={240} height={240} />
            ) : (
              <p role="status">Gerando QR code…</p>
            )}
            <p>Ou insira a chave manual:</p>
            <code aria-label="Chave manual" className="break-all font-mono">
              {setup.secret}
            </code>
            <label className="flex flex-col gap-xs" htmlFor="mfa-enable-code">
              Código do autenticador
              <input
                id="mfa-enable-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
                maxLength={6}
                value={code}
                disabled={pending}
                className={inputClass}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={pending || code.length !== 6} loading={pending}>
              Ativar verificação em duas etapas
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setSetup(null);
                setQr(undefined);
                setCode('');
                setError(undefined);
              }}
            >
              Cancelar configuração
            </Button>
          </form>
        ) : (
          <form
            className="flex flex-col gap-md"
            onSubmit={(event) => {
              event.preventDefault();
              void perform(begin);
            }}
          >
            <p>
              Use sua senha atual para iniciar a configuração. O MFA será ativado apenas depois de
              confirmar um código válido.
            </p>
            <label className="flex flex-col gap-xs" htmlFor="mfa-password">
              Senha atual
              <input
                id="mfa-password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                value={password}
                disabled={pending}
                className={inputClass}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={pending || !password} loading={pending}>
              Configurar autenticador
            </Button>
          </form>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
      <section
        className="flex flex-col gap-md rounded-default border border-border bg-surface p-lg"
        aria-labelledby="sessions-settings-heading"
      >
        <h2 id="sessions-settings-heading" className="text-xl font-semibold">
          Sessões da conta
        </h2>
        <p>Encerre o acesso em todos os dispositivos e entre novamente.</p>
        <Button variant="secondary" disabled={pending} onClick={() => void perform(revokeAll)}>
          Sair de todos os dispositivos
        </Button>
      </section>
    </div>
  );
}
