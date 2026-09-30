# ADR-005 — Cache em camadas sem compartilhar dados financeiros

|                 |                                                                      |
| --------------- | -------------------------------------------------------------------- |
| **Status**      | proposto                                                             |
| **Data**        | 2026-09-28                                                           |
| **Autor**       | Dev 2 (Arquitetura Front & Estado)                                   |
| **Task**        | [S0-05](../sprint-0-foundation/05-architecture-adrs.md)              |
| **Embasamento** | Arquiteturas Avançadas — Aulas 4 e 5 · Princípios e Padrões — Aula 2 |

---

## Status

Proposto para revisão do Dev 1 e do Dev 3; aceitação no [S0-07](../sprint-0-foundation/07-gate.md).

## Contexto

`packages/api-client/src/client.ts` mantém queries em memória com `staleTime` global de 60 s. As rotas em `apps/shell/src/app/api/transactions/` ainda não retornam ETag nem política de cache; `apps/transactions-mfe/nginx.conf` e `vercel.json` não dão cache longo explícito a todos os assets com hash. A aplicação precisa reduzir transferência e recomputação sem reutilizar respostas financeiras entre usuários.

## Decisão

**Usaremos cache HTTP privado com revalidação, cache de servidor segregado por usuário, TanStack Query em memória por tipo de dado e cache longo apenas para assets imutáveis.**

| Camada          | Política e invalidação                                                                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API autenticada | ETag fraco derivado de `userId`, parâmetros da consulta e versão dos dados; `Cache-Control: private, no-cache` e `Vary: Cookie`. Autenticar antes de comparar `If-None-Match`; retornar 304 apenas para a representação da mesma conta. Mutações alteram a versão. |
| Servidor        | Resumo por chave que inclui usuário e período, com tag `summary:<userId>`; mutações invalidam a tag. Um QueryClient de SSR é criado por requisição, nunca como singleton no servidor.                                                                              |
| Cliente         | TanStack Query com `staleTime` e `gcTime` por tipo de dado; mutações invalidam chaves afetadas e fazem rollback de atualizações otimistas. Logout limpa QueryClient e Redux.                                                                                       |
| Assets públicos | Chunks com URL de conteúdo versionado/hash recebem `public, max-age=31536000, immutable`; manifest e `remoteEntry.js` recebem `no-cache`, pois podem mudar sem mudar URL.                                                                                          |

Não usaremos `persistQueryClient`, `localStorage` ou IndexedDB para dados financeiros. `private, no-cache` ainda permite armazenamento no cache HTTP privado do navegador, mas exige revalidação antes de reutilizar; endpoints de autenticação e downloads de anexos usam `no-store`. [S3-03](../sprint-3-cache-security/03-http-cache.md), [S3-04](../sprint-3-cache-security/04-server-cache-ssr-prefetch.md) e [S3-06](../sprint-3-cache-security/06-query-cache-strategy.md) implementam as camadas.

## Alternativas consideradas

| Alternativa                               | Por que não                                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `public` ou `s-maxage` para a API         | Um cache compartilhado poderia servir dados de uma conta a outra.                                   |
| Persistir o cache TanStack no dispositivo | Guardaria dados financeiros fora da sessão e exigiria limpeza confiável em logout e troca de conta. |
| Desabilitar todo cache com `no-store`     | Elimina 304, evita reutilização de assets estáticos e mantém consultas repetidas mais caras.        |

## Consequências

**Positivas:** respostas não modificadas evitam transferir JSON; cache de servidor reduz cálculo do resumo; assets com hash podem ter validade longa sem invalidar deploys.

**Negativas / trade-offs:** versões, tags e query keys precisam acompanhar toda mutação; ETag com versão incompleta gera dado obsoleto. O cache HTTP privado pode guardar bytes no navegador entre revalidações, aceito aqui para obter 304; autorização e validação da sessão devem ocorrer em toda requisição.

**Follow-ups:** S3-03 implementa ETag e headers; S3-04 mede ganho e garante segregação no SSR; S3-06 ajusta políticas por tipo e limpeza no logout. Testar duas contas na mesma sessão de navegador antes do gate.

## Referências

- Aulas da fase: Arquiteturas Avançadas — Aulas 4 e 5; Princípios e Padrões — Aula 2 (Decorator).
- Docs oficiais: [MDN — Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control), [MDN — If-None-Match](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-None-Match), [TanStack Query — defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults).
- Código atual: `packages/api-client/src/client.ts`, `apps/shell/src/app/api/transactions/route.ts`, `apps/transactions-mfe/nginx.conf`.
