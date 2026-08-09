import { cn } from '@/lib/utils';

export function Icon({ name, fill, className, size }: { name: string; fill?: boolean; className?: string; size?: number }) {
  return (
    <span
      className={cn('material-symbols-outlined', fill && 'fill', className)}
      style={size ? { fontSize: `${size}px` } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
