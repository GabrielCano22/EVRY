import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import type { ImageStyle, StyleProp } from 'react-native';
import type { DatabaseOwner } from '../db/database';
import type { ThumbnailCache } from './thumbnail-cache';

export function CachedThumbnail({ cache, owner, url, label, style }: {
  cache: Pick<ThumbnailCache, 'resolve'>;
  owner: DatabaseOwner;
  url: string;
  label: string;
  style: StyleProp<ImageStyle>;
}) {
  const identity = JSON.stringify([owner.serverUrl, owner.userId, url]);
  const animated = /\.gif(?:[?#]|$)/i.test(url);
  const [resolved, setResolved] = useState<{ identity: string; uri: string } | null>(null);
  const uri = !animated && resolved?.identity === identity ? resolved.uri : null;

  useEffect(() => {
    if (animated) return;
    let current = true;
    void cache.resolve(owner, url).then(
      (nextUri) => { if (current) setResolved({ identity, uri: nextUri }); },
      () => { if (current) setResolved({ identity, uri: url }); },
    );
    return () => { current = false; };
  }, [cache, owner, url, identity, animated]);

  return <Image
    accessibilityLabel={label}
    cachePolicy="none"
    contentFit="contain"
    onError={() => { if (uri && uri !== url) setResolved({ identity, uri: url }); }}
    source={uri ? { uri } : undefined}
    style={style}
  />;
}
