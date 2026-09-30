import { forgetMediaCache, listMediaCache, readMediaCache, rememberMediaCache, touchMediaCache, trimMediaCache, type DatabaseOwner } from '../db/database';

export interface ThumbnailStorage {
  location(owner: DatabaseOwner, url: string): Promise<string>;
  exists(uri: string): boolean;
  list(owner: DatabaseOwner): Promise<string[]>;
  prepare?(): Promise<void>;
  download(url: string, uri: string): Promise<number>;
  remove(uri: string): void;
}

export class ThumbnailCache {
  private readonly inFlight = new Map<string, Promise<string>>();
  private readonly initialized = new Map<string, Promise<void>>();

  constructor(private readonly storage: ThumbnailStorage, private readonly maxBytes: number) {}

  resolve(owner: DatabaseOwner, url: string): Promise<string> {
    const key = JSON.stringify([owner.serverUrl, owner.userId, url]);
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    const operation = this.load(owner, url).finally(() => { this.inFlight.delete(key); });
    this.inFlight.set(key, operation);
    return operation;
  }

  private async load(owner: DatabaseOwner, url: string): Promise<string> {
    let uri: string | null = null;
    let newDownload = false;
    try {
      await this.initialize(owner);
      uri = await this.storage.location(owner, url);
      const cached = await readMediaCache(owner, url);
      if (cached?.uri === uri && cached.bytes > 0 && this.storage.exists(uri)) {
        await touchMediaCache(owner, url);
        return uri;
      }
      if (cached) await forgetMediaCache(owner, url);
      if (this.storage.exists(uri)) this.storage.remove(uri);

      newDownload = true;
      const bytes = await this.storage.download(url, uri);
      const { retained } = await rememberMediaCache(owner, url, uri, bytes, this.maxBytes,
        (removed) => this.evictOwned(owner, removed));
      if (!retained) {
        this.storage.remove(uri);
        return url;
      }
      return uri;
    } catch {
      if (newDownload && uri && this.storage.exists(uri)) {
        try { this.storage.remove(uri); } catch { /* Recoverable media cache cleanup. */ }
      }
      return url;
    }
  }

  private initialize(owner: DatabaseOwner): Promise<void> {
    const key = JSON.stringify([owner.serverUrl.replace(/\/+$/, ''), owner.userId]);
    const existing = this.initialized.get(key);
    if (existing) return existing;
    const operation = this.reconcile(owner).catch((error: unknown) => {
      this.initialized.delete(key);
      throw error;
    });
    this.initialized.set(key, operation);
    return operation;
  }

  private async reconcile(owner: DatabaseOwner): Promise<void> {
    await this.storage.prepare?.();
    const retained = new Set<string>();
    for (const row of await listMediaCache(owner)) {
      if (row.uri === await this.storage.location(owner, row.url)
        && Number.isSafeInteger(row.bytes) && row.bytes > 0 && this.storage.exists(row.uri)) retained.add(row.uri);
      else await forgetMediaCache(owner, row.url);
    }
    for (const uri of await this.storage.list(owner)) {
      if (!retained.has(uri)) this.storage.remove(uri);
    }
    await trimMediaCache(owner, this.maxBytes, (entry) => this.evictOwned(owner, entry));
  }

  private async evictOwned(owner: DatabaseOwner, entry: { url: string; uri: string }): Promise<void> {
    if (entry.uri === await this.storage.location(owner, entry.url) && this.storage.exists(entry.uri)) {
      this.storage.remove(entry.uri);
    }
  }
}
