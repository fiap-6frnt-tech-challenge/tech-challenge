import { Badge } from '@bytebank/design-system';

export default function AccountOverview() {
  return (
    <div className="flex flex-col gap-md p-lg">
      <div className="flex items-center gap-md">
        <h2 className="heading">Visão geral da conta</h2>
        <Badge variant="transfer">MFE :3003</Badge>
      </div>
      <p className="text-content-secondary">AccountOverview placeholder</p>
    </div>
  );
}
