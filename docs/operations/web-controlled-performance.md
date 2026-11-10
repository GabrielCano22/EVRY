# Controlled web performance increment

Binding scope: the integral EVRY plan, especially LCP <2500 ms, INP <200 ms,
CLS <0.1, real interactions, no hidden failures, preserved data, and no deployment.
This increment supplies a reproducible browser-side stress profile; it does not
replace authenticated, field, statistical, accessibility, or native acceptance.

Global constraints: authorized frontend worktree only; Chromium CDP, loopback
servers, synthetic credentials only; fresh contexts, disabled browser cache and
service workers; no audit exceptions, relaxed budgets, or skipped tests.

## Task 1: Controlled browser conditions

Produce a helper applying CPU slowdown 4x and an explicitly named lab network:
150 ms latency, 1,600,000 bits/s download, 750,000 bits/s upload. CDP receives
200,000 and 93,750 bytes/s. This is not a calibrated device or an official preset.
Consume it in a real Chromium boundary test with a local HTTP server: removing
the network rule must make latency/transfer assertions fail. Invalid or unsupported
CDP commands must abort measurement, never silently fall back to unrestricted runs.
Expected: RED observed without conditions; GREEN with actual received bytes and
elapsed time demonstrating both latency and throughput limits.

## Task 2: Compiled login measurements

Add a dedicated controlled configuration (three visits per desktop/Pixel viewport,
one worker, no retries). Reuse existing login actions and real web-vitals observer;
apply conditions before navigation. Retain a report even for setup/action failures,
with profile, versions, metrics, and errors, without tokens or entered passwords.
Expected: compiled measurements collected; budgets remain strict. A failing budget
is an optimization input, not grounds to change the profile or report acceptance.

## Task 3: Verification and evidence

Run root tests, web types/lint/build, the boundary probe and six controlled login
visits sequentially. Record actual results and remaining authenticated-throttled,
field/statistical and native-device gaps. Inspect publication audit before push;
do not push known failing relevant gates. One fresh-context review at the end.

Review Focus: CDP units and application timing; actual network constraints despite
Playwright interception; dropped or unavailable measurements; misleading confidence,
calibration or whole-app acceptance; failure reports/privacy; baseline scope preserved.

## Local evidence, October 5 — not accepted yet

The real Chromium probe failed without throttling (12.8 ms headers) and passed
with the profile (262144 bytes, >=120 ms headers and >=1200 ms transfer). Routing
remains enabled, matching the measurement harness. The browser acknowledges the
rule and actual login requests carry its ID. Unsupported commands propagate failure.
CPU4 is relative to this host; these values are not physical-device calibration.
CDP units are documented in the [official protocol](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/browser_protocol.json).

The first compiled six-visit run failed five visits: INP232–376 ms in those cases,
LCP1056–1432 ms and CLS<=0.000164. No budgets were changed. EventTiming and CPU
diagnostics locate the slow first email pointerdown in synchronous React hydration,
not ordinary typing (React dispatch -> synchronous render; 206.3 ms processing in
one diagnostic visit). Reports retain partial metrics/errors and never input values.
The separate temporary CPU profiling run is marked diagnostic, not acceptance
evidence; its profiling code was removed after investigation.

Static login branding/decor now stays on the server and only the form is a client
component. TanStack Query's provider is scoped to authenticated routes, where its
consumers live; public/authentication pages do not need that client dependency.
Both changes compile. They are not yet sufficient: the latest controlled run
passed 3/6 and failed 3/6. The unrestricted authenticated regression passed all
36 visits after recompiling with the exact CI API origin (127.0.0.1, not the
localhost fallback). Its initial setup failure remains recorded. Report:
`.worktrees/web-auth-performance-1791251534969-f22e684d-a6a3-4408-8b92-979654809bb5/results.json`.
This verifies the new provider boundary against populated synthetic data,
rotating refresh cookies, and real actions, not controlled authenticated performance.
The complete root suite passed 505 tests (247 mobile, 237 web, 3 accessibility,
18 shared). All workspace types and non-mutating lint passed. The final browser
probe passed 1/1 and the unrestricted public baseline passed 12/12 in 31.5 s.
No cases were skipped in these runs. Final review and the strict controlled INP
repair remain pending; these functional gates do not make this checkpoint publishable.

Reports, including failures, are in `.worktrees/web-controlled-performance-<runId>/results.json`.
The initial RED run is `1791250641582-6f29bb77-4870-49d2-a959-886343770e74`;
the latest strict run is `1791251199266-66519869-8ad2-4238-9387-f3d3ce14c994`.
These are exploratory samples, not percentiles or statistically confident acceptance.
Authenticated throttling, SPA navigation and native-device budgets remain open.

## Subsequent verified evidence, October 5

The compatible source-map-js lock update to 1.2.2 addresses its
[indexed-offset amplification advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
One bounded characterization fails on 1.2.1 and passes on 1.2.2: the malicious
offset is rejected without ever serializing it. A legitimate indexed mapping
control passes. The complete root suite passed 507 tests (247 mobile, 239 web,
3 accessibility, 18 shared); all workspace types/lint, contract check and the
canonical-origin production web build passed. This does not prove EVRY exploitation.

Additional resource diagnostics are collected only after the existing interactions,
so they do not add a wait before first input. They record static script paths and
sizes/timings, not query parameters, tokens or entered values. The first six-visit
run with these diagnostics passed unchanged budgets: desktop INP 128/136/128 ms,
mobile INP 88/128/120 ms, LCP 1024–1064 ms, CLS <=0.000164. Each visit acknowledged
the unchanged controlled profile and matched 18 requests to its network rule.
Report: `.worktrees/web-controlled-performance-1791254359262-935557cb-d12a-4d34-b2ba-d0947fbe6060/results.json`.

This is a new exploratory sample, not evidence that the dependency patch caused
the INP improvement or that previous failures disappeared. The earlier failed
reports remain valid and retained. Initial script transfers finished before the
first measured pointerdown in these visits; two later script requests started
after it. Further investigation must distinguish hydration/host variability and
establish reproducibility, not rerun until green or widen budgets. Authenticated
controlled performance, statistical/field confidence and native acceptance remain
open; no new production login optimization was made in this continuation.

Frontend publication remains forbidden by the user gate: the fresh audit reports
74 packages with advisories (56 high, 18 moderate). Latest published `braces` 3.0.3
and `node-forge` 1.4.0 still have no fixed release. No frontend push or remote CI
was performed. The backend proxy-addr update was independently completed at
`406af9c`: [PR 18](https://github.com/GabrielCano22/EVRY-Backend/pull/18), with both
exact-SHA push/PR Actions successful. That backend result does not clear frontend
or integral acceptance. No deployment or real-data modification was performed;
synthetic PostgreSQL and local benchmark listeners remain stopped.
