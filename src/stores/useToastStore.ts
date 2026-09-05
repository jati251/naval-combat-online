import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 3500);

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  error: (message, title = 'Armada Alert') =>
    get().addToast({ type: 'error', message, title }),

  warning: (message, title = 'Notice') =>
    get().addToast({ type: 'warning', message, title }),

  success: (message, title = 'Success') =>
    get().addToast({ type: 'success', message, title }),

  info: (message, title = 'Fleet Signal') =>
    get().addToast({ type: 'info', message, title }),
}));
