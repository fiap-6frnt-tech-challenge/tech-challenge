# Task 05 — Headers de segurança, CSP e defesa CSRF

|                 |                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 3 — Cache e criptografia](./README.md)                                                                                               |
| **Owner**       | Dev 3 (Performance & Plataforma) — pair com o Dev 2 (federação) e review do Dev 1                                                            |
| **Duração**     | 1.5 dia                                                                                                                                      |
| **Prioridade**  | P0                                                                                                                                           |
| **Branch**      | `dev3-perf/security-headers-csp`                                                                                                             |
| **Depende de**  | S0-06 (Spike B — CSP com o runtime do MF)                                                                                                    |
| **Desbloqueia** | S4-03 (ZAP sem achados de headers)                                                                                                           |
| **Requisito**   | Autenticação segura · segurança no desenvolvimento                                                                                           |
| **Embasamento** | Desenvolvimento Seguro — Aula 4 (XSS com CSP; CSRF com checagem de origem e SameSite), Aula 5 (HTTPS/HSTS) e Aula 6 (defesa em profundidade) |

---

## Contexto

O shell não envia CSP, HSTS nem os demais headers de segurança, e o `X-Powered-By: Next.js` está ligado. As mutações da API dependem só do `SameSite=Lax` do cookie contra CSRF. As rotas de anexo liberam CORS com credenciais para as origens dos MFEs também em produção, onde isso não é necessário (em produção o código do MFE roda na origem do shell).

## Implementação

1. **Headers fixos** (`next.config.ts`):
   ```ts
   poweredByHeader: false,
   async headers() {
     return [{
       source: '/:path*',
       headers: [
         { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
         { key: 'X-Content-Type-Options', value: 'nosniff' },
         { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
         { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
         { key: 'X-Frame-Options', value: 'DENY' },
         { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
       ],
     }];
   },
   ```
2. **CSP com nonce** (`proxy.ts`), aplicada a todo documento:

   ```ts
   const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
   const mfeOrigins = [dashboardOrigin, transactionsOrigin].join(' ');
   const csp = [
     `default-src 'self'`,
     `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${mfeOrigins}${isDev ? " 'unsafe-eval'" : ''}`,
     `style-src 'self' 'unsafe-inline'`,
     `img-src 'self' data: blob: https://lh3.googleusercontent.com`,
     `connect-src 'self' ${mfeOrigins}`,
     `font-src 'self'`,
     `frame-ancestors 'none'`,
     `base-uri 'self'`,
     `form-action 'self' https://accounts.google.com`,
     `object-src 'none'`,
     `report-uri /api/csp-report`,
   ].join('; ');
   ```

   - Passar o nonce ao Next pelo header de requisição `x-nonce` e devolver a CSP na resposta (padrão da documentação do Next), mantendo as regras de redirect que o `proxy.ts` já tem.
   - `CSP_MODE=report-only` na primeira semana (`Content-Security-Policy-Report-Only`) → `enforce` depois de zerar as violações.
   - `/api/csp-report` registra as violações (entra nos logs do S4-01).

3. **Defesa CSRF** (`proxy.ts`), para `/api/*` com método que altera estado, exceto `/api/auth/*`:
   ```ts
   const origin = req.headers.get('origin');
   const fetchSite = req.headers.get('sec-fetch-site');
   const allowed = new Set([nextUrl.origin, ...devMfeOrigins]);
   if ((origin && !allowed.has(origin)) || fetchSite === 'cross-site') {
     return NextResponse.json({ error: 'Origem não permitida' }, { status: 403 });
   }
   ```
   Documentar as outras camadas: cookie `SameSite=Lax` e o token CSRF próprio do NextAuth nas rotas de auth.
4. **CORS das rotas de anexo** só quando `NODE_ENV !== 'production'` (menor privilégio).

## Validação

- [ ] securityheaders.com (ou `curl -I`) mostra todos os headers
- [ ] Navegação completa (login com senha e com Google, home, lista, CRUD, anexos, gráficos) sem violações de CSP no report
- [ ] POST vindo de uma página HTML servida em outra porta → 403
- [ ] `proxy.test.ts` cobre nonce, CSP e checagem de origem
- [ ] CSP em modo enforce no fim do sprint

## Gotchas

1. O nonce exige renderização dinâmica (nonce novo por resposta): páginas estáticas deixam de ser estáticas. As rotas autenticadas já são dinâmicas.
2. Com `'strict-dynamic'`, scripts inseridos pelo runtime do MF a partir de um script com nonce são permitidos; navegadores com CSP3 ignoram a allowlist de hosts, que fica como fallback.
3. O recharts e alguns componentes usam `style=""` inline, por isso `style-src 'unsafe-inline'`. Risco aceito e documentado: scripts continuam protegidos.
4. Em dev, o React Refresh precisa de `'unsafe-eval'` — só em dev.
5. O `form-action` precisa do domínio do Google: o Chrome aplica `form-action` aos redirects que seguem o submit do login com Google.
6. A CSP que vale é a do documento (shell). Os MFEs, carregados pelo shell, não precisam de CSP própria — mas recebem `X-Content-Type-Options` e as regras de cache da Task 03.
