import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { isCurrentMobileSession, type MobileSession } from '../api/client';

export function AccountQueryProvider({ session, children }: { session: MobileSession | null; children: ReactNode }) {
  const key = session ? JSON.stringify([session.serverUrl, session.userId, session.version]) : 'anonymous';
  return <QueryScope key={key} session={session}>{children}</QueryScope>;
}

function QueryScope({ session, children }: { session: MobileSession | null; children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: (failures) => failures < 1 && isCurrentMobileSession(session) },
      mutations: { retry: false },
    },
  }));
  useEffect(() => () => {
    void client.cancelQueries();
    client.clear();
  }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
