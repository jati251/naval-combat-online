import React from 'react';
import { create } from 'zustand';

export type ModalVariant = 'danger' | 'warning' | 'info' | 'primary';
export type ModalIconType = 'retreat' | 'warning' | 'danger' | 'info' | 'skull' | 'swords';

export interface ConfirmDialogOptions {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ModalVariant;
  icon?: ModalIconType;
}

export interface AlertDialogOptions {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  variant?: ModalVariant;
  icon?: ModalIconType;
}

interface ActiveConfirmDialog extends ConfirmDialogOptions {
  type: 'confirm';
  resolve: (value: boolean) => void;
}

interface ActiveAlertDialog extends AlertDialogOptions {
  type: 'alert';
  resolve: () => void;
}

type ActiveDialog = ActiveConfirmDialog | ActiveAlertDialog;

interface ModalState {
  currentDialog: ActiveDialog | null;
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alert: (options: AlertDialogOptions) => Promise<void>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useModalStore = create<ModalState>((set, get) => ({
  currentDialog: null,

  confirm: (options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      set({
        currentDialog: {
          ...options,
          type: 'confirm',
          resolve,
        },
      });
    });
  },

  alert: (options: AlertDialogOptions) => {
    return new Promise<void>((resolve) => {
      set({
        currentDialog: {
          ...options,
          type: 'alert',
          resolve,
        },
      });
    });
  },

  handleConfirm: () => {
    const dialog = get().currentDialog;
    if (!dialog) return;

    if (dialog.type === 'confirm') {
      dialog.resolve(true);
    } else {
      dialog.resolve();
    }
    set({ currentDialog: null });
  },

  handleCancel: () => {
    const dialog = get().currentDialog;
    if (!dialog) return;

    if (dialog.type === 'confirm') {
      dialog.resolve(false);
    } else {
      dialog.resolve();
    }
    set({ currentDialog: null });
  },
}));
