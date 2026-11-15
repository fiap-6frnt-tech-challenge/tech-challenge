export function attachmentDownloadUrl(transactionId: string, attachmentId: string): string {
  return `/api/transactions/${encodeURIComponent(transactionId)}/attachments/${encodeURIComponent(attachmentId)}/download`;
}
