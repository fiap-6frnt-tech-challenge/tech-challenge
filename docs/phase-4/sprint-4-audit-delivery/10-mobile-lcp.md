# Task 10 — LCP mobile: tirar o elemento de LCP da cascata dos remotes

|                 |                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------ |
| **Sprint**      | [Sprint 4 — Auditoria e entrega](./README.md)                                              |
| **Owner**       | Dev 3 (Performance & Plataforma) — Dev 2 na Parte A (sessão e Redux)                       |
| **Duração**     | 2 dias (+0,5 dia de spike opcional, Parte D)                                               |
| **Prioridade**  | P1                                                                                         |
| **Branch**      | `dev3-perf/mobile-lcp`                                                                     |
| **Depende de**  | S3-04 (prefetch no SSR, `loading.tsx`), S3-05 (CSP com nonce)                              |
| **Desbloqueia** | Task 04 (linha de LCP mobile do relatório), meta 16 do [PLAN.md](../PLAN.md) (mobile ≥ 85) |
| **Requisito**   | Melhoria no tempo de resposta · pré-carregamento                                           |
| **Embasamento** | Arquiteturas Avançadas — Aula 4 (Performance)                                              |

---

## Contexto

O S3-04 tirou a busca de dados da cascata, mas o LCP mobile **não mudou**. O A/B controlado deu IC 95% de [−140, +90] ms na home e [−124, +208] ms em `/transactions`, contra ~160 ms de ganho no "conteúdo pronto" ([evidências](../sprint-3-cache-security/04-server-cache-ssr-prefetch.md#evidências--2026-10-20)). A meta do PLAN.md é Lighthouse mobile ≥ 85 nas duas páginas; o S0-04 mediu 68 / 71 em produção.

O motivo é que o elemento de LCP só aparece no fim de uma cascata serial, e os dados nunca estiveram nela. A sequência abaixo vem do trace do Lighthouse (build do S3-04):

```
HTML → JS do shell (~270 kB, 14 chunks) → hidratação
  → /api/auth/session (2×)                 trava do AppShell (isAuthenticated)
  → runtime do MF do shell (49 kB, lazy)   lib/federation
  → remote entry (114 kB) + expose
  → remote monta → elemento de LCP → pintura
```

O Lighthouse mobile simula 150 ms de RTT, 1,6 Mbps e CPU 4× mais lenta. Cada seta custa pelo menos um RTT mais o download.

| Página          | Elemento de LCP                                        | Fase dominante                                                  |
| --------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| `/`             | ilustração do `BalanceCard` (`/piggy-bank.png`, 11 kB) | _load delay_ ~3,4 s: a imagem só é pedida quando o remote monta |
| `/transactions` | `h1#transactions-heading`, dentro do remote            | _render delay_ ~5,3 s de JS                                     |

Há três alavancas: tirar o elemento de LCP da cascata (Partes A e B), paralelizar a cascata (Parte C) e reduzir bytes e CPU em cada passo (Partes C e D).

## Parte A — sessão vinda do servidor, sem a trava no cliente (Dev 2 + Dev 3)

Hoje o `AppShell` renderiza `{isAuthenticated ? children : null}`. Com isso, o `<main>` do HTML chega vazio, e a página espera o `/api/auth/session` do cliente (duas requisições) antes de renderizar qualquer coisa. O proxy e o `auth()` das páginas já protegem as rotas no servidor; a trava não acrescenta segurança.

1. `app/layout.tsx` chama `auth()` e passa a sessão para o `Providers`, que a entrega ao `SessionProvider`. Com a sessão inicial, o NextAuth não busca `/api/auth/session` na carga.
2. A sessão entra no `authSlice` antes do primeiro render, por `dispatch(setSession(...))` uma única vez. O store não pode ser recriado: ele é o singleton compartilhado com os MFEs.
3. O `AppShell` passa a esconder `children` só quando o cliente sabe que a sessão **acabou** (logout em andamento, sessão expirada ou revogada), não enquanto ela é desconhecida. Os testes do S2-07 (`session-hardening.spec.ts`) garantem que logout e expiração continuam limpando o conteúdo privado.

**Resultado esperado:** nenhuma requisição de sessão antes do remote começar a carregar, e o skeleton da rota já vem no HTML do servidor.

## Parte B — elemento de LCP no HTML do servidor

Com a Parte A, o skeleton da rota (`loading.tsx` e o `loading` do `next/dynamic`) passa a sair no HTML. Ele deve trazer o conteúdo real e estável que hoje é o elemento de LCP, no mesmo lugar e no mesmo tamanho:

- **`/transactions`:** o `h1` "Transações" com as classes do `#transactions-heading`, no lugar da barra de `Skeleton`.
- **Home:** a ilustração do `BalanceCard` (decorativa, `aria-hidden`), com o mesmo tamanho e posição, mais `<link rel="preload" as="image" fetchpriority="high">` para ela.

Quando o remote monta, ele troca o elemento por um idêntico. Não surge um candidato de LCP maior, e o CLS fica em 0.

- **Sem divergência entre shell e remote:** o cabeçalho da página e a ilustração vão para o Design System, e o remote e o skeleton usam o mesmo componente.
- **Acessibilidade:** só um `h1` por vez (o skeleton sai quando o remote monta). A região da lista continua com `aria-busy` enquanto carrega.
- **Não é maquiagem:** o conteúdo antecipado é o mesmo que o remote mostra. O conteúdo que depende dos dados continua medido pelo "conteúdo pronto" do S3-04, e o relatório mostra as duas métricas.

## Parte C — pré-carregar o remote da rota atual

Hoje só o manifest é pré-carregado (`layout.tsx`). O runtime, o remote entry e o expose esperam a trava da Parte A e o `import('@/lib/federation')`, um depois do outro.

1. **No servidor:** emitir `<link rel="preload" as="script">` para o remote entry e para o expose da rota atual. As URLs vêm do `mf-manifest.json` do remote, lido no servidor com cache curto: `metaData.publicPath` + `metaData.remoteEntry.name` (do tipo `global`, script clássico) e `exposes[].assets.js.sync`.
2. **No cliente:** disparar o `preloadRemote` da rota atual na inicialização (hoje só o hover e o idle disparam, e só para a próxima rota). O import do `lib/federation` começa junto, sem esperar a montagem.
3. **Adiar o `preloadLikelyNextRoute`** para depois da marca `*:ready` da página atual. Em `/transactions`, ele baixou o remote do dashboard (114 kB + expose) no meio da carga, disputando rede e CPU.

## Parte D — spike (timebox 0,5 dia, opcional): runtime do MF duplicado

Cada remote entry (~114 kB) leva o próprio runtime do Module Federation (`__FEDERATION__`, `loadRemote`, snapshot), e o shell já baixou o dele (49 kB). O MF 2.x tem um modo em que o host fornece o runtime aos remotes (`experiments.externalRuntime` nos remotes e `provideExternalRuntime` no host).

Falta confirmar se isso funciona com o nosso host, que usa a API de runtime direto no Next/Turbopack, sem o plugin de bundler. O spike registra a decisão e o ganho em kB por remote, mas só entra no código se couber no prazo.

## Fora do escopo — SSR dos remotes

É o único caminho que põe no HTML o conteúdo que **depende dos dados** (saldo, lista). Exige build dos remotes para Node e renderização no servidor. O Next App Router com Module Federation e SSR não tem suporte oficial (o `nextjs-mf` está descontinuado para o App Router), e as fronteiras de RSC complicam.

A alternativa, mover a parte visível da tela para Server Components do shell, quebra a posse dos MFEs exigida pela Fase 2. Registrar como passo futuro na documentação de arquitetura (Task 06).

## Medição

- **Local — A/B controlado** (o protocolo que tornou o S3-04 conclusivo):
  - 10 amostras por build, intercaladas em ordem ABBA.
  - A cada amostra: reiniciar o servidor, fazer uma carga de aquecimento até a marca `*:ready` e esperar memória livre (≥ 400 MB).
  - Regra de travamento definida antes de ver os resultados: o scripting do chunk do framework (hash igual nos dois builds) passar de 2× a mediana.
  - Estatística: Mann-Whitney exato e intervalo de Hodges-Lehmann.
  - Nesta máquina (3,8 GB), fechar o Chrome e limitar a VM do WSL/Docker a 1 GB (`.wslconfig`) durante a medição.
  - Versionar o script em `scripts/perf/` como parte desta task.
- **Produção:** Lighthouse best-of-3 (meta 16 do PLAN.md e Task 04). O PageSpeed Insights não alcança páginas autenticadas.
- **Métricas:** LCP, FCP, TBT e CLS, mais o "conteúdo pronto" (marca `*:ready` do remote menos o fim do `mf:loadRemote`) e as requisições feitas antes de o remote montar.

## Validação

- [ ] Nenhuma requisição a `/api/auth/session` antes de o remote montar; o `<main>` do HTML do servidor traz o skeleton
- [ ] Elemento de LCP pintado a partir do HTML do servidor nas duas páginas, com CLS = 0
- [ ] LCP mobile menor em `/` e `/transactions`, com IC 95% que exclui zero (A/B controlado, 10 × 10)
- [ ] TBT e "conteúdo pronto" sem piora (IC 95%)
- [ ] E2E verdes, inclusive `session-hardening.spec.ts` (logout e expiração limpam o conteúdo privado) e `ssr-prefetch.spec.ts`
- [ ] Números locais e de produção registrados na Task 04

## Gotchas

1. **CSP (S3-05).** Com `'strict-dynamic'`, um `<link rel="preload">` vindo do HTML precisa do nonce da requisição. Os preloads do próprio Next já saem com nonce.
2. **O preload precisa ter os mesmos atributos do request final** (`as="script"` e o mesmo `crossorigin` que o runtime do MF usa). Se não tiver, o navegador baixa o arquivo duas vezes.
3. **`auth()` no layout deixa todas as rotas dinâmicas.** Com o nonce do S3-05, isso já acontece; o `loading.tsx` mantém o skeleton imediato na navegação SPA.
4. **O store Redux é singleton compartilhado com os MFEs** ([MFE state](../../../packages/stores/src/store.ts)). Semeie a sessão por `dispatch`; nunca crie outro store.
5. **Nesta máquina, nunca compare execuções soltas.** Sem o protocolo controlado, o swap gera 5–8 s de TBT e resultados contraditórios (S3-04).
6. **O conteúdo antecipado tem que ser idêntico ao do remote.** Se for diferente, o remote gera um novo candidato de LCP ou layout shift, e o ganho some ou vira CLS.
