import { Component, lazy, Suspense, useState, type ComponentType, type ReactNode } from 'react';
import {
  Button,
  DashboardWidget,
  ErrorState,
  type DashboardWidgetProps,
} from '@bytebank/design-system';
import { DeferUntilVisible } from './DeferUntilVisible';

class ChartErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface ChartWidgetProps<T extends object> {
  title: string;
  skeletonType: DashboardWidgetProps['skeletonType'];
  data: T[];
  loading: boolean;
  error: boolean;
  onRefresh: () => unknown;
  loadChart: () => Promise<{ default: ComponentType<{ data: T[] }> }>;
}

export function ChartWidget<T extends object>({ loadChart, data, ...widget }: ChartWidgetProps<T>) {
  const [{ Chart, attempt }, setChart] = useState(() => ({ Chart: lazy(loadChart), attempt: 0 }));
  const retry = () => setChart(({ attempt }) => ({ Chart: lazy(loadChart), attempt: attempt + 1 }));
  const skeleton = (
    <DashboardWidget title={widget.title} skeletonType={widget.skeletonType} loading>
      {null}
    </DashboardWidget>
  );
  return (
    <DeferUntilVisible minHeight={380} fallback={skeleton}>
      <ChartErrorBoundary
        key={attempt}
        fallback={
          <DashboardWidget title={widget.title}>
            <div role="alert">
              <ErrorState
                title="Não foi possível carregar o gráfico"
                description="Verifique sua conexão e tente novamente."
                action={<Button onClick={retry}>Tentar novamente</Button>}
              />
            </div>
          </DashboardWidget>
        }
      >
        <Suspense fallback={skeleton}>
          <DashboardWidget {...widget} empty={data.length === 0}>
            <Chart data={data} />
          </DashboardWidget>
        </Suspense>
      </ChartErrorBoundary>
    </DeferUntilVisible>
  );
}
