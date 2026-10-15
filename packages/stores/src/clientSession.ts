let generation = 0;

export class ClientSessionEndedError extends Error {
  constructor() {
    super('A sessão desta operação foi encerrada.');
    this.name = 'ClientSessionEndedError';
  }
}

export function invalidateClientSession(): void {
  generation++;
}

export function createClientSessionGuard(): () => void {
  const startedIn = generation;
  return () => {
    if (startedIn !== generation) throw new ClientSessionEndedError();
  };
}
