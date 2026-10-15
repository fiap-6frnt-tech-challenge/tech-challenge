const queues = new Set<() => void>();

export function registerUploadCancellation(cancel: () => void): () => void {
  queues.add(cancel);
  return () => {
    queues.delete(cancel);
  };
}

export function cancelPendingUploads(): void {
  for (const cancel of [...queues]) cancel();
}
