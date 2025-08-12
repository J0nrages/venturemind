import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'confirm' | 'alert' | 'error';
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface DialogContextType {
  isOpen: boolean;
  options: DialogOptions;
  openDialog: (options: DialogOptions) => void;
  closeDialog: () => void;
  confirm: (message: string, onConfirm: () => void) => void;
  alert: (message: string) => void;
  error: (message: string) => void;
}

const initialOptions: DialogOptions = {
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  type: 'confirm',
};

const DialogContext = createContext<DialogContextType>({
  isOpen: false,
  options: initialOptions,
  openDialog: () => {},
  closeDialog: () => {},
  confirm: () => {},
  alert: () => {},
  error: () => {},
});

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<DialogOptions>(initialOptions);

  const openDialog = (dialogOptions: DialogOptions) => {
    setOptions({ ...initialOptions, ...dialogOptions });
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
  };

  const confirm = (message: string, onConfirm: () => void) => {
    openDialog({
      title: 'Confirmation',
      message,
      type: 'confirm',
      onConfirm,
    });
  };

  const alert = (message: string) => {
    openDialog({
      title: 'Information',
      message,
      type: 'alert',
      confirmText: 'OK',
      cancelText: undefined,
    });
  };

  const error = (message: string) => {
    openDialog({
      title: 'Error',
      message,
      type: 'error',
      confirmText: 'OK',
      cancelText: undefined,
    });
  };

  return (
    <DialogContext.Provider
      value={{
        isOpen,
        options,
        openDialog,
        closeDialog,
        confirm,
        alert,
        error,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
};