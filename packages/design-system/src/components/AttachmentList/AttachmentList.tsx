'use client';

import { ExternalLink, FileText, Loader2, X } from 'lucide-react';
import { formatFileSize } from '@bytebank/shared';
import { IconButton } from '../Button';
import type { IAttachmentList } from './IAttachmentList';

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function AttachmentList({ attachments, onRemove, isRemoving = null }: IAttachmentList) {
  if (attachments.length === 0) return null;

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
    </ul>
  );
}
