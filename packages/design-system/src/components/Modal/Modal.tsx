'use client';

import { useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@bytebank/shared';
import { useFocusTrap } from '../../hooks';
import type { ModalProps } from './IModal';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
}: ModalProps) {
  const panelRef = useFocusTrap({ isActive: isOpen, onEscape: onClose });
  const generatedTitleId = useId();
  const titleId = title ? `${generatedTitleId}-title` : undefined;

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-lg [animation:backdrop-in_150ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-content-primary/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        className={cn(
          'relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-120 flex-col overflow-hidden rounded-default bg-surface p-lg shadow-card [animation:modal-panel-in_200ms_ease-out]',
          className
        )}
      >
        <div className="mb-md flex shrink-0 items-center justify-between">
          {title && (
            <h2 id={titleId} className="heading text-content-primary">
              {title}
            </h2>
          )}
          {showCloseButton && (
            <button
              onClick={onClose}
              aria-label="Fechar modal"
              className="ml-auto rounded-default p-xs text-icon-default hover:bg-background transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="min-h-0 overflow-y-auto pr-xs">{children}</div>
      </div>
    </div>,
    document.body
  );
}
