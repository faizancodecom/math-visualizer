import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 2800);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const { message, type = 'success' } = toast;

  return (
    <div className="fixed top-4 left-1/2 z-50 pointer-events-none select-none toast-animate-in">
      <div className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full border-2 border-foreground bg-card text-foreground shadow-2xl text-xs font-semibold">
        {type === 'success' && <CheckCircle2 className="h-4 w-4" />}
        {type === 'error' && <AlertCircle className="h-4 w-4" />}
        {type === 'info' && <Info className="h-4 w-4" />}
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
