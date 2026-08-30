# EVRY 02: entrenamiento, progreso y ficha transversal

> Reemplazado por la hoja de ruta integral de mejora y optimización solicitada por el usuario. Se conserva como referencia histórica; consultar el estado vigente en `docs/operations/implementation-status.md`.

> **Para agentes de implementación:** SUB-SKILL OBLIGATORIA: usar `superpowers:subagent-driven-development` o `superpowers:executing-plans`. Aplicar TDD y completar este plan después de `EVRY 01`.

**Goal:** Convertir el núcleo de entrenamiento en un flujo transaccional e idempotente, mostrar progreso real y ofrecer una ficha reutilizable para los 1.324 ejercicios desde selector, rutina, sesión, dashboard y progreso.

**Architecture:** PostgreSQL es la fuente de verdad de sesiones y métricas. El backend valida visibilidad, pagina por sesión y calcula récords desde series finalizadas. El frontend conserva el contexto mediante un proveedor global de detalle; usa JPG en listas y descarga el GIF solo por acción explícita.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Jest/Supertest, Next.js/React, Recharts diferido, Vitest/Testing Library/axe, Playwright.

**Spec:** `EVRY/docs/superpowers/specs/2026-08-19-evry-release-candidate-design.md`

## Global Constraints

- Requiere que el plan `01-fundamentos-seguridad` esté verde y su migración aplicada en la base de prueba.
- Un ejercicio visible es global no personalizado (`ownerId=null`, `isCustom=false`) o personalizado propio.
- Una sesión finalizada es inmutable en la experiencia normal; toda corrección administrativa futura debe reconstruir estadísticas en la misma transacción.
- `clientMutationId` hace idempotente cada alta de serie.
- Progreso excluye sesiones activas, canceladas y series de calentamiento.
- Las listas nunca solicitan GIF; las gráficas no se cargan antes de visitar Progreso.
- Los datos del dataset y medios conservan atribución Gym Visual; no generar indicaciones sustitutas cuando ya existen 1.324 traducciones españolas.

---

### Task 1: Centralizar visibilidad y reemplazo transaccional de rutinas

**Files:**
- Create: `EVRY-Backend/src/modules/exercises/exercise-visibility.ts`
- Create: `EVRY-Backend/src/modules/exercises/exercise-visibility.spec.ts`
- Modify: `EVRY-Backend/src/modules/exercises/exercises.service.ts`
- Modify: `EVRY-Backend/src/modules/exercises/exercises.module.ts`
- Modify: `EVRY-Backend/src/modules/routines/routines.service.ts`
- Modify: `EVRY-Backend/src/modules/routines/routines.service.spec.ts`
- Modify: `EVRY-Backend/src/modules/routines/dto/routine.dto.ts`

**Interfaces:**

```ts
export type ExerciseReader = Pick<Prisma.TransactionClient, 'exercise'>;
export function visibleExerciseWhere(userId: string): Prisma.ExerciseWhereInput;
export async function assertExercisesVisible(
  db: Pick<Prisma.TransactionClient, 'exercise'>,
  userId: string,
  exerciseIds: readonly string[],
): Promise<void>;
export async function findVisibleExerciseOrThrow(db: ExerciseReader, userId: string, id: string): Promise<Exercise>;
```

- [ ] **Step 1: Escribir pruebas de global, propio, ajeno, huérfano e IDs repetidos.**

  Ajeno e inexistente devuelven 404 indistinguible. Un custom con `ownerId=null` no se vuelve global. Rutina rechaza duplicados de ejercicio y planes de serie inválidos.

- [ ] **Step 2: Implementar el predicado único.**

  Reutilizarlo en listado, detalle, rutina, sets y progreso. No copiar condiciones `OR` en servicios independientes.

- [ ] **Step 3: Hacer create/update de rutina atómicos.**

  Dentro de `$transaction`: comprobar propietario de rutina, validar todos los ejercicios, actualizar cabecera, borrar relaciones anteriores y crear el nuevo orden/`seriesPlan`. Una excepción deja intacta la rutina anterior.

- [ ] **Step 4: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- --runInBand src/modules/exercises/exercise-visibility.spec.ts src/modules/routines/routines.service.spec.ts
  npm.cmd run build
  ```

  Commit: `fix: proteger y actualizar rutinas de forma atomica`.

### Task 2: Hacer idempotente y completa la sesión activa

**Files:**
- Modify: `EVRY-Backend/prisma/schema.prisma`
- Modify: `EVRY-Backend/src/modules/workouts/servicio-sesion-activa.ts`
- Modify: `EVRY-Backend/src/modules/workouts/servicio-sesion-activa.spec.ts`
- Modify: `EVRY-Backend/src/modules/workouts/workouts.controller.ts`
- Modify: `EVRY-Backend/src/modules/workouts/workouts.service.ts`
- Modify: `EVRY-Backend/src/modules/workouts/workouts.module.ts`
- Modify: `EVRY-Backend/src/modules/workouts/workouts.service.spec.ts`
- Modify: `EVRY-Backend/src/modules/workouts/dto/workout.dto.ts`
- Create: `EVRY-Backend/src/modules/workouts/exercise-stats.service.ts`
- Create: `EVRY-Backend/src/modules/workouts/exercise-stats.service.spec.ts`
- Create: `EVRY-Backend/prisma/migrations/20260819130000_exercise_stat_records/migration.sql`
- Create: `EVRY-Backend/test/workouts.integration-spec.ts`

**Interfaces:**

```ts
export interface StartWorkoutInput {
  name: string;
  notes?: string;
  routineId?: string;
}
export interface CreateSetInput {
  clientMutationId: string;
  exerciseId: string;
  order: number;
  weightKg?: number;
  reps?: number;
  durationS?: number;
  rpe?: number;
  techniqueStable?: boolean;
  isWarmup?: boolean;
}
export interface UpdateSetInput {
  weightKg?: number | null;
  reps?: number | null;
  durationS?: number | null;
  rpe?: number | null;
  techniqueStable?: boolean | null;
  isWarmup?: boolean;
}
export interface WorkoutSetResponse {
  id: string;
  clientMutationId: string | null;
  exerciseId: string;
  order: number;
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  rpe: number | null;
  techniqueStable: boolean | null;
  isWarmup: boolean;
  completedAt: string;
}
export interface WorkoutDetail {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  cancelledAt: string | null;
  sets: WorkoutSetResponse[];
}
export function startOrResume(userId: string, input: StartWorkoutInput): Promise<WorkoutDetail>;
export function cancel(userId: string, workoutId: string): Promise<void>;
export function rebuildExerciseStats(tx: Prisma.TransactionClient, userId: string, exerciseIds: readonly string[]): Promise<void>;
```

**Routes:** `POST /api/workouts`, `POST /api/workouts/:id/sets`, `PATCH /api/workouts/sets/:setId`, `DELETE /api/workouts/sets/:setId`, `POST /api/workouts/:id/cancel`, `POST /api/workouts/:id/finish` y `DELETE /api/workouts/:id`.

- [ ] **Step 1: Escribir carreras y reglas antes de implementar.**

  Cubrir dos inicios simultáneos, dos POST con igual mutation ID, set ajeno, update/delete tras finalizar, cancelar, finalizar vacío, doble finalización y fallo de stats. La expectativa es una sesión, una serie y una agregación.

- [ ] **Step 2: Completar el esquema de integridad.**

  Usar `Workout.cancelledAt`, `WorkoutSet.clientMutationId`, `techniqueStable` e índices creados por el plan 01. Añadir a `ExerciseStat`: `bestWeightAt DateTime?`, `bestRepsWeightKg Float?`, `bestRepsAt DateTime?`, `estimated1RMAt DateTime?`, `estimated1RMWeightKg Float?` y `estimated1RMReps Int?`. La migración contiene un CTE SQL idempotente que recalcula todas las filas desde sesiones finalizadas; no depende de ejecutar después un servicio de aplicación.

- [ ] **Step 3: Implementar inicio y alta idempotentes.**

  Intentar crear y capturar P2002 para devolver la activa existente. `addSet` busca/crea por `(workoutId, clientMutationId)` y devuelve la fila definitiva; no incrementa estadísticas todavía.

- [ ] **Step 4: Implementar edición, borrado, cancelación y finalización.**

  PATCH/DELETE de sets solo en sesión activa. Una serie útil cumple `reps > 0 || durationS > 0`; peso aislado no permite finalizar. Cancelar una activa fija `cancelledAt` y no genera progreso. Finalizar, dentro de transacción serializable, fija `endedAt` y reconstruye stats; un reintento devuelve la misma sesión finalizada. `DELETE /workouts/:id` permite eliminar una sesión histórica con confirmación desde UI y, en una transacción, elimina el workout y reconstruye stats de sus ejercicios; no se usa para cancelar una activa.

- [ ] **Step 5: Reconstruir, no incrementar.**

  `rebuildExerciseStats` deriva sesiones, mejor carga, récord de reps con su peso, 1RM Epley y fechas desde sesiones finalizadas; evita drift después de operaciones compuestas.

- [ ] **Step 6: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- --runInBand src/modules/workouts
  npm.cmd run test:integration -- --runInBand --testPathPattern=workouts
  npm.cmd run build
  ```

  Commit: `feat: completar sesiones idempotentes y estadisticas`.

### Task 3: Reescribir progreso y la ficha en backend

**Files:**
- Create: `EVRY-Backend/src/modules/progress/dto/exercise-progress-query.dto.ts`
- Create: `EVRY-Backend/src/modules/progress/dto/overview-query.dto.ts`
- Create: `EVRY-Backend/src/modules/progress/dto/activity-query.dto.ts`
- Create: `EVRY-Backend/src/modules/progress/progress.types.ts`
- Create: `EVRY-Backend/src/modules/progress/progress-period.ts`
- Create: `EVRY-Backend/src/modules/progress/progress-period.spec.ts`
- Create: `EVRY-Backend/src/modules/progress/metrics.ts`
- Create: `EVRY-Backend/src/modules/progress/metrics.spec.ts`
- Create: `EVRY-Backend/src/modules/progress/progress.repository.ts`
- Modify: `EVRY-Backend/src/modules/progress/progress.controller.ts`
- Modify: `EVRY-Backend/src/modules/progress/progress.service.ts`
- Modify: `EVRY-Backend/src/modules/progress/progress.service.spec.ts`
- Modify: `EVRY-Backend/src/modules/progress/progress.module.ts`
- Modify: `EVRY-Backend/src/modules/exercises/exercises.controller.ts`
- Modify: `EVRY-Backend/src/modules/exercises/exercises.service.spec.ts`
- Modify: `EVRY-Backend/src/media/exercise-media.middleware.ts`
- Create: `EVRY-Backend/src/media/exercise-media.middleware.spec.ts`
- Modify: `EVRY-Backend/src/main.ts`
- Modify: `EVRY-Backend/src/main.spec.ts`
- Modify: `EVRY-Backend/scripts/verify-exercise-assets.ts`
- Create: `EVRY-Backend/test/progress.integration-spec.ts`
- Create: `EVRY-Backend/test/media.integration-spec.ts`

**Endpoints:**

```http
GET /api/progress/exercise/:id?period=30d|90d|6m|1y|all&page=1&limit=10
GET /api/progress/overview?period=30d
GET /api/progress/activity?from=AAAA-MM-DD&to=AAAA-MM-DD
```

**Response:**

```ts
type ProgressPeriod = '30d' | '90d' | '6m' | '1y' | 'all';
interface PeriodMetrics {
  sessionsCount: number;
  workingSetsCount: number;
  volumeKg: number;
  bestWeightKg: number | null;
  estimated1RMKg: number | null;
}
interface ExerciseProgressPoint {
  workoutId: string;
  workoutName: string;
  completedAt: string;
  maxWeightKg: number | null;
  estimated1RMKg: number | null;
  volumeKg: number;
}
interface ExerciseHistorySet {
  id: string;
  order: number;
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  rpe: number | null;
  completedAt: string;
}
interface ExerciseHistorySession {
  workoutId: string;
  workoutName: string;
  startedAt: string;
  endedAt: string;
  sets: ExerciseHistorySet[];
}
interface ExerciseProgressResponse {
  exerciseId: string;
  period: { key: ProgressPeriod; from: CivilDate | null; to: CivilDate; timezone: 'America/Bogota' };
  summary: {
    sessionsCount: number;
    workingSetsCount: number;
    volumeKg: number;
    bestWeight: { weightKg: number; achievedAt: string; workoutId: string } | null;
    repetitionRecord: { reps: number; weightKg: number | null; achievedAt: string; workoutId: string } | null;
    estimated1RM: { valueKg: number; weightKg: number; reps: number; achievedAt: string; workoutId: string; formula: 'EPLEY' } | null;
  };
  comparison: null | {
    period: { from: CivilDate; to: CivilDate };
    previous: PeriodMetrics;
    delta: PeriodMetrics;
  };
  points: ExerciseProgressPoint[];
  history: { items: ExerciseHistorySession[]; page: number; limit: number; total: number; hasMore: boolean };
}
interface OverviewMetrics {
  sessionsCompleted: number;
  volumeKg: number;
  activeDays: number;
  weeklyFrequency: number;
}
interface ProgressOverviewResponse {
  period: { key: '30d'; from: CivilDate; to: CivilDate; timezone: 'America/Bogota' };
  summary: OverviewMetrics;
  comparison: { previous: OverviewMetrics; delta: OverviewMetrics };
  records: Array<{ exerciseId: string; exerciseName: string; kind: 'WEIGHT' | 'REPS' | 'ESTIMATED_1RM'; value: number; achievedAt: string }>;
  muscleDistribution: Array<{ muscleGroup: MuscleGroup; workingSets: number; percentage: number }>;
}
interface ProgressActivityResponse {
  from: CivilDate;
  to: CivilDate;
  days: Array<{
    date: CivilDate;
    sessions: Array<{ id: string; name: string; endedAt: string; volumeKg: number }>;
  }>;
}
```

- [ ] **Step 1: Probar periodos, métricas, filtros y paginación.**

  Dataset controlado donde mejor carga, mejor 1RM y máximo de repeticiones pertenecen a series distintas. Cubrir empates recientes, peso corporal, warmups, sesión activa/cancelada, otro usuario, vacío, 30d/90d/6m/1y/all, `all` con comparación `null`, comparación anterior y página por workout sin partir series.

- [ ] **Step 2: Implementar métricas puras y DTO acotado.**

  Defaults `30d,1,10`; `page>=1`; `1<=limit<=25`; parámetros desconocidos se rechazan. `progress-period.ts` importa `CivilDate`/bounds desde `EVRY-Backend/src/common/dates/civil-date.ts`, creados en el Task 3 del plan 01; no importa código del frontend. Con zona Bogotá convierte 30/90 días o resta calendaria 6/12 meses a `[fromInclusive,toExclusive)`, exponiendo `to` civil inclusivo. Probar 18:59/19:01, febrero, fin de mes/año. Epley solo con peso/reps positivos. Redondear al serializar, no para comparar.

- [ ] **Step 3: Agregar en PostgreSQL.**

  Usar SQL parametrizado/Prisma para `eligible_sets`, puntos por sesión y récords con desempate reciente. Paginar primero workouts y luego incluir sus series mínimas. `overview` de 30 días también se agrega en DB y nombra explícitamente el periodo. `activity` valida `from<=to`, máximo 62 días y selecciona solo id/nombre/fin/volumen agrupado; será la única fuente del calendario por mes.

- [ ] **Step 4: Verificar visibilidad y semántica HTTP.**

  401 sin token, 400 query inválida, 404 tanto ajeno como inexistente, 200 con ceros/nulls si visible sin sesiones. Nunca devolver error como historial vacío.

- [ ] **Step 5: Corregir medios.**

  Permitir fetch CORS, exponer `Content-Length, ETag`, ETag/caché revalidable y retirar `immutable` de nombres mutables. Probar origen permitido, 304, ausencia de immutable, confinamiento y 404. Ampliar `exercises:verify` para confirmar 1.324 JPG/GIF de 180×180, instrucciones españolas de 4–11 pasos y atribución exacta `© Gym visual — https://gymvisual.com/`.

- [ ] **Step 6: Medir índices y commit.**

  Crear fixture grande de prueba, ejecutar `EXPLAIN ANALYZE` sobre consulta central y documentar el plan. Luego:

  ```powershell
  npm.cmd run test:unit -- --runInBand src/modules/progress src/modules/exercises src/media src/main.spec.ts
  npm.cmd run test:integration -- --runInBand --testPathPattern="progress|media"
  npm.cmd run build
  ```

  Commit: `feat: calcular progreso real y paginado por ejercicio`.

### Task 4: Corregir el motor adaptativo

**Files:**
- Modify: `EVRY-Backend/src/modules/adaptive/adaptive.service.ts`
- Modify: `EVRY-Backend/src/modules/adaptive/adaptive.controller.ts`
- Create: `EVRY-Backend/src/modules/adaptive/adaptive.service.spec.ts`
- Modify: `EVRY-Backend/src/modules/readiness/readiness.service.ts`
- Create: `EVRY-Backend/src/modules/readiness/readiness.service.spec.ts`
- Modify: `EVRY/lib/types.ts`
- Modify: `EVRY/app/(app)/workout/[id]/page.tsx`

**Interfaces:**

```ts
type RecommendationAction = 'MANTENER' | 'PROGRESAR' | 'REDUCIR' | 'DATOS_INSUFICIENTES';
interface Recommendation {
  exerciseId: string;
  action: RecommendationAction;
  targetWeightKg: number | null;
  targetReps: number | null;
  evidence: Array<{ code: string; message: string; value?: string | number | boolean }>;
  cycleContext?: CycleEstimate;
}
```

- [ ] **Step 1: Escribir tabla de decisión.**

  Definir como comparables las dos sesiones finalizadas más recientes del mismo ejercicio, dentro de 42 días, con al menos una serie de trabajo y mediana de repeticiones a ±2. Menos de dos => `DATOS_INSUFICIENTES`. Readiness de hoy `<40` o dos sesiones con mediana RPE `>=9`/técnica inestable => `REDUCIR`. Dos sesiones con técnica estable, mediana RPE `6..8`, carga no descendente y readiness de hoy `>=60` => `PROGRESAR`. El resto => `MANTENER`; readiness de otro día no participa.

- [ ] **Step 2: Eliminar reglas contradictorias y hormonales.**

  Retirar `targetReps = lastReps` usado como umbral, caps/multiplicadores por fase y lenguaje prescriptivo. `PROGRESAR` sugiere como máximo 2,5% de carga redondeada a 0,5 kg, o una repetición si es peso corporal; nunca cambia la sesión automáticamente. `REDUCIR` no prescribe un número: devuelve targets `null` y evidencia. El ciclo puede adjuntarse como contexto, jamás decide la acción. Migrar `Recomendacion` frontend desde `confidence/rationale` a `action/target/evidence/cycleContext` y probar el render.

- [ ] **Step 3: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- --runInBand src/modules/adaptive src/modules/readiness
  npm.cmd run build
  ```

  Commit: `fix: hacer conservadora la orientacion adaptativa`.

### Task 5: Crear medios estáticos eficientes y tipos de ficha en frontend

**Files:**
- Modify: `EVRY/lib/types.ts`
- Modify: `EVRY/lib/exercise-media.ts`
- Create: `EVRY/lib/exercise-media.test.ts`
- Create: `EVRY/lib/exercise-muscles.ts`
- Create: `EVRY/lib/exercise-muscles.test.ts`
- Modify: `EVRY/components/ExerciseMedia.tsx`
- Modify: `EVRY/components/MapaMuscular.tsx`
- Create: `EVRY/components/MapaMuscular.test.tsx`
- Create: `EVRY/components/exercises/ExerciseThumbnail.tsx`
- Create: `EVRY/components/exercises/ExerciseThumbnail.test.tsx`
- Create: `EVRY/components/exercises/MediaAttribution.tsx`
- Create: `EVRY/components/exercise-detail/ExerciseDemo.tsx`
- Create: `EVRY/components/exercise-detail/ExerciseDemo.test.tsx`

**Interfaces:**

```ts
export type ExerciseProgressPeriod = '30d' | '90d' | '6m' | '1y' | 'all';
export interface ExercisePreview extends Omit<Ejercicio, 'instructions' | 'instructionSteps'> {
  instructions?: never;
  instructionSteps?: never;
}
export interface ExerciseDetail extends Omit<Ejercicio, 'instructions' | 'instructionSteps'> {
  instructions: Record<string, string> | null;
  instructionSteps: Record<string, string[]> | null;
}
export interface ExerciseMuscleMap {
  primary: MuscleRegion[];
  secondary: MuscleRegion[];
  exercisesByRegion: Record<MuscleRegion, string[]>;
}
export function mapExerciseMuscles(exercises: Ejercicio[]): ExerciseMuscleMap;
```

- [ ] **Step 1: Probar que una miniatura jamás solicita GIF.**

  `ExerciseThumbnail` solo recibe/usa JPG con `loading="lazy"`, dimensiones fijas y fallback estable. Cubrir custom sin imagen. `target` manda sobre `secondaryMuscles`; categoría/grupo son fallback y primario prevalece en solapamientos. Ajustar ya `MapaMuscular` para pintar primario/secundario distintos, exponer `aria-pressed`, agrupar regiones bilaterales y ofrecer resumen textual; el plan 04 hará el refinamiento visual final.

- [ ] **Step 2: Probar reproducción bajo demanda.**

  Antes del clic, cero fetch `.gif`. Al reproducir: stream con porcentaje real si hay `Content-Length`, progreso indeterminado si no, timeout exacto 10 s, reintento, detener/abortar, revocar Blob URL y volver al JPG. Reduced motion nunca autoinicia.

- [ ] **Step 3: Implementar tipos de dominio sin `any`.**

  Añadir los contratos completos `ExerciseProgressResponse`, `ProgressOverviewResponse` y `ProgressActivityResponse` del Task 3, además de historial, comparación y récords, en `lib/types.ts` o módulos de dominio importables. Separar `ExercisePreview` de `ExerciseDetail`; una vista previa nunca satisface la carga de Indicaciones. Las 1.324 indicaciones usan fallback `es -> en -> []`; custom sin indicaciones muestra un estado útil.

- [ ] **Step 4: Mantener compatibilidad y atribución.**

  `ExerciseMedia` conserva temporalmente su firma pública, pero internamente renderiza solo `ExerciseThumbnail`; así sus consumidores compilan hasta Task 7. `MediaAttribution` muestra exactamente `© Gym visual — https://gymvisual.com/` para medios del dataset y nada para custom.

- [ ] **Step 5: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- lib/exercise-media.test.ts lib/exercise-muscles.test.ts components/exercises components/exercise-detail/ExerciseDemo.test.tsx components/MapaMuscular.test.tsx
  npm.cmd run type-check
  npm.cmd run build
  ```

  Commit: `feat: separar miniaturas y demostraciones de ejercicios`.

### Task 6: Implementar el panel transversal de ejercicio

**Files:**
- Modify: `EVRY/app/(app)/layout.tsx`
- Create: `EVRY/components/ui/Dialog.tsx`
- Create: `EVRY/components/ui/Tabs.tsx`
- Create: `EVRY/components/exercise-detail/ExerciseDetailProvider.tsx`
- Create: `EVRY/components/exercise-detail/ExerciseDetailDialog.tsx`
- Create: `EVRY/components/exercise-detail/ExerciseNameButton.tsx`
- Create: `EVRY/components/exercise-detail/ExerciseDetailTabs.tsx`
- Create: `EVRY/components/exercise-detail/ExerciseSummaryTab.tsx`
- Create: `EVRY/components/exercise-detail/ExerciseProgressTab.tsx`
- Create: `EVRY/components/exercise-detail/ExerciseHistoryTab.tsx`
- Create: `EVRY/components/exercise-detail/ExerciseInstructionsTab.tsx`
- Create: `EVRY/components/exercise-detail/useExerciseProgress.ts`
- Create: `EVRY/components/exercise-detail/useExerciseProgress.test.tsx`
- Create: `EVRY/components/exercise-detail/ExerciseDetailDialog.test.tsx`
- Create: `EVRY/tests/a11y/exercise-detail.a11y.test.tsx`
- Create: `EVRY/components/progress/ExerciseProgressChart.tsx`
- Create: `EVRY/components/progress/ExerciseProgressChart.test.tsx`

**Interfaces:**

```ts
type ExerciseDetailTab = 'summary' | 'progress' | 'history' | 'instructions';
interface OpenExerciseOptions { initialTab?: ExerciseDetailTab; returnFocus?: HTMLElement | null }
interface ExerciseDetailContextValue {
  openExercise(exercise: Pick<ExercisePreview, 'id'> | ExercisePreview, options?: OpenExerciseOptions): void;
  closeExercise(): void;
  isOpen: boolean;
}
```

- [ ] **Step 1: Probar diálogo y pila modal.**

  Abrir/cerrar, `Escape`, foco inicial/atrapado/restaurado, bloqueo de scroll, desktop drawer, móvil full-screen, cierre por ruta. Al abrir sobre selector, solo se cierra la capa superior; la inferior queda `inert` y recupera filtros/scroll/foco. Probar por separado loading/error/empty/success.

- [ ] **Step 2: Implementar proveedor y caché de metadatos.**

  Ubicarlo alrededor de `AppShell`; una apertura siempre consulta `GET /exercises/:id` salvo que la caché tenga `detailLoaded=true`, nunca trata `ExercisePreview` como detalle. Cachear por id, abortar fetch al cerrar/cambiar y probar custom sin medios/indicaciones. No bloquear el panel completo si falla solo progreso.

- [ ] **Step 3: Implementar cuatro tabs semánticos.**

  `tablist/tab/tabpanel`, flechas/Home/End. Resumen: demo, equipo, categorías, mapa ya coherente y métricas. Progreso: periodos y métrica carga/1RM. Historial: sesiones con `Cargar más`. Indicaciones: pasos españoles, aviso editorial y atribución. `useExerciseProgress.test.tsx` cubre abort al cambiar periodo, respuesta obsoleta ignorada, comparación `all=null`, paginación sin duplicados y retry sin convertir error en vacío.

- [ ] **Step 4: Diferir Recharts.**

  Importar `ExerciseProgressChart` con `next/dynamic` únicamente al visitar Progreso y aportar resumen textual equivalente.

- [ ] **Step 5: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- components/exercise-detail components/progress/ExerciseProgressChart.test.tsx
  npm.cmd run test:a11y -- exercise-detail
  npm.cmd run type-check
  npm.cmd run build
  ```

  Commit: `feat: crear ficha transversal accesible de ejercicios`.

### Task 7: Conectar la ficha sin perder contexto

**Files:**
- Modify: `EVRY/components/ExercisePicker.tsx`
- Modify: `EVRY/components/EditorRutina.tsx`
- Modify: `EVRY/app/(app)/workout/page.tsx`
- Modify: `EVRY/app/(app)/workout/[id]/page.tsx`
- Modify: `EVRY/app/(app)/progress/page.tsx`
- Modify: `EVRY/app/(app)/dashboard/page.tsx`
- Create: `EVRY/components/ExercisePicker.test.tsx`

- [ ] **Step 1: Probar acciones separadas en selector.**

  Miniatura + nombre forman un único botón de consulta y muestran `MediaAttribution` compacta; `Agregar` es su hermano independiente y agrega una sola vez. No crear dos focos redundantes ni botón dentro de botón. Cerrar ficha conserva búsqueda, filtros, página, scroll y foco.

- [ ] **Step 2: Sustituir todas las miniaturas por JPG.**

  Rutina nueva/editable, tarjetas de rutina y sesión muestran `ExerciseThumbnail` y `MediaAttribution` compacta. En sesión, `Ver indicaciones` abre directamente la pestaña correspondiente y se elimina técnica duplicada de la tarjeta.

- [ ] **Step 3: Conectar nombres.**

  Rutina, sesión, progreso y dashboard usan `ExerciseNameButton`; ninguna apertura dispara iniciar, seleccionar gráfica, editar o borrar.

- [ ] **Step 4: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- components/ExercisePicker.test.tsx components/exercise-detail
  npm.cmd run type-check
  npm.cmd run build
  ```

  Commit: `feat: abrir ficha desde todo el flujo de entrenamiento`.

### Task 8: Completar la experiencia de sesión

**Files:**
- Refactor: `EVRY/app/(app)/workout/[id]/page.tsx`
- Create: `EVRY/components/workouts/WorkoutHeader.tsx`
- Create: `EVRY/components/workouts/SessionExerciseCard.tsx`
- Create: `EVRY/components/workouts/SetComposer.tsx`
- Create: `EVRY/components/workouts/SetRow.tsx`
- Create: `EVRY/components/workouts/SetEditDialog.tsx`
- Create: `EVRY/components/workouts/SessionActions.tsx`
- Modify: `EVRY/components/RestTimer.tsx`
- Modify: `EVRY/components/ui/Stepper.tsx`
- Create: `EVRY/components/workouts/SetComposer.test.tsx`
- Create: `EVRY/components/workouts/SessionActions.test.tsx`
- Create: `EVRY/tests/a11y/workout.a11y.test.tsx`

- [ ] **Step 1: Probar mutación local segura.**

  POST exitoso + refetch fallido se muestra como `guardada, sincronización pendiente`, añade la serie definitiva y nunca ofrece repetir POST. UUID nuevo solo para una intención nueva.

- [ ] **Step 2: Implementar campos por serie.**

  Peso, reps, duración, RPE, calentamiento y técnica estable; inputs vacíos editables sin `04`; labels contextuales y objetivos táctiles. El temporizador aparece después de la primera serie y anuncia fin sin secuestrar foco.

- [ ] **Step 3: Editar/borrar/cancelar/finalizar.**

  Diálogos claros, estados saving/error/success, botones deshabilitados durante mutación. Finalizar vacío se evita; cancelar explica que no sumará progreso.

- [ ] **Step 4: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- components/workouts components/RestTimer.tsx components/ui/Stepper.tsx
  npm.cmd run test:a11y -- workout
  npm.cmd run type-check
  ```

  Commit: `feat: completar edicion y cierre de sesiones`.

### Task 9: Sustituir progreso artificial por comparaciones reales

**Files:**
- Refactor: `EVRY/app/(app)/progress/page.tsx`
- Replace: `EVRY/components/ExerciseChart.tsx`
- Create: `EVRY/components/progress/ProgressOverview.tsx`
- Create: `EVRY/components/progress/PeriodComparison.tsx`
- Modify: `EVRY/components/progress/ExerciseProgressChart.tsx`
- Modify: `EVRY/components/CalendarioActividad.tsx`
- Create: `EVRY/components/progress/ProgressOverview.test.tsx`
- Create: `EVRY/tests/a11y/progress.a11y.test.tsx`

- [ ] **Step 1: Probar estados y definiciones.**

  Error no es vacío. Eliminar `max(workoutsCompleted + 1, 3)`. Mostrar sesiones/volumen/frecuencia/récords con periodo y comparación real. Día vacío seleccionado sí muestra estado accionable.

- [ ] **Step 2: Implementar cuadrícula equilibrada.**

  Calendario + detalle del día/resumen del mes ocupan el espacio disponible. Consultar `GET /progress/activity?from&to` para el mes visible; no descargar 200 workouts. El detalle de una sesión completada ofrece `Eliminar del historial`, confirma el efecto y usa `DELETE /workouts/:id`; al éxito invalida overview, actividad, ficha y estadísticas visibles.

- [ ] **Step 3: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- components/progress
  npm.cmd run test:a11y -- progress
  npm.cmd run type-check
  npm.cmd run build
  ```

  Commit: `fix: mostrar progreso verificable y contextual`.

### Task 10: Puerta del núcleo de entrenamiento

**Files:**
- Create: `EVRY/tests/e2e/training-core.spec.ts`
- Create: `EVRY/tests/e2e/exercise-detail.spec.ts`
- Create: `EVRY/docs/quality/entrenamiento.md`
- Modify: `EVRY-Backend/README.md`

- [ ] **Step 1: Automatizar recorridos desktop/móvil.**

  Crear/editar rutina; iniciar/reanudar; agregar/corregir/borrar serie; cancelar; eliminar una sesión histórica y ver stats reconstruidas; finalizar y ver progreso; abrir ficha desde selector/rutina/sesión/progreso/dashboard; reproducir/detener GIF; cambiar periodo rápidamente; paginar; leer indicaciones; teclado/Escape/foco.

- [ ] **Step 2: Afirmar rendimiento funcional.**

  Cero solicitudes `.gif` antes de reproducir, cero Recharts antes de Progreso, sin duplicados al reintentar, sin respuestas obsoletas tras cambio de periodo.

- [ ] **Step 3: Ejecutar puerta y documentar.**

  ```powershell
  cd EVRY-Backend
  npm.cmd run test:unit -- --runInBand
  npm.cmd run test:integration -- --runInBand
  npm.cmd run build
  npm.cmd run exercises:verify
  cd ..\EVRY
  npm.cmd run test:unit
  npm.cmd run test:a11y
  npm.cmd run test:e2e -- tests/e2e/training-core.spec.ts tests/e2e/exercise-detail.spec.ts
  npm.cmd run type-check
  npm.cmd run build
  ```

  Commits: `test: cubrir nucleo de entrenamiento y ficha`; `docs: documentar progreso y records`.
