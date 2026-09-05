# Monthly calendar implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load calendar activity and cycle records for the displayed month without full workout downloads or history truncation, preserving daily details and optional estimated phases.

**Architecture:** Expand the existing aggregate activity response with scalar set count and stored phase. Add a bounded cycle-calendar read with a single previous period-start seed. The web calendar uses the generated response types, authenticated web transport and independent account/month-scoped TanStack queries.

**Tech Stack:** NestJS, Prisma/PostgreSQL, OpenAPI, Next.js, TanStack Query, Jest/Supertest, Vitest/Testing Library.

**Spec:** The user's integral EVRY roadmap in this task, especially web query migration, civil dates, explicit cycle consent, and bounded progress queries; current acceptance gaps in `docs/operations/implementation-status.md`. This is one tranche, not replacement of the integral objective.

## Global Constraints

- Preserve all existing data. No destructive migrations or database reset.
- No deployments or external infrastructure. Future deployment requires explicit authorization and would use Vercel only.
- Work only in `C:/Users/gabri/.codex/worktrees/EVRY-optimization/frontend` and `C:/Users/gabri/.codex/worktrees/EVRY-optimization/backend`, branch `codex/evry-optimization`.
- No dependency upgrades, force pushes, main merges, new PRs or disabled/relaxed CI gates. Controller handles already-authorized pushes after validation.
- Workout activity uses completed-session `endedAt` in America/Bogota; cycle dates are civil labels, including API dates serialized at UTC midnight.
- Cycle reads and rendering require explicit `trackCycle`, independent of biological sex. Estimates must remain labelled as estimates.
- Keep the existing authenticated web transport (refresh, cancellation and normalized failures) while migrating to generated types. Do not claim this completes generated-transport migration.

### Task 1: Bounded aggregate calendar contracts

**Files (backend root):**
- Modify `src/modules/progress/progress.repository.ts`, `progress.types.ts`, `progress.service.ts`, `dto/progress-response.dto.ts` for scalar activity metadata.
- Modify `src/modules/cycle/cycle.controller.ts`, `cycle.service.ts`, `dto/cycle-response.dto.ts`; create `dto/cycle-calendar-query.dto.ts` if needed for strict query validation.
- Tests: `test/progress.integration-spec.ts`, new `test/cycle-calendar.integration-spec.ts`, related cycle/progress unit fixtures.
- Generate `openapi/evry-v1.json` and `openapi/client.generated.ts` using the existing command.

**Interfaces:**
- Existing `GET /api/v1/progress/activity?from=&to=` keeps its fields and adds `setCount: number` (all logged sets, including warmups, matching the old UI count) and `cyclePhase: CyclePhase | null` to each session. No nested sets are returned. Volume retains existing eligible non-warmup calculation. Preserve existing range validation (max 62 inclusive days, no future `to`).
- Add authenticated `GET /api/v1/cycle/calendar?from=&to=` with mandatory valid civil dates, ordered range and max 62 inclusive days. Unlike the workout activity read, a future display window is valid for projections; it must never return future recorded entries.
- Return the following shape; `entries` contains only that user's records in the requested range through today, ascending by date. `previousPeriodStart` is that user's most recent recorded start strictly before `from` and not after today, or null. It is a date-only label. Read entries and seed consistently in one read transaction. Opt-out yields the existing cycle opt-in rejection.

```ts
interface CycleCalendarResponse {
  from: string;
  to: string;
  entries: CycleEntryResponseDto[];
  previousPeriodStart: string | null;
}
// Controller method delegates to service.calendar(userId, query.from, query.to).
// Prior seed query: where { userId, isPeriodStart: true, date: { lt: fromDate, lte: todayDate } },
// orderBy: { date: 'desc' }, take: 1. No unbounded history read.
```

- [ ] Add HTTP/PostgreSQL regressions before implementation. The synthetic dataset must include >200 historical workouts plus a visible-month session, warmup and work sets, another account, terminal/cancelled and active sessions, two sides of Bogotá midnight, cycle entries at month boundaries, and a previous start followed by >180 newer non-start records. Assert the old-start seed survives history density, scoped range entries, set count, phase, correct volume, no nested sets, rejection when opted out, malformed/reversed/oversized dates, and no future recorded entries.

```ts
expect(calendar.body.days[0].sessions[0]).toMatchObject({ setCount: 2, volumeKg: 400, cyclePhase: 'LUTEAL' });
expect(calendar.body.days[0].sessions[0]).not.toHaveProperty('sets');
expect(cycle.body).toMatchObject({ from: '2026-01-01', to: '2026-01-31', previousPeriodStart: '2025-06-01' });
// Literal expectations must come from independent fixture arithmetic.
```

- [ ] Run focused integration against the controller-provided synthetic PostgreSQL URL and record RED. Follow `docs/operations/integration-tests.md`; real data is prohibited.
- [ ] Implement SQL aggregate metadata and the bounded opt-in cycle read. Use parameterized queries/Prisma, no schema migration. Regenerate OpenAPI.
- [ ] Run focused GREEN, full backend unit suite once, test type-check, lint, build and OpenAPI generation. After committing, `openapi:check` must pass. Report actual output and warnings.
- [ ] Commit backend implementation/tests/generated contract together; do not push. Report backend SHA for Task 2.

### Task 2: Month-scoped web calendar

**Files (frontend root):**
- Import and regenerate `packages/api-client` contract using Task 1 backend SHA, no manual schema edits.
- Modify `apps/web/components/CalendarioActividad.tsx`; a focused `apps/web/lib/calendar-queries.ts` helper may own query options and range derivation if needed.
- Tests: new `apps/web/tests/unit/calendar-month.test.tsx`, update HTTP fixtures/provider setup in `cycle-opt-in.test.tsx`, `cycle-opt-in-lifecycle.test.tsx`, `progress-page.test.tsx` and any actual calendar consumer tests.
- Update `docs/operations/implementation-status.md` with observed results and remaining gaps, not readiness claims.

**Interfaces:**
- Consume `components['schemas']['ProgressActivity']` with Task 1 scalar fields and generated cycle calendar response.
- For the visible month derive first/last day using shared civil-date utilities. Activity requests use `from=monthStart`, `to=min(monthEnd,today)`; skip activity for wholly future months and show no historical workout markers there. Cycle calendar queries use full month boundaries, including future months, for estimated phase seeds.
- Keys include account, authentication generation, month boundaries and consent where relevant. Use the supplied AbortSignal. Do not keep previous-month/account data visible during a new request. Remount account-specific selection state when account changes.

```tsx
const activity = useQuery({
  queryKey: ['calendar-activity', userId, generation, from, to],
  enabled: from <= to,
  queryFn: ({ signal }) => requestOrThrow<Activity>(`/progress/activity?from=${from}&to=${to}`, { signal }),
});
// Independent cycle query: enabled only by explicit trackCycle.
// Use response day.date directly, never re-group workouts by startedAt.
```

- [ ] Add RED tests using real Calendar, QueryClient, Zustand and authenticated HTTP helper with transport-only doubles. Cover month ranges and year/leap boundaries; completed days from server labels; name/setCount/volume details; no `/workouts` calls; old account/month response abortion and late completion; loading vs genuine empty vs recoverable error; stale data warning; partial read failure; cycle seed before month; opt-out and event invalidation.
- [ ] Implement independent monthly queries and account-keyed selection. Remove full workout arrays and client-side volume calculations. Preserve name, total set count, aggregate volume and stored cycle phase. Use cycle entries and the prior start to maintain projections and label the legend as estimated. Day buttons should expose selection state and the selected empty day should say no activity only after successful reads.
- [ ] On `evry:cycle-updated`, invalidate this account's calendar cycle queries and refetch the visible window; when opted out, no cycle network request is allowed. Preserve the existing explicit refresh event behavior for activity. Avoid cross-account invalidation and remove event listeners on unmount.
- [ ] Update all affected existing fixtures to the real response shape and wrap real calendar consumers in QueryClientProvider. Keep their consent/cancellation/account-switch assertions; do not weaken them to accommodate incorrect behavior.
- [ ] Run focused GREEN, full web suite once, web lint/types/build, contract check and backend verification. Root will run changing external gates (audit/Expo Doctor) and monitor CI. Do not re-run unrelated unchanged workspaces locally merely to duplicate current CI.
- [ ] Commit frontend implementation, tests, imported contract, plan and status; no push. Report generated pin, commands/results and remaining integration/device/performance limits.
