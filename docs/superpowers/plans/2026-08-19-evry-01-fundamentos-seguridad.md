# EVRY 01: fundamentos, contratos y seguridad

> Reemplazado por la hoja de ruta integral de mejora y optimización solicitada por el usuario. Se conserva como referencia histórica; consultar el estado vigente en `docs/operations/implementation-status.md`.

> **Para agentes de implementación:** SUB-SKILL OBLIGATORIA: usar `superpowers:subagent-driven-development` o `superpowers:executing-plans` y completar cada casilla en orden. Aplicar TDD con `superpowers:test-driven-development` y verificar antes de cerrar cada tarea.

**Goal:** Establecer una base verificable para EVRY: fechas civiles correctas, estados HTTP honestos, pruebas frontend/backend, configuración segura e invariantes de base de datos.

**Architecture:** El frontend tendrá una frontera HTTP única con errores normalizados y una utilidad de fecha civil sin conversiones UTC accidentales. El backend validará el entorno antes de arrancar, normalizará errores y aplicará límites de frecuencia. PostgreSQL impondrá los invariantes que no pueden depender de una comprobación `find-then-create`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Testing Library, axe-core, Playwright, NestJS 10, Prisma 5, PostgreSQL, Jest, Supertest.

**Spec:** `EVRY/docs/superpowers/specs/2026-08-19-evry-release-candidate-design.md`

## Global Constraints

- Ejecutar frontend y backend desde sus propios repositorios; no mezclar commits.
- No usar `new Date('AAAA-MM-DD')` ni `toISOString().slice(0, 10)` para fechas civiles.
- Ningún error de API puede convertirse en `[]`, `null`, `0` o un estado vacío sin conservar el error.
- No registrar secretos, contraseñas, refresh tokens ni datos del ciclo.
- No ejecutar limpiezas de integración contra `DATABASE_URL`; exigir una `TEST_DATABASE_URL` distinta.
- Ejecutar `type-check` y `build` del frontend secuencialmente; desarrollo usa `.next-dev` y producción `.next`.
- Cada tarea termina con pruebas en verde y un commit pequeño en el repositorio correspondiente.

---

### Task 1: Crear la base de pruebas y comandos no mutativos

**Files:**
- Modify: `EVRY/package.json`
- Create: `EVRY/vitest.config.ts`
- Create: `EVRY/vitest.a11y.config.ts`
- Create: `EVRY/vitest.setup.ts`
- Create: `EVRY/playwright.config.ts`
- Create: `EVRY/eslint.config.mjs`
- Create: `EVRY/.env.test.example`
- Create: `EVRY/tests/unit/smoke.test.ts`
- Create: `EVRY/tests/a11y/render-accessible.tsx`
- Create: `EVRY/tests/a11y/smoke.a11y.test.tsx`
- Modify: `EVRY-Backend/package.json`
- Create: `EVRY-Backend/eslint.config.mjs`
- Create: `EVRY-Backend/.env.test.example`
- Create: `EVRY-Backend/test/jest-integration.json`
- Create: `EVRY-Backend/test/guard-test-database.ts`
- Create: `EVRY-Backend/scripts/migrate-test-database.ts`
- Create: `EVRY-Backend/test/app.integration-spec.ts`

**Interfaces:**

```ts
export function assertSafeTestDatabase(
  testUrl: string | undefined,
  runtimeUrl: string | undefined,
): string;
```

- [ ] **Step 1: Escribir las pruebas de humo que inicialmente fallen.**

  En frontend, comprobar que Vitest ejecuta con `TZ=America/Bogota` y dispone de matchers de `@testing-library/jest-dom`. En backend, probar que el guard rechaza URL ausente, igual a producción o sin una señal explícita de base de pruebas.

- [ ] **Step 2: Instalar dependencias compatibles con Node 24.14.**

  Instalar con lockfile y versiones exactas:

  ```powershell
  cd EVRY
  npm.cmd install --save-dev --save-exact eslint@9.39.1 eslint-config-next@15.1.6 vitest@4.1.11 @vitejs/plugin-react@6.0.5 vite-tsconfig-paths@6.1.1 jsdom@29.1.1 @testing-library/react@16.3.2 @testing-library/user-event@14.6.5 @testing-library/jest-dom@7.0.1 vitest-axe@0.1.0 @playwright/test@1.62.1 @axe-core/playwright@4.13.0
  npx.cmd playwright install chromium
  cd ..\EVRY-Backend
  npm.cmd install --save-dev --save-exact supertest@7.2.2 @types/supertest@7.2.1 eslint@9.39.1 @eslint/js@9.39.1 typescript-eslint@8.57.0
  ```

  `jsdom@29.1.1` es compatible con Node 24.14; no instalar `jsdom@30`, que exige Node 24.15.

- [ ] **Step 3: Definir scripts reproducibles.**

  Definir exactamente:

  ```json
  // EVRY/package.json
  {
    "lint": "eslint . --max-warnings 0",
    "test": "npm run test:unit && npm run test:a11y",
    "test:unit": "vitest run --exclude tests/a11y/**",
    "test:a11y": "vitest run --config vitest.a11y.config.ts",
    "test:e2e": "playwright test"
  }
  // EVRY-Backend/package.json
  {
    "lint:check": "eslint \"{src,test,scripts}/**/*.ts\" --max-warnings 0",
    "lint:fix": "eslint \"{src,test,scripts}/**/*.ts\" --fix",
    "test:unit": "jest --runInBand",
    "test:integration": "jest --config test/jest-integration.json --runInBand",
    "test:db:migrate": "ts-node scripts/migrate-test-database.ts"
  }
  ```

  `migrate-test-database.ts` llama `assertSafeTestDatabase` antes de invocar Prisma; ningún comando de prueba asigna `DATABASE_URL` directamente sin ese guard.

- [ ] **Step 4: Configurar los runners.**

  Vitest general usa `environment: 'jsdom'`, setup global y alias `@`. `vitest.a11y.config.ts` incluye `tests/a11y/**/*.a11y.test.tsx`; cada flujo crea allí una suite para que los filtros posicionales (`auth`, `workout`, etc.) sean ejecutables. Playwright inicia frontend/backend mediante dos `webServer` con `cwd` derivados de su archivo, usa desktop + móvil y fija `timezoneId: 'America/Bogota'`. El backend recibe `NODE_ENV=test`, `PORT=4000`, `APP_TIME_ZONE=America/Bogota`, dos secretos fijos y distintos exclusivos de test, `SWAGGER_ENABLED=false` y `DATABASE_URL=process.env.TEST_DATABASE_URL`; la configuración aborta si falta o coincide con la URL normal. Jest integración carga `guard-test-database.ts` antes de tocar Prisma.

- [ ] **Step 5: Ejecutar y versionar.**

  ```powershell
  cd EVRY
  npm.cmd run lint
  npm.cmd run type-check
  npm.cmd run test:unit
  cd ..\EVRY-Backend
  npm.cmd run lint:check
  npm.cmd run test:unit -- --runInBand
  ```

  Commit frontend: `test: establecer base de pruebas de interfaz`.
  Commit backend: `test: establecer base de pruebas de integracion`.

### Task 2: Unificar fechas civiles en frontend

**Files:**
- Create: `EVRY/lib/civil-date.ts`
- Create: `EVRY/lib/civil-date.test.ts`
- Modify: `EVRY/lib/utils.ts`
- Modify: `EVRY/app/(app)/cycle/page.tsx`
- Modify: `EVRY/app/(app)/dashboard/page.tsx`
- Modify: `EVRY/components/CalendarioActividad.tsx`
- Modify: `EVRY/components/ReadinessCheckin.tsx`

**Interfaces:**

```ts
export type CivilDate = string & { readonly __civilDate: unique symbol };
export type PeriodKey = '30d' | '90d' | '6m' | '1y' | 'all';
export function civilDate(value: string): CivilDate;
export function todayCivil(now?: Date): CivilDate;
export function parseCivilDate(value: CivilDate): { year: number; month: number; day: number };
export function formatCivilDate(value: CivilDate, options?: Intl.DateTimeFormatOptions): string;
export function timestampToLocalCivil(iso: string): CivilDate;
export function monthRange(year: number, month: number): { from: CivilDate; to: CivilDate };
export function periodRange(period: Exclude<PeriodKey, 'all'>, now?: Date): { from: CivilDate; to: CivilDate };
export function compareCivil(a: CivilDate, b: CivilDate): number;
```

- [ ] **Step 1: Escribir casos de frontera.**

  Fijar Bogotá y comprobar 18:59/19:01, 29 de febrero, cambio de mes/año, formato de `2026-08-01` sin desplazarse al 31 de julio, rangos 30/90 días y 6/12 meses.

- [ ] **Step 2: Implementar funciones puras por componentes.**

  Validar con expresión regular + calendario real; construir fechas de presentación a mediodía local solo dentro de la utilidad. `to` será inclusivo para filtros de calendario y se convertirá a límite exclusivo en el backend.

- [ ] **Step 3: Reemplazar todos los usos inseguros.**

  Buscar `toISOString().slice`, `new Date(` con cadenas de fecha y `slice(0, 10)`. Los timestamps de entrenamientos sí se convierten con zona local; las fechas civiles nunca pasan por UTC.

- [ ] **Step 4: Ejecutar regresión y commit.**

  ```powershell
  npm.cmd run test:unit -- lib/civil-date.test.ts
  npm.cmd run type-check
  ```

  Commit: `fix: unificar fechas civiles en zona local`.

### Task 3: Crear fechas civiles y tipos compartidos en backend

**Files:**
- Create: `EVRY-Backend/src/common/dates/civil-date.ts`
- Create: `EVRY-Backend/src/common/dates/civil-date.spec.ts`
- Create: `EVRY-Backend/src/common/types/cycle-estimate.ts`

**Interfaces:**

```ts
export type CivilDate = `${number}-${number}-${number}`;
export function parseCivilDate(value: string): Date;
export function formatCivilDate(value: Date): CivilDate;
export function todayCivilDate(timeZone?: 'America/Bogota', now?: Date): CivilDate;
export function assertCivilDateRange(from: CivilDate, to: CivilDate, today: CivilDate): void;
export function civilDateBounds(value: CivilDate, timeZone?: 'America/Bogota'): { from: Date; toExclusive: Date };

export type CycleEstimate =
  | {
      status: 'ESTIMATE';
      phase: CyclePhase;
      cycleDay: number;
      cycleLengthDays: number;
      nextPeriodDate: CivilDate;
      basedOnPeriodStarts: number;
      explanation: string;
    }
  | {
      status: 'INSUFFICIENT_DATA';
      basedOnPeriodStarts: number;
      explanation: string;
    };
```

- [ ] **Step 1: Escribir casos de zona y calendario.**

  Probar fecha imposible, bisiesto, futuro/rango invertido y límites Bogotá a las 18:59/19:01, fin de mes y fin de año. `civilDateBounds` siempre produce un intervalo medio abierto de un día local.

- [ ] **Step 2: Implementar parseo por componentes.**

  No delegar una fecha civil a `new Date(string)`. Validar round-trip y usar una sola configuración `APP_TIME_ZONE` para periodos, readiness, ciclo y progreso.

- [ ] **Step 3: Definir el tipo de estimación sin lógica hormonal.**

  El tipo compartido solo describe incertidumbre y evidencia; la regla concreta se implementa en ciclo. No incluir caps o multiplicadores de carga.

- [ ] **Step 4: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- --runInBand src/common/dates
  npm.cmd run build
  ```

  Commit: `feat: establecer fechas civiles en backend`.

### Task 4: Normalizar la frontera HTTP y los estados remotos

**Files:**
- Modify: `EVRY/lib/api.ts`
- Create: `EVRY/lib/api.test.ts`
- Create: `EVRY/lib/remote-data.ts`
- Create: `EVRY/lib/remote-data.test.ts`
- Modify: `EVRY/lib/auth-store.ts`
- Modify: `EVRY/lib/types.ts`
- Modify: `EVRY/app/(app)/layout.tsx`

**Interfaces:**

```ts
export interface ApiFailure {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
  fieldErrors?: Record<string, string[]>;
  details?: unknown;
}
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };
export type RemoteData<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; error: ApiFailure; staleData?: T }
  | { status: 'empty'; data: T }
  | { status: 'success'; data: T };
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}
export function request<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>>;
export function requestOrThrow<T>(path: string, options?: RequestOptions): Promise<T>;
```

- [ ] **Step 1: Probar éxito, JSON inválido, 401, 429, 500, timeout y cancelación externa.**

  La prueba debe demostrar primero que el `signal` del consumidor no cancela hoy el fetch. Asegurar que timeout y signal se compongan y que una cancelación intencional no se muestre como error reintentable.

- [ ] **Step 2: Implementar el contrato discriminado.**

  Extraer `code` y mensaje seguro del backend, clasificar `retryable` solo para timeout/429/5xx/red, y conservar `requestOrThrow` únicamente donde Zustand o una mutación requieran excepciones.

- [ ] **Step 3: Migrar auth-store sin cambiar el contrato visible.**

  Modelar auth como `checking | authenticated | anonymous | error`. Renovación y login limpian credenciales solo ante 401/403; un fallo temporal en `/users/me` mantiene la sesión conocida o muestra recuperación y nunca redirige automáticamente al login. El layout autenticado espera `checking` y representa `error`. Recordar usuario solo persiste email y flag.

- [ ] **Step 4: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- lib/api.test.ts lib/remote-data.test.ts
  npm.cmd run type-check
  ```

  Commit: `refactor: normalizar respuestas y errores de api`.

### Task 5: Validar el entorno y endurecer autenticación

**Files:**
- Modify: `EVRY-Backend/.env.example`
- Modify: `EVRY-Backend/src/app.module.ts`
- Modify: `EVRY-Backend/src/main.ts`
- Create: `EVRY-Backend/src/config/environment.ts`
- Create: `EVRY-Backend/src/config/environment.spec.ts`
- Create: `EVRY-Backend/src/modules/auth/refresh-cookie.ts`
- Create: `EVRY-Backend/src/modules/auth/refresh-cookie.spec.ts`
- Modify: `EVRY-Backend/src/modules/auth/auth.controller.ts`
- Modify: `EVRY-Backend/src/modules/auth/auth.service.ts`
- Modify: `EVRY-Backend/src/modules/auth/jwt.strategy.ts`
- Modify: `EVRY-Backend/src/modules/auth/dto/login.dto.ts`
- Modify: `EVRY-Backend/src/modules/auth/dto/register.dto.ts`

**Interfaces:**

```ts
export interface RuntimeConfig {
  databaseUrl: string;
  jwtSecret: string;
  refreshSecret: string;
  port: number;
  swaggerEnabled: boolean;
}
export function validateEnvironment(env: Record<string, unknown>): Record<string, unknown>;
export function refreshCookieOptions(expiresAt?: Date): CookieOptions;
```

- [ ] **Step 1: Escribir fallos de configuración.**

  Rechazar secretos ausentes, `dev-secret`, secretos iguales o menores al mínimo documentado, URL Prisma ausente y puerto inválido. Probar que crear/borrar cookie comparte `httpOnly`, `sameSite`, `secure` y `path: '/api/auth'`.

- [ ] **Step 2: Eliminar todos los fallbacks inseguros.**

  Configurar `ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment })`; AuthService y estrategia solo leen valores ya validados. Swagger se habilita por configuración, no incondicionalmente.

- [ ] **Step 3: Añadir rate limiting.**

  Instalar `@nestjs/throttler@6.5.0`, registrar guard global y límites específicos más estrictos para `login`, `register` y `refresh`. Añadir respuesta 429 normalizada y `Retry-After` cuando esté disponible.

- [ ] **Step 4: Acotar DTO y mensajes.**

  Email normalizado, nombre/contraseña con límites máximos, `whitelist` + `forbidNonWhitelisted`. Nunca distinguir email existente de usuario inexistente en login.

- [ ] **Step 5: Ejecutar y commit.**

  ```powershell
  npm.cmd run test:unit -- --runInBand src/config src/modules/auth
  npm.cmd run lint:check
  npm.cmd run build
  ```

  Commit: `fix: endurecer configuracion y autenticacion`.

### Task 6: Corregir conexión, errores Prisma e invariantes de concurrencia

**Files:**
- Modify: `EVRY-Backend/src/prisma/prisma.service.ts`
- Modify: `EVRY-Backend/src/common/filters/prisma-connection-exception.filter.ts`
- Create: `EVRY-Backend/src/common/filters/prisma-exception.filter.ts`
- Create: `EVRY-Backend/src/common/filters/prisma-exception.filter.spec.ts`
- Modify: `EVRY-Backend/prisma/schema.prisma`
- Create: `EVRY-Backend/prisma/migrations/20260819090000_release_invariants/migration.sql`
- Modify: `EVRY-Backend/src/modules/workouts/dto/workout.dto.ts`

**Schema contract:**

```prisma
model Workout {
  cancelledAt DateTime?
  @@index([userId, endedAt(sort: Desc), id])
}

model WorkoutSet {
  clientMutationId String?
  techniqueStable Boolean?
  @@unique([workoutId, clientMutationId])
  @@index([exerciseId, workoutId, completedAt(sort: Desc)])
}
```

La migración añade además un índice único parcial SQL sobre `Workout("userId") WHERE "endedAt" IS NULL AND "cancelledAt" IS NULL`, y un índice de consulta sobre `Workout(userId, endedAt DESC, id)`.

- [ ] **Step 1: Probar el mapeo de P2002/P2003/P2025/P1001.**

  Esperar 409 para duplicados, 400/409 para referencias inválidas según contrato, 404 para registro ausente y 503 reintentable para conexión. Mensajes internos y SQL no salen al cliente.

- [ ] **Step 2: Hacer fail-fast de Prisma.**

  No suprimir `$connect`; el backend no debe anunciar salud si la base no está disponible.

- [ ] **Step 3: Migrar invariantes sin perder datos.**

  Antes de crear el índice parcial, producir un reporte SQL de sesiones activas duplicadas. Conservar abierta la más reciente y marcar las anteriores con `cancelledAt`, sin borrar workouts ni sets. Añadir `clientMutationId` y `techniqueStable` nullable para compatibilidad; validar mutation ID como UUID en nuevas series.

- [ ] **Step 4: Aplicar y verificar en base de prueba.**

  ```powershell
  npm.cmd run test:db:migrate
  npx.cmd prisma generate
  npm.cmd run test:integration -- --runInBand
  npm.cmd run build
  ```

  Commit: `fix: imponer invariantes de datos y errores prisma`.

### Task 7: Puerta de fundamentos

**Files:**
- Modify: `EVRY/README.md`
- Modify: `EVRY-Backend/README.md`
- Create: `EVRY/docs/quality/fundamentos.md`

- [ ] **Step 1: Documentar variables, scripts y fecha civil.**

  Incluir ejemplos sin secretos, base de prueba aislada, matriz de estados remotos y regla de no mezclar `.next-dev`/`.next`.

- [ ] **Step 2: Ejecutar la puerta completa.**

  ```powershell
  cd EVRY-Backend
  npm.cmd run lint:check
  npm.cmd run test:unit -- --runInBand
  npm.cmd run test:integration -- --runInBand
  npm.cmd run build
  cd ..\EVRY
  npm.cmd run lint
  npm.cmd run test:unit
  npm.cmd run type-check
  npm.cmd run build
  ```

- [ ] **Step 3: Revisar estados y commit.**

  Confirmar que `.env`, `dist`, `.next`, `.next-dev`, coverage y artefactos de Playwright no están staged. Commit frontend: `docs: documentar fundamentos verificables`; backend: `docs: documentar configuracion segura`.
