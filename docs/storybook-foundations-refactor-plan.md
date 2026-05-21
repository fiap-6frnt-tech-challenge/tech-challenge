# Plano de Melhoria das Stories de Foundations

## Objetivo

Reestruturar as stories de foundations do Storybook para:

- reduzir duplicação de layout, markup e classes utilitárias;
- padronizar a documentação dos tokens;
- facilitar manutenção e evolução de novas foundations;
- melhorar legibilidade e consistência das páginas de docs.

Arquivos analisados:

- `stories/foundations/radius.stories.tsx`
- `stories/foundations/shadows.stories.tsx`
- `stories/foundations/spacing.stories.tsx`
- `stories/foundations/typography.stories.tsx`
- contexto complementar: `stories/foundations/colors.stories.tsx`

## Principais Problemas Encontrados

### 1. Estrutura de story repetida

Todos os arquivos repetem a mesma base:

- `Meta` com `title`, `tags`, `parameters.layout` e `docs.description`;
- `type Story = StoryObj`;
- `render: () => (...)` com container, seções, grid e cards;
- blocos de preview + bloco de metadados + bloco de exemplo de uso.

Impacto:

- qualquer ajuste visual ou de documentação precisa ser repetido em várias stories;
- aumenta o risco de divergência entre foundations.

### 2. Card de token duplicado em várias variações

`radius`, `shadows` e `typography` usam praticamente o mesmo card:

- container com borda, fundo e overflow;
- área de preview;
- rodapé com nome, token, utility class e snippet.

`spacing` repete a mesma ideia duas vezes, com pequenas variações.

Impacto:

- muito código JSX duplicado;
- difícil manter consistência de espaçamento, ordem de informações e estilos.

### 3. Tipagem dos tokens não é compartilhada

Cada arquivo declara seus próprios arrays com formatos parecidos, mas sem tipos reutilizáveis.

Exemplos:

- `name`, `token`, `value`, `utilityClass`;
- combinações específicas como `marginClass`, `paddingClass`, `widthClass`.

Impacto:

- não existe contrato comum para renderização;
- fica mais difícil criar helpers genéricos ou validar consistência.

### 4. Snippets de código estão hardcoded e repetidos

Os exemplos em `<code>` aparecem copiados manualmente em vários arquivos, mudando apenas tag, texto ou classe.

Impacto:

- custo alto para manter;
- grande chance de inconsistência visual e semântica;
- mistura documentação com markup de apresentação.

### 5. Seções e grids sem abstração

Os títulos de seção e grids (`Radius Scale`, `Shadow Scale`, `Font Sizes`, `Margin Usage`, `Padding Usage`) seguem o mesmo padrão estrutural, mas cada story monta isso manualmente.

Impacto:

- repetição de JSX;
- pouca clareza entre conteúdo e estrutura.

### 6. Inconsistências de qualidade

Pontos observados:

- `radius.stories.tsx` contém `className="rounded-default rounded- ..."` com classe inválida/incompleta;
- `spacing.stories.tsx` define `widthClass`, mas essa informação não é usada;
- ordem das informações muda entre arquivos;
- parte dos textos descritivos é genérica demais para docs de design tokens.

Impacto:

- ruído visual;
- baixa confiança na documentação;
- dificuldade para escalar.

## Direção de Refatoração

### 1. Criar uma camada compartilhada para foundations

Criar uma pequena infraestrutura reutilizável em algo como:

- `stories/foundations/_shared/foundation-story.tsx`
- `stories/foundations/_shared/foundation-types.ts`
- `stories/foundations/_shared/foundation-data.tsx` se necessário

Essa camada deve concentrar:

- layout base da página de docs;
- seção com título e descrição opcional;
- card padrão de token;
- bloco de metadados do token;
- renderer de snippet/código;
- tipos compartilhados.

### 2. Separar layout de conteúdo

Cada story deve ficar responsável apenas por:

- declarar os dados dos tokens;
- informar como cada token é visualizado;
- compor as seções da página.

O layout genérico deve ser abstraído.

Meta desejada:

- story curta, com foco em dados e intenção;
- helpers responsáveis pela apresentação repetitiva.

### 3. Padronizar um contrato base para tokens

Sugestão de tipo base:

```ts
type FoundationTokenBase = {
  name: string;
  token: string;
  value?: string;
  utilityClass?: string;
  description?: string;
};
```

Extensões por foundation:

- `RadiusToken`
- `ShadowToken`
- `TypographyToken`
- `SpacingToken`

Para `spacing`, preferir um modelo mais explícito:

```ts
type SpacingUsage = {
  label: string;
  utilityClass: string;
  previewValue: string;
};

type SpacingToken = FoundationTokenBase & {
  usages: SpacingUsage[];
};
```

Assim a story deixa de depender de chaves fixas como `marginClass`, `paddingClass` e `widthClass`.

### 4. Criar componentes utilitários reutilizáveis

Sugestão mínima:

- `FoundationsPage`
  - wrapper da página com `flex`, `gap`, `padding`;
- `FoundationSection`
  - título, descrição opcional e grid configurável;
- `TokenCard`
  - estrutura padrão de card;
- `TokenMetaList`
  - renderiza `name`, `token`, `value`, `utilityClass` e extras;
- `CodeSnippet`
  - renderiza snippet textual padronizado;
- `TokenPreviewFrame`
  - moldura visual comum para a área de preview.

Benefício:

- mudanças de UI ficam centralizadas;
- novas foundations passam a ser baratas de documentar.

### 5. Trocar snippets JSX hardcoded por geração declarativa

Em vez de repetir várias `<span>` para simular código colorido, padronizar uma solução mais simples:

- gerar uma string curta de exemplo;
- renderizar com um componente `CodeSnippet`;
- aplicar estilo único ao bloco.

Exemplo de API:

```ts
getClassUsageSnippet({
  element: 'div',
  className: 'shadow-card',
  content: 'shadow preview',
});
```

Ou, mais simples:

```ts
<CodeSnippet code={'<div className="shadow-card">shadow preview</div>'} />
```

Se houver interesse futuro em highlight real, isso pode evoluir depois. Para agora, o ganho principal é remover duplicação.

### 6. Extrair metadados padrão do Storybook

Criar helper para o `meta` padrão das foundations.

Exemplo de objetivo:

```ts
createFoundationMeta({
  title: 'Foundations/Radius',
  description: '...',
});
```

Esse helper deve centralizar:

- `tags: ['autodocs']`;
- `parameters.layout = 'padded'`;
- estrutura de `docs.description.component`.

Benefício:

- metadados consistentes;
- menos boilerplate por arquivo.

## Estrutura Sugerida

```text
stories/
  foundations/
    _shared/
      foundation-meta.ts
      foundation-types.ts
      foundations-page.tsx
      foundation-section.tsx
      token-card.tsx
      token-meta-list.tsx
      code-snippet.tsx
    colors.stories.tsx
    radius.stories.tsx
    shadows.stories.tsx
    spacing.stories.tsx
    typography.stories.tsx
```

Observação:

- manter os arquivos `.stories.tsx` como ponto de entrada de documentação;
- concentrar reaproveitamento em `_shared` para evitar dependências espalhadas em `components/` sem necessidade.

## Estratégia por Arquivo

### `radius.stories.tsx`

Melhorias:

- corrigir classe inválida `rounded-`;
- migrar para `TokenCard`;
- usar contrato base com `name`, `token`, `value`, `utilityClass`;
- reduzir a story para dados + renderer do preview.

### `shadows.stories.tsx`

Melhorias:

- reaproveitar o mesmo card de `radius`;
- reaproveitar geração de snippet;
- manter apenas a função de preview específica da shadow.

### `spacing.stories.tsx`

Melhorias:

- é o arquivo com maior potencial de simplificação;
- transformar cada token em dados + lista de usos, em vez de propriedades fixas;
- reaproveitar a mesma seção para `margin`, `padding` e futuros usos;
- remover dados não utilizados, como `widthClass`, ou passar a documentá-los de fato.

Recomendação:

- modelar `spacing` como uma story orientada a variações de uso;
- criar um renderer genérico de uso de spacing para evitar dois blocos quase idênticos.

### `typography.stories.tsx`

Melhorias:

- unificar `fontFamilyTokens` e `fontSizeTokens` dentro de seções configuráveis;
- reaproveitar `TokenCard`, `TokenMetaList` e `CodeSnippet`;
- padronizar textos de preview.

## Ordem Recomendada de Implementação

### Fase 1. Infraestrutura compartilhada

Criar:

- tipos base;
- helper de `meta`;
- `FoundationsPage`;
- `FoundationSection`;
- `TokenCard`;
- `CodeSnippet`.

Resultado esperado:

- base pronta para migração incremental das stories.

### Fase 2. Migrar `radius` e `shadows`

Motivo:

- são os casos mais simples e quase idênticos;
- validam rapidamente o modelo de abstração.

Resultado esperado:

- prova de que o card compartilhado funciona bem.

### Fase 3. Migrar `typography`

Motivo:

- aproveita a mesma infraestrutura;
- adiciona o caso de múltiplas seções com datasets diferentes.

### Fase 4. Refatorar `spacing`

Motivo:

- é o caso mais específico;
- vale refatorar depois que a base estiver consolidada.

Resultado esperado:

- eliminar a maior fonte de duplicação estrutural.

### Fase 5. Revisão final de docs

Padronizar:

- textos de descrição;
- nomenclatura de seções;
- ordem das informações;
- tamanhos de grid;
- consistência visual entre foundations.

## Critérios de Sucesso

Ao final da refatoração, o ideal é que:

- cada story tenha foco em dados e composição, não em boilerplate visual;
- exista um único card padrão de foundation;
- snippets de código sejam gerados de forma consistente;
- metadados de Storybook sejam centralizados;
- adicionar uma nova foundation exija pouco código novo;
- inconsistências visuais entre páginas sejam mínimas.

## Resultado Esperado na Manutenção

Com essa estrutura, futuras mudanças como:

- trocar layout dos cards;
- mudar estilo dos snippets;
- adicionar descrição extra nos tokens;
- ajustar grids responsivos;
- incluir novas categories/variantes;

passam a ser feitas em um ponto central, em vez de replicadas em todos os arquivos.

## Próximo Passo Sugerido

Executar a refatoração em uma PR pequena e incremental:

1. criar a infraestrutura compartilhada;
2. migrar `radius` e `shadows`;
3. validar visualmente no Storybook;
4. migrar `typography`;
5. atacar `spacing` por último.

Essa ordem reduz risco e facilita revisão.
