# @bytebank/design-system

Componentes, tokens e estilos do Bytebank.

## Uso

```ts
import { Button, Card } from '@bytebank/design-system';
import '@bytebank/design-system/styles/globals.css';
```

## Entrypoints sob demanda

O barrel principal permanece compartilhado como singleton na federação. Gráficos e formulários com validação têm entrypoints próprios:

```ts
import { BarChart, LineChart, PieChart } from '@bytebank/design-system/charts';
import { LoginForm, RegisterForm } from '@bytebank/design-system/forms';
```

Importe gráficos dentro de widgets lazy. O dashboard fornece skeleton, carregamento por visibilidade e nova tentativa em caso de falha. `DashboardWidget` e `KpiCard` continuam no barrel principal, sem Recharts ou Zod.
