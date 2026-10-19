import { afterEach, describe, expect, it, vi } from 'vitest';
import { shouldPrefetch, whenIdle } from './prefetch';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('shouldPrefetch', () => {
  it('pré-carrega quando o navegador não informa a conexão', () => {
    vi.stubGlobal('navigator', {});
    expect(shouldPrefetch()).toBe(true);
  });

  it.each(['3g', '4g'])('pré-carrega em %s', (effectiveType) => {
    vi.stubGlobal('navigator', { connection: { effectiveType } });
    expect(shouldPrefetch()).toBe(true);
  });

  it('respeita a Economia de dados', () => {
    vi.stubGlobal('navigator', { connection: { saveData: true, effectiveType: '4g' } });
    expect(shouldPrefetch()).toBe(false);
  });

  it.each(['slow-2g', '2g'])('não pré-carrega em %s', (effectiveType) => {
    vi.stubGlobal('navigator', { connection: { effectiveType } });
    expect(shouldPrefetch()).toBe(false);
  });
});

function stubWindow(readyState: DocumentReadyState, withIdleCallback = true) {
  const listeners = new Map<string, () => void>();
  const win = {
    requestIdleCallback: withIdleCallback ? vi.fn(() => 7) : undefined,
    cancelIdleCallback: vi.fn(),
    addEventListener: vi.fn((type: string, listener: () => void) => listeners.set(type, listener)),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', { readyState });
  return { win, fire: (type: string) => listeners.get(type)?.() };
}

describe('whenIdle', () => {
  it('agenda no requestIdleCallback quando a página já carregou', () => {
    const { win } = stubWindow('complete');
    const callback = vi.fn();

    whenIdle(callback, 2000);

    expect(win.requestIdleCallback).toHaveBeenCalledWith(callback, { timeout: 2000 });
    expect(win.addEventListener).not.toHaveBeenCalled();
  });

  it('espera o evento load antes de agendar', () => {
    const { win, fire } = stubWindow('interactive');

    whenIdle(vi.fn());
    expect(win.requestIdleCallback).not.toHaveBeenCalled();

    fire('load');
    expect(win.requestIdleCallback).toHaveBeenCalledTimes(1);
  });

  it('usa setTimeout quando não há requestIdleCallback', () => {
    vi.useFakeTimers();
    stubWindow('complete', false);
    const callback = vi.fn();

    whenIdle(callback);
    vi.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancela o agendamento pendente', () => {
    const { win } = stubWindow('complete');

    const cancel = whenIdle(vi.fn());
    cancel();

    expect(win.cancelIdleCallback).toHaveBeenCalledWith(7);
    expect(win.removeEventListener).toHaveBeenCalledWith('load', expect.any(Function));
  });
});
