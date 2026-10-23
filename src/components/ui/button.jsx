import React from 'react';
import { cn } from '@/lib/utils';

export const Button = React.forwardRef(({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none';
  
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline'
  };

  const sizes = {
    default: 'h-8 px-3 py-1.5',
    sm: 'h-7 rounded-md px-2.5 text-[11px]',
    lg: 'h-10 rounded-md px-6 text-sm',
    icon: 'h-8 w-8 p-0'
  };

  return (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
