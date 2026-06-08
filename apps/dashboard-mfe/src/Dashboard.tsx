import { Badge, Button, Card } from '@bytebank/design-system';

/**
 * Componente exposto via Module Federation (`exposes: { './Dashboard' }`).
 *
 * Por enquanto é um placeholder — o layout real (widgets + charts) chega na
 * Task 10. Importa componentes do @bytebank/design-system para provar, ainda
 * standalone em :3001, que os tokens e os singletons compartilhados resolvem
 * corretamente (validação da Task 5).
 */
export default function Dashboard() {
  return (
    <div className="flex flex-col gap-lg p-lg">
      <div className="flex items-center gap-md">
        <h1 className="heading">Dashboard</h1>
        <Badge variant="transfer">MFE :3001</Badge>
      </div>

      <Card padding="lg">
        <p className="body-default text-content-secondary">
          Dashboard placeholder — federado em runtime via Module Federation.
        </p>
        <Button variant="primary" className="mt-md">
          Componente do Design System
        </Button>
      </Card>
    </div>
  );
}
