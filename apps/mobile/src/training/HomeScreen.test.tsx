import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomeScreen from '../../app/(tabs)/index';
import { useSessionStore } from '../auth/session-store';
import { useTrainingStore } from './training-store';
import { loadRecoveredDrafts, syncReviews } from '../db/database';

// Keep queries and the screen real; navigation requires a native router host.
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (callback: () => void) => jest.requireActual('react').useEffect(callback, [callback]),
}));

jest.mock('../db/database', () => ({
  loadRecoveredDrafts: jest.fn(), syncReviews: jest.fn(),
  continueServerWorkout: jest.fn(), keepReviewAsDraft: jest.fn(),
}));

it('distinguishes damaged local outbox data from a server version conflict', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  useSessionStore.setState({ session: { userId: 'damage-user', serverUrl: 'https://api.example.com/api/v1', version: 1 }, offline: true });
  useTrainingStore.setState({ activeWorkout: null, error: null, localSaveState: 'saved', syncState: 'requires_review' });
  jest.mocked(loadRecoveredDrafts).mockResolvedValue([]);
  jest.mocked(syncReviews).mockResolvedValue([{ workoutClientId: 'damaged-workout', workoutName: 'Sesión conservada',
    errorCode: 'LOCAL_SYNC_PAYLOAD_INVALID', serverVersion: null }]);
  try {
    await render(<QueryClientProvider client={client}><HomeScreen /></QueryClientProvider>);
    expect(await screen.findByText('Datos locales requieren revisión')).toBeTruthy();
    expect(screen.getByText('Un lote guardado contiene datos inválidos. Los datos locales se conservan; no se enviará hasta revisarlo.')).toBeTruthy();
    expect(screen.queryByText('Hay otra versión en el servidor. EVRY no mezclará ambas automáticamente.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continuar versión del servidor' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Conservar local como borrador' })).toBeTruthy();
  } finally { client.clear(); }
});

it('shows a local draft read error and retries without claiming that drafts are empty', async () => {
  const message = 'La sesión guardada contiene datos inválidos. Los datos locales se conservan.';
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  useSessionStore.setState({ session: { userId: 'draft-user', serverUrl: 'https://api.example.com/api/v1', version: 1 }, offline: true });
  useTrainingStore.setState({ activeWorkout: null, error: null, localSaveState: 'saved', syncState: 'synced' });
  jest.mocked(syncReviews).mockResolvedValue([]);
  jest.mocked(loadRecoveredDrafts).mockRejectedValue(new Error(message));
  try {
    await render(<QueryClientProvider client={client}><HomeScreen /></QueryClientProvider>);
    expect(await screen.findByText(message)).toBeTruthy();
    const calls = jest.mocked(loadRecoveredDrafts).mock.calls.length;
    jest.mocked(loadRecoveredDrafts).mockResolvedValue([{
      clientId: 'recovered-draft', revision: 0, status: 'DRAFT', name: 'Borrador protegido',
      startedAt: '2026-08-30T10:00:00Z', notes: null, sets: [], deletedSetClientIds: [],
    }]);
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar borradores locales' }));
    expect(await screen.findByText('Borrador protegido')).toBeTruthy();
    expect(jest.mocked(loadRecoveredDrafts).mock.calls.length).toBeGreaterThan(calls);
    expect(screen.queryByText(message)).toBeNull();
  } finally {
    client.clear();
  }
});

it('shows a failed sync-review read and allows retry without hiding local conflicts', async () => {
  const message = 'La sesión guardada contiene datos inválidos. Los datos locales se conservan.';
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  useSessionStore.setState({ session: { userId: 'review-user', serverUrl: 'https://api.example.com/api/v1', version: 1 }, offline: true });
  useTrainingStore.setState({ activeWorkout: null, error: null, localSaveState: 'saved', syncState: 'requires_review' });
  jest.mocked(loadRecoveredDrafts).mockResolvedValue([]);
  jest.mocked(syncReviews).mockRejectedValue(new Error(message));
  try {
    await render(<QueryClientProvider client={client}><HomeScreen /></QueryClientProvider>);
    expect(await screen.findByText(message)).toBeTruthy();
    jest.mocked(syncReviews).mockResolvedValue([{
      workoutClientId: 'review-workout', workoutName: 'Conflicto protegido',
      errorCode: 'REVISION_CONFLICT', serverVersion: null,
    }]);
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar conflictos locales' }));
    expect(await screen.findByText('Conflicto protegido')).toBeTruthy();
    expect(screen.queryByText(message)).toBeNull();
  } finally {
    client.clear();
  }
});
