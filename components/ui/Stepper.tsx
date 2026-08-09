'use client';
import { Icon } from './Icon';

interface Props {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}

export function Stepper({ value, onChange, step = 2.5, min = 0, max = 1000, suffix }: Props) {
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 10) / 10));
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 10) / 10));
  return (
    <div className="flex items-center gap-sm">
      <button
        type="button"
        onClick={dec}
        className="w-12 h-12 rounded-lg bg-surface-container-high border border-white/10 flex items-center justify-center text-on-surface hover:bg-surface-bright transition-colors active:scale-[0.95]"
        aria-label="Restar"
      >
        <Icon name="remove" />
      </button>
      <div className="flex-1 text-center font-grotesk text-display-lg tabular-nums text-on-surface leading-none">
        {value}
        {suffix && <span className="font-label-caps text-label-caps text-on-surface-variant ml-sm">{suffix}</span>}
      </div>
      <button
        type="button"
        onClick={inc}
        className="w-12 h-12 rounded-lg bg-surface-container-high border border-white/10 flex items-center justify-center text-on-surface hover:bg-surface-bright transition-colors active:scale-[0.95]"
        aria-label="Sumar"
      >
        <Icon name="add" />
      </button>
    </div>
  );
}
