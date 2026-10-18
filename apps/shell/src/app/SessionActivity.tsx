'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { filter, fromEvent, merge, Subject } from 'rxjs';
import { Button, Modal } from '@bytebank/design-system';
import {
  ClientSessionEndedError,
  createClientSessionGuard,
  idle$,
  idleTimeoutMs,
  logout,
  publish,
  selectIsAuthenticated,
  useAppDispatch,
  useAppSelector,
} from '@bytebank/stores';

export function SessionActivity() {
  const authenticated = useAppSelector(selectIsAuthenticated);
  const logoutError = useAppSelector((state) => state.auth.logoutError === true);
  const dispatch = useAppDispatch();
  const { update } = useSession();
  const [warning, setWarning] = useState(false);
  const warningRef = useRef(false);
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState('');
  const continue$ = useMemo(() => new Subject<void>(), []);
  const descriptionId = useId();

  useEffect(() => {
    if (!authenticated) return;
    warningRef.current = false;
    const activity$ = merge(
      fromEvent(document, 'pointerdown'),
      fromEvent(document, 'keydown'),
      fromEvent(document, 'scroll', { passive: true, capture: true }),
      fromEvent(document, 'visibilitychange')
    ).pipe(filter(() => !warningRef.current));
    const subscription = idle$(
      merge(activity$, continue$),
      idleTimeoutMs(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES),
      60_000
    ).subscribe((state) => {
      warningRef.current = state === 'warn';
      setWarning(state === 'warn');
      if (state === 'expire') void dispatch(logout('idle'));
    });
    return () => subscription.unsubscribe();
  }, [authenticated, continue$, dispatch]);

  const handleContinue = useCallback(async () => {
    if (continuing) return;
    const assertSession = createClientSessionGuard();
    setContinuing(true);
    setError('');
    try {
      const session = await update();
      assertSession();
      if (!session?.user?.id) {
        publish({ type: 'session.expired', version: 1 });
        return;
      }
      warningRef.current = false;
      continue$.next();
    } catch (failure) {
      if (!(failure instanceof ClientSessionEndedError))
        setError('Não foi possível confirmar sua sessão. Tente novamente.');
    } finally {
      setContinuing(false);
    }
  }, [continuing, continue$, update]);

  return (
    <>
      <Modal
        isOpen={logoutError}
        onClose={() => {}}
        title="Não foi possível encerrar sua sessão"
        role="alertdialog"
        showCloseButton={false}
      >
        <p className="mb-lg text-content-secondary">
          Não foi possível confirmar o encerramento da sessão. Tente novamente.
        </p>
        <Button onClick={() => void dispatch(logout())}>Tentar novamente</Button>
      </Modal>
      <Modal
        isOpen={authenticated && warning}
        onClose={() => {}}
        title="Sua sessão será encerrada"
        role="alertdialog"
        descriptionId={descriptionId}
        showCloseButton={false}
      >
        <p id={descriptionId} className="mb-lg text-content-secondary">
          Por segurança, sua sessão será encerrada em um minuto por inatividade.
        </p>
        {error && (
          <p role="alert" className="mb-md text-content-secondary">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-sm">
          <Button
            onClick={() => void handleContinue()}
            disabled={continuing}
            aria-busy={continuing || undefined}
          >
            Continuar conectado
          </Button>
          <Button variant="secondary" onClick={() => void dispatch(logout())}>
            Sair agora
          </Button>
        </div>
      </Modal>
    </>
  );
}
