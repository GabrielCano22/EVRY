# Web Generated Training Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the complete web training and routine surface to the generated OpenAPI client and TanStack Query while preserving session refresh, cancellation, honest remote states, and existing UX.

**Architecture:** Keep the hardened browser transport in `apps/web/lib/api.ts`, expose it as a standards-compatible `fetch` implementation, and inject it into `@evry/api-client` so route, parameter, request, and response types come from OpenAPI. Put training operations and cache identities in one client-only module; components consume those operations through TanStack Query instead of handwritten generics and request effects.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, openapi-fetch, TanStack Query v5, Vitest, Testing Library.

**Spec:** `docs/operations/implementation-status.md` — especially “Contratos e integración” and “Web, rendimiento y operación”; the user-provided integral EVRY roadmap remains the binding product specification.

## Global Constraints

- Do not deploy, publish hosting resources, or add Render/Cloudflare configuration; any future deployment requires explicit authorization and may use only Vercel.
- Keep the browser access token only in memory and the web refresh token only in its existing `HttpOnly` cookie flow.
- A generated-client request must retain the existing single-flight refresh, one retry after `401`, strict cancellation, 15-second default timeout, credentials, and safe normalized `ApiError` behavior.
- API entity, input, and response types in this scope must come from `@evry/api-client`; do not introduce replacement handwritten transport contracts.
- Every private TanStack Query key must include the authenticated account id plus every route/filter parameter that changes the response.
- Preserve separate initial loading, recoverable error, genuine empty, stale-data warning, and success states. An aborted obsolete request must not surface as a user error.
- Catalog requests remain limited to 30 records per page. Lists render thumbnails only; a GIF is fetched only after the existing explicit “Reproducir” action.
- Preserve the current Spanish UI, keyboard behavior, focus restoration, 200% zoom layout, and reduced-motion behavior.
- Follow strict RED → GREEN → REFACTOR. Each behavior-changing production edit requires a test that was observed failing for the intended reason first.
- Commit subjects use `Feat: Se agrega "Accion que se realizó en este modulo"`.

---

### Task 1: Authenticated transport for the generated client

**Files:**
- Modify: `packages/api-client/src/index.ts`
- Modify: `packages/api-client/src/index.test.ts`
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/lib/api.test.ts`
- Create: `apps/web/lib/generated-api.ts`
- Create: `apps/web/lib/generated-api.test.ts`

**Interfaces:**
- Produces: `createEvryApiClient(baseUrl, accessToken, options?: { fetch?: (input: Request) => Promise<Response> })`.
- Produces: `fetchWithSession(input: Request): Promise<Response>` from `apps/web/lib/api.ts`.
- Produces: `evryApi` and `unwrapApiResponse<T>(operation): Promise<T>` from `apps/web/lib/generated-api.ts`.
- Preserves: `request`, `requestOrThrow`, `api`, `getAccessToken`, and `setAccessToken` for consumers not migrated in this plan.

- [ ] **Step 1: Write failing package-client and browser-transport tests**

Add tests proving that an injected fetch receives the generated URL/method/body and that access-token middleware still applies. Add browser tests proving `fetchWithSession` preserves a request body and caller signal, retries exactly once with a rotated token after a protected `401`, shares one refresh across concurrent requests, never refreshes unauthenticated requests, and returns the original successful status/body/headers.

- [ ] **Step 2: Run the focused tests and record RED**

Run `npm run test --workspace @evry/api-client -- src/index.test.ts` and `npm run test:unit --workspace @evry/web -- lib/api.test.ts lib/generated-api.test.ts`. The new tests must fail because the optional fetch, session fetch, and generated web client do not exist.

- [ ] **Step 3: Implement the minimum transport integration**

Extend the package factory without changing its current two-argument callers. Refactor the existing browser request path so `fetchWithSession` owns timeout/caller abort, credentials, current bearer token, single-flight refresh, and the one retry, while `request` parses its returned `Response` as before. Add `requestId?: string` to `ApiFailure` and preserve a safe server request id when present. Build `evryApi` with `resolveApiBaseUrl()`, `getAccessToken`, and `fetchWithSession`; `unwrapApiResponse` must return successful data (including `undefined` for `204`) and throw normalized `ApiError` for documented and undocumented failures.

- [ ] **Step 4: Verify GREEN and compatibility**

Run the focused tests again, then `npm run test:unit --workspace @evry/web -- lib/api-origin.test.ts lib/api.test.ts lib/generated-api.test.ts lib/auth-store.test.ts` and `npm run test --workspace @evry/api-client`. Existing auth consumers must remain green.

- [ ] **Step 5: Commit**

Commit only Task 1 files with `Feat: Se agrega "transporte autenticado para el cliente OpenAPI web"`.

---

### Task 2: Typed training operations and cache identities

**Files:**
- Create: `apps/web/lib/training-api.ts`
- Create: `apps/web/lib/training-api.test.ts`

**Interfaces:**
- Consumes: `evryApi` and `unwrapApiResponse` from Task 1.
- Produces: generated-schema aliases for exercise list/detail, workout, workout set, routine, routine create/update input, and adaptive recommendation.
- Produces: `trainingKeys` with account-scoped keys for workout list/detail, routine list/detail, and exercise catalog filters.
- Produces: `listExercises`, `getExercise`, `listWorkouts`, `getWorkout`, `createWorkout`, `finishWorkout`, `addWorkoutSet`, `getRecommendation`, `listRoutines`, `getRoutine`, `createRoutine`, `updateRoutine`, `deleteRoutine`, and `startRoutine`.

- [ ] **Step 1: Write failing operation tests**

Through a real generated client and only a stubbed network boundary, assert literal URLs, query strings, HTTP verbs, and JSON bodies for every exported operation. Cover catalog defaults `page=1&limit=30`, optional filters, encoded ids, routine create/update, session start, series addition, and finish. Assert that a structured `409` becomes `ApiError` with `code`, `retryable`, and `requestId` rather than an empty result.

- [ ] **Step 2: Run the focused test and record RED**

Run `npm run test:unit --workspace @evry/web -- lib/training-api.test.ts`. It must fail because the module does not exist.

- [ ] **Step 3: Implement generated operations**

Use `evryApi.GET/POST/PATCH/DELETE` route literals and their generated `params`/`body` options. Do not cast request payloads to handwritten DTOs and do not build query strings manually. Keep this module free of React state; it is the typed boundary used by queries and mutations.

- [ ] **Step 4: Verify GREEN and types**

Run the focused test, `npm run api:check`, and `npm run type-check --workspace @evry/web`.

- [ ] **Step 5: Commit**

Commit Task 2 with `Feat: Se agrega "operaciones tipadas de entrenamientos web"`.

---

### Task 3: Catalog and routine screens on TanStack Query

**Files:**
- Modify: `apps/web/components/ExercisePicker.tsx`
- Create: `apps/web/components/ExercisePicker.test.tsx`
- Modify: `apps/web/components/EditorRutina.tsx`
- Create: `apps/web/components/EditorRutina.test.tsx`
- Modify: `apps/web/app/(app)/workout/routines/[id]/page.tsx`
- Modify: `apps/web/app/(app)/workout/routines/[id]/page.test.tsx`
- Modify: `apps/web/app/(app)/workout/routines/new/page.tsx`

**Interfaces:**
- Consumes: Task 2 operations/types and `trainingKeys`.
- Produces: account-isolated catalog/routine queries and create/update mutations with exact invalidation of that account’s routine cache.

- [ ] **Step 1: Write failing interaction tests**

Render the real picker/editor/pages under `QueryClientProvider` with the real generated transport and a stubbed HTTP boundary. Prove that catalog search/filter changes abort obsolete reads, pagination appends without duplicates, an initial error offers retry without showing a fake empty catalog, and a later-page error keeps prior items. Prove routine edit distinguishes loading/error/success, create/update sends the generated body including explicit `null` notes and per-set plans, validation maps field errors, success invalidates only the current account’s routine keys, and failed delete/save preserves the form.

- [ ] **Step 2: Run the focused tests and record RED**

Run `npm run test:unit --workspace @evry/web -- components/ExercisePicker.test.tsx components/EditorRutina.test.tsx 'app/(app)/workout/routines/[id]/page.test.tsx'`. New assertions must fail against imperative request state.

- [ ] **Step 3: Migrate the catalog query**

Use `useInfiniteQuery` with the account id and all debounced filters in the query key, pass TanStack’s `signal` into `listExercises`, and derive items/total/has-more from pages. Preserve the 220 ms search delay, 30-item page size, excluded ids, thumbnail-only media, explicit retry, loading skeleton, stale-page warning, genuine empty state, Escape close, and dialog focus behavior.

- [ ] **Step 4: Migrate routine reads and writes**

Use `useQuery` for edit detail and `useMutation` for create/update. Derive all API types from Task 2. Surface normalized global and field errors, prevent duplicate submission, keep entered data after failure, and invalidate current-account routine list/detail keys after success before navigation.

- [ ] **Step 5: Verify GREEN and regression scope**

Run the focused tests, all web unit tests, web accessibility tests, lint, and web type-check.

- [ ] **Step 6: Commit**

Commit Task 3 with `Feat: Se agrega "rutinas web con contrato generado y cache remota"`.

---

### Task 4: Workout list, creation, active session, and history on TanStack Query

**Files:**
- Modify: `apps/web/app/(app)/workout/page.tsx`
- Create: `apps/web/app/(app)/workout/page.test.tsx`
- Modify: `apps/web/app/(app)/workout/new/page.tsx`
- Create: `apps/web/app/(app)/workout/new/page.test.tsx`
- Modify: `apps/web/app/(app)/workout/[id]/page.tsx`
- Create: `apps/web/app/(app)/workout/[id]/page.test.tsx`
- Modify: `apps/web/lib/types.ts`
- Modify: `docs/operations/implementation-status.md`

**Interfaces:**
- Consumes: Task 2 operations/types and `trainingKeys`; Task 3 routine cache behavior.
- Produces: generated-client/TanStack Query coverage for all remaining web workout and routine consumers in scope.

- [ ] **Step 1: Write failing list and mutation tests**

Prove workout and routine reads are independent: one may fail and be retried without hiding the other’s successful data. Prove an active session and completed history render from generated responses; no failure is converted to an empty list or zero metric. Prove quick start and routine start disable duplicate submissions, navigate only after success, and surface a `409`. Prove routine deletion reports failure, preserves the card, and invalidates/refetches only after success.

- [ ] **Step 2: Write failing active-session tests**

Prove the detail query is cancelled when id/account changes, exercise detail and recommendation remain independent, adding a set sends the exact generated payload once and refreshes canonical workout data, finish sends once and navigates only after success, and completed/cancelled sessions expose no controls that mutate history. Prove a failed add/finish keeps current canonical data and offers retry.

- [ ] **Step 3: Run focused tests and record RED**

Run `npm run test:unit --workspace @evry/web -- 'app/(app)/workout/page.test.tsx' 'app/(app)/workout/new/page.test.tsx' 'app/(app)/workout/[id]/page.test.tsx'`. Failures must identify imperative/manual behavior being replaced.

- [ ] **Step 4: Migrate workout list and creation**

Use account-scoped `useQuery` calls for workouts and routines and generated `useMutation` calls for quick start, routine start, and delete. Keep successful cached sections visible during a failure/refetch and provide section-specific recovery. Guard the automatic `/workout/new` mutation against React Strict Mode’s repeated effect execution.

- [ ] **Step 5: Migrate active workout detail**

Use generated detail types and account/id query keys. Replace manual refetch state with query invalidation or canonical cache replacement after mutations. Keep local stepper/timer/selection UI in component state, but remote workout, exercise detail, recommendation, set addition, and finish in Query/Mutation. Respect server terminal status/`endedAt` and never render historical mutation controls.

- [ ] **Step 6: Remove obsolete manual API contracts and update evidence**

Remove only workout/routine/exercise/recommendation interfaces from `apps/web/lib/types.ts` that have no remaining consumer; retain auth/cycle aliases still in use. Update implementation status with exact tests and explicit remaining gaps, without claiming device, performance, migration, or deployment evidence.

- [ ] **Step 7: Verify GREEN and the whole frontend gate**

Run focused tests, `npm run api:test`, `npm run api:check`, exact backend verification, `npm run lint`, `npm run type-check`, `npm run test`, `npm run build`, `npm run expo:doctor`, `npm run export:mobile`, and `npm audit --audit-level=high`. Also run `git diff --check`.

- [ ] **Step 8: Commit**

Commit Task 4 with `Feat: Se agrega "entrenamientos web con cliente generado y TanStack Query"`.
