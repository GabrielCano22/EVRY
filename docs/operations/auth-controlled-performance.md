# Controlled authenticated performance

Spec: the integral EVRY plan's exact LCP <2500 ms, INP <200 ms, CLS <0.1,
real authenticated interactions, privacy and data-preservation requirements.
No deployment, remote databases, thresholds relaxed, retries added or audit bypasses.
Preserve previous dirty frontend work. Reuse authorized linked worktrees only.

## Current evidence — 17 October 2026

### Retired experiment: settled-document layout fast path

The proposed layout fast path was tested with seventy focused authentication,
epoch/generation, pending-profile and SSR/hydration checks; types, lint and build
passed. Its actual desktop run `1792277746961-1c203ec8-f40b-4e01-82da-d06d03584c16`
on build `i4k48YA5s_ZtN_usH-QGw` still failed all eighteen LCP budgets
(2756–3768 ms), plus one history INP (256 ms); CLS passed. All eighteen visits
and final functional/authentication checks completed, in 251.709 s. These data
do not justify an additional authentication rendering path as an LCP fix.

The production change and its experiment-specific API tests were removed;
original initialization, loading, redirect and recovery behavior are restored.
The original asynchronous bootstrap test remains, and the two new real safety
tests are retained: anonymous server HTML hydrates without a mismatch or extra
auth requests, and a pending profile never exposes previously known content.
The initial restored validation passed sixty-seven focused tests and a full
build (`27uO8SY4BleVrV5ep8RRo`); that build has not been remeasured. A later
fresh root run now passes 927 tests, including the two retained layout safety
tests (`frontend-current-full-test-20261018.log`); existing native act warnings
remain. The preceding 925-test root result belongs to the calendar version
below. Neither unit result proves performance acceptance. No threshold,
workload or mandatory assertion
was changed, no known failure was hidden, and no checkpoint was published.

### Latest desktop build: calendar formatter reuse

Build `ys_axXsvNJ6PB2lOvPmo8` adds caller-owned civil-date formatter reuse for
calendar labels and lazy initialization of the unchanged Bogotá clock. Tests
first reproduced thirty month-label formatter allocations instead of one, three
factory allocations instead of one, and native ICU allocation at module import.
The real-calendar and shared-domain regressions now pass, including selection,
month changes, midnight, leap days, year 0001 and invalid dates. No global cache
of civil dates or account content was introduced. Full root: **925 tests pass**;
types, lint and full production build exit 0. Existing native test warnings remain.

Run `1792277130763-2801ed1c-ca5c-4bb1-8712-a249ad16afed` completed eighteen
unchanged controlled desktop visits in 242.181 s. All eighteen INP values pass
(48–184 ms), as do all CLS values (maximum 0.03553103). All eighteen LCP values
still fail (2620–3776 ms), so the command exits 1 at the final budget assertion.
Cycle LCP samples are 3332/2868/3436 ms; this is not a demonstrated or statistical
LCP fix. Conditions preceded every document and at least thirty requests matched.
All functional/auth/network/fixture checks passed; independent SQL confirmed
30 completed sessions, one active, 93 sets and 54000 kg completed volume. Reports
and synthetic database are retained; services and owned PostgreSQL shut down
normally. No current mobile profile, field, native or whole-project performance
acceptance is claimed. Next investigation remains the initial client render.

### Earlier history volume optimization: desktop-only measurement

The history view now prepares volumes with its existing data-dependent labels
and reuses one lazy fixed-locale number formatter. No session values are stored
globally. The real component regression failed before the change (locale
formatting occurred on the tab click), then passed with the fifteen nearest
history/pagination tests. Full-root tests passed: 923, with existing native
`act(...)` warnings retained. Types, lint and full production build exited 0.

New build `_JNzfz9Jda6RUX6gvC2-6` desktop-only run
`1792276003034-d6ab80af-278c-4811-97a4-5990d43c6060` completed all eighteen
visits in 252.326 s and exited 1 at the final budget assertion. All eighteen
LCP values still fail (2996–3916 ms). INP fails once (history, 224 ms); the
other seventeen pass. All CLS values pass (maximum 0.03553548). All visits
applied conditions before the document, with at least thirty matched requests.
Final fixture checks passed and independent SQL confirmed 30 completed sessions,
one active session, 93 sets and 54000 kg. Database and report are retained.

History INP samples were 176/224/176 ms, versus 272/272/352 ms in the earlier
desktop build below. This is an exploratory observation, not a statistical or
isolated causal improvement claim. The remaining failed history visit had
86.4 ms click processing and a 171 ms overlapping task; these timings alone
do not identify a function or prove that layout is the remaining cause.
Neither LCP nor the whole desktop gate is accepted. The newer build has not
yet repeated the mobile profile; earlier mobile results below are baseline
evidence, not acceptance of the newer build.

### Earlier complete desktop/mobile baseline

Build `J-ZZyTGgr6rqLZqI171Cm`, unchanged strict budgets and controlled conditions:

| Profile | Visits | LCP range (ms) | LCP failures | INP failures | CLS failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop | 18 | 3092–5768 | 18 | 4 | 0 |
| Mobile Chromium | 18 | 2712–3860 | 18 | 0 | 0 |

Both profiles reached the final budget assertion after all functional, network,
cookie-rotation and fixture checks. Mobile was run separately because the
unchanged first-failure limit left it unexecuted in the desktop attempt. Both
commands exited 1; neither profile is accepted. Mobile INP was 48–184 ms and
maximum CLS 0.06183748. All visits applied conditions before the document;
minimum matched requests were 30 desktop and 29 mobile. These are exploratory
laboratory samples, not field, native, confidence-interval or p95 acceptance.

Reports remain in `.worktrees/web-auth-controlled-performance-` directories
with run IDs `1792273737015-52df8a53-6151-4ae8-af2d-e38ba7c2615c` and
`1792274613132-549dcca4-c0d9-405a-8945-ec4c1975e054`. Independent SQL confirmed
each retained synthetic fixture: 30 completed sessions, one active session,
93 sets and 54000 kg completed volume. No quota or database reset was used.

A separate startup diagnostic passed in 21.5 s against the retained desktop
fixture, run `1792274965903-32f4a7d3-74ce-4be1-ab61-0032699c20bc` under
`.worktrees/web-startup-diagnostic-`. Navigation response start/end were
73/245.2 ms; refresh finished at 1004.8 ms and profile at 1233.7 ms, while
dashboard data requests started only at 3843.6 ms. The sanitized trace includes
a 507.297 ms React DOM chunk evaluation, a later 534.664 ms function call in
that chunk and 278.801 ms layout. Nested durations must not be summed; profiling
perturbs timing and is not a replacement for the unprofiled gate. CPU sampling
contains five negative deltas and is unsuitable for weighted time attribution.
No function-level cause, source optimization or performance fix is claimed.
Next investigation: client startup/render critical path, rather than assuming
that prefetching dashboard data will fix its earlier heading LCP. The earlier
cold service-start timeout remains unexplained; later successful startup is
not proof that it was fixed.

## Task 1: Prove and apply controlled conditions

Extend the existing real authenticated workload through dedicated configuration,
without modifying its baseline profile. Require conditions before navigation and
actual matched network requests for every measured visit. First run must fail
because controlled conditions are requested but not applied. Then integrate the
already byte/latency-proven Chromium helper. Expected: the missing-condition
assertion becomes GREEN; actual budget failures stay RED and retain partial reports.

## Task 2: Run real scenarios and inspect evidence

Use compiled canonical-origin web/backend and dedicated loopback PostgreSQL 55438.
Fixture setup and initial cookie acquisition are outside measured scenarios.
Measure dashboard, profile, progress, routines, active session and cycle: three
visits per desktop/mobile viewport, fresh contexts, genuine rotating HttpOnly
cookies, CPU4 relative to the host,150ms,1.6Mbps/750Kbps,cache disabled.
Expected: precise reports of scope/profile, conditions requested/applied, actual
matched requests, web vitals and failures. No credentials or cookie values written.
Controlled budget failures are retained and fail the profile after its visits,
allowing each page to be measured instead of discarding later evidence. Functional,
network and authentication failures still abort immediately. The existing first
failed-test stop remains explicit; unexecuted visits never count as passed. If it
stops before mobile, measure mobile separately only after that run is terminal.
Do not call an exploratory sample statistical/field/native acceptance.

## Task 3: Regression, review and publication gates

Run root suite, all-workspace types/lint and the real controlled-condition probe.
No push while relevant audit or performance gates fail. One whole-branch fresh
review before publication; previous increments stay preserved until gates pass.
Expected: matching fresh results recorded, no hidden/disabled tests, and synthetic
listeners stopped with their data preserved. The full goal remains open if any
required native, functional or performance coverage remains missing.

Review Focus: conditions applied before navigation, actual requests despite
routing, honest partial reports and stop scope, warm synthetic API/cookie isolation,
unchanged budget/baseline/limiter, credential privacy, no whole-app acceptance claim.

## Task 4: Remove repeated history date-formatter construction

The measured slow routines interaction renders a populated history page. Trace the real
date formatter first: verify native construction cost in Chromium CPU4, with
identical outputs, separately from application acceptance. Hypothesis: repeated
native ICU construction is one contributor, not the entire LCP/INP cause.
Expected: a real-output regression must reject 30 native constructions for one
fixed locale/options; Bogotá date boundaries and invalid dates remain unchanged.
Reuse one lazily created formatter, without caching user dates/outputs. Run RED,
GREEN, complete root suite, types/lint, production build and a desktop controlled
measurement with unchanged workload/budgets. Record failures, not only improvements.
Do not claim complete performance acceptance from a native microbenchmark.
The 30 completed-session fixture is not a 30-row rendering claim: the current
workout query defaults to 20 total sessions, including the active session. The
30-date benchmark/regression independently covers repeated formatting, not the
number of cards observed in this scenario. Older-history pagination still needs
client verification; bounded server queries alone do not prove accessible history.

## Task 5: Preserve delayed interaction metrics before document disposal

Trace the missing INP through the real compiled web-vitals observer. A controlled
browser probe uses a trusted click and real EventTiming, delaying only idle
callback delivery to model scheduling. Expected RED: closing the page before
delivery loses INP. Wait for an actual finite INP after all measured actions and
before closing, without extra idle time before first input. Expected GREEN: retain
the real metric; missing values fail and keep the document, never become zero.
Keep existing thresholds, workload, retries, timeout and post-close completeness
checks. Run all probes, regression/types/lint and a controlled desktop profile.
Performance violations remain failures even when collection is now complete.

## Task 6: Make older workout history accessible

Use the existing generated `take`/`skip` contract, 20 rows per request, without
changing backend data or APIs. Write real-page/HTTP-boundary regressions first:
older-page access, overlap deduplication, failed-page retry retaining earlier rows,
cancelled-only first pages, account changes with a pending response, and explicit
server offset-limit disclosure. Expected RED: no load-more control. Use an
account-scoped infinite-query identity distinct from legacy flat-list caches,
preserving workout mutation invalidation. Expected GREEN: pages load only on user
action, short pages stop, current-account data remains isolated. Verify compiled
web/backend with 24 synthetic completed sessions across desktop/mobile viewports.
Run root tests, types, lint, contract and build. No push while existing audit or
performance gates fail; no claim of native or whole-app acceptance.

## Task 7: Patch newly published shell-quote advisory

The October 6 audit reports GHSA-pqg4-j6r4-53mv in React Native developer tools:
shell-quote 1.10.0 permits a line terminator in a string following a comment.
Upstream fixes it in 1.11.0, inside react-devtools-core's existing ^1.6.1 range.
Add a real dependency regression for all four terminators and safe round trips;
observe RED before updating only that transitive dependency. Never execute the
constructed shell string. Verify focused and complete tests, types, lint, web
build, mobile exports/doctor and audit; retain other findings as failing gates.
Do not override audit policy, force major versions or deploy. This task does not
remove Task 6's unverified browser startup requirement or performance failures.

## Task 8: Restore Expo SDK 57 patch compatibility

Observe the actual Expo Doctor mismatch before changing the manifest or lock.
Upgrade only the five compatible SDK 57 patches it requests: expo ~57.0.27,
expo-constants ~57.0.21, expo-linking ~57.0.12, expo-router ~57.0.25 and
expo-sqlite ~57.0.4. Preserve other versions, scripts, exclusions and user changes.
Expected: Doctor's unchanged 21 checks pass, complete root tests remain green,
types/lint/web build/Android and iOS exports succeed. Recheck the audit without
exceptions; all remaining high advisories still block publication. Record the
actual versions and scope: exports/Doctor do not prove physical-device behavior,
release budgets or a deployable APK. Do not retry blocked server launch by another
launcher, create remote builds/resources or publish before relevant gates pass.

## Task 9: Upgrade the patched native image decoder

GHSA-wq5f-xc86-pv6w reports sharp <0.35.5 with vulnerable librsvg. Verify the
actually loaded decoder meets the upstream minimum librsvg 2.63.2, not merely
the package label. Expected RED: installed sharp 0.35.4 loads librsvg 2.62.91.
Use a harmless SVG-to-PNG control with literal dimensions/color. Do not execute
a memory-corruption payload or claim a Windows check reproduces Linux RCE.
Update only sharp within Next's existing ^0.35.4 range, including matching optional
native bundles. Expected GREEN: native minimum and real conversion control pass,
sharp advisory disappears without audit exceptions. Run the full root suite,
types/lint/web build, Expo Doctor and both exports after the dependency batch.
Remaining high advisories and controlled performance failures still block push.

## Task 10: Reject damaged locally stored workouts without deleting data

Use real synthetic SQLite to reproduce valid JSON with invalid workout shape
being accepted by active-session/draft readers. Write failing tests first for
invalid JSON, missing fields, invalid sets and mismatched stored identity/status.
Implement a shared stored-workout decoder and use it for active and draft reads.
Keep legacy symbolic client IDs and unknown extension fields; do not require UUIDs,
rewrite records, skip damaged drafts or turn errors into an empty session.
Expected: both readers reject damage with a recoverable, non-sensitive Spanish
message; the original payload and queue remain unchanged. Valid sessions and
drafts still load, including completed drafts and nullable exercise values.
Run focused SQLite tests, mobile suite, types and lint. Other transactional raw
payload reads require subsequent coverage; do not claim complete corruption
recovery or physical-device acceptance. Publication remains held by known gates.
The home draft query must display its failure and offer an explicit retry instead
of silently rendering its default empty array. Verify the real screen/query
observer with only native navigation/storage boundaries substituted.

## Task 11: Preserve damaged workout records during sync transactions

Reproduce shape-invalid persisted workouts against real synthetic SQLite for
enqueueWorkout, syncReviews, keepReviewAsDraft and markSyncSuccess. Compare all
workout, queue and ID-mapping rows before/after rejection, including acknowledgement
rollback after its initial queue deletion. Expected RED: the existing casts accept
invalid shapes or rewrite them. Reuse the stored-workout decoder at these four
read boundaries with authoritative row identity/status/revision. Expected GREEN:
all four reject with the safe message and preserve every original row; existing
canonical rebasing/conflict/uncertain-send tests remain green. Outbox SyncWorkoutInput
is a different schema and must not be decoded as LocalWorkout. Run focused real
SQLite tests, full mobile suite, mobile types/lint. Publication and complete goal
acceptance remain held by the existing gates; no real data or external deployment.

## Task 12: Recover drafts from an authoritative transactional snapshot

Reproduce stale/damaged/missing/already-archived source drafts during enqueue's
draftToArchive operation with real SQLite and offline training-store integration.
Expected RED: source is overwritten/resurrected and a phantom active session can
be created. Read and validate the source inside the same write transaction. Reject
if the original snapshot changed (even without a revision increment) or is no
longer DRAFT. Compare JSON values without depending on object property order;
preserve extension fields and array order. Archive the validated stored source,
not the earlier caller copy. Expected GREEN: changed rows/queue/mappings stay
identical on rejection, no new active/queue row, normal recovery still works and
offline store rolls back optimistic state. Run focused SQLite/store tests and full
mobile types/lint/suite. No automatic merge/reset, real data edits or publication
before existing global gates pass.

## Task 13: Restore web authentication without a predictable unauthorized request

Use real auth API/generated client/transport with a substituted HTTP boundary to
reproduce cold restoration requesting users/me before refresh. Add a dedicated
restoreCurrentUser path used by auth initialization, leaving ordinary profile and
login/register contract calls unchanged. Reuse shared refresh rotation, in-memory
token, timeout/cancellation and generation checks. Expected RED: three requests
instead of refresh then authenticated users/me. Expected GREEN: two requests,
existing token skips refresh, concurrent restores share rotation, refresh failure
does not query user, pre-abort sends nothing, stale refresh cannot restore logout.
Run focused auth/store/API tests then web types/lint/full tests/build. Reduction
of one request is not proof that LCP/INP budgets pass; controlled browser metrics
remain pending. No contract/migration/deployment changes or policy circumvention.

## Task 14: Preserve damaged offline outbox payloads for explicit review

Reproduce malformed/shape-invalid/mismatched-identity SyncWorkoutInput payloads
with real SQLite and sync engine, not only mocked database assertions. Validate
the distinct generated input shape before marking a send attempt. Expected RED:
malformed JSON becomes a network error and shape-invalid JSON is uploaded. Expected
GREEN: no upload/no fake send attempt; exact raw queue/source/mapping data remains,
selected queue/workout state becomes requires_review with a non-sensitive local
error code; other pending batches are not deleted. Conditional marking must not
flag a replaced stale payload. Never decode outbox as LocalWorkout or invent UUID
validation incompatible with legacy symbolic-ID fixtures; backend business/UUID
validation remains authoritative. Existing real network retries/success/account
guards remain intact. Explain local damage separately from a server conflict in
home and verify that UI. Run focused tests, full mobile types/lint/suite; no real
data edits, automatic cleanup, publication or deployment.

## Task 15: Defer unused exercise detail modules from authenticated startup

Verify that importing/rendering the shared exercise-detail provider currently
evaluates the muscle map and progress/history module even when the drawer is
closed. Observe actual module evaluation with Vitest importActual (no substituted
visual components), keep the real provider/dialog/queries and HTTP fixture. Expected
RED: both heavy modules evaluate before any exercise interaction. Lazy-load the
map only when summary renders and activity only when the user requests a progress
or history tab. Keep the immediate dialog, close/focus trap/restoration, metadata
errors, tab keyboard controls and GIF opt-in unchanged; visible loading states.
Expected GREEN: closed provider loads neither; summary loads the actual map but
not activity, progress loads actual activity and renders fixture metrics. Run
existing real drawer/context/a11y coverage, full web suite/types/lint and compiled
production build. Unit module evaluation and build success do not prove browser
download reduction or LCP/INP budgets: no runtime acceptance until permitted actual
measurement. Never retry rejected server launch with another launcher, relax
budgets or publish while global audit/performance gates fail.

## Measured evidence — October 5, 2026

### Subsequent local offline integrity verification — October 6

The offline outbox now validates its generated transport shape and queued identity
before counting an upload attempt. Real SQLite/engine regressions reproduced
malformed JSON treated as a network failure and invalid objects sent to HTTP.
Those batches are now retained byte-for-byte, marked for local review without
uploading, and distinguished from a server conflict in the home screen. Source
workouts, existing ID mappings and later queued edits remain unchanged. A stale
damaged snapshot cannot mark a newly replaced payload. Symbolic legacy IDs and
optional/null transport fields remain supported; server business rules are not
duplicated as new local restrictions.

Verification: 300/300 mobile tests across 33 suites, mobile types/lint and whitespace
checks passed. This is local integrity evidence, not native-device, full-project,
performance or publication acceptance. Existing failed performance/audit gates
remain unresolved; no commit, push, deployment or real data changes occurred.

The missing-condition run failed as intended. A separate mutation applying the
helper after navigation also failed the actual first-document guard. The final
ordering applies conditions before navigation and proves requests matched the
acknowledged rule. Neither mutation changes production behavior or budgets.

Desktop report:
`.worktrees/web-auth-controlled-performance-1791255116145-87664db8-0409-4619-82a3-5404851f3aa1/results.json`.
All 18 visits completed real interactions, auth rotation, network checks and final
synthetic data checks. Every visit exceeded LCP: 3500–4288 ms. Routines also exceeded
INP at 392/400/400 ms; other INP values were 48–168 ms. All CLS values met the budget
(0–0.030845). Conditions preceded the document in 18/18 visits, with 32–51 matched
requests per visit. The profile failed; the default first-failure stop left mobile
unexecuted, not passed.

A separate mobile-only run started after desktop was terminal:
`.worktrees/web-auth-controlled-performance-1791255446869-15fbe758-6988-433d-80d6-f058949752d9/results.json`.
Six first-pass visits had complete metrics: LCP 3692–4580 ms (all fail), routines
INP 456 ms and cycle INP 216 ms (fail); other INP was 64–160 ms. CLS 0–0.061838
met the budget. The seventh visit, dashboard, recorded LCP 3916 ms and CLS
0.006319 but no INP after real interaction/finalization. The completeness assertion
failed immediately: six complete visits, one incomplete and eleven unexecuted.
Missing metrics are not zero or successful. Conditions preceded the document and
requests matched on all seven observed visits. No native-device acceptance follows.

The first desktop dashboard's largest element was real H2 text, not an image.
Initial script transfers ended at 1642.7 ms, auth requests started at 2777.8 ms and
the recovery sequence finished at 3373.6 ms, before LCP at 4132 ms. This local
observation directs further hydration/authenticated-rendering investigation; it
does not establish a causal fix. No production optimization was made here.

Publication remains blocked by these relevant performance failures and the
previously verified frontend high-severity dependency advisories. No frontend
push, remote CI, deployment or real database modification occurred in this work.

Fresh regression checks after the workload changes passed: 507 root tests
(247 mobile, 239 web, 3 accessibility, 18 shared), all-workspace types/lint,
contract verification, whitespace check and the real routed latency/byte probe.
These successful checks do not override the failed authenticated budgets or
missing mobile metric. Local compiled listeners and synthetic PostgreSQL were
stopped; the fixture data and failed reports remain preserved for investigation.

## Subsequent formatter and finalization evidence — October 5

The timestamp formatter now reuses one native ICU formatter for fixed `es-CO`
and Bogotá options. A real-output regression first failed with 30 constructions,
then passed with one, preserving midnight boundaries, strings/Date inputs, aliases
and invalid-date errors. No user dates or outputs are cached. The standalone
Chromium CPU4 experiment measured 195.7/37.1/37.6 ms for 30 constructions versus
2.5/1.4/2.3 ms for reuse with identical strings; this is not application acceptance.

A real browser regression reproduced lost INP when closing before delayed idle
delivery. Another reproduced under-reporting the last slower interaction (128 ms
reported instead of at least 240 ms). The finalizer now waits after measured
actions for paint/idle delivery and an actual finite INP before disposal. The
settling deadline remains five seconds; there is no extra wait before first input.
Missing values still fail without closing/substituting zero. All four browser
probes passed, including the unchanged actual bandwidth/latency probe.

Fresh root tests passed 509/509 (247 mobile, 241 web, 3 accessibility, 18 shared),
all-workspace types/lint, contract and whitespace checks passed. The canonical
production web build passed after the formatter change.

The corrected desktop collector completed all 18 visits, with all three metrics,
real authentication rotation, network assertions and final synthetic integrity
checks. Report:
`.worktrees/web-auth-controlled-performance-1791256712639-c83bd9dc-0efa-4ddd-bb04-b994bf14b7ca/results.json`.
All LCP values still fail (3504–4272 ms). Routines INP 360/336/344 ms still fails;
cycle reaches 200 ms in one visit and fails the strict <200 boundary. All CLS values
remain below 0.1 (maximum 0.033627). Conditions precede the document in 18/18 visits
and match 32–50 requests. The profile remains RED. The different observed INP
values are not proof of a causal/statistically established application improvement.
Mobile collection after this finalizer change remains unverified.

No push, remote review/CI or deployment was made. Dedicated synthetic PostgreSQL
and local compiled listeners were stopped, preserving data/reports. Next actions
are critical-path/interaction attribution and accessible older-history pagination,
not repeated runs until green.

## Task 16: Attribute initial JavaScript using the actual bundler graph

Use the installed Next CLI's documented experimental-analyze --output mode,
which writes local static diagnostics without starting a server or producing an
application build. Keep the canonical loopback API build configuration, existing
compiled output and user data. Read the actual route/client module import chains
and sizes for dashboard, routines/workout and cycle. Expected: concrete diagnostic
files and bounded ranked dependencies/import paths identifying a next justified
optimization; if diagnostics fail or data cannot be interpreted, record the exact
limitation instead of guessing. Do not install another analyzer, change app code
before attribution, retry a blocked server launcher, claim browser CPU/network or
LCP/INP acceptance, loosen tests or publish. All previous failed suite reports
remain evidence. Run only after previous verification handles are terminal; do
not add competing builds/tests. This is analysis for the full performance target,
not a replacement acceptance target or a completed implementation deliverable.

### Attribution evidence — October 6

Output-only analysis completed successfully in 28 seconds, without an interactive
server or replacing the existing compiled dashboard. Its synchronous client-module
closures contain 248 modules for dashboard/cycle and 246 for workout. A reader
following the installed analyzer's big-endian JSON/CSR format validates edge and
source bounds before ranking emitted client parts. These sums exclude async
edges and are not a complete initial bootstrap, compressed transfer or CPU metric.

The largest application-controlled shared candidates include tailwind-merge
(19,596 emitted bytes through utils) and exercise-i18n (16,407 emitted bytes).
Dashboard/workout directly consume the exercise dictionary; cycle reaches it via
layout → ExerciseDetail → exercise-i18n despite its closed drawer. This justifies
investigating a lightweight, immediately accessible drawer frame with deferred
content rather than removing translations or guessing an icon-library override.
No further app change or performance acceptance follows from this graph alone.

## Task 17: Defer drawer content behind its stable accessible frame

Keep the portal, dialog title, close button, focus trap, inert siblings and focus
restoration immediately available. Load metadata, translations, media and tab
content only on opening the drawer. Preserve existing query cancellation, tab
navigation and explicit GIF playback. First extend the real-module loading
regression to reject translation evaluation while closed; run and observe the
failure. Extract a lazy content component without replacing actual UI in tests.
Expected: focused loading/drawer/context tests green, types and lint green,
production build green and bundler graph no longer connecting the closed cycle
drawer to translations synchronously. Run the full root suite and report every
failure honestly; do not change deadlines or publish while relevant gates fail.
Keep all failed evidence and user data. Chunk-load recovery must retain the close
button and safe focus restoration, without automatic page reload.

The full root run ended failed: mobile 300/300, web 252/255, shared 18/18; web
accessibility did not execute after unit failure. The three web failures concerned
history remaining in loading, a changed workout ID remaining in loading, and a
cancelled-workout test timeout. The exact two affected files then passed 26/26
without altering assertions, cases, workers or deadlines. This does not prove a
timing fix or override the failed full suite. Failed reports remain preserved.

## Task 18: Add MSW-backed contract and network recovery coverage

Add MSW as a development-only web dependency, using the current official Node
integration and a Node-compatible pinned release. Use generated contract types
and complete existing fixtures; intercept transport, never replace rendered UI,
generated client, auth transport or TanStack Query. Scope the server lifecycle
to the new test file, reject unknown requests and reset handlers between cases.
Verify safe network-error versus empty state, explicit successful retry, metadata
remaining usable after a progress error, and obsolete/closed request cancellation.
Assertions concern real UI outcomes; parameter-aware handlers reject wrong queries.
Expected: focused cases and existing drawer cases pass, full root passes with no
deadline/worker changes, all types/lint and production build pass, and fresh audit
records new dependency risk accurately. Characterize already implemented behavior
without inventing a production fix merely to make a test fail. Any new behavior
needed must have an observed RED before its implementation. No real server,
database, browser service worker, deployment or remote resources are created;
MSW transport tests do not prove PostgreSQL, E2E, actual offline devices or budgets.

## Task 19: Pin the contract to the verified security-patched backend

The frontend CI checks out the exact backend revision from backend.lock.json.
Confirm the current lock precedes the committed proxy-addr patch, that the
authorized backend checkout is clean and that its origin is canonical. Verify
the backend branch on GitHub contains commit406af9c and its exact-SHA CI passed;
do not infer remote success from local history. Compare both committed OpenAPI
artifacts across the old and new revisions; expected: no API or type changes.
Run the existing api:verify-backend against the current authorized checkout
before editing; expected RED: backend revision differs from pinned source.
Update only the revision with apply_patch, retaining both content hashes and
all unrelated changes. Expected GREEN: api:verify-backend and api:check, followed
by the complete contract-script tests and root suite. No new verifier behavior,
API route, dependency change, forced version, backend commit or empty push.
Preserve every earlier report; audit/performance/native acceptance and publication
remain separate gates. If the committed artifacts differ or exact-SHA remote
checks are not successful, keep the lock unchanged and investigate instead.

## Task 20: Exercise real authentication accessibility instead of a fake surface

Start only after Task19's live verification handle is terminal; never change a
test set or app component under a running full suite. Keep the existing smoke
case and all assertions. Add cases rendering actual login/registration UI, real
Input/Button/Icon/auth store, with only Next navigation outside a router replaced.
Verify named navigation links, input labels, exposed selection state and validation
alerts; assert consumer-visible accessible roles/names, not source text or mocks.
Use axe on real UI for semantic rules supported by jsdom, stating the exact scan
scope. No newly disabled rules or relaxed existing checks. Browser contrast,
zoom, reduced-motion and manual NVDA/VoiceOver remain explicit unverified gates;
do not label this an accessibility audit completed or WCAG conformance.
Observe each genuine missing behavior RED before the smallest production fix.
Do not invent a failure for behavior already implemented. Preserve account
registration, sex-independent opt-in, validation and field-error behavior.
Expected: new focused cases and existing authentication/cycle lifecycle cases
pass, all-workspace types/lint and full root pass, production build passes.
No deadlines/worker changes, fake UI components, server-policy workaround,
device/tool installation, real user data, deployment or publication with known
audit/performance failures. Record discovered barriers with user impact and
WCAG criterion, leaving actual assistive-technology acceptance pending.

## Task 21: Connect field errors to the actual shared input

Begin only after Task20's running verification is terminal. The actual Input
renders error text without invalid-state or descriptive association; label-derived
IDs also collide if two controls have the same label. Write real DOM regressions
before modifying it: error-bearing controls expose invalid state and their own
accessible error description, clearing the error removes stale association, and
caller help-text references/explicit IDs remain intact. Render two same-labelled
controls to verify each label and error describes only its own input. Use stable
React-generated fallback IDs, not random or module-global counters, if that
regression proves necessary. Preserve the visible label, caller refs/input props,
styles and error text inside its existing label for compatibility with current
form tests. Caller-supplied accessibility metadata must not be silently erased.
Extend an existing actual registration field-error flow with accessible state/
description assertions while retaining its original checks, proving integration
with the real auth transport/store rather than a fake form.
Expected RED before fixes; focused Input/authentication/cycle tests, all types/
lint, full root and production build GREEN after. No newly disabled rules,
changed deadlines/workers, extra dependencies, network resources, real data or
publication while relevant gates remain RED. Record exact automation scope;
real screen-reader announcement and full browser acceptance remain unverified.

## Task 22: Register the controlled authenticated gate in CI

The executable controlled authenticated performance suite is absent from the
actual CI job, and its dedicated result directory is absent from artifact upload.
Inspect the parsed workflow's executable steps and result-discovery patterns
before changing it; expected RED: the controlled authenticated command is not
registered, and its actual preserved result path is not selected for upload.
Add the existing npm command to the real E2E job without continue-on-error,
conditional bypasses, budget changes or replacing any existing gate. Include
its result directory in the existing always-on artifact upload. Verify the
parsed registration and actual report-path discovery, and invoke the actual
Playwright configuration with --list to prove both profiles discover the
existing real workload without starting servers. Do not invent source-text
regressions or new application behavior for this configuration-only wiring.
Run the normal root suite; a local registration/discovery pass does not prove
CI execution, browser performance acceptance, security readiness or publication.
Preserve the existing failing reports and runtime-policy restriction; no new
server launch, dependencies, deployment, user-data access or push while relevant
gates remain failed. Keep the full objective open.

## Task 23: Preserve the drawer when an inner content module fails

The outer drawer handles DetailContent delivery, but inner lazy map/activity/
plot delivery has only Suspense fallbacks. First fault-inject the actual Activity
module transport while retaining its real exports and the actual drawer, queries,
auth store and UI. Expected RED: a rejected lazy module removes the drawer
instead of displaying a recoverable failure. Preserve metadata, dialog close,
keyboard Escape/focus restoration and other tabs. Add explicit safe recovery
without automatic reload, raw error disclosure or importing unused content
while closed. Rejected lazy payloads must not be reused on retry; handle module
delivery at the actual boundary, with late-response guards after close/account
change and preserved query cache. Verify the original outer-module failure,
loading/cancellation/tab behavior and new inner failure/retry cases. No visual
mocks, relaxed deadlines/budgets, new dependencies, deployment or user data.
Run focused tests, all types/lint, normal root and production build. This is a
separate recovery defect, not an asserted fix for the earlier intermittent
summary timeout. Preserve all existing reports; do not publish while security
or actual browser/native gates remain unresolved.

## Task 24: Name the mobile profile shortcut

Inspect the real AppShell, Next Link and decorative local Icon boundary. The
mobile header profile shortcut renders only an aria-hidden SVG and therefore
has no accessible name. First render the actual shell and auth store with only
the external Next pathname hook supplied; expected RED: its header link cannot
be found by a meaningful name and axe link-name reports the unnamed link.
Add a Spanish accessible name on the actual Link without changing its route,
icon, responsive visibility or any other navigation behavior. Verify the named
profile destination and semantic link-name scan against actual rendered DOM.
Run all-workspace types/lint, the normal root suite and production web build.
These DOM checks do not certify real screen readers, browser layout/contrast,
200% zoom or physical-device acceptance. No new dependency, relaxed gate, server,
real data, publication or deployment while existing blockers remain unresolved.

## Task 25: Pin the verified backend cookie checkpoint

First verify the authorized backend checkout is clean, its HEAD matches the
published optimization branch and both exact-head push/PR CI runs succeeded.
The frontend still pins the earlier source: expected RED from the real contract
verifier is the backend-revision mismatch. Use the existing guarded importer
to synchronize only after remote verification, then verify generated-document
and client hashes remain unchanged and both local/linked-backend contract checks
pass. Run importer safety tests, all-workspace types/lint and normal root suite.
Do not fabricate a new runtime fix or alter contracts to satisfy this source-pin
update. Preserve frontend dirty work and all known failing reports; no frontend
commit/push while its relevant security/performance gates remain unresolved.

## Task 26: Finish the real chart import during test cleanup

The two ModuleContent regressions use real Activity and its lazy chart. Timing
diagnostics reproduced a failure before the obsolete promise is rejected: the
new Activity module arrived quickly, but the previous test's still-running chart
import delayed React render/query initialization beyond the original assertion
deadline. A same-case control that completes the real requested chart import
during cleanup passed without changing assertions or any deadline.
Replace temporary probes with explicit asynchronous cleanup of that real import
in the first regression. Keep all real UI, queries, exports and original checks;
do not prewarm modules before the tested interaction, mock charts, skip cases,
increase limits/workers or change production loading behavior. Verify both
regressions without probes, all-workspace types/lint and the normal root suite.
Preserve unrelated pagination timeout evidence: this scoped fixture correction
does not establish its cause or prove browser/native performance acceptance.

## Task 27: Keep Home training navigation inside its owning session

Home awaits start/recover writes but currently navigates after a superseded
account returns, and start can navigate when the store declined initialization.
Reproduce with real Home/QueryClient/training-store and controlled native storage
promises. Assert no navigation after account/version change, no navigation when
initialization declines a start, and no unhandled rejection on failed saving.
Keep a successful same-session durable start/recovery control. Scope side effects
after awaits to their owning current session and successfully saved active workout;
catch failed starts without hiding the store's visible error or fabricating save
success. Preserve stale-account data and avoid automatic deletion or merging.
Verify focused real-screen cases, all-workspace types/lint and normal root suite.
No dependency, timeout, worker, API, publication or deployment changes.

## Task 28: Prevent a second Home press bypassing pending local persistence

The optimistic active snapshot switches Home's action from Start to Continue
before the start or draft-recovery write finishes. Reproduce a second press with
real Home and training-store while native persistence is held pending. Expected:
no navigation, and an accessible disabled Continue control until local persistence
settles. Keep same-owner durable success and failed-save retry controls. Disable
the Home training action while saving or not initialized; do not discard snapshots,
change storage semantics or claim optimistic data durable. Verify focused training
screen cases, full-workspace types/lint and normal root tests. Preserve all prior
reports; no timeout/worker/dependency changes, publication or deployment.

## Task 29: Complete mobile set editing parity

Actual native Train only exposes weight/reps, although local snapshots and sync
support nullable duration/RPE, warmup and nullable technique. Reproduce absent
controls and invalid numeric input changing source values using real screen/store.
Expose duration seconds, integer RPE1..10, warmup and three-state technique with
native accessible controls; allow numeric values to be cleared to null. Validate
finite numbers, integer counts/time and actual sync bounds (weight2000,reps1000,
duration86400) before saving; invalid input stays visible with a field error and
must not turn into zero. Preserve current serial offline persistence, rollback,
historical edit prohibition, source IDs and unrelated values. Keep successful
source/sync-payload controls, including duration-only useful completion.
Run focused real-screen cases and real-SQLite restart/outbox coverage, full types,
lint and normal root tests; then local Android/iOS exports only. No API/schema,
dependency/timeout/worker changes, real-data mutation or deployment.

## Task 30: Show conservative mobile training recommendations

Native Train has no consumer for the generated AdaptiveRecommendation contract.
Add an explicit on-demand consultation inside the selected exercise of an active
workout, without automatically changing any local series or requiring a network
connection to train. First reproduce absent consultation with the real Train,
QueryClient, auth wrapper and generated client; replace only native storage,
catalog transport and HTTP boundaries. Verify HOLD without numeric targets,
PROGRESS/DELOAD with server rationale, recoverable network/API errors and retry,
loading, cancellation on exercise change and isolation across login versions.
Do not reuse cached advice from another exercise, workout, owner or consultation;
the backend remains the sole source of load calculations/readiness/cycle context.
Run focused tests, all types/lint and normal root suite, then local native exports.
No backend/schema, dependency, deadline/worker, real-data or deployment changes;
publication stays held by existing security/performance gates.

## Task 31: Persist the offline rest-timer foundation

Native Train still lacks a rest timer. First add its shared pure state transitions
and durable SQLite foundation, then integrate the native controls/lifecycle in
the next task; this foundation alone is not completed mobile timer acceptance.
Use an absolute millisecond deadline rather than decrementing background ticks;
support start, pause/resume, ten-second adjustments, expiry and durable notification
acknowledgement. Validate integer/bounded state and preserve malformed local data.
Add a non-destructive v2-to-v3 local migration with an owner-scoped table keyed by
workout, keeping catalog, source snapshots, outbox, IDs and media unchanged.
Serialize timer reads/writes with the existing database transaction queue; reject
writes to missing or terminal workouts. Prove missing behavior RED, then pure
transitions, populated v1/v2 migrations, owner/environment/workout isolation,
rollback and fresh-JS-process offline recovery with actual synthetic SQLite.
Run focused tests, all types/lint and normal root suite. No UI-complete, real-device,
API/schema/backend, dependency, deployment or publication claims; no real data.

## Task 32: Integrate the native rest timer

Mount accessible rest controls only for the active workout, keyed by its owning
login version and ID. Hydrate the Task31 durable state; offer start/restart120s,
pause/resume and ten-second adjustments. Never show an uncommitted change as
saved: disable duplicate presses while writing, retain canonical state on failure
and expose a retry for load/save errors. Use wall-clock deadlines on foreground
return and stop periodic updates in background; no background notification or
new platform permission. Persist the finished/acknowledged state before one
moderate foreground haptic; no tick vibration or repeated notice after remount.
Scope late reads/writes/haptics to the current account/version/workout and prevent
historical edits. First reproduce absent controls using real Train/store/query.
Verify durable controls, pending/error/retry, remount, background elapsed time,
single notification and account/workout/terminal isolation at native boundaries.
Run focused screens/storage/domain, all types/lint, normal root and local native
exports. No mocks of screens/stores, weakened deadlines/workers, dependency/API,
real data, remote build, publication or deployment changes.

## Task 33: Keep confirmed readiness saves independent of optional haptics

Profile awaits a native success vibration inside the readiness mutation's
onSuccess callback. A rejected optional vibration can consequently turn an
already confirmed server save into a visible mutation error. First reproduce
this with the actual Profile screen and QueryClient, using only the existing
native/transport fixtures. Assert confirmed save feedback and canonical score
remain available after native rejection, and keep a failed-server-save control
with a visible error and no success vibration. Catch only optional haptic
failure after the existing cache refresh; do not hide transport errors, retry
the confirmed mutation, alter readiness calculation or change other form logic.
Run focused profile cases, workspace types/lint and the normal root suite.
No API/dependency/deadline changes, publication, deployment or real-data access.

## Task 34: Make native readiness query states recoverable and cancellable

Native Profile does not visibly distinguish readiness loading from no daily
record and offers no query retry. Reproduce these gaps with the actual Profile,
Zustand session, QueryClient, mobile auth wrapper and generated client; replace
only SecureStore, optional haptics and HTTP transport. Show initial loading,
successful absence, explicit retry after network/API failures, and retained
canonical score clearly labelled when an update fails. Pass the query abort
signal through generated GET, scope its key to origin/user/login version and
prevent stale old-session responses from appearing in the current profile.
Preserve form values and confirmed-save behavior; do not manufacture zero scores
or infer query success from unavailable data. Exercise retry success, concurrent
unmount/account change and transport cancellation with independent fixtures.
Run focused native profile cases, workspace types/lint and normal root suite.
Day rollover and physical-device acceptance remain separate gates, not proven
by these cases. No backend/API/dependency/deadline, real-data or deployment changes.

## Task 35: Scope native readiness to the actual Bogotá civil day

The readiness key still uses literal today, so a mounted profile may retain
yesterday's score and save confirmation after midnight/background recovery.
Reproduce with real Profile, auth/generated transport and controlled clock/native
AppState events. Use the shared Bogotá civil-date rule; refresh the day on native
foreground return and at midnight while active, without periodic background work.
Key only the readiness form/query by origin/account/login version/civil day:
reset daily ephemeral fields/feedback without discarding an unsaved profile form.
Cancel superseded daily queries and ignore late results. Scope completed mutation
cache/haptic side effects to a live current owner/day, and reject a submission
from yesterday's form before sending it. Do not move or delete actual readiness
records, silently resubmit saves or weaken confirmed-save/haptic separation.
Test midnight in Bogotá (not UTC), multiday background recovery, no duplicate
same-day GET, late previous-day query/save, profile-draft preservation, cleanup
and preflight stale-day rejection. Run focused native cases, all types/lint,
normal root suite and local Android/iOS exports. No API/schema/backend/dependency,
deadline/worker changes, real-data access, remote build, deployment or publication.

## Task 36: Preserve canonical nullable readiness fields and user edits

Actual native readiness initializes fixed numbers even when today's stored
fields differ or are null. Generated Readiness/Input and backend validators
support nullable sleep/stress/soreness/motivation. Reproduce wrong displayed
values and wrong POST payload with real Profile/auth/client/query transport.
Hydrate canonical fields without replacing fields edited during pending load or
refresh. Offer accessible explicit unset controls and bounded steppers; null
remains null in the generated POST, never silently zero/default. On success use
the confirmed POST response as canonical cache/form state without a second GET;
preserve newer edits made during the request and distinguish unsaved changes
from a fully confirmed draft. Cancel older queries before canonical cache update,
keep current owner/day/unmount guards, optional haptic independence and field
values on failure. Reject malformed/out-of-range returned readiness instead of
rendering invalid values or inventing scores. Keep prior failure/retry/day cases.
Update only incomplete old native readiness fixtures to real full response shape.
Run focused real profile cases, all types/lint, normal root and local native
exports. No scoring/backend/schema/dependency/deadline changes, real data,
publication, remote build or deployment.

## Task 37: Avoid redundant transformation of generated native renderer JavaScript

CPU profiling of uncached readiness shows 6663/7867ms in Jest transformation.
Installed ReactFabric-dev/prod renderer implementation files are generated
plain JavaScript, @noflow, and pass Node24 syntax checks. Preserve the Expo
preset and all its default ignore patterns, actual renderer execution, app/Flow
transforms, original worker/deadline/coverage behavior and test path ignores.
Write a behavioral configuration regression first: normalized actual Jest
configuration must bypass Babel only for those exact generated implementation
files, not similarly named/Flow/source files or platform shims. Verify installed
files remain syntactically valid and default preset transforms remain active.
Expected RED: actual baseline config still transforms these generated files.
Then add the exact exception and rerun configuration controls plus original
uncached readiness cases. Expected: configuration controls pass, actual screen
behavior unchanged; record whether original5000ms cold timeout is resolved,
not a warm-cache inference or fabricated speed guarantee. If still red, retain
failure and diagnose remaining transform cost before expanding any exception.
Run normal root, all types/lint and local native exports after the change;
generated-client/backend/API/assets/real data must remain unchanged. No new
dependency, skipped test, mock component, prewarm, deadline/worker change,
publication, remote build or deployment; global gates remain distinct.

## Task 38: Exercise native offline synchronization against the compiled backend

Existing native storage tests replace the API client; backend sync tests do not
consume the native outbox. Add an explicit cross-repository local integration
command, failing closed without a distinct loopback PostgreSQL test database.
Test that safety boundary before implementing the runner. Reuse the compiled
backend benchmark listener and its close IPC, without Next.js or remote services.
Use the actual generated client, auth/session, training store, sync engine and
SQLite SQL, replacing only native storage/network bridges and the HTTP adapter
with real Node HTTP. Verify offline completion after module reload, lost
acknowledgement/replay without duplicate sessions/sets/statistics, refresh after
reload and stale-device revision conflict preserving local and server versions.
Run the new explicit gate, its safety controls, focused existing storage/auth
tests, types/lint and normal root tests. Do not weaken existing gates, claim
physical-device/process-restart acceptance or publish while relevant gates fail.
The existing dedicated synthetic cluster may be started and stopped; never
reset or migrate real data. Preserve all prior dirty work and reports.

## Task 39: Verify offline recovery across real JavaScript process exits

Task38 reloads modules but retains in-memory bridges. First reproduce that the
test SQLite bridge cannot persist a requested file database. Add a bounded
test-only file storage option, preserving default in-memory behavior and guarding
database names against path escape. Then exercise actual native auth/training/
outbox/client code in three separate Jest child processes: create offline, reopen
offline and finish, reopen online and synchronize. Native SecureStore remains a
synthetic disk adapter, not a claim of physical encryption. Use one guarded
compiled backend/PG runtime and its exact fixture cleanup; keep local synthetic
SQLite artifacts for diagnosis. Add the scenario to the explicit existing CI
gate, not a skipped test or replacement for the ordinary suite. Test transaction
rollback and memory/file isolation of the bridge. Run explicit integration,
types/lint and normal root. No app/API/dependency/real data/deployment changes.

## Task 40: Verify native readiness and optional cycle contracts with real HTTP

Extend the explicit guarded mobile/backend gate beyond training. Add a separate
suite using the actual mobile authentication wrapper and generated client against
the compiled local backend and existing synthetic PostgreSQL cluster. Replace
only native SecureStore and the coherent Node HTTP transport. Verify daily
readiness upserts (including concurrent requests), nullable fields and one source
row; verify optional cycle opt-in independent of sex, month-boundary civil-date
move preserving identity, occupied-date conflict and deletion. Confirm failures
leave source rows unchanged. Clean only randomly generated fixture user IDs.
These are characterization checks of existing behavior, not invented RED evidence
or a production behavior change. Register the suite in the existing explicit CI
command without weakening limits. Run the complete explicit gate, safety controls,
types/lint and normal tests; record actual failures and device/security/performance
limits. No real migration, runtime app changes, tool installation, publication,
remote build or deployment.

## Task 41: Preserve safe benchmark startup evidence without weakening gates

The performance control failed before sampling and recorded only generic Error.
Add bounded startup phase/error evidence to the existing compiled benchmark.
First exercise the real process/IPC lifecycle with a controlled test worker:
valid phase messages followed by readiness, initialization rejection containing
sensitive text, early exit and deadline expiry. Extract the current startup
behavior only to make the existing boundary testable, then observe missing
diagnostics before implementing the feature. Unknown messages must not end the
readiness wait or enter reports; elapsed values come from the parent clock.
Trace only allowlisted phases and fixed error codes; never raw credentials,
exceptions, stacks or IPC payloads. Opt-in worker tracing must leave the mobile
runner's legacy first-message readiness protocol unchanged. Preserve original
30s startup, 10s/5s cleanup, warmup20/samples80, confidence/budgets and failure
exit codes. Keep all adverse reports. Run protocol controls, whole backend unit
suite, types/lint/build and a bounded real compiled startup diagnostic using only
the existing synthetic cluster. No performance acceptance by inference, repeated
benchmarks until green, real data, installers, publication or deployment.

## Task 42: Characterize the full API gate with the newly verified startup trace

Run exactly one full existing performance gate with Task41 diagnostics, only
after the compiled artifact and dedicated synthetic PostgreSQL are ready. Keep
the existing dataset, warmup, samples, concurrency, repetitions, confidence
formula, budgets and watchdogs. This is a diagnostic measurement, not an
implementation fix or repeat-until-green policy. Read the terminal command and
all thirty groups or the exact startup failure trace. Preserve the two prior
failed reports regardless of outcome. A passing run alone does not explain the
previous outliers or certify the entire project. No concurrent owned checks,
real data, reset/drop, installation, publication or deployment. Stop the dedicated
cluster gracefully after all dependent checks finish. Use the actual outcome
to select the next root-cause investigation, not a guessed performance patch.

## Task 43: Remove the newly reported critical transitive Handlebars dependency

The fresh backend high/critical audit fails on installed Handlebars4.7.9 via
ts-jest29.4.12. Preserve the actual failing audit. Confirm the upstream advisory
and patched release plus the parent's allowed range. Update only the compatible
transitive package to4.7.10, keeping application/framework majors and audit gates
unchanged. Inspect the generated manifest/lock diff for unrelated changes. The
real audit must pass without exceptions; rerun whole backend units, types/lint
and build to verify the tooling remains compatible. No invented framework test,
forced broad audit fix, real data, deployment or premature publication. Prior
integration/migration/performance evidence remains distinct; re-evaluate remaining
CI coverage before a checkpoint, and retain all adverse artifacts.

## Task 44: Verify and publish the coherent backend checkpoint

Using the changed backend lock and existing diagnostic source, run the complete
backend workflow locally in its declared order: clean install, Prisma validate/
generate, OpenAPI drift, lint, types, build, whole units, guarded test migration,
integration, populated migration/backup recovery, compiled API performance and
high-level audit. Use only the preserved dedicated loopback synthetic cluster;
retain every report and stop it safely when its dependent checks finish. This
new full gate is post-dependency-update verification, not repeating unchanged
performance runs until green. Stop publication if a relevant check fails.
After all gates pass, commit only the benchmark diagnostics/tests/docs as one
coherent increment alongside the two existing narrow commits. Verify a normal
push to codex/evry-optimization, update the existing backend PR preserving its
history, and inspect both push-triggered and PR-triggered Actions for the exact
head. Pending remote CI is not success. Keep frontend unpublished while its own
gates fail. No merge, deployment, EAS build or remote environment/database writes.

## Task 45: Pin both frontend platforms to the verified published backend

Now that backend00c57b2 has verified push and PR CI, reproduce the stale backend
pin with the existing api:verify-backend command. Use api:sync against the exact
authorized clean backend worktree, never manual hashes or an unpublished SHA.
Verify regeneration, source identity and API safety tests; confirm whether the
OpenAPI/client bytes actually change or only the revision lock. Run frontend
types and nonmutating lint and retain errors. Preserve all existing dirty work.
This is local contract alignment, not frontend publication or security/performance
acceptance; the current55high audit still prohibits a frontend checkpoint.

## Task 46: Exercise mobile progress search and pagination through real HTTP

Add a characterization suite mounting the actual ExerciseProgressPanel with
TanStack Query, real generated/auth client and SQLite cache against the guarded
compiled backend and synthetic PostgreSQL. Seed only UUID-owned fixtures: 33
private exercises and 41 completed sessions with one useful 60kg/10rep set each.
Verify search, 30-item catalog pages, search resetting page, empty search result,
20-item history cursors without duplicate/missing sessions, and the independently
derived 41 sessions/41 sets/24600kg summary. Replace only unavailable native
SecureStore/SQLite/crypto bridges and the coherent Node HTTP transport. No API,
query, component or SQL-response mocks. Register this suite in the explicit
runner; preserve all existing tests, watchdogs and budgets. These tests characterize
existing behavior, not an invented production RED/GREEN fix. Run the complete
explicit gate, runner safety tests, types/lint and normal root suite. Clean exact
fixture IDs and stop the owned cluster after checks. Preserve failed evidence.
Keep frontend unpublished while its audit fails. No physical-device acceptance,
new production behavior, installations, remote builds, resources or deployment.

## Task 47: Avoid chart delivery for exercise periods with no plottable load

The failed web hook waits for real ProgressPlot imports even though its fixture
has points[]. Activity starts this heavy import unconditionally; ProgressPlot
later filters null 1RM and returns only empty text. First test actual Activity
under chart-chunk delivery failure with empty and null-only source points:
metrics and explicit absence must render without depending on a chart chunk.
Expected RED: missing empty text and chart-delivery error. Add the minimal
conditional before ModuleContent using the existing plottable-1RM criterion;
leave chart rendering/dynamic imports, nullable metrics and errors unchanged
when points exist. Update the existing delivery-failure fixture to contain real
plottable data, preserving its failure/retry/focus assertions. Do not prewarm or
drop cleanup, increase limits, replace Recharts or simulate whole components.
Run focused checks, types/lint, whole root and local web build; record native
and other failures honestly. Preserve original reports; no unsupported claim
that this explains all web/native timings or meets browser performance budgets.
Frontend remains local until all publication gates pass. No production data,
SDK/installer, remote build, resource or deployment writes.

## Task 49: Verify the complete mobile progress route against HTTP

Current local-fixture amendment (11 October): under the owner's general
implementation authority, these two progress fixtures use setup 30 seconds
and journey 15 seconds only on Windows with CI unset; CI and other OS retain
five seconds. This supersedes the original no-deadline-change instruction
below for those fixtures only. All assertions and exact-ID cleanup remain.
Normal HTTPS execution passes 2/2 at 2326/1920 ms; no-cache HTTPS passes 2/2 at
3954/5049 ms. These are functional fixture results, not phone startup/API
performance or proof that the intermittent latency cause was resolved.
Root verification exits 1: web misses two worker starts (247 tests/51 files
executed; accessibility not executed). Types/lint/mobile/shared packages pass.
Focused unchanged worker instrumentation passes 26 cases in the two affected
files without reproducing the failure; full instrumented web reproduction
also passes 273/53files, first worker starts 2825/2899ms, maximum 3757ms.
No latency/root-cause correction claimed. Separate normal accessibility gate
passes 10/5files, exit 0; original root chain remains failed.
Local Android tooling/installation is now
authorized; no remote build, deployment, real-data mutation or CI waiver.

Task48 was a read-only security revalidation, not an implementation task. Expand
the existing guarded progress suite without replacing its panel characterization.
Mount the actual ProgressScreen inside its actual AccountQueryProvider using the
user/session returned by real mobile authentication. Reuse exact owned fixtures,
not fake API responses: 41 historical sessions, one 60kg/10rep set per session.
Verify the initial 30d successful absence, all-time 41 sessions/41 active days/
24600kg and 100percent chest distribution, no artificial previous period for
all-time, selecting exercise then changing period updating both overview and
history, and restoring all-time data. Native storage/crypto transport bridges
remain the only replacements. Preserve all existing cases, limits and source
cleanup; this is existing-behavior characterization, not invented production RED.
Run complete explicit integration, safety, types/lint and normal root. No cache
prewarming, deadline/worker changes, missing-case skips, new app behavior or
publication. Record errors and keep full-device/runtime performance and account
switch/navigation acceptance separate. Use only owned synthetic PG/backend;
stop it safely afterward and retain all prior failing evidence. SDK authority
is still pending; no installer, EAS/deployment/resources or real-data writes.

## Task 50: Release unsuccessful SQLite preparation before a retry

The production opener caches its preparation promise, but an opened native
connection was not closed when migration or queue recovery rejected. Exercise
both failures against independently created file-backed SQLite fixtures. Require
the failed native handle to be closed, original source rows unchanged, a repaired
synthetic fixture to reopen successfully, concurrent opens to share one promise,
and successful connections to remain usable. Never delete an account database,
reset its schema, close a connection already returned to consumers, or replace
the original preparation error with a cleanup error. Native bridge replacement
is limited to real Node SQLite, not simulated statements or rows.

Expected RED: both native handles remain open after failed preparation.
Expected GREEN: close only that unsuccessful connection before evicting its
promise. Run the existing migration/storage tests, full root tests, types and
lint. Keep source verification separate from the previously installed APK and
the unresolved physical memory budget; this does not attribute that measurement
to initialization failures. Retain synthetic files and earlier failed attempts.
No publication while the relevant security gate fails; no deployment or real
data changes.

## Task 51: Align the real performance gate with cold cookie restoration

The current production bootstrap restores an absent in-memory access token
directly through its HttpOnly cookie, then fetches the authenticated user.
The old performance gate still required a deliberately unnecessary initial
401. A real compiled-browser run reproduces the mismatch: refresh 200 followed
by users/me 200, without that failed request. Correct only the expected
sequence to those exact two responses; require zero unexpected HTTP errors,
the same scoped rotating cookie, and all existing visits/actions/budgets.
Do not accept either sequence loosely or revert the application to manufacture
an error for the old test. Startup timeouts remain unchanged; diagnostic runs
do not establish cold stability or performance acceptance. Run the corrected
normal controlled profile, inspect every actual metric and retain violations,
then root tests/types/lint. Preserve pre-existing synthetic/real data and stop
only owned services. No push while a relevant gate fails.

## Task 52: One keyboard stop for routine editing

The real routine card wraps a button in a link, producing nested interactive
controls. First reproduce it in the actual page with literal routine/workout
transport fixtures, not a mocked Link: require a named edit anchor with the
same destination, no nested button, and deletion as the next Tab destination.
Move only the existing name and styling onto Link; keep its icon, navigation,
pagination and adjacent start/delete behavior unchanged. Watch RED before
production change, then all existing page cases and complete root gates.
Do not represent a jsdom keyboard regression as full screen-reader/browser
acceptance or ignore the independently observed accessibility worker timeout.

## Task 53: Identify main-thread phases before optimizing cold rendering

The existing actual dashboard attachment places refresh start at2729ms,
user-response end3169ms and heading LCP4104ms; the page's domain reads start
only afterward. Do not attribute that heading delay to progress aggregation.
Record browser long tasks and sanitized INP processing phases inside the
existing profile. Collect tasks in-page without a per-task IPC call or CDP
profiler, then read them after measured interactions. Include support status;
never record text, input values, tokens, cookies or full URLs. Keep every
action, case, threshold, delay and limiter intact. This extra instrumentation
is diagnostic and may have overhead: a run is not a causal proof or acceptance
improvement merely because its numbers change. Inspect event delay, handler
time, presentation delay and auth-relative tasks before choosing a source fix.
Build the current production source first, use only the owned loopback test
database, preserve its unrelated synthetic account and stop owned services.

## Task 54–55: Actual startup phases and diagnostic document lifetime

Opt-in EVRY_LOCAL_STARTUP_DIAGNOSTICS on the local compiled API runner reports
only fixed stage names and elapsed milliseconds (imports, factory, HTTP config,
listener). Keep application order/settings/guards identical and default logging
off; never log credentials, environment values or request bodies. The actual
diagnostic observed6230ms pre-listen setup, not a fix for earlier60s failures.

The18-visit report retained real INP phases but omitted long tasks because the
capture happened after navigation to about:blank. Undefined is missing data,
not zero work or lack of browser support. A real browser regression must fail
when navigation races an asynchronous diagnostic read. Await the beforeClose
callback after the unchanged metric-settling steps; collect/validate support
status and task array inside it before navigation. Preserve synchronous callers,
slow-last-interaction and missing-INP rejection. Do not insert idle time before
measured actions or redefine budgets to accommodate the new diagnostics.

## Task 56: Correlate the whole interaction, not only pointerdown

Capture genuine PerformanceEventTiming events in-page with a support flag and
only event name, timing, interactionId and target tag. Read them in the awaited
beforeClose callback, without per-event IPC, input values or text. Correlate
events by interactionId: short pointerdown processing does not imply a short
click handler. Actual18-visit report validates both capture arrays/support flags;
routines click processing572.3/266.9/488.6ms overlaps long tasks773/484/654ms.
This establishes costly interaction work, not the responsible source function.
Keep all budgets/controls unchanged; identify that function before modifying
application code. Root77034 worker startup failures remain independently open;
targeted missing cases cannot retroactively make the full chain pass.

## Task 57: Attribute the history click to sampled functions

Use EVRY_LOCAL_CLICK_CPU_DIAGNOSTICS=1 only for an explicit local diagnostic.
Start CDP sampling after the existing readiness steps and stop immediately
after the unchanged routines interaction. Preserve sampled nodes, positions,
stacks and time deltas; retain only compiled static URL paths, never query
strings, source text or data values. Attach each repetition's CPU profile.
Default gates never activate sampling. Diagnostic overhead means these timings
are not acceptance evidence; still retain all existing budget assertions and
failures, real authentication, populated fixtures, actions and conditions.
Identify the hot function in the already-built source before proposing a fix;
do not preemptively change formatting, rendering or application authentication.

## Task 58: Prepare bounded history labels from source data

Native Chromium isolation distinguishes first Intl construction (268–380ms)
from cached30-row formatting (under6ms), confirming the source hypothesis.
Reproduce first-click work with the real page/formatter and literal completed,
active and cancelled fixtures. Require completed labels prepared before the
interaction, exact visible Bogotá text, and no repeated formatter calls when
switching tabs. Watch the test fail before changing production.

Memoize deduplicated loaded pages and completed-only display labels when remote
data changes; do not initialize formatters at module load or add test idle time.
Preserve native timezone behavior, pagination, cache ownership and status filters.
Run page/pagination/date tests, whole workspace gates and a current web build.
Then repeat the unprofiled actual populated profile with unchanged actions and
budgets. Moving construction after remote data arrival must not be accepted on
unit tests alone: inspect cold LCP and first-click INP, retain every failure.

## Task 59: Share concurrent complete authentication restoration

Before moving restoration earlier in the hydration critical path, prevent
multiple consumers from issuing duplicate user requests. Existing store test
characterizes one refresh but two user requests. Require one complete restoration
per concurrent operation/session generation, with authenticated state observed by
both callers. Preserve new-login/logout epochs, anonymous/error behavior and
fresh retry after a settled failure; do not cache a resolved restoration forever.
RED: real store/transport test fails at duplicate users/me count. GREEN: minimal
generation-and-epoch-scoped pending operation, cleared by identity on settlement.
Run auth/session regressions and workspace gates before claiming completion.
This prerequisite alone is not evidence of LCP improvement. Early bootstrap
integration and new actual cold measurements remain separate mandatory work.

## Task 60: Reuse early document restoration through protected hydration

Start the existing guarded restoration before React hydration for protected
document paths only, using Next instrumentation-client. Do not refresh on
login/register/public pages. Opt-in document reuse on inicializar must share
both pending and settled bootstrap for the current generation/operation epoch;
normal explicit reload/recovery stays fresh. RED real transport fixture:
two sequential document consumers currently issue a second users/me request.
Preserve invalidation/new-login/logout behavior, recoverable errors and scopes.
Then wire protected layout to this mode and test entry path behavior before
claiming readiness. Run whole gates, loopback-configured production build and
actual unchanged cold profile; inspect request-start times as well as LCP/INP.
No forced idle, widened budget, persistent access token or inferred acceptance.
