import { useEffect, useState } from 'react';
import type { components } from '@evry/api-client';
import { isCurrentMobileSession, withMobileAuth, type MobileSession } from '../api/client';
import { loadUiPreference, saveUiPreference } from '../db/database';

export type RecommendationAction = 'HOLD' | 'PROGRESS' | 'DELOAD';

export interface ExerciseTarget {
  weightKg: number | null;
  reps: number | null;
  action: RecommendationAction;
}

export interface PreviousSet {
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
}

export interface ExerciseInsight {
  target: ExerciseTarget | null;
  targetSavedAt: string | null;
  previous: PreviousSet[];
}

const EMPTY: ExerciseInsight = { target: null, targetSavedAt: null, previous: [] };
const cachePrefix = 'adaptive:';

type StoredTarget = { target: ExerciseTarget; savedAt: string };

function parseTarget(raw: string | null): StoredTarget | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const target = record.target as Record<string, unknown> | undefined;
    if (!target || typeof target !== 'object') return null;
    const action = target.action;
    if (action !== 'HOLD' && action !== 'PROGRESS' && action !== 'DELOAD') return null;
    const weightKg = typeof target.weightKg === 'number' ? target.weightKg : null;
    const reps = typeof target.reps === 'number' ? target.reps : null;
    const savedAt = typeof record.savedAt === 'string' ? record.savedAt : null;
    if (!savedAt) return null;
    return { target: { weightKg, reps, action }, savedAt };
  } catch {
    return null;
  }
}

function targetFromRecommendation(data: components['schemas']['AdaptiveRecommendation']): ExerciseTarget {
  return { weightKg: data.targetWeightKg, reps: data.targetReps, action: data.action };
}

/**
 * Optional, remote insight for the inline target column and the previous
 * performance column. Cached recommendations stay visible offline with their
 * consultation date; previous values are simply omitted when offline.
 */
export function useExerciseInsights(session: MobileSession, exerciseIds: readonly string[]): Record<string, ExerciseInsight> {
  const [insights, setInsights] = useState<Record<string, ExerciseInsight>>({});
  const key = [...new Set(exerciseIds)].sort().join(',');

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (!ids.length || !isCurrentMobileSession(session)) return;
    const controller = new AbortController();
    let alive = true;
    const merge = (id: string, patch: Partial<ExerciseInsight>) => {
      if (!alive) return;
      setInsights((current) => ({ ...current, [id]: { ...(current[id] ?? EMPTY), ...patch } }));
    };

    void (async () => {
      // Cached advice is useful immediately and does not wait for the network.
      await Promise.all(ids.map(async (id) => {
        try {
          const stored = parseTarget(await loadUiPreference(session, `${cachePrefix}${id}`));
          if (stored) merge(id, { target: stored.target, targetSavedAt: stored.savedAt });
        } catch {
          // A damaged local preference must not block the session.
        }
      }));

      await Promise.all(ids.map(async (id) => {
        try {
          const response = await withMobileAuth((client) => client.GET('/adaptive/recommend/{exerciseId}', {
            params: { path: { exerciseId: id } }, signal: controller.signal,
          }), session);
          if (!alive || !isCurrentMobileSession(session) || response.error || !response.data) return;
          if (response.data.exerciseId !== id) return;
          const target = targetFromRecommendation(response.data);
          const savedAt = new Date().toISOString();
          merge(id, { target, targetSavedAt: savedAt });
          await saveUiPreference(session, `${cachePrefix}${id}`, JSON.stringify({ target, savedAt })).catch(() => undefined);
        } catch {
          // Advice is optional: training continues with the cached value or "—".
        }
        try {
          const response = await withMobileAuth((client) => client.GET('/progress/exercise/{id}', {
            params: { path: { id }, query: { period: 'all', limit: 1 } }, signal: controller.signal,
          }), session);
          if (!alive || !isCurrentMobileSession(session) || response.error || !response.data) return;
          const last = response.data.history.items[0];
          if (!last) return;
          merge(id, {
            previous: last.sets.map((set) => ({
              weightKg: set.weightKg, reps: set.reps, durationS: set.durationS,
            })),
          });
        } catch {
          // Previous performance is a convenience, never a requirement.
        }
      }));
    })();

    return () => {
      alive = false;
      controller.abort();
    };
    // `key` already encodes the exercise identity set; the session fields are
    // included so an account or login-version change cannot leak old insights.
  }, [session, key]);

  return insights;
}

export function savedAtLabel(savedAt: string | null): string | null {
  if (!savedAt) return null;
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(date);
}
