# ADR-0006 — Sessão e autenticação

|                 |                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**      | aceito na implementação; integração pela PR da S2-07                                                                                                           |
| **Data**        | 2026-10-18                                                                                                                                                     |
| **Autor**       | Dev 1 (Backend & Segurança)                                                                                                                                    |
| **Task**        | [S2-05 — Login: limite de tentativas](../sprint-2-state-reactive/05-login-rate-limit.md), [S2-07 — Sessão](../sprint-2-state-reactive/07-session-hardening.md) |
| **Embasamento** | Desenvolvimento Seguro — Aula 3 (força bruta)                                                                                                                  |

## Contexto

O login por senha precisa limitar tentativas entre instâncias do Next.js e do Postgres. O bloqueio por e-mail dificulta ataques distribuídos, mas também permite que alguém provoque indisponibilidade temporária para uma conta conhecida. As chaves de e-mail não devem ficar em claro na tabela de controle.

## Decisão

Usaremos limites persistidos no Postgres por e-mail e por IP, com chave HMAC para o e-mail. O e-mail será bloqueado após cinco falhas em quinze minutos; o primeiro bloqueio dura quinze minutos, dobra a cada novo bloqueio e chega no máximo a 24 horas. Um login bem-sucedido remove o estado de bloqueio do e-mail. O IP é uma chave secundária, com bloqueio fixo.

## Sessões e encerramento

### Sessões JWT com revogação no servidor

Mantemos o JWT criptografado do Auth.js em cookie HttpOnly, com duração renovável de 8 horas e teto absoluto de 12 horas desde `authTime`. O payload contém `userId`, `sid`, `sv` e `svCheckedAt`; esses campos não são enviados pela sessão pública ao navegador nem armazenados no Redux/localStorage. Tokens antigos sem essas claims são rejeitados e exigem novo login após a implantação.

A coluna `users.session_version` permite revogar todos os dispositivos com incremento atômico. A tabela `auth_sessions` registra um identificador de sessão, dono e expiração absoluta. Antes de chamar `signOut`, o cliente confirma a remoção do identificador em `POST /api/auth/sessions/current/revoke`, protegido por origem e pela identidade do JWT criptografado. O identificador não vem do corpo nem é exposto ao JS. O evento `signOut` repete a remoção de forma idempotente como proteção adicional. Isso faz uma cópia do cookie deixar de ser aceita na próxima checagem, sem encerrar as outras sessões ao clicar em "Sair". A sessão atual também é removida no cliente imediatamente pelo fluxo da S2-04.

Essa confirmação explícita é necessária porque o Auth.js captura falhas do evento `signOut` e ainda limpa o cookie. Se a confirmação falhar, os dados locais continuam limpos, a aplicação não anuncia sucesso remoto e oferece nova tentativa em um alertdialog. A sincronização de perfil não restaura conteúdo privado enquanto essa falha estiver pendente.

O callback Node valida versão, existência da sessão e expiração no banco quando `svCheckedAt` alcança cinco minutos. A janela de até cinco minutos vale tanto para a revogação individual quanto global. Uma sessão renovada mantém `authTime` e `sid`; dados enviados por `useSession().update()` não podem redefini-los. Em chamadas `auth()` somente leitura, o novo JWT pode não ser persistido no cookie: isso pode causar consultas adicionais depois do intervalo, mas não prolonga a sessão nem a janela de revogação.

Configuramos `session.updateAge = 15 min` conforme a task. No Auth.js instalado, esse parâmetro controla sessões de banco; JWTs são renovados ao acessar o endpoint de sessão. O teto de 12 horas é aplicado separadamente e não depende dessa renovação. O SessionProvider consulta a sessão a cada minuto e sincroniza logout entre abas; a verificação de versão no servidor continua limitada pelas claims. O prazo de ociosidade humana é controlado também pelo timer de 15 minutos do cliente; o polling não reinicia esse timer.

O proxy usa apenas as claims e exige `req.auth?.user?.id`; não consulta banco. Um cookie revogado ainda pode passar pelo proxy durante a janela de checagem, mas as APIs usam o callback Node, respondem 401 e o cliente encerra a sessão. Uma carga inicial de página privada com sessão inválida também redireciona ao login.

`POST /api/auth/sessions/revoke` autentica o ator e exige `Origin` igual à origem da requisição, rejeitando `Sec-Fetch-Site: cross-site`. Ignora qualquer identificador no corpo: só incrementa a versão do usuário autenticado. A UI só faz o logout após confirmar a revogação; em falha, mostra erro sem anunciar sucesso.

Uma alteração do hash de senha incrementa a versão na mesma instrução SQL. Isso inclui o rehash transparente de bcrypt: o login novo lê a versão atualizada, enquanto outros dispositivos podem precisar entrar novamente. Esse custo evita separar incorretamente uma substituição de hash de sua revogação.

Para preservar o Google OAuth com sessões persistidas, somente e-mails verificados pelo provedor podem resolver/criar uma identidade local sem senha. Usuários criados apenas por OAuth têm hash vazio, sem senha utilizável pelo login de credenciais. Se já existir uma conta com senha para aquele e-mail, o vínculo automático é recusado: o cadastro local ainda não verifica posse do e-mail e preservar sua senha poderia manter uma credencial plantada por terceiro. Vincular contas requer um fluxo explícito de prova de posse, fora desta task. O provedor continua responsável por verificar o token Google; o app não aceita esse perfil vindo do cliente.

### Expiração no cliente e inatividade

HTTP e XHR 401 publicam `session.expired`; a geração de sessão evita que respostas antigas encerrem um login posterior. O shell deduplica logout, executa a limpeza da S2-04 e redireciona ao login com mensagem fixa. O aviso não depende de uma notificação Redux que seria apagada no reset.

O stream de inatividade observa pointerdown, keydown, scroll passivo e visibilitychange, com throttle de um segundo. Emite aviso um minuto antes do prazo configurado por `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES` (15 por padrão; valores inválidos ou menores/iguais a 1 usam o padrão). Durante o alertdialog, só "Continuar conectado" renova o prazo após validar a sessão; interação incidental não renova. O diálogo prende o foco e o posiciona nesse botão. O prazo usa relógio absoluto para não ganhar um minuto extra quando uma aba suspensa retoma.

Atividade entre abas não é compartilhada: o timer é por aba. O SessionProvider sincroniza o encerramento entre abas; atividade global via BroadcastChannel permanece opcional.

### Opções rejeitadas para sessão

- JWT sem estado de revogação: uma cópia do cookie continuaria utilizável até expirar.
- Usar apenas `session_version`: logout individual encerraria todos os dispositivos ou deixaria a cópia do cookie válida. O `sid` permite revogar só a sessão atual.
- Consultar a sessão no banco em toda chamada: reduz a janela, mas aumenta IO; adotamos a janela de cinco minutos da task.
- Migrar para sessões de banco do Auth.js: altera a integração de credenciais; mantemos a estratégia JWT existente e adicionamos o estado mínimo necessário à revogação.

## Alternativas para limite de tentativas

| Alternativa                    | Por que não                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| Bloquear apenas pelo IP        | Ataques distribuídos podem trocar de IP e continuar tentando a mesma conta.                |
| Bloquear a conta sem expiração | Um atacante poderia manter a conta indisponível até intervenção manual.                    |
| Usar Redis gerenciado          | Acrescenta um serviço externo quando o Postgres existente atende às instâncias do projeto. |

## Consequências

**Positivas**

- Logout individual e global invalidam cópias de cookie na próxima checagem do servidor, mantendo a janela explícita de até cinco minutos.
- O teto absoluto de sessão e o timer de atividade são independentes da renovação de cookies.
- Falha de confirmação de logout mantém dados privados ocultos e permite nova tentativa.

- A contagem compartilhada funciona entre instâncias serverless.
- O e-mail não aparece em claro na tabela de tentativas.
- A duração limitada reduz a janela de indisponibilidade causada por bloqueio abusivo.

**Negativas / trade-offs**

- A revogação não é instantânea para uma cópia externa do cookie; pode levar até cinco minutos.
- O banco guarda registros de sessão e recebe consultas periódicas; chamadas `auth()` sem persistência do cookie podem consultar com maior frequência depois do intervalo.

- Um atacante ainda pode bloquear temporariamente o login de uma pessoa. O crescimento progressivo limita a duração máxima a 24 horas.
- A rotação da chave HMAC muda as chaves calculadas e pode deixar registros antigos sem uso até expirarem.
- O IP encaminhado por proxy é uma chave secundária; em ambientes locais sem proxy, o cabeçalho pode ser forjado.

**Operação e implantação**

- Aplicar a migration `0007_session_lifecycle.sql` antes da aplicação nova. Ela adiciona a versão com default zero e cria a tabela de sessões; o deploy invalida JWTs legados de forma intencional.
- Em HTTPS, o Auth.js emite `__Secure-authjs.session-token` com HttpOnly, Secure e SameSite=Lax. No desenvolvimento/E2E HTTP usa o nome sem prefixo Secure; não forçamos cookie Secure em localhost HTTP.
- Sessões expiradas do usuário são removidas quando ele inicia uma sessão nova; a exclusão de usuário também remove seus registros de sessão por cascade.
- A indisponibilidade do banco impede validar sessões quando a checagem vence, em vez de aceitá-las sem validação. Durante a janela já validada de cinco minutos, mantém-se o comportamento JWT documentado.

## Referências

- [Task S2-05 — Login: limite de tentativas](../sprint-2-state-reactive/05-login-rate-limit.md)
- [Auth.js — callbacks e configuração de sessão](https://authjs.dev/reference/core)
- [Task S2-07 — Sessão](../sprint-2-state-reactive/07-session-hardening.md)
- Código: `apps/shell/src/server/infrastructure/db/PostgresRateLimiter.ts`
