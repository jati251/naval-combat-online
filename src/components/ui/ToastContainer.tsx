import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore, type ToastType } from '@/stores/useToastStore';

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
  success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
  info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
};

const TOAST_STYLES: Record<ToastType, { border: string; glow: string }> = {
  error: {
    border: 'border-rose-500/50',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.25)]',
  },
  warning: {
    border: 'border-amber-500/50',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
  },
  success: {
    border: 'border-emerald-500/50',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
  },
  info: {
    border: 'border-cyan-500/50',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.25)]',
  },
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
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
              className={`pointer-events-auto w-full p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md border ${style.border} ${style.glow} flex items-start justify-between gap-3 text-slate-100`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="mt-0.5">{TOAST_ICONS[toast.type]}</div>
                <div className="flex flex-col flex-1 min-w-0">
                  {toast.title && (
                    <span className="text-xs font-bold font-cinzel tracking-wider text-slate-200">
                      {toast.title}
                    </span>
                  )}
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words font-medium">
                    {toast.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
                title="Dismiss"
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
