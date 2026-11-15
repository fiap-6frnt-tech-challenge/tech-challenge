export const ATTACHMENT_MAX_SIZE_BYTES = 4 * 1024 * 1024;

export const ATTACHMENT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
] as const;

export type AttachmentMimeType = (typeof ATTACHMENT_MIME_TYPES)[number];

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

const SIGNATURES: Array<{ mime: AttachmentMimeType; test: (bytes: Uint8Array) => boolean }> = [
  { mime: 'image/png', test: (b) => PNG_SIGNATURE.every((byte, index) => b[index] === byte) },
  { mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'application/pdf', test: (b) => ascii(b, 0, 5) === '%PDF-' },
  { mime: 'image/webp', test: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP' },
];

export function detectAttachmentType(bytes: Uint8Array): AttachmentMimeType | null {
  return SIGNATURES.find((signature) => signature.test(bytes))?.mime ?? null;
}
