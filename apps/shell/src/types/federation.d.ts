// Type declarations for federated modules carregados em runtime via
// `@module-federation/enhanced/runtime`. Apesar de usarmos `loadRemote(string)`
// no código (sem import estático), estas declarações ajudam intellisense de
// IDEs e evitam falsos positivos em quem editar `apps/shell/src/lib/federation.ts`.

declare module 'hello/Hello' {
  const Hello: React.ComponentType;
  export default Hello;
}

declare module 'dashboard/Dashboard' {
  const Dashboard: React.ComponentType;
  export default Dashboard;
}
