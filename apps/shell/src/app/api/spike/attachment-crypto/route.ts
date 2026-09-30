import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { del, get, put } from '@vercel/blob';
import { auth } from '@/auth';

export const runtime = 'nodejs';

const VERSION = 1;
const KEY_ID = 1;
const key = process.env.SPIKE_ENCRYPTION_KEY
  ? Buffer.from(process.env.SPIKE_ENCRYPTION_KEY, 'base64')
  : randomBytes(32);

function encrypt(plain: Uint8Array, context: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(context));
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from([VERSION, KEY_ID]), iv, cipher.getAuthTag(), body]);
}

function decrypt(payload: Uint8Array, context: string): Buffer {
  const buf = Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength);
  if (buf[0] !== VERSION || buf[1] !== KEY_ID) throw new Error('Formato ou chave desconhecidos');
  const decipher = createDecipheriv('aes-256-gcm', key, buf.subarray(2, 14));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(buf.subarray(14, 30));
  return Buffer.concat([decipher.update(buf.subarray(30)), decipher.final()]);
}

const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const mb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;

function memorySnapshot() {
  const m = process.memoryUsage();
  return {
    rss: mb(m.rss),
    heapUsed: mb(m.heapUsed),
    external: mb(m.external),
    arrayBuffers: mb(m.arrayBuffers),
  };
}

async function runPipeline(plain: Uint8Array, access: 'public' | 'private', readMs: number) {
  const before = memorySnapshot();
  const peak = { rss: before.rss, arrayBuffers: before.arrayBuffers };
  const sampler = setInterval(() => {
    const m = memorySnapshot();
    peak.rss = Math.max(peak.rss, m.rss);
    peak.arrayBuffers = Math.max(peak.arrayBuffers, m.arrayBuffers);
  }, 5);
  const timings: Record<string, number> = { readBody: readMs };
  const time = async <T>(label: string, fn: () => T | Promise<T>) => {
    const start = performance.now();
    const result = await fn();
    timings[label] = Math.round((performance.now() - start) * 10) / 10;
    return result;
  };

  const attachmentId = randomUUID();
  const context = `attachment:${attachmentId}`;
  let blobUrl: string | undefined;
  try {
    const ciphertext = await time('encrypt', () => encrypt(plain, context));
    const blob = await time('put', () =>
      put(`spike-s006/${randomUUID()}`, ciphertext, {
        access,
        contentType: 'application/octet-stream',
        addRandomSuffix: false,
      })
    );
    blobUrl = blob.url;

    const downloaded = await time('get', async () => {
      if (access === 'private') {
        const result = await get(blob.pathname, { access: 'private', useCache: false });
        if (!result || result.statusCode !== 200) throw new Error('Blob privado não encontrado');
        return new Uint8Array(await new Response(result.stream).arrayBuffer());
      }
      const res = await fetch(blob.url, { cache: 'no-store' });
      return new Uint8Array(await res.arrayBuffer());
    });

    const decrypted = await time('decrypt', () => decrypt(downloaded, context));

    const tampered = Buffer.from(downloaded);
    tampered[tampered.length - 1] ^= 0xff;
    let tamperRejected = false;
    try {
      decrypt(tampered, context);
    } catch {
      tamperRejected = true;
    }
    let wrongContextRejected = false;
    try {
      decrypt(downloaded, `attachment:${randomUUID()}`);
    } catch {
      wrongContextRejected = true;
    }

    await time('del', () => del(blob.url));
    blobUrl = undefined;

    return {
      ok: true,
      access,
      sizeMb: mb(plain.byteLength),
      ciphertextOverheadBytes: ciphertext.byteLength - plain.byteLength,
      blobPathnameHasOriginalName: false,
      storedBytesEqualCiphertext: sha256(downloaded) === sha256(ciphertext),
      roundTripIntact: sha256(decrypted) === sha256(plain),
      storedBytesDifferFromPlain: sha256(downloaded) !== sha256(plain),
      tamperRejected,
      wrongContextRejected,
      timingsMs: timings,
      memoryMb: { before, peak, after: memorySnapshot() },
    };
  } catch (error) {
    return {
      ok: false,
      access,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      timingsMs: timings,
    };
  } finally {
    clearInterval(sampler);
    if (blobUrl) await del(blobUrl).catch(() => undefined);
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const sizeMb = Math.min(Number(req.nextUrl.searchParams.get('sizeMb') ?? 5), 10);
  const access = req.nextUrl.searchParams.get('access') === 'private' ? 'private' : 'public';
  const plain = randomBytes(Math.round(sizeMb * 1024 * 1024));
  return NextResponse.json(await runPipeline(plain, access, 0));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const access = req.nextUrl.searchParams.get('access') === 'private' ? 'private' : 'public';
  const start = performance.now();
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File))
    return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
  const plain = new Uint8Array(await file.arrayBuffer());
  const readMs = Math.round((performance.now() - start) * 10) / 10;
  return NextResponse.json(await runPipeline(plain, access, readMs));
}
