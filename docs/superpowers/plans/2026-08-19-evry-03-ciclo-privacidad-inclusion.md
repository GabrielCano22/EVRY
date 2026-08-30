# EVRY 03: ciclo, privacidad e inclusión

> Reemplazado por la hoja de ruta integral de mejora y optimización solicitada por el usuario. Se conserva como referencia histórica; consultar el estado vigente en `docs/operations/implementation-status.md`.

> **Para agentes de implementación:** SUB-SKILL OBLIGATORIA: usar `superpowers:subagent-driven-development` o `superpowers:executing-plans`. Aplicar TDD y completar después de los fundamentos.

**Goal:** Hacer que registro, perfil y diario menstrual sean inclusivos, voluntarios, coherentes con fechas civiles y plenamente gestionables por la persona usuaria, incluida exportación y eliminación.

**Architecture:** El backend trata el ciclo como un diario opt-in y no lo deduce del sexo. Una utilidad civil única valida fechas y una representación de estimación evita prescripción. El frontend comparte formularios tipados, conserva nulos reales y sincroniza el calendario mediante invalidación explícita.

**Tech Stack:** NestJS/Prisma/PostgreSQL/Jest/Supertest y Next.js/React/Vitest/Testing Library/axe/Playwright.

**Spec:** `EVRY/docs/superpowers/specs/2026-08-19-evry-release-candidate-design.md`

## Global Constraints

- El seguimiento de ciclo depende solo de consentimiento `trackCycle`, no de `biologicalSex`.
- `PREFER_NOT_SAY` debe funcionar en registro y perfil; el sexo no se usará para prometer calibración metabólica.
- Las proyecciones se llaman estimaciones y no cambian automáticamente carga o volumen.
- `energy` y `mood` permanecen `null` si la persona no los indicó.
- Exportación excluye password hash y refresh tokens. Borrado de cuenta revoca sesión y elimina datos mediante cascadas comprobadas.
- Desactivar el módulo lo oculta, explica retención y no borra silenciosamente datos.

---

### Task 1: Aplicar fechas civiles a perfil y readiness

**Files:**
- Modify: `EVRY-Backend/prisma/schema.prisma`
- Modify: `EVRY-Backend/src/modules/users/users.service.ts`
- Modify: `EVRY-Backend/src/modules/users/dto/update-user.dto.ts`
- Create: `EVRY-Backend/src/modules/users/users.service.spec.ts`
- Modify: `EVRY-Backend/src/modules/readiness/readiness.service.ts`
- Modify: `EVRY-Backend/src/modules/readiness/readiness.controller.ts`
- Modify: `EVRY-Backend/src/modules/readiness/readiness.service.spec.ts`
- Create: `EVRY-Backend/prisma/migrations/20260819150000_civil_readiness/migration.sql`

**Dependency:** Importar `CivilDate`, `parseCivilDate`, `todayCivilDate` y `civilDateBounds` creados en el plan 01; no crear una segunda implementación.

- [ ] **Step 1: Probar fecha inválida, futuro, rango invertido y fronteras Bogotá.**

  Incluir 18:59/19:01, fin de mes/año y bisiesto. La conversión a timestamp produce un rango medio abierto estable.

- [ ] **Step 2: Migrar fechas de perfil sin parser ISO ambiguo.**

  Cambiar `User.birthDate` a `DateTime? @db.Date`; migrar datos por fecha civil, validar `UpdateUserDto` y usar `parseCivilDate` en `UsersService`. Ningún módulo construye `new Date(dateString)`.

- [ ] **Step 3: Normalizar readiness por día.**

  Deduplicar datos existentes antes de imponer único `(userId,date)`; recomendación solo lee check-in del día local actual.

- [ ] **Step 4: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- --runInBand src/common/dates src/modules/readiness
  npm.cmd run build
  ```

  Commit: `fix: normalizar fechas civiles y readiness diario`.

### Task 2: Completar contrato de consentimiento y CRUD del ciclo

**Files:**
- Modify: `EVRY-Backend/src/modules/cycle/cycle.controller.ts`
- Modify: `EVRY-Backend/src/modules/cycle/cycle.service.ts`
- Modify: `EVRY-Backend/src/modules/cycle/dto/cycle.dto.ts`
- Create: `EVRY-Backend/src/modules/cycle/dto/list-cycle-entries.dto.ts`
- Modify: `EVRY-Backend/src/modules/cycle/cycle.service.spec.ts`
- Create: `EVRY-Backend/test/cycle.integration-spec.ts`

**Routes:**

```text
GET    /api/cycle/entries?from=AAAA-MM-DD&to=AAAA-MM-DD
POST   /api/cycle/entries
DELETE /api/cycle/entries/:date
DELETE /api/cycle/data
GET    /api/cycle/phase/:date
```

**Estimate:**

```ts
type CycleEstimate = import('../../common/types/cycle-estimate').CycleEstimate;
```

- [ ] **Step 1: Escribir casos de opt-in y CRUD.**

  Sin consentimiento: lectura, escritura, borrado individual y fase rechazan. `DELETE /cycle/data` es la excepción deliberada: cualquier usuario autenticado puede borrar sus datos conservados aun con `trackCycle=false`. Con consentimiento: crear, editar moviendo fecha atómicamente, borrar una y borrar todas. Cubrir rango, futuro, propiedad y nulls.

- [ ] **Step 2: Aplicar una sola regla de fase.**

  El backend produce `CycleEstimate`; retirar caps de intensidad/volumen y mensajes hormonales deterministas. Si faltan inicios suficientes, devolver datos insuficientes en lugar de certeza.

- [ ] **Step 3: Implementar borrado y límites.**

  Rango máximo documentado para listado. `DELETE /data` solo borra ciclo, no perfil, funciona con seguimiento desactivado y es idempotente. Registrar auditoría técnica sin contenido sensible.

- [ ] **Step 4: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- --runInBand src/modules/cycle
  npm.cmd run test:integration -- --runInBand --testPathPattern=cycle
  npm.cmd run build
  ```

  Commit: `feat: completar diario de ciclo privado y editable`.

### Task 3: Añadir exportación y eliminación de cuenta

**Files:**
- Create: `EVRY-Backend/src/modules/privacy/privacy.module.ts`
- Create: `EVRY-Backend/src/modules/privacy/privacy.controller.ts`
- Create: `EVRY-Backend/src/modules/privacy/privacy.service.ts`
- Create: `EVRY-Backend/src/modules/privacy/privacy.service.spec.ts`
- Create: `EVRY-Backend/src/modules/privacy/dto/delete-account.dto.ts`
- Modify: `EVRY-Backend/src/modules/users/users.module.ts`
- Modify: `EVRY-Backend/src/modules/users/users.controller.ts`
- Modify: `EVRY-Backend/src/modules/users/users.service.ts`
- Modify: `EVRY-Backend/prisma/schema.prisma`
- Create: `EVRY-Backend/test/privacy.integration-spec.ts`
- Create: `EVRY-Backend/prisma/migrations/20260819160000_privacy_cascades/migration.sql`

**Routes:**

```text
GET    /api/users/me/export
DELETE /api/users/me
```

- [ ] **Step 1: Escribir una prueba de allowlist de exportación.**

  Incluir perfil, rutinas, sesiones/series, readiness y ciclo. Afirmar expresamente que no aparecen `passwordHash`, refresh tokens, secretos ni datos de otros usuarios.

- [ ] **Step 2: Auditar cascadas antes de cambiar schema.**

  Cuenta elimina tokens, ejercicios custom, rutinas, workouts/sets, stats, readiness y ciclo sin convertir ejercicios custom en globales. Antes de cambiar `Exercise.ownerId` a cascade, la migración detecta `WorkoutSet` o `RoutineExercise` de terceros que referencien ejercicios custom ajenos y aborta con IDs accionables; no borra ni reasigna esas filas silenciosamente. En el servicio, una transacción borra explícitamente en este orden: rutinas/relaciones del usuario, workouts/sets del usuario, estadísticas, readiness/ciclo/tokens, ejercicios custom propios y por último User. Solo entonces la FK owner puede usar cascade como red de seguridad. Probar preflight, orden completo, rollback y SQL real en PostgreSQL.

- [ ] **Step 3: Implementar descarga y confirmación fuerte.**

  Export JSON con versión/fecha. En esta versión, `DELETE /users/me` exige `DeleteAccountDto { currentPassword: string; confirmation: 'ELIMINAR' }`, ejecuta transacción, revoca cookies con opciones simétricas y devuelve 204; no dejar dos alternativas indefinidas.

- [ ] **Step 4: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- --runInBand src/modules/privacy src/modules/users
  npm.cmd run test:integration -- --runInBand --testPathPattern=privacy
  npm.cmd run build
  ```

  Commit: `feat: permitir exportar y eliminar datos personales`.

### Task 4: Refactorizar registro y login inclusivos

**Files:**
- Create: `EVRY/components/auth/AuthFrame.tsx`
- Create: `EVRY/components/auth/LoginForm.tsx`
- Create: `EVRY/components/auth/RegisterForm.tsx`
- Modify: `EVRY/app/(auth)/login/page.tsx`
- Modify: `EVRY/app/(auth)/register/page.tsx`
- Modify: `EVRY/lib/auth-store.ts`
- Modify: `EVRY/lib/types.ts`
- Create: `EVRY/components/auth/LoginForm.test.tsx`
- Create: `EVRY/components/auth/RegisterForm.test.tsx`
- Create: `EVRY/tests/a11y/auth.a11y.test.tsx`

**Contracts:**

```ts
type BiologicalSex = 'FEMALE' | 'MALE' | 'OTHER' | 'PREFER_NOT_SAY';
interface RegisterInput {
  name: string;
  email: string;
  password: string;
  biologicalSex: BiologicalSex;
  trackCycle: boolean;
}
```

- [ ] **Step 1: Probar opciones y consentimiento independiente.**

  `Prefiero no decirlo` se registra. El formulario inicializa `biologicalSex='PREFER_NOT_SAY'`; nunca envía `null` ni deja el contrato a decisión posterior. Cualquier persona puede activar ciclo tras leer explicación. Ningún copy promete metabolismo/recuperación por sexo.

- [ ] **Step 2: Compartir estructura y errores por campo.**

  Volver al menú visible, autocomplete correcto, `role=alert`, foco en primer error. Recordar usuario persiste solo email/flag; nunca contraseña.

- [ ] **Step 3: Probar recuperación de red/auth.**

  401 muestra credenciales inválidas; 429 informa espera; 5xx permite reintentar sin borrar campos; error de refresh no simula logout definitivo salvo 401/403.

- [ ] **Step 4: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- components/auth
  npm.cmd run test:a11y -- auth
  npm.cmd run type-check
  ```

  Commit: `feat: hacer inclusivo y recuperable el acceso`.

### Task 5: Completar perfil y controles de privacidad

**Files:**
- Refactor: `EVRY/app/(app)/profile/page.tsx`
- Create: `EVRY/components/profile/ProfileForm.tsx`
- Create: `EVRY/components/profile/CycleConsent.tsx`
- Create: `EVRY/components/profile/PrivacyActions.tsx`
- Create: `EVRY/components/profile/ProfileForm.test.tsx`
- Create: `EVRY/components/profile/PrivacyActions.test.tsx`
- Create: `EVRY/tests/a11y/profile.a11y.test.tsx`
- Modify: `EVRY/lib/types.ts`

**Interfaces:**

```ts
interface ProfilePatch {
  name?: string;
  biologicalSex?: BiologicalSex;
  trackCycle?: boolean;
  goals?: Meta[];
  avgCycleLen?: number;
  avgPeriodLen?: number;
}
```

- [ ] **Step 1: Probar éxito/error sin `Partial<Usuario>`.**

  Solo campos editables salen del formulario. Guardado confirma; error conserva cambios y ofrece retry. Habilitar/deshabilitar ciclo no depende de sexo. Validar `avgCycleLen` en 21–45 y `avgPeriodLen` en 1–10, preservando valores existentes si no se modifican.

- [ ] **Step 2: Implementar retención explícita.**

  Al desactivar, explicar que entradas se conservan hasta `Borrar datos del ciclo`; ofrecer esa acción separada con confirmación.

- [ ] **Step 3: Implementar export/delete.**

  Export descarga Blob JSON con nombre estable. Eliminar cuenta exige confirmación fuerte, maneja error y al éxito limpia estado local y navega a landing.

- [ ] **Step 4: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- components/profile
  npm.cmd run test:a11y -- profile
  npm.cmd run type-check
  ```

  Commit: `feat: añadir controles de privacidad al perfil`.

### Task 6: Dividir el diario y sincronizar calendario

**Files:**
- Refactor: `EVRY/app/(app)/cycle/page.tsx`
- Create: `EVRY/components/cycle/CycleSummary.tsx`
- Create: `EVRY/components/cycle/CycleEntryForm.tsx`
- Create: `EVRY/components/cycle/CycleEntryList.tsx`
- Create: `EVRY/components/cycle/ActivityCalendar.tsx`
- Replace: `EVRY/components/CalendarioActividad.tsx`
- Create: `EVRY/lib/cycle-events.ts`
- Create: `EVRY/components/cycle/CycleEntryForm.test.tsx`
- Create: `EVRY/components/cycle/ActivityCalendar.test.tsx`
- Create: `EVRY/tests/a11y/cycle.a11y.test.tsx`

**State:**

```ts
interface CycleEntryDraft {
  date: CivilDate;
  flow: Flow | null;
  symptoms: string[];
  energy: number | null;
  mood: number | null;
  notes: string;
  isPeriodStart: boolean;
}
```

- [ ] **Step 1: Probar nulos y sincronización.**

  Editar entrada con energy/mood null no los convierte en 3. Crear/mover/borrar emite invalidación y el mes visible se vuelve a consultar; los fallos permanecen como error, no “sin registros”.

- [ ] **Step 2: Implementar carga por mes.**

  Calendario consulta `GET /progress/activity?from&to` y `GET /cycle/entries?from&to` solo para `monthRange`; aborta ambas al cambiar mes. Leyenda distingue sesión, periodo, síntomas y estimación; cada día tiene etiqueta accesible.

- [ ] **Step 3: Implementar CRUD completo.**

  Fecha elegible, flujo/síntomas opcionales, edición, borrado con confirmación. Botones internos siempre `type="button"`. La fase mostrada viene del contrato único del backend.

- [ ] **Step 4: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- components/cycle lib/cycle-events.ts
  npm.cmd run test:a11y -- cycle
  npm.cmd run type-check
  ```

  Commit: `feat: sincronizar diario y calendario opcional`.

### Task 7: Concordancia y lenguaje seguro

**Files:**
- Modify: `EVRY/lib/motivacion.ts`
- Modify: `EVRY/app/(app)/dashboard/page.tsx`
- Modify: `EVRY/app/(app)/cycle/page.tsx`
- Create: `EVRY/lib/motivacion.test.ts`
- Create: `EVRY/docs/content/voice-and-safety.md`

- [ ] **Step 1: Probar pools masculino, femenino y neutral.**

  `OTHER` y `PREFER_NOT_SAY` usan neutral; no hay “perfecta o perfecto”. Reformular a lenguaje neutral cuando sea natural. Retirar frases de dolor, aguante extremo o transformaciones corporales prometidas.

- [ ] **Step 2: Etiquetar orientación.**

  Ciclo/readiness dicen estimación/contexto y recomiendan escuchar señales, sin afirmaciones clínicas.

- [ ] **Step 3: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- lib/motivacion.test.ts
  npm.cmd run type-check
  ```

  Commit: `fix: aplicar concordancia y lenguaje responsable`.

### Task 8: Puerta de privacidad e inclusión

**Files:**
- Create: `EVRY/tests/e2e/auth-profile.spec.ts`
- Create: `EVRY/tests/e2e/cycle-privacy.spec.ts`
- Modify: `EVRY/README.md`
- Modify: `EVRY-Backend/README.md`

- [ ] **Step 1: Automatizar registro, perfil y ciclo.**

  Desktop/móvil: registro con `Prefiero no decirlo`, opt-in independiente, login/refresh/logout, perfil con error y retry, export, crear/editar/mover/borrar entrada, desactivar/retener/borrar ciclo y eliminar cuenta de fixture.

- [ ] **Step 2: Inspeccionar privacidad.**

  Export no contiene campos prohibidos; usuario B no accede a datos A; después de borrar cuenta token/cookie no funcionan y no quedan filas huérfanas.

- [ ] **Step 3: Ejecutar puerta.**

  ```powershell
  cd EVRY-Backend
  npm.cmd run test:unit -- --runInBand
  npm.cmd run test:integration -- --runInBand
  npm.cmd run build
  cd ..\EVRY
  npm.cmd run test:unit
  npm.cmd run test:a11y
  npm.cmd run test:e2e -- tests/e2e/auth-profile.spec.ts tests/e2e/cycle-privacy.spec.ts
  npm.cmd run type-check
  npm.cmd run build
  ```

  Commits: `test: cubrir privacidad e inclusion`; `docs: explicar ciclo opcional y gestion de datos`.
