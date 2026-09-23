# Task 04 — Rotas finas + mapeamento de erros

|                 |                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 1 — Clean Architecture](./README.md)                                                    |
| **Owner**       | Dev 1 (Backend & Segurança)                                                                     |
| **Duração**     | 1 dia                                                                                           |
| **Prioridade**  | P0                                                                                              |
| **Branch**      | `dev1-sec/thin-routes`                                                                          |
| **Depende de**  | Task 03                                                                                         |
| **Desbloqueia** | S2-05, S3-03, S4-01                                                                             |
| **Requisito**   | Clean Architecture (apresentação) · autenticação segura (erros genéricos)                       |
| **Embasamento** | Arquiteturas Avançadas — Aula 1 · Desenvolvimento Seguro — Aulas 2 e 6 (falhar de forma segura) |

---

## Contexto

Rota vira **controller fino**: autentica, lê a entrada, chama o caso de uso e traduz o resultado ou o erro para HTTP. Nada de regra de negócio, nada de Drizzle.

## Implementação

`apps/shell/src/server/http/route.ts`:

```ts
type Handler<P> = (ctx: { actor: Actor; req: NextRequest; params: P }) => Promise<unknown>;

export function route<P>(handler: Handler<P>, options: { status?: number } = {}) {
  return async (req: NextRequest, { params }: { params: Promise<P> }) => {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    try {
      const result = await handler({
        actor: { userId: session.user.id },
        req,
        params: await params,
      });
      return result === undefined
        ? new NextResponse(null, { status: 204 })
        : NextResponse.json(result, { status: options.status ?? 200 });
    } catch (error) {
      return toHttpError(error);
    }
  };
}
```

Mapeamento (`toHttpError`):

| Erro de domínio       | HTTP                | Corpo                                                              |
| --------------------- | ------------------- | ------------------------------------------------------------------ |
| `ValidationError`     | 422                 | `{ error: 'Dados inválidos', issues }`                             |
| `NotFoundError`       | 404                 | `{ error: 'Não encontrado' }`                                      |
| `ConflictError`       | 409                 | `{ error: <mensagem> }`                                            |
| `RateLimitedError`    | 429 + `Retry-After` | `{ error: 'Muitas tentativas' }`                                   |
| `AuthenticationError` | 401                 | `{ error: 'Não autenticado' }`                                     |
| Qualquer outro        | 500                 | `{ error: 'Erro interno', requestId }` + log com stack no servidor |

Rota depois da refatoração:

```ts
// app/api/transactions/[id]/route.ts
export const GET = route<{ id: string }>(({ actor, params }) =>
  container.getTransaction.execute(actor, params.id)
);
export const PATCH = route<{ id: string }>(async ({ actor, req, params }) =>
  container.updateTransaction.execute(actor, params.id, await readJson(req))
);
export const DELETE = route<{ id: string }>(async ({ actor, params }) => {
  await container.deleteTransaction.execute(actor, params.id);
});
```

**Rotas a migrar:** `transactions` (GET/POST), `transactions/[id]` (GET/PATCH/DELETE), `transactions/summary`, `transactions/[id]/attachments` (GET/POST), `transactions/[id]/attachments/[attachmentId]` (DELETE), `auth/register` (pública: `publicRoute()` sem exigir sessão). O `authorize()` do NextAuth passa a chamar `container.authenticateUser`.

**Testes de contrato:** adaptar os `route.test.ts` existentes para mockar o `container` em vez do `store`. Status e corpo precisam ser idênticos aos da Fase 2 (o `api-client` não muda).

## Validação

- [ ] Todas as rotas usam `route()`/`publicRoute()` e o `container`
- [ ] Nenhum import de `@/db` ou `drizzle-orm` em `app/api/**`
- [ ] Testes de contrato verdes; E2E verdes
- [ ] Erro inesperado devolve só `requestId`, sem stack nem SQL

## Gotchas

1. Nunca devolva `error.message` de exceção desconhecida ao cliente: pode vazar SQL ou caminhos internos.
2. Os `corsHeaders` das rotas de anexo viram um helper, mantendo o comportamento (o S3-05 restringe ao ambiente de dev).
3. `register` e as rotas do NextAuth continuam públicas; o `proxy.ts` segue barrando `/api/*` sem sessão.
4. Rotas `multipart/form-data` (upload) usam `req.formData()` em vez de `readJson` — trate as duas formas no helper.
