import { RemoteHello } from '@/components/RemoteHello';

export default function PoCPage() {
  return (
    <div className="flex flex-col gap-xl p-xl">
      <h1 className="heading">PoC Module Federation</h1>
      <p className="body-default text-content-secondary">
        Este componente abaixo é carregado em runtime do app <code>hello-mfe</code> rodando em{' '}
        <code>:3001</code>:
      </p>
      <RemoteHello />
    </div>
  );
}
