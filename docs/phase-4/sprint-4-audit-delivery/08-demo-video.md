# Task 08 — Vídeo demo (≤ 5 min)

|                |                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Sprint**     | [Sprint 4 — Auditoria e entrega](./README.md)                                              |
| **Owner**      | Todos (roteiro e edição: Dev 2; cada dev grava a própria parte)                            |
| **Duração**    | 1 dia                                                                                      |
| **Prioridade** | P0                                                                                         |
| **Branch**     | —                                                                                          |
| **Depende de** | Aplicação completa, Tasks 03, 04 e 06                                                      |
| **Requisito**  | Vídeo de até 5 minutos demonstrando as principais funcionalidades (entregável obrigatório) |

---

## Contexto

A banca vê o vídeo para entender o que a fase entregou. Cinco minutos é pouco: o roteiro segue os requisitos da spec e mostra evidências (DevTools, código, números), não só a interface.

## Roteiro

| Tempo     | Cena                                                                                                                                                                                                                                | Requisito                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 0:00–0:30 | Abertura: o que mudou da Fase 2 para a 4; diagrama de camadas e grafo de dependências                                                                                                                                               | Arquitetura modular                             |
| 0:30–1:10 | Código: rota fina → caso de uso → repositório; teste do core rodando sem framework; lint barrando import proibido                                                                                                                   | Clean Architecture                              |
| 1:10–1:50 | Busca reativa (Network: 1 requisição, canceladas); upload de 3 anexos com progresso, cancelamento e retry; Redux DevTools com estado normalizado                                                                                    | Programação reativa · state management          |
| 1:50–2:40 | Hover em "Transações" pré-carrega o remote; home monta com dados do SSR; 304 com ETag; Lighthouse antes/depois                                                                                                                      | Lazy loading, preload, cache, tempo de resposta |
| 2:40–4:20 | `curl` do IDOR (antes 200 / agora 404); bloqueio após 5 senhas; senha vazada recusada; inatividade → logout; blob ilegível × anexo aberto pela aplicação; `psql` com e-mail cifrado; headers/CSP no DevTools; CI de segurança verde | Autenticação segura · criptografia              |
| 4:20–5:00 | Fechamento: README, auditoria OWASP, resultados                                                                                                                                                                                     | —                                               |

## Produção

- Gravar as cenas separadamente (OBS ou o gravador do sistema) e juntar na edição
- Usar a produção ou o build local de produção, com dados de exemplo já carregados
- Esconder segredos durante a gravação: cookies, `.env`, tokens
- Narração curta ou legendas explicando o **porquê** de cada cena
- Editar até caber em **5:00** (limite rígido)

## Validação

- [ ] Vídeo com até 5 minutos
- [ ] Todos os requisitos da spec aparecem (mapa no [README do sprint](./README.md#mapa-requisito-da-spec--onde-está))
- [ ] Nenhum segredo visível
- [ ] Link do vídeo no README
