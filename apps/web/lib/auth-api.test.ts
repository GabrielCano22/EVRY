import type { components } from '@evry/api-client';
import { afterEach, expect, expectTypeOf, it, vi } from 'vitest';
import { ApiError, setAccessToken } from './api';
import {
  getCurrentUser,
  loginWeb,
  logoutWeb,
  registerWeb,
  updateCurrentUser,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
  type UpdatedUser,
  type User,
  type UserUpdateInput,
} from './auth-api';

interface CapturedRequest {
  authorization: string | null;
  body: string | null;
  method: string;
  pathname: string;
}

function captureJsonRequests() {
  const requests: CapturedRequest[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input.clone() : new Request(input, init);
    requests.push({
      authorization: request.headers.get('authorization'),
      body: request.body ? await request.text() : null,
      method: request.method,
      pathname: new URL(request.url).pathname,
    });
    return Response.json({ ok: true });
  }));
  return requests;
}

afterEach(() => {
  setAccessToken(null);
  vi.unstubAllGlobals();
});

it('exports the generated authentication and profile schema aliases', () => {
  expectTypeOf<AuthUser>().toEqualTypeOf<components['schemas']['AuthUser']>();
  expectTypeOf<User>().toEqualTypeOf<components['schemas']['User']>();
  expectTypeOf<UpdatedUser>().toEqualTypeOf<components['schemas']['UpdatedUser']>();
  expectTypeOf<RegisterInput>().toEqualTypeOf<components['schemas']['RegisterInput']>();
  expectTypeOf<LoginInput>().toEqualTypeOf<components['schemas']['LoginInput']>();
  expectTypeOf<UserUpdateInput>().toEqualTypeOf<components['schemas']['UserUpdateInput']>();
});

it('sends the exact unauthenticated authentication and profile requests', async () => {
  const requests = captureJsonRequests();

  await registerWeb({
    email: 'eva@example.test',
    password: 'testing-password',
    name: 'Eva',
    biologicalSex: 'PREFER_NOT_SAY',
    trackCycle: true,
  });
  await loginWeb({ email: 'eva@example.test', password: 'testing-password' });
  await getCurrentUser();
  await updateCurrentUser({ name: 'Eva Cano', birthDate: '1999-05-20', goals: ['STRENGTH'] });
  await logoutWeb();

  expect(requests).toEqual([
    {
      authorization: null,
      body: '{"email":"eva@example.test","password":"testing-password","name":"Eva","biologicalSex":"PREFER_NOT_SAY","trackCycle":true}',
      method: 'POST',
      pathname: '/api/v1/auth/register',
    },
    {
      authorization: null,
      body: '{"email":"eva@example.test","password":"testing-password"}',
      method: 'POST',
      pathname: '/api/v1/auth/login',
    },
    { authorization: null, body: null, method: 'GET', pathname: '/api/v1/users/me' },
    {
      authorization: null,
      body: '{"name":"Eva Cano","birthDate":"1999-05-20","goals":["STRENGTH"]}',
      method: 'PATCH',
      pathname: '/api/v1/users/me',
    },
    { authorization: null, body: null, method: 'POST', pathname: '/api/v1/auth/logout' },
  ]);
});

it('throws the uniform API error for structured authentication validation failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
    code: 'VALIDATION_ERROR',
    message: 'Revisa los campos enviados.',
    fieldErrors: { email: ['El correo no es válido.'] },
    retryable: false,
    requestId: 'request-auth_422',
  }, { status: 422 })));

  const result = registerWeb({
    email: 'eva@example.test',
    password: 'testing-password',
    name: 'Eva',
  });

  await expect(result).rejects.toBeInstanceOf(ApiError);
  await expect(result).rejects.toMatchObject({
    status: 422,
    fieldErrors: { email: ['El correo no es válido.'] },
    retryable: false,
    requestId: 'request-auth_422',
  });
});
