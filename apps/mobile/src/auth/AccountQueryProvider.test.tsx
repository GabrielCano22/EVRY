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
