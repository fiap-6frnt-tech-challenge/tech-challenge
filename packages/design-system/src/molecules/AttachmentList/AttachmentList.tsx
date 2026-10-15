'use client';

import { ExternalLink, FileText, Loader2, RotateCcw, X } from 'lucide-react';
import { formatFileSize } from '@bytebank/shared';
import { IconButton } from '../../atoms/Button';
import type { IAttachmentList } from './IAttachmentList';

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function AttachmentList({
  attachments,
  uploadItems = [],
  onRemove,
  onCancel,
  onRetry,
  isRemoving = null,
}: IAttachmentList) {
  if (attachments.length === 0 && uploadItems.length === 0) return null;

  return (
    <ul className="flex flex-col gap-sm" aria-label="Anexos da transação">
      {attachments.map((attachment) => {
        const removing = isRemoving === attachment.id;

        return (
          <li
            key={attachment.id}
            className="flex items-center gap-md rounded-default border border-border bg-surface p-sm"
          >
            {isImage(attachment.mimeType) ? (
              <img
                src={attachment.url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-default object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-default bg-background text-content-secondary"
              >
                <FileText size={20} />
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-xs">
              <p className="truncate label-semibold text-content-primary">{attachment.name}</p>
              <p className="label-default text-content-secondary">
                {formatFileSize(attachment.size)}
              </p>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir ${attachment.name} em nova aba`}
                className="inline-flex w-fit items-center gap-xs label-semibold text-brand-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                Abrir
                <ExternalLink aria-hidden="true" size={14} />
              </a>
            </div>

            {onRemove && (
              <div className="flex shrink-0 items-center gap-xs">
                {removing && (
                  <span role="status" aria-label={`Removendo anexo: ${attachment.name}`}>
                    <Loader2
                      aria-hidden="true"
                      size={16}
                      className="animate-spin text-content-secondary"
                    />
                  </span>
                )}
                <IconButton
                  type="button"
                  icon={<X size={16} />}
                  aria-label={`Remover anexo: ${attachment.name}`}
                  disabled={removing}
                  onClick={() => onRemove(attachment.id)}
                />
              </div>
            )}
          </li>
        );
      })}
      {uploadItems.map((item) => {
        const isInFlight = item.status === 'queued' || item.status === 'uploading';
        const canRetry = item.status === 'failed' || item.status === 'cancelled';

        return (
          <li
            key={item.id}
            className="flex items-center gap-md rounded-default border border-border bg-surface p-sm"
          >
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-default bg-background text-content-secondary"
            >
              <FileText size={20} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-xs">
              <p className="truncate label-semibold text-content-primary">{item.file.name}</p>
              <p className="label-default text-content-secondary">
                {formatFileSize(item.file.size)}
              </p>
              {isInFlight && (
                <div
                  role="progressbar"
                  aria-valuenow={item.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Enviando ${item.file.name}`}
                  className="h-1.5 w-full overflow-hidden rounded-full bg-background"
                >
                  <div
                    className="h-full rounded-full bg-brand-primary transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              <p role="status" className="label-default text-content-secondary">
                {uploadStatusLabel(item.status)}
              </p>
            </div>
            {isInFlight && onCancel ? (
              <IconButton
                type="button"
                icon={<X size={16} />}
                aria-label={`Cancelar envio de ${item.file.name}`}
                onClick={() => onCancel(item.id)}
              />
            ) : canRetry && onRetry ? (
              <IconButton
                type="button"
                icon={<RotateCcw size={16} />}
                aria-label={`Tentar novamente ${item.file.name}`}
                disabled={uploadItems.some(
                  (upload) => upload.status === 'queued' || upload.status === 'uploading'
                )}
                onClick={() => onRetry(item.id)}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function uploadStatusLabel(status: NonNullable<IAttachmentList['uploadItems']>[number]['status']) {
  switch (status) {
    case 'queued':
      return 'Aguardando envio';
    case 'uploading':
      return 'Enviando';
    case 'done':
      return 'Enviado';
    case 'failed':
      return 'Falhou';
    case 'cancelled':
      return 'Cancelado';
  }
}
