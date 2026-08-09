'use client';
import { useEffect, useState } from 'react';
import { Icon } from './ui/Icon';

export function RestTimer({ seconds = 120 }: { seconds?: number }) {
  const [restantes, setRestantes] = useState(seconds);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    setRestantes(seconds);
    setPausado(false);
  }, [seconds]);

  useEffect(() => {
    if (pausado) return;
    const intervalo = setInterval(() => setRestantes((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(intervalo);
  }, [pausado]);

  const mm = String(Math.floor(restantes / 60)).padStart(2, '0');
  const ss = String(restantes % 60).padStart(2, '0');
  const terminado = restantes === 0;

  return (
    <div className="glass-panel rounded-xl p-lg flex flex-col items-center justify-center relative overflow-hidden border-t border-primary/20">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
      <span className="font-grotesk text-label-caps tracking-[0.18em] uppercase text-primary mb-sm">
        Descanso
      </span>
      <div
        className={`font-grotesk text-display-lg text-on-surface tabular-nums tracking-tight leading-none mb-md ${
          terminado ? 'text-secondary' : ''
        }`}
        style={{ textShadow: terminado ? 'none' : '0 0 12px rgba(0,122,255,0.4)' }}
      >
        {terminado ? '¡Vamos!' : `${mm}:${ss}`}
      </div>
      <div className="flex gap-sm">
        <button
          onClick={() => setRestantes((r) => Math.max(0, r - 10))}
          className="w-12 h-12 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center text-on-surface hover:bg-surface-bright transition-colors"
        >
          <Icon name="replay_10" />
        </button>
        <button
          onClick={() => setPausado((p) => !p)}
          className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center hover:scale-105 transition-transform"
          style={{ boxShadow: '0 0 15px rgba(0,122,255,0.5)' }}
        >
          <Icon name={pausado ? 'play_arrow' : 'pause'} fill />
        </button>
        <button
          onClick={() => setRestantes((r) => r + 10)}
          className="w-12 h-12 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center text-on-surface hover:bg-surface-bright transition-colors"
        >
          <Icon name="forward_10" />
        </button>
      </div>
    </div>
  );
}
