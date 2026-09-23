# Task 02 — Correção do IDOR em `/api/transactions/[id]`

|                 |                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| **Sprint**      | [Sprint 0 — Fundação](./README.md)                                                                            |
| **Owner**       | Dev 1 (Backend & Segurança)                                                                                   |
| **Duração**     | 1 dia                                                                                                         |
| **Prioridade**  | P0 — **produção vulnerável**                                                                                  |
| **Branch**      | `dev1-sec/idor-fix` (+ `hotfix/idor-transactions` → `main`)                                                   |
| **Depende de**  | —                                                                                                             |
| **Desbloqueia** | Task 03, S1-02                                                                                                |
| **Requisito**   | Autenticação segura                                                                                           |
| **Embasamento** | Desenvolvimento Seguro — Aula 4 (OWASP A01 Broken Access Control; API1:2023 BOLA) e Aula 6 (menor privilégio) |

---

## Contexto

Em `apps/shell/src/app/api/transactions/[id]/route.ts`, os handlers `GET`, `PATCH` e `DELETE` **não chamam `auth()`** e **não conferem o dono**. As funções `store.getById`, `store.update` e `store.remove` filtram só por `id`, e `store.update` ainda copia `data.userId` para o registro. O `proxy.ts` barra apenas quem não está logado.

Impacto: qualquer usuário logado que obtenha o `id` de uma transação alheia (log, print, URL compartilhada) consegue **ler, alterar ou apagar** essa transação — e, com `PATCH { "userId": "<meu-id>" }`, **transferi-la para a própria conta**. Os ids são UUID (difíceis de adivinhar), mas isso é segurança por obscuridade. Como a `main` (Fase 2) está em produção, a falha está ativa hoje.

## Implementação

1. **Store com escopo por dono** (`app/api/transactions/store.ts`):

   ```ts
   export async function getById(id: string, userId: string): Promise<Transaction | null> {
     const row = await db.query.transactions.findFirst({
       where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
       with: { attachments: true },
     });
     return row ? toTransaction(row) : null;
   }

   export async function update(id: string, userId: string, data: TransactionPatch) {
     // ...mesmo corpo de hoje, sem copiar data.userId
     // .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
   }

   export async function remove(id: string, userId: string): Promise<boolean> {
     const rows = await db
       .delete(transactions)
       .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
       .returning();
     return rows.length > 0;
   }
   ```

   - `userId` **nunca** é alterável por `update`.
   - Apagar `getAll()` (consulta sem escopo, sem uso em rotas).

2. **Rotas** (`[id]/route.ts`), mesmo padrão nos três handlers:

   ```ts
   export async function GET(_req: NextRequest, { params }: { params: Params }) {
     const session = await auth();
     if (!session?.user?.id) {
       return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
     }
     const { id } = await params;
     const transaction = await store.getById(id, session.user.id);
     if (!transaction) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
     return NextResponse.json(transaction);
   }
   ```

   - Recurso de outro usuário → **404**, não 403: não revela que o id existe.
   - Na rota de upload (`[id]/attachments/route.ts`), trocar a comparação manual `transaction.userId !== session.user.id` por `store.getById(id, session.user.id)`, para ficar uniforme.

3. **Testes** — novo `[id]/route.test.ts`, no mesmo padrão dos testes de rota existentes (mock de `@/auth` e do store):
   - Usuário B → 404 em `GET`, `PATCH` e `DELETE` da transação de A
   - `PATCH` de A com `userId: 'B'` não muda o dono
   - Sem sessão → 401
4. **Hotfix em produção:** PR `hotfix/idor-transactions` → `main` com os passos 1–3. Depois do merge e do deploy, mesclar a `main` na `phase-4`.

## Validação

- [ ] Testes novos verdes; testes de rota existentes verdes
- [ ] Em produção, com 2 contas: `curl` autenticado como B em `/api/transactions/<id-de-A>` → 404 (GET/PATCH/DELETE)
- [ ] `PATCH` com `userId` não altera o dono (conferir no banco)
- [ ] Hotfix mergeado na `main`, deploy concluído, `main` mesclada na `phase-4`

## Gotchas

1. Não confiar no `proxy.ts` para autorização: ele só sabe **se** há sessão, não **quem** é dono de quê (defesa em profundidade).
2. No Sprint 1 essa regra vai para os casos de uso (camada de aplicação). Os testes desta task viram testes de contrato das rotas e continuam valendo.
3. Registrar no PR a classificação: OWASP A01:2021 / API1:2023 (BOLA). Ela entra na auditoria do S4-03 como "encontrada e corrigida" — e rende uma cena forte no vídeo (antes/depois com `curl`).
