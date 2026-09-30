import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import type { DatabaseOwner } from '../db/database';
import { ThumbnailCache, type ThumbnailStorage } from './thumbnail-cache';

export const mobileThumbnailCache = new ThumbnailCache(createNativeThumbnailStorage(), 20 * 1024 * 1024);

export function createNativeThumbnailStorage(): ThumbnailStorage {
  let legacyCleanup: Promise<void> | undefined;
  async function directoryFor(owner: DatabaseOwner): Promise<Directory> {
    const ownerKey = JSON.stringify([owner.serverUrl.replace(/\/+$/, ''), owner.userId]);
    const ownerHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, ownerKey);
    return new Directory(Paths.cache, 'evry-thumbnails', ownerHash);
  }
  return {
    prepare: () => {
      legacyCleanup ??= Image.clearDiskCache().then((cleared) => {
        if (!cleared) throw new Error('El caché de imágenes todavía no está disponible.');
      }).catch((error: unknown) => {
        legacyCleanup = undefined;
        throw error;
      });
      return legacyCleanup;
    },
    location: async (owner, url) => {
      const [directory, urlHash] = await Promise.all([
        directoryFor(owner),
        Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, url),
      ]);
      const extension = new URL(url).pathname.match(/\.(?:jpe?g|png|webp)$/i)?.[0].toLowerCase() ?? '.jpg';
      return new File(directory, `${urlHash}${extension}`).uri;
    },
    list: async (owner) => {
      const directory = await directoryFor(owner);
      if (!directory.exists) return [];
      return directory.list().filter((entry): entry is File => entry instanceof File
        && /^[a-f0-9]{64}\.(?:jpe?g|png|webp)$/.test(entry.name)).map((entry) => entry.uri);
    },
    exists: (uri) => new File(uri).exists,
    download: async (url, uri) => {
      const destination = new File(uri);
      destination.parentDirectory.create({ intermediates: true, idempotent: true });
      try {
        const file = await File.downloadFileAsync(url, destination, { idempotent: true });
        if (!Number.isSafeInteger(file.size) || file.size <= 0) throw new Error('La miniatura descargada está vacía.');
        return file.size;
      } catch (error) {
        if (destination.exists) destination.delete();
        throw error;
      }
    },
    remove: (uri) => {
      const file = new File(uri);
      if (file.exists) file.delete();
    },
  };
}
