import React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card text-card-foreground shadow-sm flex flex-col overflow-hidden',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex items-center justify-between px-3 py-2 border-b border-border', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('text-xs font-bold leading-none tracking-tight text-foreground', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-3 pt-0 flex-1', className)} {...props} />;
}
