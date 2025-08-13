import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { useDialog } from '../contexts/DialogContext';

export default function Dialog() {
  const { isOpen, options, closeDialog } = useDialog();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Trap focus inside the dialog
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  const handleConfirm = () => {
    options.onConfirm?.();
    closeDialog();
  };

  const handleCancel = () => {
    options.onCancel?.();
    closeDialog();
  };

  // Render icon based on dialog type
  const renderIcon = () => {
    switch (options.type) {
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'alert':
        return <Info className="w-6 h-6 text-blue-500" />;
      case 'confirm':
        return <CheckCircle className="w-6 h-6 text-emerald-500" />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={handleCancel}
          />

          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-xl z-50 max-w-md w-full"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {renderIcon()}
                <h3 className="text-lg font-semibold text-foreground">
                  {options.title}
                </h3>
              </div>
              <button
                onClick={handleCancel}
                className="p-1 rounded-full hover:bg-accent/40"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-muted-foreground">{options.message}</p>
            </div>

            {/* Actions */}
            <div className={`flex ${options.type === 'confirm' ? 'justify-between' : 'justify-end'}`}>
              {options.type === 'confirm' && options.cancelText && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  {options.cancelText}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  options.type === 'error' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : options.type === 'alert'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                autoFocus
              >
                {options.confirmText}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}