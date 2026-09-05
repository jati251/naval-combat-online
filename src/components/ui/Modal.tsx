import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'max-w-md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = '',
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none pointer-events-auto transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`pirate-parchment border-2 border-amber-500/70 rounded-xl p-5 sm:p-6 w-full ${maxWidth} max-h-[92vh] flex flex-col overflow-y-auto shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_24px_rgba(245,158,11,0.25)] relative ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ornate Brass/Gold Corner Accents */}
        <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400" />
        <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-400" />
        <div className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-400" />
        <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-400" />

        {/* Header (optional) */}
        {(title || icon || showCloseButton) && (
          <div className="flex items-center justify-between pb-3.5 border-b border-amber-500/30 mb-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="w-10 h-10 rounded-lg pirate-panel border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-md shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {typeof title === 'string' ? (
                  <h3 className="font-cinzel font-black text-amber-100 text-lg tracking-wider gold-emboss truncate">
                    {title}
                  </h3>
                ) : (
                  title
                )}
                {subtitle && (
                  <p className="text-[10px] font-fell italic text-amber-200/80 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="text-amber-300/80 hover:text-white transition p-1.5 rounded hover:bg-amber-500/10 cursor-pointer shrink-0 ml-2"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 min-h-0 text-amber-100/90 font-fell">
          {children}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className="mt-5 pt-3.5 border-t border-amber-500/30 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
