# Web cycle opt-in implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Track steps with checkboxes.

**Goal:** Make web cycle access depend on explicit consent, not biological sex, across registration, profile, dashboard, calendar and direct navigation.

**Architecture:** Keep the existing Next.js client components and shared NestJS API. Use the real Zustand session and HTTP client in component tests, substituting only HTTP transport and Next navigation. A small mounted-content boundary on the cycle page can ensure opt-out unmounts sensitive form/data and aborts pending reads.

**Tech Stack:** Next.js 16, React, Zustand, Vitest, Testing Library, existing TypeScript API client.

**Spec:** User-approved integral roadmap in this conversation: “Cualquier persona que active voluntariamente el seguimiento podrá usarlo, independientemente del sexo registrado.” “El ciclo será contexto opcional y estimado; no multiplicará automáticamente la carga ni afirmará picos fisiológicos como certeza.” These are the binding requirements for this slice; the full roadmap remains active separately in docs/operations/implementation-status.md.

## Global Constraints

- Preserve existing data and optional consent. No automatic opt-in.
- No deployments, remote infrastructure, main merge or force push. Root owns authorized checkpoint pushes after verification.
- No dependency upgrades, API changes, generated-contract replacement or test exclusions for this task.
- No new automatic cycle-based load multipliers or claims of certain physiological performance.
- Work only in C:/Users/gabri/.codex/worktrees/EVRY-optimization/frontend on codex/evry-optimization.

### Task 1: Correct the complete web opt-in path

**Files:**
- Modify apps/web/app/(auth)/register/page.tsx: available opt-in for all sex options; changing sex preserves the choice; conservative copy.
- Modify apps/web/app/(app)/profile/page.tsx: available opt-in for every account; cycle lengths appear only when opted in; preserve existing save request.
- Modify apps/web/app/(app)/dashboard/page.tsx: query/display cycle solely from trackCycle.
- Modify apps/web/components/CalendarioActividad.tsx: query/display cycle solely from trackCycle, including opt-out transition.
- Modify apps/web/app/(app)/cycle/page.tsx: guard direct access, remount content per account, cancel pending reads on opt-out/unmount, conservative estimated copy.
- Create apps/web/lib/cycle-date.ts and focused tests if needed to adapt the existing API's UTC-midnight serialization of civil cycle dates without applying the workout timestamp conversion.
- Create apps/web/tests/unit/cycle-opt-in.test.tsx. Split into cycle-opt-in-forms.test.tsx and cycle-opt-in-views.test.tsx only if separate fixtures improve readability.

**Interfaces:** Existing useAutenticacion exposes usuario, registrar and recargarUsuario. Existing api/request send /auth/register, /users/me, /cycle/today and /cycle/entries. Preserve request field names biologicalSex and trackCycle. No new exported domain interface is needed.

**Discovered contract requirement:** CycleEntry includes userId and date serialized as YYYY-MM-DDT00:00:00.000Z (backend CycleEntryResponseDto). Fixtures must use this real shape. Cycle dates retain the civil date portion; unlike workout timestamps, converting midnight UTC to Bogotá would incorrectly move them to the previous day. Test calendar marker/details and edit input using real serialized dates, including a month boundary. Use a shared cycle-specific adapter if needed; leave generic timestamp formatting unchanged.

- [x] Write failing interaction tests using the real page components, controls, Zustand store and HTTP client. Stub fetch (complete controlled response structures) and next/navigation only. Capture requests at the HTTP boundary; do not mock api, Button, Input, Icon or the components being tested.

Minimal transport fixture and interaction shape:

```tsx
const requests: { path: string; method: string; body: unknown }[] = [];
vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
  const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
  requests.push({ path, method: init?.method ?? 'GET', body });
  if (path.endsWith('/auth/register')) return Response.json({ accessToken: 'test-token' });
  if (path.endsWith('/users/me')) return Response.json(user);
  throw new Error(`Unexpected request: ${path}`);
});
render(<PaginaRegistro />);
fireEvent.click(screen.getByRole('button', { name: 'Masculino' }));
fireEvent.click(screen.getByRole('checkbox', { name: 'Activar seguimiento del ciclo' }));
fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Alex' } });
fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'alex@example.test' } });
fireEvent.change(screen.getByLabelText('Contraseña (mín. 8 caracteres)'), { target: { value: 'testing-password' } });
fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
await waitFor(() => expect(requests).toContainEqual({
  path: '/api/v1/auth/register', method: 'POST',
  body: { email: 'alex@example.test', password: 'testing-password', name: 'Alex', biologicalSex: 'MALE', trackCycle: true },
}));
```

Test matrix, each expectation at the user-visible or emitted-request boundary:

1. Registration offers opt-in for Femenino, Masculino and Otro; initial checkbox unchecked. Submit at least one non-FEMALE opt-in and an untouched opt-out payload. Choose FEMALE, enable, change to MALE/OTHER: remains checked and submission preserves it.
2. Profile with MALE, OTHER and PREFER_NOT_SAY can enable/disable cycle and save true/false through PATCH /users/me; after save actual session reload reflects it. Opt-out hides length controls. Include initial missing user followed by session hydration so the toggle does not become uncontrolled or overwrite saved consent.
3. Dashboard opted-in MALE gets /cycle/today and displays a literal returned phase, while opted-out FEMALE neither queries nor displays it.
4. Calendar opted-in OTHER gets /cycle/entries and displays a dated period-start/symptom marker; opted-out FEMALE does not query or show cycle legend/data. Toggle true to false while mounted: cycle information disappears and cycle-updated events do not re-request it.
5. Direct cycle route for opt-out renders explanation and link to /profile, with no cycle HTTP requests or record controls. With opt-in non-FEMALE, normal form and loaded history appear. Toggle off while a cycle read is pending: request signal aborts and late results do not remount history. Re-enable or switch account: a fresh form does not retain prior private notes.

- [x] Run the focused test before production edits:

```powershell
npm run test:unit --workspace @evry/web -- tests/unit/cycle-opt-in
```

Expected RED: missing checkbox for non-FEMALE, no opted-in cycle queries, or unguarded opted-out route. Fix setup errors before claiming RED. Record exact result in report.

- [x] Implement the gates without rearchitecting data fetching:

```tsx
// dashboard and calendar
const muestraCiclo = !!usuario?.trackCycle;
// registration sex selection preserves independent consent
setDatos({ ...datos, sexoBiologico: opcion.valor });
// registration/profile: remove outer FEMALE conditional around opt-in card
// retain datos.trackCycle conditional around length inputs
```

Profile can avoid pre-hydration state by a small keyed form boundary; keep session actions in the form and initialize only from a real user:

```tsx
export default function PaginaPerfil() {
  const { usuario } = useAutenticacion();
  return usuario ? <FormularioPerfil key={usuario.id} usuario={usuario} /> : null;
}
function FormularioPerfil({ usuario }: { usuario: Usuario }) {
  const { recargarUsuario, cerrarSesion } = useAutenticacion();
  // Existing form state/handlers/JSX remain here; initialize from usuario.
}
```

Use the same mounted-content pattern for direct cycle access:

```tsx
export default function PaginaCiclo() {
  const { usuario } = useAutenticacion();
  if (!usuario) return null;
  if (!usuario.trackCycle) return (
    <section>
      <h1>Ciclo</h1>
      <p>El seguimiento del ciclo es opcional. Puedes activarlo en tu perfil.</p>
      <Link href="/profile">Configurar seguimiento</Link>
    </section>
  );
  return <ContenidoCiclo key={usuario.id} />;
}
// Rename existing component to ContenidoCiclo; keep its cleanup that
// increments request sequence and aborts the controller on unmount.
```

Conservative copy: registration introduction describes optional preferences, not a claim of calibrated metabolism. Cycle toggle describes optional estimated context, not predicted strength. Cycle page labels phase/next-period dates as estimates and does not claim adaptation is automatic. Do not modify unrelated motivational copy or calculation rules.

- [x] Re-run focused tests until green, then once run full web tests, lint, type-check and web build. Keep existing warnings visible and document them; no exclusions.

```powershell
npm run test:web
npm run lint --workspace @evry/web
npm run type-check --workspace @evry/web
npm run build --workspace @evry/web
git diff --check
```

- [x] Self-review and commit only the listed implementation/test files with message `fix(web): make cycle tracking depend on explicit opt-in`. Write report with RED/GREEN output, files, warnings and concerns. Do not push. Controller reviews the exact diff, checks remote state, then publishes after all relevant checks are green.

**Task boundaries:** No calendar aggregation rewrite, full generated-client migration, backend physiology advice, mobile parity or profile error redesign in this task. Those remain real open roadmap items, not waived acceptance requirements.
