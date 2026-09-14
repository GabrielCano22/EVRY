'use client';

import type { components } from '@evry/api-client';
import { evryApi, unwrapApiResponse } from './generated-api';

export type AuthUser = components['schemas']['AuthUser'];
export type User = components['schemas']['User'];
export type UpdatedUser = components['schemas']['UpdatedUser'];
export type RegisterInput = components['schemas']['RegisterInput'];
export type LoginInput = components['schemas']['LoginInput'];
export type UserUpdateInput = components['schemas']['UserUpdateInput'];

export const registerWeb = (body: RegisterInput) =>
  unwrapApiResponse(evryApi.POST('/auth/register', { body }));
export const loginWeb = (body: LoginInput) =>
  unwrapApiResponse(evryApi.POST('/auth/login', { body }));
export const logoutWeb = () =>
  unwrapApiResponse(evryApi.POST('/auth/logout'));
export const getCurrentUser = (signal?: AbortSignal) =>
  unwrapApiResponse(evryApi.GET('/users/me', { signal }));
export const updateCurrentUser = (body: UserUpdateInput) =>
  unwrapApiResponse(evryApi.PATCH('/users/me', { body }));
