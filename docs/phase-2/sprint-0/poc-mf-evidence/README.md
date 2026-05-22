# Evidências do PoC Module Federation (Task 6)

Artefatos coletados para suporte ao [ADR `mfe-decision.md`](../mfe-decision.md) e à reunião do Gate (Task 7).

## Arquivos

| Arquivo                                            | O que é                                                                                      | Coletado por                     | Como reproduzir                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| [`5-prod-build-logs.txt`](./5-prod-build-logs.txt) | Output completo de `npm run build` para hello-mfe e shell em modo produção                   | dev5-transactions (automatizado) | Ver [seção "Como reproduzir"](#como-reproduzir) abaixo                       |
| `1-mfe-standalone.png`                             | hello-mfe rodando isolado em `:3001`, mostrando `<Hello />` renderizado                      | dev4-dashboard                   | Iniciar `npm run dev -w @bytebank/hello-mfe`, abrir `http://localhost:3001`  |
| `2-mfe-in-shell.png`                               | Shell em `:3000/poc` com `<Hello />` federado renderizando                                   | dev5-transactions                | `npm run dev` em ambos terminais, abrir `http://localhost:3000/poc`          |
| `3-devtools-network.png`                           | DevTools → Network mostrando `mf-manifest.json` + chunks remotos carregados em `/poc`        | dev5-transactions                | Em `/poc`, F12 → Network → recarregar; filtrar por `manifest` e `federation` |
| `4-devtools-react.png`                             | React DevTools mostrando árvore única (sem duplicidade React) com `<Hello />` filho do shell | dev5-transactions                | Em `/poc`, F12 → ⚛️ Components → expandir até `<Hello />`                    |

> **Status:** `5-prod-build-logs.txt` ✅ coletado. PNGs 1-4 ⏳ pendentes — coletar antes da reunião do Gate.

## Como reproduzir

### Build logs (`5-prod-build-logs.txt`)

```bash
cd tech-challenge
echo "===== hello-mfe build (criterion #11) =====" > docs/phase-2/sprint-0/poc-mf-evidence/5-prod-build-logs.txt
npm run build -w @bytebank/hello-mfe 2>&1 >> docs/phase-2/sprint-0/poc-mf-evidence/5-prod-build-logs.txt

echo "" >> docs/phase-2/sprint-0/poc-mf-evidence/5-prod-build-logs.txt
echo "===== shell build (criterion #12) =====" >> docs/phase-2/sprint-0/poc-mf-evidence/5-prod-build-logs.txt
npm run build -w @bytebank/shell 2>&1 >> docs/phase-2/sprint-0/poc-mf-evidence/5-prod-build-logs.txt
```

**Resultado esperado (já validado):**

- hello-mfe build em ~3s; gera `dist/mf-manifest.json`, `dist/static/js/async/__federation_expose_Hello.<hash>.js`, etc.
- shell build em ~5s; rota `/poc` listada como Static (`○`)

### Screenshots PNG (1-4)

Sequência sugerida para coletar em uma única sessão de ~10 min:

1. **Terminal 1:** `npm run dev -w @bytebank/hello-mfe` (sobe `:3001`)
2. **Terminal 2:** `npm run dev -w @bytebank/shell` (sobe `:3000`)
3. **Browser → `http://localhost:3001`** → captura `1-mfe-standalone.png` (mostra hello-mfe isolado funcionando)
4. **Browser → `http://localhost:3000/poc`** → captura `2-mfe-in-shell.png` (mostra `<Hello />` renderizado dentro do shell)
5. Na mesma aba `/poc` → F12 → Network → recarregar → captura `3-devtools-network.png` (filtros: `manifest`, `federation`, `__federation`)
6. Mesma aba → React DevTools (⚛️ Components) → expandir árvore até `<RemoteHello>` → `<Hello>` → captura `4-devtools-react.png`

**Resolução recomendada:** 1280×720 ou maior. Esconder dados pessoais do navegador (URL bar pode aparecer).

## Como esses artefatos suportam os critérios

Mapeamento entre artefato e os 16 critérios da [matriz no ADR](../mfe-decision.md#matriz-de-validação-16-critérios-14-verde--aprovado-obrigatórios-3-6-11-13):

| Artefato                 | Critérios cobertos                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1-mfe-standalone.png`   | #1 (manifest 200), #2 (página 200)                                                                                                                    |
| `2-mfe-in-shell.png`     | #3 (renderiza no shell — **obrigatório**)                                                                                                             |
| `3-devtools-network.png` | #4 (manifest carregado), #5 (chunks remotos carregados)                                                                                               |
| `4-devtools-react.png`   | #6 (árvore React única — **obrigatório**), #7 (singleton React)                                                                                       |
| `5-prod-build-logs.txt`  | #11 (build hello-mfe — **obrigatório**), #12 (build shell — **obrigatório**), #13 (integração prod implícita pelo sucesso de ambos — **obrigatório**) |

Critérios `#8` (DS), `#9` (onClick), `#10` (hot reload), `#14` (Vercel), `#15` (warnings), `#16` (hydration) são validados visualmente durante a demo da Gate, sem artefato estático necessário.
