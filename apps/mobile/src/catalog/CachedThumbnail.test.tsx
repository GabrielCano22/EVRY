import { render, screen, waitFor } from '@testing-library/react-native';
import { CachedThumbnail } from './CachedThumbnail';

const owner = { userId: 'account-a', serverUrl: 'https://api.example.test/api/v1' };
const url = 'https://cdn.example.test/squat.jpg';

it('displays the bounded local copy without enabling the native unbounded disk cache', async () => {
  const cache = { resolve: async () => 'file:///cache/squat.jpg' };
  await render(<CachedThumbnail cache={cache} owner={owner} url={url} label="Miniatura de sentadilla" style={{ width: 72, height: 72 }} />);

  await waitFor(() => expect(screen.getByLabelText('Miniatura de sentadilla').props.source).toEqual([{ uri: 'file:///cache/squat.jpg' }]));
  expect(screen.getByLabelText('Miniatura de sentadilla').props.cachePolicy).toBe('none');
  expect(screen.getByLabelText('Miniatura de sentadilla').props.contentFit).toBe('contain');
});

it('never displays a late result from another account', async () => {
  let resolveFirst!: (value: string) => void;
  const first = new Promise<string>((resolve) => { resolveFirst = resolve; });
  const cache = { resolve: (account: typeof owner) => account.userId === owner.userId ? first : Promise.resolve('file:///cache/account-b.jpg') };
  const view = await render(<CachedThumbnail cache={cache} owner={owner} url={url} label="Miniatura" style={{ width: 72, height: 72 }} />);
  await view.rerender(<CachedThumbnail cache={cache} owner={{ ...owner, userId: 'account-b' }} url={url} label="Miniatura" style={{ width: 72, height: 72 }} />);
  resolveFirst('file:///cache/account-a.jpg');

  await waitFor(() => expect(screen.getByLabelText('Miniatura').props.source).toEqual([{ uri: 'file:///cache/account-b.jpg' }]));
});

it('does not automatically load an animated GIF supplied as a thumbnail', async () => {
  const gif = 'https://cdn.example.test/squat.gif';
  const cache = { resolve: async () => gif };
  await render(<CachedThumbnail cache={cache} owner={owner} url={gif} label="Miniatura" style={{ width: 72, height: 72 }} />);

  expect(JSON.stringify(screen.getByLabelText('Miniatura').props.source)).not.toContain('.gif');
});
