# EVRY mobile routines and profile parity plan

> This focused execution plan implements the next unfinished slice of the user's integral EVRY roadmap. The roadmap in the conversation is the binding specification; the older 2026-08-19 plans are superseded.

## Goal

Finish mobile routine management and expose every profile field already supported by the generated OpenAPI contract, while preserving the current offline workout behavior and shared backend contract.

## Global Constraints

- Work only in `C:\Users\gabri\.codex\worktrees\EVRY-optimization\frontend` on `codex/evry-optimization`.
- Do not deploy or create remote infrastructure. A future deployment requires explicit authorization and must use Vercel only.
- Use only the generated `@evry/api-client` schemas and typed client; do not duplicate transport contracts.
- Remote state uses TanStack Query. Zustand remains limited to session and temporary workout state.
- Keep DOM and React Native UI separate; share contracts, domain logic, and design tokens only.
- Every remote operation must expose distinct pending, recoverable error, empty, and success feedback where those states apply. Never turn a server or network error into an empty result.
- Mobile routine mutations require connectivity. Existing cached routines remain usable to start an offline workout; failed mutations must preserve the last confirmed query/cache state and show a recoverable error.
- The routine editor supports name, optional day of week, optional notes, ordered exercises, target sets, optional target repetitions, optional target weight, optional per-exercise notes, and optional per-set plans. Exercise selection must distinguish viewing details from adding/removing an exercise.
- Routine form bounds: name 1-120 characters after trimming, notes and per-exercise notes at most 2,000 characters, at most 100 exercises, target sets 1-20, target repetitions 1-1,000, target weight 0-500 kg, and series plan length exactly equal to target sets when present.
- Profile editing supports `name`, `biologicalSex`, `birthDate`, `goals`, `trackCycle`, `avgCycleLen`, and `avgPeriodLen` using the exact generated enum values. Birth date input is `YYYY-MM-DD`; cycle lengths are visible only while tracking is enabled and remain within backend bounds (20-45 and 2-10).
- Cycle tracking remains optional for any person regardless of biological sex.
- Follow strict TDD: write a behavioral test, run it and record the expected failure, add the minimum implementation, then record the passing focused test. Run the full mobile suite, lint, and type-check before each task commit.
- Use the repository commit format: `Feat: Se agrega "<acción realizada en este módulo>"`.

## Interfaces shared by both tasks

- Session-scoped requests go through `withMobileAuth` and must call `assertCurrentMobileSession` before and after asynchronous persistence boundaries.
- Routine query key is `['routines']`. Successful create/update/delete operations invalidate it and let `loadRoutines` refresh the SQLite snapshot through `replaceCachedRoutines`.
- API/server errors must be translated with `apiError` so the UI receives the backend message and request context when available.

### Task 1: Complete mobile routine CRUD

**Files:**

- Create `apps/mobile/src/routines/routines.ts`.
- Create `apps/mobile/src/routines/routines.test.ts`.
- Create `apps/mobile/src/routines/RoutineManager.tsx`.
- Create `apps/mobile/src/routines/RoutineManager.test.tsx`.
- Modify `apps/mobile/app/(tabs)/train.tsx`.
- Modify `apps/mobile/src/catalog/TrainScreen.test.tsx` only where needed for the integrated routine manager.

**Requirements:**

1. Add typed `createRoutine`, `updateRoutine`, and `deleteRoutine` functions using the generated `/routines` and `/routines/{id}` operations. Reject an unsuccessful or structurally incompatible response, preserve backend error messages through `apiError`, and guard every request with the current mobile session.
2. Build a focused React Native routine manager shown only while no workout is active. It must let the user create, edit, and delete routines without turning the training screen into one monolithic form.
3. The editor must implement every routine field and bound listed in Global Constraints. It must preserve exercise order, prevent duplicates, support moving exercises up/down, and allow each exercise to be removed independently.
4. Reuse the already queried 30-item paginated/searchable exercise catalog. `Ver <nombre>` changes only the preview; `Agregar <nombre>` changes only the routine draft. Existing GIF behavior remains under explicit play only.
5. On successful mutation, close/reset the editor, invalidate `['routines']`, show a visible success confirmation, and trigger moderate success haptics. While pending, disable duplicate submission. On failure, keep the draft open with its values intact and show an accessible recoverable error.
6. Deletion requires an in-app confirmation state before the request. Cancelling leaves the routine unchanged. A failed deletion must leave it visible.
7. Existing routine cards still start cached routines offline. Editing/deleting/creating while the routine query is stale must be disabled with a clear connectivity notice rather than mutating stale data.
8. Behavioral tests must cover create, edit, duplicate prevention, reorder, deletion confirmation/cancellation, failure preserving the draft, stale-cache mutation disabling, separate preview/add controls, and query invalidation after success. Data-layer tests must cover all three methods, backend error propagation, incompatible response rejection, and session invalidation.

**Acceptance:**

- Focused tests pass with pristine output.
- The complete mobile Jest suite passes.
- `npm run lint -w @evry/mobile` and `npm run type-check -w @evry/mobile` pass.
- Work is self-reviewed and committed.

### Task 2: Complete mobile profile fields

**Files:**

- Create `apps/mobile/src/profile/profile-form.ts`.
- Create `apps/mobile/src/profile/profile-form.test.ts`.
- Create `apps/mobile/src/profile/ProfileScreen.test.tsx`.
- Modify `apps/mobile/app/(tabs)/profile.tsx`.

**Requirements:**

1. Extract a typed profile draft and pure validation/normalization helpers. Initialize it from the authenticated generated `CurrentUser` type without inventing transport fields.
2. Render controls for every profile field listed in Global Constraints. Biological sex is a single-choice control; goals are independent toggle controls; birth date is a keyboard-friendly text field with visible format guidance.
3. Validate locally before mutation: trimmed name required and at most 120 characters, valid real calendar date in `YYYY-MM-DD` with no future date, unique generated goal values, and cycle lengths inside their specified bounds when tracking is enabled.
4. Send the complete normalized `UserUpdateInput` body through the generated `PATCH /users/me` operation. Keep values and field-specific errors visible on failure. Disable repeated submission while pending.
5. After success, refresh the account store, update the visible form from the canonical user response, show `Perfil guardado.`, and trigger moderate success haptics. If refreshing fails after the update succeeded, retain the confirmed mutation response rather than reporting the save as failed.
6. Toggling cycle tracking off hides cycle-length controls but does not gate the option by biological sex. Toggling it on restores valid canonical/default lengths and includes them in the request.
7. Keep readiness behavior unchanged except for regressions required by the refactor. Its loading, error, success, and haptic feedback remain distinct from profile mutation feedback.
8. Behavioral tests must cover all fields in the submitted payload, invalid name/date/cycle values, future date rejection, goal toggling, cycle controls independent of sex, field errors surviving a failed mutation, canonical success refresh, and readiness regression behavior.

**Acceptance:**

- Focused tests pass with pristine output.
- The complete mobile Jest suite passes.
- `npm run lint -w @evry/mobile` and `npm run type-check -w @evry/mobile` pass.
- Work is self-reviewed and committed.

