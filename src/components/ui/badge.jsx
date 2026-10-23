import React from 'react';
import { cn } from '@/lib/utils';

export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground',
    secondary: 'border-transparent bg-secondary text-secondary-foreground',
    outline: 'text-foreground border-border'
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none select-none',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
