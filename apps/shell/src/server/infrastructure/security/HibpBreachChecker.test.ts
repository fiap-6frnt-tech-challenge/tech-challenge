import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HibpBreachChecker } from './HibpBreachChecker';

const password = 'password123456';
const prefix = '98A16';
const suffix = 'C09B0759E63EF7DF53592724E8EEDDB953A';

const rangeResponse = (...lines: string[]) =>
  new Response(lines.join('\r\n'), { status: 200, headers: { 'content-type': 'text/plain' } });

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
});

describe('HibpBreachChecker', () => {
  it('envia só os 5 primeiros caracteres do SHA-1, com padding, e acha o sufixo vazado', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        rangeResponse('0018A45C4D1DEF81644B54AB7F969B88D65:3', `${suffix}:2413`, 'FFFFF:0')
      );

    await expect(new HibpBreachChecker(true, fetcher).isBreached(password)).resolves.toBe(true);

    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${prefix}`);
    expect(String(url)).not.toContain(suffix);
    expect(init?.headers).toEqual({ 'Add-Padding': 'true' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.stringify(init)).not.toContain(password);
  });

  it('ignora linhas de padding com contagem 0 e sufixos ausentes', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(rangeResponse(`${suffix}:0`))
      .mockResolvedValueOnce(rangeResponse('0018A45C4D1DEF81644B54AB7F969B88D65:3'));
    const checker = new HibpBreachChecker(true, fetcher);

    await expect(checker.isBreached(password)).resolves.toBe(false);
    await expect(checker.isBreached(password)).resolves.toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it('libera o cadastro e registra log quando a API responde com erro', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('Service Unavailable', { status: 503 }));

    await expect(new HibpBreachChecker(true, fetcher).isBreached(password)).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('fail-open'), {
      reason: 'HTTP 503',
    });
  });

  it('libera o cadastro e registra log quando a API estoura o timeout', async () => {
    const fetcher = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        })
    );

    await expect(new HibpBreachChecker(true, fetcher, 10).isBreached(password)).resolves.toBe(
      false
    );
    expect(warn).toHaveBeenCalledOnce();
    expect(JSON.stringify(warn.mock.calls)).not.toContain(password);
  });

  it('não consulta a API quando HIBP_ENABLED=false', async () => {
    const fetcher = vi.fn<typeof fetch>();

    await expect(new HibpBreachChecker(false, fetcher).isBreached(password)).resolves.toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
