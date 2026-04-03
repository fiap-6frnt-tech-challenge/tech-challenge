'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/classes';
import { useFocusTrap } from '@/hooks';
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

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-lg [animation:backdrop-in_150ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-content-primary/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'relative z-10 w-full max-w-120 rounded-default bg-surface p-lg shadow-card [animation:modal-panel-in_200ms_ease-out]',
          className
        )}
      >
        <div className="flex items-center justify-between mb-md">
          {title && (
            <h2 id="modal-title" className="heading text-content-primary">
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

        {children}
      </div>
    </div>,
    document.body
  );
}
