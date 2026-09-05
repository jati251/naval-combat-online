import React, { useEffect } from 'react';
import { Skull, AlertTriangle, Info, Swords, Anchor, ShieldAlert } from 'lucide-react';
import { useModalStore, ModalVariant, ModalIconType } from '@/stores/useModalStore';

const getDialogIcon = (variant: ModalVariant = 'danger', icon?: ModalIconType) => {
  if (icon === 'retreat') {
    return <Anchor className="w-8 h-8 text-rose-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />;
  }
  if (icon === 'skull' || variant === 'danger') {
    return <Skull className="w-8 h-8 text-rose-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />;
  }
  if (icon === 'warning' || variant === 'warning') {
    return <AlertTriangle className="w-8 h-8 text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />;
  }
  if (icon === 'swords') {
    return <Swords className="w-8 h-8 text-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />;
  }
  if (icon === 'info' || variant === 'info') {
    return <Info className="w-8 h-8 text-cyan-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />;
  }
  return <ShieldAlert className="w-8 h-8 text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />;
};

export const ConfirmDialog: React.FC = () => {
  const currentDialog = useModalStore((s) => s.currentDialog);
  const handleConfirm = useModalStore((s) => s.handleConfirm);
  const handleCancel = useModalStore((s) => s.handleCancel);

  useEffect(() => {
    if (!currentDialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDialog, handleCancel, handleConfirm]);

  if (!currentDialog) return null;

  const isConfirmType = currentDialog.type === 'confirm';
  const variant = currentDialog.variant || 'danger';
  const title = currentDialog.title || (isConfirmType ? 'CONFIRM ORDERS' : 'FLEET DISPATCH');
  const confirmLabel = currentDialog.confirmLabel || (isConfirmType ? 'Confirm' : 'Acknowledge');
  const cancelLabel = (isConfirmType && currentDialog.cancelLabel) || 'Belay Order';

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none pointer-events-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
    >
      <div
        className="pirate-parchment max-w-md w-full rounded-xl p-6 sm:p-7 border-2 border-amber-600/70 shadow-[0_16px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.25)] flex flex-col items-center text-center gap-5 relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ornate Corner Accents */}
        <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400" />
        <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-400" />
        <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-400" />
        <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-400" />

        {/* Wax Seal Medallion */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-xl ${
            isDanger
              ? 'wax-seal-red text-rose-100'
              : isWarning
              ? 'wax-seal-gold text-amber-100'
              : 'pirate-panel border-amber-400/80 text-amber-200'
          }`}
        >
          {getDialogIcon(variant, currentDialog.icon)}
        </div>

        {/* Title & Body */}
        <div className="flex flex-col gap-2 w-full">
          <span className="text-[10px] font-cinzel font-bold uppercase tracking-[0.25em] text-amber-400/90">
            {isDanger ? 'ADMIRALTY DECREE' : 'FLAGSHIP TRANSMISSION'}
          </span>
          <h2 className="font-cinzel text-xl sm:text-2xl font-black text-amber-100 tracking-wider gold-emboss">
            {title}
          </h2>
          <div className="font-fell text-amber-200/90 text-sm sm:text-base leading-relaxed px-1">
            {currentDialog.message}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 w-full pt-2">
          {isConfirmType && (
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2.5 px-4 rounded-lg pirate-panel border border-amber-600/50 hover:border-amber-400 text-amber-300 hover:text-white font-cinzel font-bold text-xs sm:text-sm tracking-wider uppercase transition cursor-pointer active:scale-95 shadow-md"
            >
              {cancelLabel}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 py-2.5 px-4 rounded-lg font-cinzel font-black text-xs sm:text-sm tracking-widest uppercase transition cursor-pointer border shadow-lg active:scale-95 ${
              isDanger
                ? 'bg-gradient-to-b from-rose-700 via-rose-800 to-red-950 hover:from-rose-600 hover:to-red-900 text-rose-100 border-rose-500/80 shadow-[0_0_20px_rgba(225,29,72,0.4)]'
                : isWarning
                ? 'bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 hover:from-amber-500 hover:to-amber-800 text-amber-100 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                : 'bg-gradient-to-b from-cyan-700 via-cyan-800 to-blue-950 hover:from-cyan-600 hover:to-blue-900 text-cyan-100 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
