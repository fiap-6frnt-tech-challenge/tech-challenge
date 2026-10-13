import { describe, expect, it, vi } from 'vitest';
import { CloudflareTurnstileVerifier } from './CloudflareTurnstileVerifier';

describe('CloudflareTurnstileVerifier', () => {
  it('sends the token to Siteverify without relying on a forwarded client IP', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    const verifier = new CloudflareTurnstileVerifier('public-key', 'private-key', fetcher);

    await expect(verifier.verify('challenge-token')).resolves.toBe(true);
    const [url, request] = fetcher.mock.calls[0];
    const body = new URLSearchParams(request?.body as string);
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(body.get('secret')).toBe('private-key');
    expect(body.get('response')).toBe('challenge-token');
    expect(body.has('remoteip')).toBe(false);
  });

  it('fails closed when disabled, rejected, or unreachable', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const disabled = new CloudflareTurnstileVerifier('public-key', '', fetcher);
    await expect(disabled.verify('challenge-token')).resolves.toBe(false);
    expect(fetcher).not.toHaveBeenCalled();

    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false }), { status: 200 })
    );
    const enabled = new CloudflareTurnstileVerifier('public-key', 'private-key', fetcher);
    await expect(enabled.verify('invalid-token')).resolves.toBe(false);
    fetcher.mockRejectedValueOnce(new Error('unreachable'));
    await expect(enabled.verify('challenge-token')).resolves.toBe(false);
  });
});
