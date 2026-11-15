import { afterEach, describe, expect, it, vi } from 'vitest';
import { SystemClock } from './SystemClock';

afterEach(() => {
  vi.useRealTimers();
});

describe('SystemClock', () => {
  it('devolve a data de hoje no fuso configurado', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T02:30:00Z'));

    expect(new SystemClock('America/Sao_Paulo').todayISO()).toBe('2026-10-03');
    expect(new SystemClock('UTC').todayISO()).toBe('2026-10-04');
  });

  it('devolve o instante atual', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));

    expect(new SystemClock('America/Sao_Paulo').now()).toEqual(new Date('2026-10-04T12:00:00Z'));
  });

  it('recusa um fuso horário inválido', () => {
    expect(() => new SystemClock('America/Atlantida')).toThrow(RangeError);
  });
});
