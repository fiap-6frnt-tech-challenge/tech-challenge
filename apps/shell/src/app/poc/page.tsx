import { RemoteHello } from '@/components/RemoteHello';

// TODO(sprint-2): remove this route once dashboard-mfe replaces hello-mfe.
// Kept after Task 7 Gate (2026-05-24) as the live reference for Module Federation
// runtime wiring — Sprints 2/3 copy this pattern. See docs/phase-2/sprint-0/mfe-decision.md.
/** @deprecated PoC route — superseded when dashboard-mfe lands in Sprint 2. */
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
