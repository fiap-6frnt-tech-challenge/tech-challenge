import { Badge } from '@bytebank/design-system';

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-lg p-lg">
      <div className="flex items-center gap-md">
        <h1 className="heading">Transações</h1>
        <Badge variant="transfer">MFE :3003</Badge>
      </div>
      <p className="text-content-secondary">Transactions placeholder</p>
    </div>
  );
}
