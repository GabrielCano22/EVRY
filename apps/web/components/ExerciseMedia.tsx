'use client';

import { useEffect, useState } from 'react';
import type { Ejercicio } from '@/lib/types';
import { exerciseGifUrl, exerciseImageUrl } from '@/lib/exercise-media';
import { traducirNombreEjercicio } from '@/lib/exercise-i18n';
import { Icon } from './ui/Icon';

export function ExerciseMedia({
  exercise,
  variant = 'thumbnail',
  className = '',
}: {
  exercise: Ejercicio;
  variant?: 'thumbnail' | 'detail';
  className?: string;
}) {
  const [gifFailed, setGifFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const gifUrl = exerciseGifUrl(exercise);
  const imageUrl = exerciseImageUrl(exercise);

  useEffect(() => {
    setGifFailed(false);
    setImageFailed(false);
  }, [exercise.id, exercise.gifUrl, exercise.gifPath, exercise.imageUrl, exercise.imagePath]);

  const src = !gifFailed && gifUrl ? gifUrl : !imageFailed && imageUrl ? imageUrl : null;
  const sizeClass = variant === 'detail' ? 'aspect-square w-full max-w-sm' : 'h-14 w-14 shrink-0';

  return (
    <div className={`relative overflow-hidden rounded-lg bg-surface-container-high ${sizeClass} ${className}`}>
      {src ? (
        <img
          src={src}
          alt={`Demostración de ${traducirNombreEjercicio(exercise.name)}`}
          loading={variant === 'detail' ? 'eager' : 'lazy'}
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => (gifUrl && !gifFailed ? setGifFailed(true) : setImageFailed(true))}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center text-on-surface-variant">
          <Icon name="fitness_center" size={variant === 'detail' ? 32 : 18} />
          {variant === 'detail' && <span className="text-xs">Sin demostración disponible</span>}
        </div>
      )}
    </div>
  );
}
