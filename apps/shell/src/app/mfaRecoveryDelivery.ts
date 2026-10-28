// UI-only navigation hold. It never extends or authorizes the revoked server session.
// Recovery codes remain exclusively in component memory, never in this module.
let deliveryActive = false;
let pendingExpiry: (() => void) | undefined;

export function beginMfaRecoveryDelivery(): () => void {
  deliveryActive = true;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    deliveryActive = false;
    const pending = pendingExpiry;
    pendingExpiry = undefined;
    pending?.();
  };
}

export function afterMfaRecoveryDelivery(action: () => void): void {
  if (deliveryActive) pendingExpiry = action;
  else action();
}
