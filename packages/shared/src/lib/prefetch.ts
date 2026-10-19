interface ConnectionHints {
  saveData?: boolean;
  effectiveType?: string;
}

const SLOW_CONNECTIONS = ['slow-2g', '2g'];

export function shouldPrefetch(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as Navigator & { connection?: ConnectionHints }).connection;
  return !connection?.saveData && !SLOW_CONNECTIONS.includes(connection?.effectiveType ?? '');
}

export function whenIdle(callback: () => void, timeout = 3000): () => void {
  if (typeof window === 'undefined') return () => {};

  let idleHandle: number | undefined;
  let timerHandle: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(callback, { timeout });
    } else {
      timerHandle = setTimeout(callback, Math.min(timeout, 1000));
    }
  };

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });

  return () => {
    window.removeEventListener('load', schedule);
    if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
    if (timerHandle !== undefined) clearTimeout(timerHandle);
  };
}
