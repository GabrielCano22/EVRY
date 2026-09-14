# Web Auth And Profile Generated Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar autenticación y perfil web al cliente OpenAPI generado, conservar las garantías de sesión y completar errores por campo y confirmación de guardado.

**Architecture:** Un módulo `auth-api.ts` será el único límite HTTP del dominio web de sesión/perfil y exportará aliases directos del esquema generado. Zustand conservará la identidad y generación de sesión; el formulario de perfil usará una mutación TanStack Query y aplicará la respuesta canónica al store.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zustand, TanStack Query, openapi-fetch, Vitest y Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-12-web-auth-profile-generated.md`

## Global Constraints

- El access token permanece únicamente en memoria y el refresh token web permanece en cookie HttpOnly.
- Los tipos de request/response HTTP se derivan de `@evry/api-client`; no se recrean DTO manuales.
- Las respuestas tardías nunca restauran una sesión invalidada ni mezclan cuentas.
- Los errores remotos no se convierten en éxito, valores vacíos o navegación.
- El seguimiento del ciclo es voluntario e independiente del sexo registrado.
- No se realiza ningún despliegue.
- Toda conducta nueva sigue RED → GREEN → REFACTOR y cada tarea termina en un commit enfocado.

---

### Task 1: Límite OpenAPI de autenticación y perfil

**Files:**
- Create: `apps/web/lib/auth-api.ts`
- Create: `apps/web/lib/auth-api.test.ts`

**Interfaces:**
- Consumes: `evryApi` y `unwrapApiResponse` de `apps/web/lib/generated-api.ts`.
- Produces: `AuthUser`, `User`, `UpdatedUser`, `RegisterInput`, `LoginInput`, `UserUpdateInput`, `loginWeb`, `registerWeb`, `logoutWeb`, `getCurrentUser` y `updateCurrentUser`.

- [ ] **Step 1: Escribir pruebas de tipos y transporte**

Crear pruebas que fallen mientras `auth-api.ts` no exista. Deben comprobar aliases con `expectTypeOf`, y ejecutar el transporte real con `fetch` simulado para obtener exactamente:

```ts
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
```

Las solicitudes esperadas son `POST /auth/register`, `POST /auth/login`, `GET /users/me`, `PATCH /users/me` y `POST /auth/logout`, con cuerpos JSON literales y sin Authorization inventada cuando no hay token.

- [ ] **Step 2: Verificar RED**

Run: `npm run test:unit --workspace @evry/web -- lib/auth-api.test.ts`

Expected: FAIL porque `./auth-api` no existe.

- [ ] **Step 3: Implementar el límite mínimo**

```ts
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
```

- [ ] **Step 4: Verificar GREEN y error uniforme**

Agregar una prueba con respuesta `422` que exija un `ApiError` con `fieldErrors.email`, `retryable: false` y `requestId`. Ejecutar de nuevo el archivo y exigir PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/auth-api.ts apps/web/lib/auth-api.test.ts
git commit -m 'Feat: Se agrega "contrato generado de autenticación web"'
```

### Task 2: Store de sesión y formularios de acceso

**Files:**
- Modify: `apps/web/lib/auth-store.ts`
- Modify: `apps/web/lib/auth-store.test.ts`
- Modify: `apps/web/lib/types.ts`
- Modify: `apps/web/app/(auth)/login/page.tsx`
- Modify: `apps/web/app/(auth)/login/page.test.tsx`
- Modify: `apps/web/app/(auth)/register/page.tsx`
- Modify: `apps/web/tests/unit/cycle-opt-in.test.tsx`

**Interfaces:**
- Consumes: funciones y aliases de `apps/web/lib/auth-api.ts`.
- Produces: `useAutenticacion` sin DTO HTTP manual, con `aplicarUsuarioActualizado(updated: UpdatedUser): void`.

- [ ] **Step 1: Escribir regresiones del store**

Cambiar el mock del store para apuntar a `./auth-api` y exigir que login/registro llamen `loginWeb`, `registerWeb` y `getCurrentUser` con correo/nombre normalizados. Mantener las pruebas de respuesta tardía tras login/logout y añadir que `aplicarUsuarioActualizado` conserva `createdAt` del usuario existente.

- [ ] **Step 2: Escribir regresiones de formularios**

En login y registro, lanzar un `ApiError` con `fieldErrors: { email: ['Correo inválido.'], password: ['Contraseña inválida.'] }`. Las pruebas deben exigir mensajes ligados a los inputs, ausencia de navegación y un solo envío mientras la promesa está pendiente.

- [ ] **Step 3: Verificar RED**

Run: `npx vitest run lib/auth-store.test.ts 'app/(auth)/login/page.test.tsx' tests/unit/cycle-opt-in.test.tsx --testTimeout=10000`

Expected: FAIL porque el store todavía usa `request/requestOrThrow`, no existe `aplicarUsuarioActualizado` y los formularios no enlazan `fieldErrors`.

- [ ] **Step 4: Migrar store y aliases**

Usar `loginWeb/registerWeb/getCurrentUser/logoutWeb`; conservar `epochOperacion`, generación de sesión y borrado local previo al logout remoto. En `types.ts`, derivar `Sexo`, `Meta` y `Usuario` desde `components['schemas']['User']` en vez de repetir sus campos. Implementar:

```ts
aplicarUsuarioActualizado(updated) {
  const current = get().usuario;
  if (!current || current.id !== updated.id) return;
  set({ usuario: { ...current, ...updated }, estado: 'authenticated', error: null });
}
```

- [ ] **Step 5: Mostrar errores por campo y bloquear duplicados**

Cada formulario conserva `Record<string, string[]> | undefined` del último `ApiError`, lo limpia al reenviar y pasa el primer mensaje a `Input.error`. El handler retorna si `cargando`; registro ofrece las cuatro opciones del enum, incluida “Prefiero no decir”. La navegación ocurre únicamente tras resolver el store.

- [ ] **Step 6: Verificar GREEN**

Ejecutar el comando focal hasta PASS y luego `npm run type-check --workspace @evry/web` y `npm run lint --workspace @evry/web`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/auth-store.ts apps/web/lib/auth-store.test.ts apps/web/lib/types.ts 'apps/web/app/(auth)/login/page.tsx' 'apps/web/app/(auth)/login/page.test.tsx' 'apps/web/app/(auth)/register/page.tsx' apps/web/tests/unit/cycle-opt-in.test.tsx
git commit -m 'Feat: Se agrega "sesión web sobre contrato generado"'
```

### Task 3: Perfil completo con mutación remota verificable

**Files:**
- Create: `apps/web/app/(app)/profile/page.test.tsx`
- Modify: `apps/web/app/(app)/profile/page.tsx`
- Modify: `apps/web/tests/unit/cycle-opt-in.test.tsx`
- Modify: `apps/web/tests/unit/cycle-opt-in-lifecycle.test.tsx`
- Modify: `docs/operations/implementation-status.md`

**Interfaces:**
- Consumes: `updateCurrentUser(UserUpdateInput)`, `User`, `UserUpdateInput`, `UpdatedUser` y `aplicarUsuarioActualizado`.
- Produces: formulario de perfil completo con actualización canónica, estados de guardado/error/éxito y sin segundo GET obligatorio.

- [ ] **Step 1: Escribir regresiones del perfil**

Renderizar el componente real con `QueryClientProvider` y un usuario completo. Verificar una sola solicitud pendiente, cuerpo literal con nombre, sexo, fecha civil, metas, consentimiento y longitudes, confirmación `Cambios guardados.`, y actualización inmediata del store conservando `createdAt`.

- [ ] **Step 2: Escribir regresiones de fallo**

Una respuesta `422` con `fieldErrors.name` y `fieldErrors.birthDate` debe conservar los valores editados, mostrarlos junto a sus inputs y no cambiar el usuario canónico. Una respuesta `503` debe mostrar error general y permitir reintento.

- [ ] **Step 3: Verificar RED**

Run: `npx vitest run 'app/(app)/profile/page.test.tsx' tests/unit/cycle-opt-in.test.tsx tests/unit/cycle-opt-in-lifecycle.test.tsx --testTimeout=10000`

Expected: FAIL porque el perfil todavía usa `api`, omite sexo/fecha, no expone errores y recarga con un segundo GET.

- [ ] **Step 4: Implementar la mutación mínima**

Usar `useMutation({ mutationFn: updateCurrentUser })`. En éxito, llamar `aplicarUsuarioActualizado`, mostrar confirmación y mantener el formulario sincronizado con la respuesta. En error, conservar las entradas y obtener `fieldErrors` de `ApiError`. Bloquear `mutate` cuando `isPending`.

- [ ] **Step 5: Completar todos los campos generados**

Añadir selector accesible de las cuatro opciones de sexo registrado, `Input type="date"` para `birthDate`, metas, consentimiento y longitudes. Serializar fecha como `YYYY-MM-DD`; si está vacía, omitirla porque el contrato actual define `null` como “sin cambio”.

- [ ] **Step 6: Verificar GREEN**

Ejecutar el foco hasta PASS. Después ejecutar:

```bash
npm run api:check
npm run api:verify-backend
npm run test --workspace @evry/web
npm run lint --workspace @evry/web
npm run type-check --workspace @evry/web
npm run build --workspace @evry/web
git diff --check
```

- [ ] **Step 7: Documentar evidencia y commit**

Actualizar `implementation-status.md` con conteos observados, límites todavía pendientes y la afirmación explícita de que no hubo despliegue.

```bash
git add 'apps/web/app/(app)/profile/page.tsx' 'apps/web/app/(app)/profile/page.test.tsx' apps/web/tests/unit/cycle-opt-in.test.tsx apps/web/tests/unit/cycle-opt-in-lifecycle.test.tsx docs/operations/implementation-status.md
git commit -m 'Feat: Se agrega "perfil web completo con OpenAPI y TanStack Query"'
```
