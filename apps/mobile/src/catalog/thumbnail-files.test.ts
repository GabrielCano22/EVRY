import { createNativeThumbnailStorage } from './thumbnail-files';
import { Image } from 'expo-image';

jest.mock('expo-image', () => ({ Image: { clearDiskCache: jest.fn().mockResolvedValue(true) } }));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (_algorithm: string, value: string) => jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
}));
jest.mock('expo-file-system', () => {
  const files = new Map<string, number>();
  const join = (parts: (string | { uri: string })[]) => parts.map((part) => typeof part === 'string' ? part : part.uri).join('/');
  class Directory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) { this.uri = join(parts); }
    create() { /* The in-memory directory exists on demand. */ }
    get exists() { return true; }
    list() { return [...files.keys()].filter((uri) => uri.startsWith(`${this.uri}/`)).map((uri) => new File(uri)); }
  }
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) { this.uri = join(parts); }
    get parentDirectory() { return new Directory(this.uri.slice(0, this.uri.lastIndexOf('/'))); }
    get name() { return this.uri.slice(this.uri.lastIndexOf('/') + 1); }
    get exists() { return files.has(this.uri); }
    get size() { return files.get(this.uri) ?? 0; }
    delete() { files.delete(this.uri); }
    static async downloadFileAsync(url: string, destination: File) {
      files.set(destination.uri, 10);
      if (url.includes('fail.jpg')) throw new Error('download failed after partial write');
      return destination;
    }
  }
  return { Directory, File, Paths: { cache: { uri: 'file:///cache' } } };
});

const owner = { userId: 'user-a', serverUrl: 'https://api.example.test/api/v1' };

it('stores thumbnails in a deterministic account-specific file and deletes only that file', async () => {
  const storage = createNativeThumbnailStorage();
  const url = 'https://cdn.example.test/squat.jpg';
  const first = await storage.location(owner, url);
  const same = await storage.location(owner, url);
  const anotherAccount = await storage.location({ ...owner, userId: 'user-b' }, url);

  expect(first).toBe(same);
  expect(first).not.toBe(anotherAccount);
  expect(first).toMatch(/^file:\/\/\/cache\/evry-thumbnails\/[a-f0-9]{64}\/[a-f0-9]{64}\.jpg$/);
  expect(await storage.download(url, first)).toBe(10);
  await storage.download(url, anotherAccount);
  expect(storage.exists(first)).toBe(true);
  expect(await storage.list(owner)).toEqual([first]);
  storage.remove(first);
  expect(storage.exists(first)).toBe(false);
});

it('retries legacy image-cache cleanup if Android is not ready yet', async () => {
  const storage = createNativeThumbnailStorage();
  jest.mocked(Image.clearDiskCache).mockResolvedValueOnce(false);
  await expect(storage.prepare!()).rejects.toThrow('caché');
  await expect(storage.prepare!()).resolves.toBeUndefined();
});

it('removes an Android partial file when downloading fails', async () => {
  const storage = createNativeThumbnailStorage();
  const url = 'https://cdn.example.test/fail.jpg';
  const uri = await storage.location(owner, url);

  await expect(storage.download(url, uri)).rejects.toThrow('download failed');
  expect(storage.exists(uri)).toBe(false);
});
