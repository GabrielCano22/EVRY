import { getDatabase, readMediaCache, rememberMediaCache, touchMediaCache } from './database';
import { ThumbnailCache, type ThumbnailStorage } from '../catalog/thumbnail-cache';

jest.mock('expo-sqlite', () => jest.requireActual('../testing/sqlite-native').createSQLiteBridge());
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, value: string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
}));

const owner = { userId: 'media-user', serverUrl: 'https://api.example.test/api/v1' };
const other = { userId: 'other-media-user', serverUrl: owner.serverUrl };

beforeEach(async () => {
  await (await getDatabase(owner)).execAsync('DELETE FROM media_cache;');
  await (await getDatabase(other)).execAsync('DELETE FROM media_cache;');
});

it('evicts the least recently used thumbnail when the byte budget is exceeded', async () => {
  await rememberMediaCache(owner, 'https://example.test/a.jpg', 'file://a.jpg', 10, 20);
  await rememberMediaCache(owner, 'https://example.test/b.jpg', 'file://b.jpg', 10, 20);
  await touchMediaCache(owner, 'https://example.test/a.jpg');
  const result = await rememberMediaCache(owner, 'https://example.test/c.jpg', 'file://c.jpg', 10, 20);

  expect(result).toEqual({ retained: true, evicted: [{ url: 'https://example.test/b.jpg', uri: 'file://b.jpg' }] });
  expect(await readMediaCache(owner, 'https://example.test/a.jpg')).toEqual({ uri: 'file://a.jpg', bytes: 10 });
  expect(await readMediaCache(owner, 'https://example.test/b.jpg')).toBeNull();
  expect(await readMediaCache(owner, 'https://example.test/c.jpg')).toEqual({ uri: 'file://c.jpg', bytes: 10 });
});

it('does not index an oversized thumbnail or evict another account', async () => {
  await rememberMediaCache(other, 'https://example.test/private.jpg', 'file://other.jpg', 10, 20);
  const result = await rememberMediaCache(owner, 'https://example.test/large.jpg', 'file://large.jpg', 21, 20);

  expect(result).toEqual({ retained: false, evicted: [] });
  expect(await readMediaCache(owner, 'https://example.test/large.jpg')).toBeNull();
  expect(await readMediaCache(other, 'https://example.test/private.jpg')).toEqual({ uri: 'file://other.jpg', bytes: 10 });
});

function fakeStorage(bytes = 10) {
  const files = new Set<string>();
  const downloads: string[] = [];
  const removed: string[] = [];
  const storage: ThumbnailStorage = {
    location: async (account, url) => `file://${account.userId}/${encodeURIComponent(url)}`,
    exists: (uri) => files.has(uri),
    list: async (account) => [...files].filter((uri) => uri.startsWith(`file://${account.userId}/`)),
    download: async (url, uri) => { downloads.push(url); files.add(uri); return bytes; },
    remove: (uri) => { removed.push(uri); files.delete(uri); },
  };
  return { storage, files, downloads, removed };
}

it('serves a visited thumbnail offline and removes the LRU file after reaching the limit', async () => {
  const files = fakeStorage();
  const cache = new ThumbnailCache(files.storage, 20);
  const a = 'https://example.test/a.jpg';
  const b = 'https://example.test/b.jpg';
  const c = 'https://example.test/c.jpg';
  const first = await cache.resolve(owner, a);
  await cache.resolve(owner, b);
  expect(await cache.resolve(owner, a)).toBe(first);
  expect(files.downloads).toEqual([a, b]);
  await cache.resolve(owner, c);

  expect(files.removed).toEqual([`file://${owner.userId}/${encodeURIComponent(b)}`]);
  expect(files.files.has(first)).toBe(true);
  expect(await readMediaCache(owner, b)).toBeNull();
});

it('redownloads a file removed by the operating system instead of returning a broken local URI', async () => {
  const files = fakeStorage();
  const cache = new ThumbnailCache(files.storage, 20);
  const url = 'https://example.test/missing.jpg';
  const localUri = await cache.resolve(owner, url);
  files.files.delete(localUri);

  expect(await cache.resolve(owner, url)).toBe(localUri);
  expect(files.downloads).toEqual([url, url]);
});

it('does not retain an oversized download in the app cache', async () => {
  const files = fakeStorage(21);
  const cache = new ThumbnailCache(files.storage, 20);
  const url = 'https://example.test/large.jpg';

  expect(await cache.resolve(owner, url)).toBe(url);
  expect(await readMediaCache(owner, url)).toBeNull();
  expect(files.files.size).toBe(0);
});

it('retains the old index and discards the new file when physical eviction fails', async () => {
  const files = fakeStorage();
  const cache = new ThumbnailCache(files.storage, 20);
  const a = 'https://example.test/a.jpg';
  const b = 'https://example.test/b.jpg';
  const c = 'https://example.test/c.jpg';
  const first = await cache.resolve(owner, a);
  await cache.resolve(owner, b);
  const remove = files.storage.remove;
  files.storage.remove = (uri) => {
    if (uri === first) throw new Error('file is temporarily locked');
    remove(uri);
  };

  expect(await cache.resolve(owner, c)).toBe(c);
  expect(await readMediaCache(owner, a)).toEqual({ uri: first, bytes: 10 });
  expect(await readMediaCache(owner, c)).toBeNull();
  expect(files.files.size).toBe(2);
});

it('removes interrupted-download files and stale rows when the cache reopens', async () => {
  const files = fakeStorage();
  const initial = new ThumbnailCache(files.storage, 20);
  const a = 'https://example.test/a.jpg';
  const b = 'https://example.test/b.jpg';
  const first = await initial.resolve(owner, a);
  const missing = await initial.resolve(owner, b);
  files.files.delete(missing);
  const abandoned = `file://${owner.userId}/abandoned.jpg`;
  files.files.add(abandoned);
  const otherAccountFile = `file://${other.userId}/preserved.jpg`;
  files.files.add(otherAccountFile);

  expect(await new ThumbnailCache(files.storage, 20).resolve(owner, a)).toBe(first);
  expect(files.files.has(abandoned)).toBe(false);
  expect(files.files.has(otherAccountFile)).toBe(true);
  expect(await readMediaCache(owner, b)).toBeNull();
});

it('applies a smaller retention budget when reopening the cache', async () => {
  const files = fakeStorage();
  const initial = new ThumbnailCache(files.storage, 30);
  const a = 'https://example.test/a.jpg';
  const b = 'https://example.test/b.jpg';
  const first = await initial.resolve(owner, a);
  const recent = await initial.resolve(owner, b);

  expect(await new ThumbnailCache(files.storage, 10).resolve(owner, b)).toBe(recent);
  expect(files.files.has(first)).toBe(false);
  expect(await readMediaCache(owner, a)).toBeNull();
  expect(files.files.size).toBe(1);
});
