import createClient from 'openapi-fetch';
import type { paths as ServerPaths } from './schema';

// Callers supply the versioned base URL; derive route keys without repeating it.
export type paths = {
  [Path in keyof ServerPaths as Path extends `/api/v1${infer Route}` ? Route : never]: ServerPaths[Path];
};

export type AccessTokenProvider = () => string | null | Promise<string | null>;

export function createEvryApiClient(baseUrl: string, accessToken: AccessTokenProvider) {
  const client = createClient<paths>({ baseUrl, credentials: 'include' });
  client.use({
    async onRequest({ request }) {
      const token = await accessToken();
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    },
  });
  return client;
}

export type { components, operations } from './schema';
