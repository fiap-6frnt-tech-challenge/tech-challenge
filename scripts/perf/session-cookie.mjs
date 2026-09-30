import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.PERF_USER_EMAIL ?? 'perf.user@bytebank.test';
const password = process.env.PERF_USER_PASSWORD ?? 'Senha123!';
const outDir = resolve(process.cwd(), '.secrets');

function readCookies(response, jar) {
  for (const raw of response.headers.getSetCookie()) {
    const [pair] = raw.split(';');
    const index = pair.indexOf('=');
    jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
}

function serialize(jar) {
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}

const jar = new Map();

const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
if (!csrfResponse.ok) throw new Error(`GET /api/auth/csrf -> ${csrfResponse.status}`);
readCookies(csrfResponse, jar);
const { csrfToken } = await csrfResponse.json();

const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
  method: 'POST',
  redirect: 'manual',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Cookie: serialize(jar),
  },
  body: new URLSearchParams({ csrfToken, email, password, callbackUrl: `${baseUrl}/` }),
});
readCookies(loginResponse, jar);

const sessionCookie = [...jar].find(([name]) => name.endsWith('session-token'));
if (!sessionCookie) {
  throw new Error(
    `Login falhou (${loginResponse.status}): nenhum cookie de sessão. Confira email/senha e se o usuário existe neste banco.`
  );
}

const cookieHeader = `${sessionCookie[0]}=${sessionCookie[1]}`;

const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
  headers: { Cookie: cookieHeader },
});
const session = await sessionResponse.json();
if (!session?.user?.id)
  throw new Error('Cookie obtido, mas /api/auth/session não reconheceu a sessão.');

mkdirSync(outDir, { recursive: true });
writeFileSync(
  resolve(outDir, 'headers.json'),
  `${JSON.stringify({ Cookie: cookieHeader }, null, 2)}\n`
);
writeFileSync(resolve(outDir, 'cookie.txt'), `${cookieHeader}\n`);

console.log(`Sessão de ${session.user.email} (id ${session.user.id}) em ${baseUrl}`);
console.log(`Gravado em .secrets/headers.json e .secrets/cookie.txt (expira ${session.expires}).`);
