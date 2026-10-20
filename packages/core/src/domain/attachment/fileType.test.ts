import { describe, expect, it } from 'vitest';
import { detectAttachmentType } from './fileType';

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);

describe('detectAttachmentType', () => {
  it.each([
    ['image/png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00)],
    ['image/jpeg', bytes(0xff, 0xd8, 0xff, 0xe0, 0x00)],
    ['application/pdf', text('%PDF-1.7\n%âãÏÓ')],
    ['image/webp', text('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ')],
  ])('reconhece %s pelos magic bytes', (mime, content) => {
    expect(detectAttachmentType(content)).toBe(mime);
  });

  it('recusa um executável renomeado para .png', () => {
    const exe = bytes(0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00);
    expect(detectAttachmentType(exe)).toBeNull();
  });

  it.each([
    ['vazio', bytes()],
    ['PNG truncado', bytes(0x89, 0x50, 0x4e, 0x47)],
    ['RIFF que não é WEBP', text('RIFF\u0000\u0000\u0000\u0000WAVEfmt ')],
    ['HTML', text('<!doctype html><script>alert(1)</script>')],
    ['SVG', text('<svg xmlns="http://www.w3.org/2000/svg"/>')],
  ])('recusa conteúdo %s', (_name, content) => {
    expect(detectAttachmentType(content)).toBeNull();
  });
});
