'use client';

import { useEffect, useState, type ReactNode } from 'react';

type Props<T> = {
  load: () => Promise<T>;
  loading: string;
  failure: string;
  beforeRetry: () => void;
  children: (module: T) => ReactNode;
};
type State<T> = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; module: T };

// Mount only for requested content. Handle delivery failure before React renders
// the module, so a failed download cannot unmount the surrounding dialog.
export function ModuleContent<T>({ load, loading, failure, beforeRetry, children }: Props<T>) {
  const [state, setState] = useState<State<T>>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(load).then(
      module => { if (mounted) setState({ kind: 'ready', module }); },
      () => { if (mounted) setState({ kind: 'error' }); },
    );
    return () => { mounted = false; };
  }, [load, attempt]);
  if (state.kind === 'loading') return <p role="status">{loading}</p>;
  if (state.kind === 'error') return <p role="alert">{failure} <button type="button" className="underline" onClick={() => {
    beforeRetry();
    setState({ kind: 'loading' });
    setAttempt(value => value + 1);
  }}>Reintentar contenido</button></p>;
  return children(state.module);
}
