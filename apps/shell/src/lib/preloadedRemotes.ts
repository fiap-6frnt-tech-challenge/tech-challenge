type RemoteName = 'dashboard' | 'transactions';

export type ExposeId = `${RemoteName}/${string}`;

export const preloadedRemotes = new Set<ExposeId>();
