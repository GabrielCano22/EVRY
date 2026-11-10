import { act, render, screen } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { AccountQueryProvider } from './AccountQueryProvider';

const alice = { userId: 'a', serverUrl: 'https://api.example.com', version: 1 };
const bob = { ...alice, userId: 'b', version: 2 };

function Profile({ load }: { load: () => Promise<string> }) {
  const query = useQuery({ queryKey: ['private-profile'], queryFn: load, gcTime: Infinity });
  return <Text>{query.data ?? 'Loading'}</Text>;
}

function DefaultCacheProfile() {
  const query = useQuery({ queryKey: ['default-cache-profile'], queryFn: async () => 'Loaded profile' });
  return <Text>{query.data ?? 'Loading'}</Text>;
}

it('releases default query garbage-collection timers when the account scope unmounts', async () => {
  // Record actual timers without replacing their implementation or changing
  // Query defaults. Clearing the cache before children unsubscribe must fail.
  const view = await render(<AccountQueryProvider session={alice}><DefaultCacheProfile /></AccountQueryProvider>);
  expect(await screen.findByText('Loaded profile')).toBeTruthy();
  const scheduled = jest.spyOn(global, 'setTimeout');
  const cleared = jest.spyOn(global, 'clearTimeout');
  try {
    await view.unmount();
    await act(async () => { await Promise.resolve(); });
    const gcTimers = scheduled.mock.calls.flatMap((call, index) =>
      call[1] === 300_000 ? [scheduled.mock.results[index].value] : []);
    expect(gcTimers.length).toBeGreaterThan(0);
    for (const timer of gcTimers) expect(cleared).toHaveBeenCalledWith(timer);
  } finally {
    // Failed assertions must not leave this regression test's own timers alive.
    scheduled.mock.calls.forEach((call, index) => {
      if (call[1] === 300_000) clearTimeout(scheduled.mock.results[index].value);
    });
    scheduled.mockRestore();
    cleared.mockRestore();
  }
});

it('does not show the previous account cached data under the same query key', async () => {
  const view = await render(<AccountQueryProvider session={alice}><Profile load={async () => 'Private Alice'} /></AccountQueryProvider>);
  expect(await screen.findByText('Private Alice')).toBeTruthy();
  let resolve!: (value: string) => void;
  const pending = new Promise<string>((done) => { resolve = done; });
  await view.rerender(<AccountQueryProvider session={bob}><Profile load={() => pending} /></AccountQueryProvider>);
  expect(screen.queryByText('Private Alice')).toBeNull();
  expect(screen.getByText('Loading')).toBeTruthy();
  await act(async () => { resolve('Private Bob'); });
  expect(await screen.findByText('Private Bob')).toBeTruthy();
}, 20_000);
