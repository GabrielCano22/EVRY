'use client';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './Icon';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, icon, className, id, ...rest },
  ref,
) {
  const inputId = id ?? label?.replace(/\s+/g, '-').toLowerCase();
  return (
    <label className="block w-full" htmlFor={inputId}>
      {label && <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest mb-sm block">{label}</span>}
      <div className={cn(
        'relative flex items-center bg-surface-container rounded-lg overflow-hidden transition-all',
        'focus-within:ring-1 focus-within:ring-primary',
        error && 'ring-1 ring-error',
      )}>
        {icon && (
          <div className="pl-md py-md flex items-center text-outline">
            <Icon name={icon} />
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'bg-transparent border-none text-on-surface font-lexend text-body-md w-full px-md py-sm focus:ring-0 outline-none',
            icon && 'pl-sm',
            className,
          )}
          {...rest}
        />
      </div>
      {error && <span className="text-xs text-error mt-1 block">{error}</span>}
    </label>
  );
});
