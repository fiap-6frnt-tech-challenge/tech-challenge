# Task 3 — Design System: Componentes de Gráfico + KpiCard + DashboardWidget (Detalhamento Técnico Completo)

> ✅ **Status: Done**

|                        |                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------- |
| **Sprint**             | [Sprint 2 — Dashboard MFE + Charts](../sprint-2-dashboard.md)                         |
| **Owner**              | `Dev 2` (DS & UI Pages)                                                               |
| **Duração estimada**   | 4 dias                                                                                |
| **Branch recomendada** | `dev2/ds-chart-components`                                                            |
| **Depende de**         | — (pode iniciar no dia 1, em paralelo)                                                |
| **PR só abre**         | Após os 5 componentes terem stories, passarem no a11y addon e publicarem no Chromatic |

---

## Dependências

- **O que bloqueia esta tarefa**: Nada. É **DS-first**: deve sair cedo para não bloquear a integração.
- **O que esta tarefa desbloqueia**: Desbloqueia a **[Task 10 — Layout do Dashboard + Widgets](./10-dashboard-layout-widgets.md)** (Dev 3). Entregue **1 componente por dia** (BarChart → LineChart → PieChart → KpiCard → DashboardWidget) para o Dev 3 integrar de forma incremental.

---

## Contexto

Este documento detalha o escopo de implementação técnica dos componentes de visualização de dados do Bytebank. Visando manter a consistência com os componentes existentes (como `Card`, `EmptyState`, `ErrorState` e `Skeleton`), os novos componentes devem seguir rigorosamente o padrão de organização de diretórios, nomenclaturas de arquivos de tipos (`I{Name}.ts`), estilos do Tailwind v4 (`cn` helper de `@bytebank/shared`) e a integração de acessibilidade WCAG 2.1 AA.

---

## Padrões Arquiteturais Compartilhados

Para evitar duplicação de lógica e manter a consistência de UI/UX, criamos três utilitários no nível do pacote do Design System para serem consumidos pelos gráficos (`BarChart`, `LineChart`, `PieChart`).

### 1. Prevenção de Mismatch de Hidratação (`useIsMounted`)

Como os gráficos dependem do `ResponsiveContainer` do Recharts (que mede dimensões do client-side via `ResizeObserver`), adicione a diretiva `"use client"` no topo e faça a montagem condicional usando o hook utilitário abaixo:

```tsx
// packages/design-system/src/hooks/useIsMounted.ts
import { useEffect, useState } from 'react';

export function useIsMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
```

#### Como e Onde Usar:

Utilize este hook no início de `BarChart.tsx`, `LineChart.tsx` e `PieChart.tsx` para evitar erros de hidratação (quando o HTML renderizado pelo servidor é diferente do primeiro render no cliente).

```tsx
export function BarChart({ data, ...props }: BarChartProps) {
  const isMounted = useIsMounted();

  // Se não estiver montado no browser, renderiza um skeleton do mesmo tamanho para reservar o espaço
  if (!isMounted) {
    return <div className="h-[300px] w-full animate-pulse bg-border/20 rounded-default" />;
  }

  return (
    <div className="h-[300px] w-full relative min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        {/* ... Recharts Chart ... */}
      </ResponsiveContainer>
    </div>
  );
}
```

---

### 2. Acessibilidade (A11y) via Tabela Semântica (`AccessibleChartData`)

Para conformidade total WCAG 2.1 AA, leitores de tela não conseguem analisar SVGs complexos de forma intuitiva. Todo componente de gráfico receberá um componente utilitário oculto que gera uma tabela HTML com os dados exibidos:

```tsx
// packages/design-system/src/components/AccessibleChartData/AccessibleChartData.tsx
interface AccessibleDataProps {
  caption: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}

export function AccessibleChartData({ caption, headers, rows }: AccessibleDataProps) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}>
            {row.map((val, colIdx) => (
              <td key={colIdx}>{val}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

#### Como e Onde Usar:

Renderize o `<AccessibleChartData />` no final do JSX de cada componente de gráfico (fora do SVG), mapeando as chaves de dados do componente em arrays de strings e números. Adicione `aria-hidden="true"` no componente de gráfico do Recharts:

```tsx
export function BarChart({ data, xKey, bars, accessibleCaption }: BarChartProps) {
  const isMounted = useIsMounted();
  if (!isMounted) return <div className="h-[300px] w-full animate-pulse bg-border/20" />;

  // Mapeia chaves para cabeçalhos e linhas da tabela
  const headers = [xKey, ...bars.map((b) => b.label)];
  const rows = data.map((item) => [item[xKey], ...bars.map((b) => item[b.key])]);

  return (
    <div className="h-[300px] w-full relative min-w-0">
      {/* aria-hidden esconde o SVG dos leitores de tela */}
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} aria-hidden="true">
          {/* ... */}
        </RechartsBarChart>
      </ResponsiveContainer>

      {/* Tabela acessível lida nativamente por leitores de tela */}
      <AccessibleChartData
        caption={accessibleCaption || 'Dados do gráfico'}
        headers={headers}
        rows={rows}
      />
    </div>
  );
}
```

---

### 3. Custom Tooltip do Gráfico (`ChartTooltip`)

> [!NOTE]
> **Diferença de Nomenclatura:** Nomes foram alterados para evitar conflito com o componente de portal [Tooltip.tsx](../Tooltip/Tooltip.tsx) existente (usado para hover de texto/elementos DOM normais). O componente de gráfico usará **`ChartTooltip`** e deve ser injetado via propriedade `content` do Recharts.

```tsx
// packages/design-system/src/components/ChartTooltip/ChartTooltip.tsx
import { formatCurrency } from '@bytebank/shared';

export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-surface border border-border p-sm rounded-default shadow-tooltip flex flex-col gap-xs pointer-events-none text-sm">
      <span className="font-semibold text-content-primary">{label}</span>
      <div className="flex flex-col gap-1">
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-xs">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: item.color || item.fill }}
            />
            <span className="text-content-secondary">{item.name}:</span>
            <span className="font-semibold text-content-primary">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Como e Onde Usar:

```tsx
import { Tooltip as RechartsTooltip } from 'recharts';
import { ChartTooltip } from '../ChartTooltip';

// Dentro do seu gráfico do Recharts:
<RechartsTooltip content={<ChartTooltip />} />;
```

---

## Detalhamento dos Componentes Novos

### 1. Componente: `BarChart`

#### Estrutura de Arquivos

```
packages/design-system/src/components/BarChart/
├── index.ts
├── IBarChart.ts
├── BarChart.tsx
└── BarChart.stories.tsx
```

#### Tipos: `IBarChart.ts`

```typescript
export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

export interface BarChartProps {
  data: any[];
  xKey: string;
  bars: BarSeries[];
  height?: number;
  className?: string;
  accessibleCaption?: string;
}
```

#### Implementação: `BarChart.tsx`

- Deve conter estado local para controlar o clique nas legendas e alternar a visibilidade das barras de dados (ex: `visibleBars: Record<string, boolean>`).
- Grid interno com `CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3}`.
- O container pai direto deve ter a classe Tailwind `min-w-0 w-full relative` para evitar bugs do `ResizeObserver`.
- Renderiza `<ChartTooltip />` na prop `content` de `<Tooltip />`.
- Renderiza `<AccessibleChartData />` recebendo a tradução de `data` para o formato de tabela.

---

### 2. Componente: `LineChart`

#### Estrutura de Arquivos

```
packages/design-system/src/components/LineChart/
├── index.ts
├── ILineChart.ts
├── LineChart.tsx
└── LineChart.stories.tsx
```

#### Tipos: `ILineChart.ts`

```typescript
export interface LineSeries {
  key: string;
  label: string;
  color: string;
}

export interface LineChartProps {
  data: any[];
  xKey: string;
  lines: LineSeries[];
  height?: number;
  className?: string;
  accessibleCaption?: string;
}
```

#### Implementação: `LineChart.tsx`

- Curvas suavizadas com `type="monotone"` e dots discretos no hover.
- Elemento `<defs>` adicionando um gradiente linear vertical de opacidade suave (`strokeWidth={2.5}`) abaixo do traço da linha para gerar profundidade visual (estilo Area/Line híbrido).
- Integração de `<ChartTooltip />` e `<AccessibleChartData />`.

---

### 3. Componente: `PieChart` (Donut)

#### Estrutura de Arquivos

```
packages/design-system/src/components/PieChart/
├── index.ts
├── IPieChart.ts
├── PieChart.tsx
└── PieChart.stories.tsx
```

#### Tipos: `IPieChart.ts`

```typescript
export interface PieDataItem {
  label: string;
  value: number;
}

export interface PieChartProps {
  data: PieDataItem[];
  colors?: string[];
  height?: number;
  className?: string;
  accessibleCaption?: string;
}
```

#### Implementação: `PieChart.tsx`

- Renderizado com `innerRadius="60%"` e `outerRadius="80%"` para formar um design Donut premium.
- Legenda lateral em HTML puro utilizando flexbox, exibindo marcadores de cor redondos, o rótulo da categoria, o valor absoluto e o percentual calculado (ex: `Categorias (35%)`).
- Integração de `<AccessibleChartData />`.

---

### 4. Componente: `KpiCard`

Composto utilizando a estrutura do componente **`Card`** existente no Design System para consistência visual imediata.

#### Estrutura de Arquivos

```
packages/design-system/src/components/KpiCard/
├── index.ts
├── IKpiCard.ts
├── KpiCard.tsx
└── KpiCard.stories.tsx
```

#### Tipos: `IKpiCard.ts`

```typescript
import { ReactNode } from 'react';

export interface KpiCardProps {
  label: string;
  value: number;
  delta?: number; // Variação percentual (ex: 0.12 = +12%, -0.05 = -5%)
  icon?: ReactNode;
  loading?: boolean;
  error?: boolean;
  className?: string;
}
```

#### Implementação: `KpiCard.tsx`

- **Reuso**: Importa e envolve o conteúdo em `<Card className={className} padding="md">`.
- **Tratamento de Sinais**:
  - `delta > 0`: Exibe seta para cima `TrendingUp` em verde (`var(--color-feedback-success)`) e `aria-label="Aumento de X%"`.
  - `delta < 0`: Exibe seta para baixo `TrendingDown` em vermelho (`var(--color-feedback-danger)`) e `aria-label="Queda de X%"`.
- **Comportamento Interno**:
  - Se `loading` for true, renderiza `<Skeleton className="h-8 w-24" />` para o valor e outro menor para o rótulo.
  - Se `error` for true, renderiza mensagem de erro simplificada ("--").

---

### 5. Componente: `DashboardWidget`

Atua como o wrapper estrutural de controle de estados de dados do dashboard. Composto reutilizando os componentes **`Card`**, **`Skeleton`**, **`ErrorState`** e **`EmptyState`** existentes.

#### Estrutura de Arquivos

```
packages/design-system/src/components/DashboardWidget/
├── index.ts
├── IDashboardWidget.ts
├── DashboardWidget.tsx
└── DashboardWidget.stories.tsx
```

#### Tipos: `IDashboardWidget.ts`

```typescript
import { ReactNode } from 'react';

export interface DashboardWidgetProps {
  title: string;
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  skeletonType?: 'bar' | 'line' | 'pie' | 'kpi';
  onRefresh?: () => void;
  className?: string;
  children: ReactNode;
}
```

#### Implementação: `DashboardWidget.tsx`

- **Card Container**: O corpo do widget é envolvido pelo `<Card padding="lg" className="flex flex-col h-full gap-md relative min-w-0 shadow-card">`.
- **Header**: Exibe o título com tipografia `.heading` + botão de refresh (caso `onRefresh` seja passado).
- **Composição de Estados de Carregamento**:
  - Se `loading` for `true`, renderiza silhuetas de skeleton baseadas na prop `skeletonType`:
    - `kpi`: Skeletons retangulares empilhados simulando o valor e o rótulo comparativo.
    - `bar`: Skeletons em formato de pilhas horizontais ou barras verticais cinzas.
    - `pie`: Skeleton circular grande com efeito de pulso centralizado.
    - `line`: Linha ondulada simulada ou grid cinza com opacidade reduzida.
- **Composição de Estados de Erro**:
  - Se `error` for `true`, renderiza o componente `<ErrorState action={<Button onClick={onRefresh}>Tentar novamente</Button>} />` interno.
- **Composição de Estados Vazios**:
  - Se `empty` for `true`, renderiza o componente `<EmptyState title={emptyTitle || "Sem dados"} description={emptyDescription || "Não há dados a serem exibidos para este período."} />`.

---

## Responsividade sem Quebras (Gotchas do `ResponsiveContainer` e Grid/Flex)

O `ResponsiveContainer` do Recharts calcula dinamicamente as dimensões do SVG monitorando o elemento pai via `ResizeObserver`. Em layouts CSS Grid ou Flexbox, isso cria uma dependência circular porque itens flex/grid possuem por padrão `min-width: auto` e `min-height: auto`, o que impede o gráfico de encolher ou faz com que cresça infinitamente.

- **A Solução CSS Limpa**: Devemos quebrar essa dependência circular aplicando `min-width-0` (e `min-h-0` se flex-col) ou `overflow-hidden` no item grid/flex que envolve o gráfico.
- **Regra do Pai**: O container pai direto do gráfico deve ter posição relativa e altura fixa (ex: `className="h-[300px] w-full relative min-w-0"`).
- **Configuração do Recharts**:
  ```tsx
  <ResponsiveContainer width="100%" height="100%">
    {/* ...gráfico... */}
  </ResponsiveContainer>
  ```
  _(Com `min-width: 0` no pai, o `width="100%"` nativo funciona perfeitamente sem necessidade de hacks como `99%`)._

---

## Barrel Export no Index Geral

```typescript
// packages/design-system/src/index.ts
export * from './components/BarChart';
export * from './components/LineChart';
export * from './components/PieChart';
export * from './components/KpiCard';
export * from './components/DashboardWidget';
```

---

## Validação e Critérios de Aceite

- [ ] **Storybook**: stories cobrindo os estados normal, carregamento, erro e vazio de cada gráfico.
- [ ] **Acessibilidade**:
  - Testes do Storybook A11y Addon limpos.
  - A tabela oculta (`.sr-only`) deve ter dados populados.
  - O container do gráfico do Recharts deve possuir `aria-hidden="true"`.
- [ ] **Reuso**: `DashboardWidget` e `KpiCard` devem compor os componentes `Card`, `Skeleton`, `EmptyState` e `ErrorState` existentes, sem duplicar folhas de estilo ou lógica.

---

## Gotchas Técnicos

1. **Recharts Tooltip crash**: Evite renderizar a Tooltip se o array de dados estiver vazio, pois isso pode forçar erros de leitura de atributos nulos em compilações internas do Recharts.
2. **Classes dinâmicas Tailwind**: Nunca monte nomes de classes Tailwind dinamicamente no JSX baseadas em dados externos (ex: `bg-${color}`). As cores do Recharts devem ser alimentadas diretamente via inline fills baseadas em CSS variables estruturadas (`var(--color-...)`).
3. **`ResponsiveContainer` flex-grow**: Se o pai for uma flexbox ou grid, garanta que ele possua `min-h-[250px]` definido de forma explícita para evitar que o Recharts encolha para 0px.
