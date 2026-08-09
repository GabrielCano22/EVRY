import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  tone?: 'low' | 'default' | 'high';
}

export function Card({ className, glass, tone = 'low', ...rest }: CardProps) {
  const base = glass
    ? 'glass-panel'
    : tone === 'low'
    ? 'bg-surface-container-low'
    : tone === 'high'
    ? 'bg-surface-container-high'
    : 'bg-surface-container';
  return <div className={cn(base, 'rounded-xl border border-white/5 p-md', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-label-caps text-label-caps text-outline uppercase tracking-widest mb-sm', className)}
      {...rest}
    />
  );
}

export function CardHeadline({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('font-lexend text-headline-md text-on-surface', className)} {...rest} />;
}
