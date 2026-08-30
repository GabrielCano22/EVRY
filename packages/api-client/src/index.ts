import createClient from 'openapi-fetch';
import type { paths } from './schema';

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

export type { components, operations, paths } from './schema';
