import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      {/* Modal Dialog Content */}
      <div className="relative z-50 w-full max-w-md border border-border bg-card p-4 shadow-lg rounded-lg animate-in fade-in-0 zoom-in-95">
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, children, ...props }) {
  return (
    <div className={cn('flex items-center justify-between pb-3 border-b border-border', className)} {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({ className, children, ...props }) {
  return (
    <h2 className={cn('text-sm font-bold text-foreground', className)} {...props}>
      {children}
    </h2>
  );
}

export function DialogClose({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  );
}
