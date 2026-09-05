import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore, type ToastType } from '@/stores/useToastStore';

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  error: <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />,
  success: <CheckCircle2 className="w-4 h-4 text-amber-200 shrink-0" />,
  info: <Info className="w-4 h-4 text-amber-200 shrink-0" />,
};

const TOAST_STYLES: Record<ToastType, { border: string; seal: string }> = {
  error: {
    border: 'border-rose-700/80',
    seal: 'wax-seal-red text-rose-100',
  },
  warning: {
    border: 'border-amber-600/80',
    seal: 'wax-seal-gold text-amber-950',
  },
  success: {
    border: 'border-amber-500/80',
    seal: 'wax-seal-gold text-amber-950',
  },
  info: {
    border: 'border-amber-600/60',
    seal: 'bg-stone-800 border border-amber-500/40 text-amber-300',
  },
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type];

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={`pointer-events-auto w-full p-3.5 rounded-lg pirate-parchment border-2 ${style.border} shadow-2xl flex items-start justify-between gap-3 text-amber-100 relative`}
            >
              {/* Corner Accents */}
              <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-amber-400/60" />
              <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-amber-400/60" />

              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`p-1 rounded-full shadow-md mt-0.5 ${style.seal}`}>
                  {TOAST_ICONS[toast.type]}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  {toast.title && (
                    <span className="text-xs font-cinzel font-bold tracking-wider text-amber-100 gold-emboss">
                      {toast.title}
                    </span>
                  )}
                  <p className="text-xs font-fell italic text-amber-200/90 mt-0.5 leading-relaxed break-words">
                    {toast.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded text-amber-400/60 hover:text-amber-200 transition cursor-pointer"
                title="Dismiss Dispatch"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
