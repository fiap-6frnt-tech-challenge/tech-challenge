'use client';

import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { cn, formatFileSize } from '@bytebank/shared';
import { IconButton } from '../Button';
import type { IFileUpload } from './IFileUpload';

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf';
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;
const DEFAULT_MAX_FILES = 5;

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function isTypeAllowed(fileType: string, allowedTypes: string[]): boolean {
  return allowedTypes.some((type) =>
    type.endsWith('/*') ? fileType.startsWith(type.slice(0, -1)) : type === fileType
  );
}

function validate(file: File, maxSizeBytes: number, accept: string): string | null {
  const allowedTypes = accept.split(',').map((type) => type.trim());
  if (!isTypeAllowed(file.type, allowedTypes))
    return `Tipo não permitido: ${file.type || 'desconhecido'}`;
  if (file.size > maxSizeBytes) return `Arquivo excede ${maxSizeBytes / 1024 / 1024}MB`;
  return null;
}

export function FileUpload({
  accept = DEFAULT_ACCEPT,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  value,
  onChange,
  onError,
  progress,
  disabled = false,
  className,
}: IFileUpload) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    const urls: Record<string, string> = {};
    value.forEach((file) => {
      if (file.type.startsWith('image/')) {
        urls[fileKey(file)] = URL.createObjectURL(file);
      }
    });
    setPreviews(urls);

    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [value]);

  function addFiles(incoming: File[]) {
    if (disabled) return;

    const accepted: File[] = [];
    for (const file of incoming) {
      const error = validate(file, maxSizeBytes, accept);
      if (error) {
        onError?.(error);
        continue;
      }
      accepted.push(file);
    }

    const remainingSlots = maxFiles - value.length;
    let toAdd = accepted;
    if (accepted.length > remainingSlots) {
      onError?.(`Você pode anexar no máximo ${maxFiles} arquivo(s).`);
      toAdd = accepted.slice(0, Math.max(0, remainingSlots));
    }

    if (toAdd.length > 0) {
      onChange([...value, ...toAdd]);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addFiles(Array.from(event.target.files));
    }
    event.target.value = '';
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    addFiles(Array.from(event.dataTransfer.files));
  }

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  }

  function handleRemove(file: File) {
    onChange(value.filter((current) => current !== file));
  }

  return (
    <div className={cn('flex flex-col gap-md', className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Área de upload de arquivos"
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-sm rounded-default border-2 border-dashed px-lg py-2xl text-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
          isDragging ? 'border-brand-primary bg-brand-primary/5' : 'border-border bg-surface',
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:border-brand-primary hover:bg-brand-primary/5'
        )}
      >
        <UploadCloud
          aria-hidden="true"
          size={28}
          className={cn('text-content-secondary', isDragging && 'text-brand-primary')}
        />
        <p className="body-default text-content-primary">
          Arraste arquivos ou clique para selecionar
        </p>
        <p className="label-default text-content-secondary">
          Até {maxFiles} arquivo(s) · máx. {maxSizeBytes / 1024 / 1024}MB cada
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          hidden
          disabled={disabled}
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleInputChange}
        />
      </div>

      {value.length > 0 && (
        <ul
          aria-live="polite"
          aria-label={`${value.length} arquivo(s) selecionado(s)`}
          className="flex flex-col gap-sm"
        >
          {value.map((file) => {
            const key = fileKey(file);
            const previewUrl = previews[key];
            const progressValue = progress?.[file.name];

            return (
              <li
                key={key}
                className="flex items-center gap-md rounded-default border border-border bg-surface p-sm"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="h-12 w-12 shrink-0 rounded-default object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-default bg-background text-content-secondary">
                    <FileText aria-hidden="true" size={20} />
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-xs">
                  <p className="label-semibold truncate text-content-primary">{file.name}</p>
                  <p className="label-default text-content-secondary">
                    {formatFileSize(file.size)}
                  </p>
                  {progressValue !== undefined && (
                    <div
                      role="progressbar"
                      aria-valuenow={progressValue}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Enviando ${file.name}`}
                      className="h-1.5 w-full overflow-hidden rounded-full bg-background"
                    >
                      <div
                        className="h-full rounded-full bg-brand-primary transition-all"
                        style={{ width: `${progressValue}%` }}
                      />
                    </div>
                  )}
                </div>

                <IconButton
                  type="button"
                  icon={<X size={16} />}
                  aria-label={`Remover ${file.name}`}
                  disabled={disabled}
                  onClick={() => handleRemove(file)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
