'use client';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-fixed shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-[0.98]',
  secondary:
    'bg-surface-container text-on-surface hover:bg-surface-container-high border border-white/5 active:scale-[0.98]',
  ghost: 'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50',
  outline:
    'bg-transparent border border-primary text-primary hover:bg-primary/10 active:scale-[0.98]',
  danger:
    'bg-error/10 text-error border border-error/30 hover:bg-error/20 active:scale-[0.98]',
};

const sizes: Record<Size, string> = {
  sm: 'px-sm py-xs text-label-caps font-label-caps tracking-widest uppercase rounded',
  md: 'px-md py-sm text-label-caps font-label-caps tracking-wider uppercase rounded-lg',
  lg: 'px-md py-md text-label-caps font-label-caps tracking-wider uppercase rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'transition-all inline-flex items-center justify-center gap-sm disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <span className="animate-pulse-soft">…</span> : children}
    </button>
  );
});
