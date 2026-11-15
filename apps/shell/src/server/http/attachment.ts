import { NextResponse } from 'next/server';
import type { Attachment } from '@bytebank/core';
import type { AttachmentFile, AttachmentRecord } from '@bytebank/core/application';

export function publicAttachment(record: AttachmentRecord): Attachment {
  const { id, downloadUrl, name, size, mimeType } = record;
  return { id, downloadUrl, name, size, mimeType };
}

const UNSAFE_FILENAME_CHARS = /[\u0000-\u001f\u007f"/\\]/g;

export function safeFileName(name: string): string {
  return name.replace(UNSAFE_FILENAME_CHARS, '').trim() || 'anexo';
}

function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function attachmentFileResponse(file: AttachmentFile): NextResponse {
  return new NextResponse(file.bytes as Uint8Array<ArrayBuffer>, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Length': String(file.bytes.byteLength),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeRfc5987(safeFileName(file.name))}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
