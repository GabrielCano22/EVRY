# EVRY 05: verificación, documentación y publicación

> **Para agentes de implementación:** SUB-SKILL OBLIGATORIA: usar `superpowers:executing-plans` y, antes de afirmar terminado, `superpowers:verification-before-completion`. Este plan solo comienza cuando 01–04 están implementados.

**Goal:** Probar que EVRY cumple el candidato aprobado en móvil y escritorio, documentar exactamente el producto real y publicar ambos repositorios limpios en GitHub, sin desplegar.

**Architecture:** Una puerta única orquesta lint, tipos, unitarias, integración PostgreSQL, E2E, axe, rendimiento, medios y build. Los fixtures son deterministas, la documentación refleja contratos reales y la publicación usa commits trazables en `main`.

**Tech Stack:** PowerShell, npm, Prisma/PostgreSQL, Jest/Supertest, Vitest/Testing Library/axe, Playwright, Next.js, NestJS, Git/GitHub.

**Spec:** `EVRY/docs/superpowers/specs/2026-08-19-evry-release-candidate-design.md`

## Global Constraints

- Sin despliegue, dominio, hosting ni configuración de infraestructura pública.
- No declarar “100% propio”: los 1.324 JPG/GIF siguen sujetos a términos/atribución de Gym Visual.
- No declarar terminado con pruebas omitidas, procesos stale, worktree sucio o documentación desactualizada.
- No ejecutar reset/drop sobre una URL que coincida con `DATABASE_URL`; solo `TEST_DATABASE_URL` guardada.
- No ocultar warnings, retries o resultados parciales. Registrar versión, comando, exit code y limitación.
- Ejecutar type-check y build frontend de forma secuencial y no compartir `.next` entre `dev` y `start`.

---

### Task 1: Congelar contratos y documentación operativa

**Files:**
- Modify: `EVRY/README.md`
- Modify: `EVRY-Backend/README.md`
- Modify: `EVRY-Backend/.env.example`
- Modify: `EVRY-Backend/NOTICE-MEDIA.md`
- Modify: `EVRY-Backend/LICENSE-DATASET`
- Create: `EVRY/docs/product/release-candidate.md`
- Create: `EVRY/docs/product/privacy-and-cycle.md`
- Create: `EVRY/docs/product/exercise-records.md`
- Create: `EVRY/docs/operations/local-development.md`
- Create: `EVRY-Backend/docs/openapi-release.json`
- Create: `EVRY-Backend/src/bootstrap/create-app.ts`
- Modify: `EVRY-Backend/src/main.ts`
- Create: `EVRY-Backend/scripts/generate-openapi.ts`
- Create: `EVRY-Backend/scripts/check-openapi.ts`
- Create: `EVRY-Backend/test/openapi.integration-spec.ts`
- Modify: `EVRY-Backend/package.json`

- [ ] **Step 1: Generar y comprobar OpenAPI.**

  Extraer `createApp({ swaggerEnabled })` para que `main.ts`, integración y generador compartan pipes/filtros/prefix. Añadir scripts `openapi:generate` y `openapi:check`; el primero serializa de forma determinista y el segundo genera en memoria, normaliza orden y falla si difiere de `docs/openapi-release.json`. Verificar rutas reales, auth, DTO bounds, schemas de error y respuestas de ficha/progreso/privacidad.

- [ ] **Step 2: Actualizar ambos README.**

  Requisitos, variables, migraciones, seed/import, ejecución, pruebas y puertos 3000/4000. Conservar y probar el contrato actual: `GET /` devuelve la tarjeta JSON de la API, `GET /health` devuelve salud y los controladores de negocio viven bajo `/api`; no documentar `/api/health` inexistente.

- [ ] **Step 3: Documentar definiciones reales.**

  Periodos, volumen, mejor carga, récord de reps con peso, Epley, comparaciones, orientación conservadora, ciclo estimado, retención/export/delete y limitaciones.

- [ ] **Step 4: Corregir licencias y rutas.**

  `NOTICE-MEDIA.md` referencia `prisma/seed-data/exercises.json`, `LICENSE-DATASET` y assets reales. Fuente local conserva OFL. No afirmar transferencia de propiedad.

- [ ] **Step 5: Commit por repositorio.**

  Backend: `docs: alinear contratos y operacion local`.
  Frontend: `docs: documentar candidato de lanzamiento`.

### Task 2: Completar fixtures e integración real

**Files:**
- Create: `EVRY-Backend/test/fixtures/users.ts`
- Create: `EVRY-Backend/test/fixtures/exercises.ts`
- Create: `EVRY-Backend/test/fixtures/workouts.ts`
- Create: `EVRY-Backend/test/helpers/test-app.ts`
- Create: `EVRY-Backend/test/helpers/test-database.ts`
- Modify: `EVRY-Backend/test/app.integration-spec.ts`
- Create: `EVRY-Backend/test/auth.integration-spec.ts`
- Create: `EVRY-Backend/test/routines.integration-spec.ts`
- Modify: `EVRY-Backend/test/workouts.integration-spec.ts`
- Modify: `EVRY-Backend/test/progress.integration-spec.ts`
- Create: `EVRY-Backend/test/security.integration-spec.ts`

- [ ] **Step 1: Crear fixtures deterministas.**

  Dos usuarios aislados, global/custom/ajeno, rutinas, sesión activa/finalizada/cancelada, warmups, records distintos, fechas frontera, readiness y ciclo. Cada suite limpia solo IDs/namespaces de prueba.

- [ ] **Step 2: Cubrir contratos y propiedad.**

  401/400/404/409/429/503; cross-user; refresh concurrente; rutina rollback; inicio/set/finalización idempotentes; borrado/cascadas; paginación estable; ciclo opt-in.

- [ ] **Step 3: Cubrir fallo transaccional.**

  Inyectar excepción después de pasos intermedios y comprobar que rutina/sesión/stats/ciclo permanecen coherentes.

- [ ] **Step 4: Ejecutar dos veces.**

  ```powershell
  npm.cmd run test:integration -- --runInBand
  npm.cmd run test:integration -- --runInBand
  ```

  La segunda corrida debe pasar sin residuos. Commit: `test: cubrir contratos e integridad en postgres`.

### Task 3: Completar los nueve recorridos E2E

**Files:**
- Create: `EVRY/tests/e2e/fixtures.ts`
- Create: `EVRY/tests/e2e/helpers/auth.ts`
- Modify: `EVRY/tests/e2e/auth-profile.spec.ts`
- Modify: `EVRY/tests/e2e/training-core.spec.ts`
- Modify: `EVRY/tests/e2e/exercise-detail.spec.ts`
- Modify: `EVRY/tests/e2e/cycle-privacy.spec.ts`
- Modify: `EVRY/playwright.config.ts`

- [ ] **Step 1: Cubrir exactamente los recorridos aprobados.**

  1) registro inclusivo/opt-in; 2) login/refresh/logout; 3) crear/editar rutina; 4) iniciar/reanudar; 5) agregar/corregir/borrar serie; 6) finalizar, borrar historial y comprobar stats/progreso; 7) perfil/error/retry; 8) ciclo crear/editar/borrar; 9) ficha desde selector/rutina/sesión/progreso/dashboard, periodo/historial/indicaciones.

- [ ] **Step 2: Ejecutar en desktop y móvil.**

  Cada recorrido corre en Chromium desktop y viewport móvil; usar datos únicos por worker. No usar esperas arbitrarias: esperar respuestas/estados accesibles.

- [ ] **Step 3: Añadir invariantes transversales.**

  Sin `console.error`, errores de página, requests 5xx inesperados, GIF antes de click, fuentes/iconos remotos o pérdida de contexto/foco. Verificar respuesta honesta al apagar temporalmente backend.

- [ ] **Step 4: Ejecutar y commit.**

  ```powershell
  npm.cmd run test:e2e
  ```

  Commit: `test: automatizar recorridos completos de evry`.

### Task 4: Cerrar accesibilidad y revisión manual

**Files:**
- Modify: `EVRY/tests/a11y/core-components.a11y.test.tsx`
- Create: `EVRY/tests/e2e/accessibility.spec.ts`
- Modify: `EVRY/docs/quality/accessibility.md`
- Create: `EVRY/docs/quality/manual-qa.md`

- [ ] **Step 1: Ejecutar axe por ruta/estado.**

  Landing, login, register, dashboard loading/error/success, rutinas, selector, ficha y tabs, sesión, progreso, perfil, ciclo. Cero critical/serious; justificar cualquier menor con issue concreto, no suppress global.

- [ ] **Step 2: Inspeccionar manualmente.**

  Teclado completo, focus order/return, Escape, lector de pantalla al menos con navegador, zoom 200%, contrastes, targets, reduced motion, textos largos y errores.

- [ ] **Step 3: Guardar evidencia útil.**

  Capturas desktop/móvil de rutas clave y tabla de resultado/fecha/viewport. No versionar videos/traces pesados salvo fallo reproducible.

- [ ] **Step 4: Commit.**

  Commit: `test: cerrar auditoria de accesibilidad wcag aa`.

### Task 5: Cerrar rendimiento y resiliencia local

**Files:**
- Modify: `EVRY/scripts/report-route-budgets.mjs`
- Modify: `EVRY/tests/performance/budgets.spec.ts`
- Modify: `EVRY/docs/quality/performance.md`
- Create: `EVRY-Backend/test/performance/progress-query.spec.ts`
- Create: `EVRY-Backend/docs/query-plans/exercise-progress.txt`
- Create: `EVRY-Backend/scripts/load-smoke.ts`
- Modify: `EVRY-Backend/package.json`

- [ ] **Step 1: Medir builds limpios.**

  Eliminar solo artefactos de build confirmados (`.next`, `.next-dev`, `dist`) cuando ningún proceso esté usándolos; generar build nuevo y registrar First Load JS por ruta.

- [ ] **Step 2: Medir comportamiento.**

  Catálogo con 1.324 ejercicios, selector filtrado, ficha, sesión y progreso con fixture grande. Registrar número/tamaño de requests, TTFB local, CLS y GIF diferido. Añadir `"test:load": "ts-node scripts/load-smoke.ts"`; el script reutiliza `createApp`, abre un puerto efímero contra `TEST_DATABASE_URL` guardada, siembra fixtures, ejecuta y cierra en `finally`. Usando `fetch`/`performance` de Node sin servicio externo, cubre login/rate-limit, catálogo paginado, alta idempotente de series y progreso; afirma cero 5xx inesperados, ausencia de duplicados y guarda p50/p95/concurrencia. Los umbrales locales iniciales serán salud 500 ms, catálogo 1.000 ms, sesión 1.000 ms y progreso 1.500 ms con concurrencia 5/5/2/3 respectivamente, revisables solo con evidencia.

- [ ] **Step 3: Comprobar SQL.**

  Guardar `EXPLAIN (ANALYZE, BUFFERS)` sobre progreso con fixture; evitar seq scans inesperados y N+1. Definir umbral de regresión local estable, no promesa universal.

- [ ] **Step 4: Resiliencia Next.js.**

  Probar `dev` en `.next-dev`, detener, luego `build/start` en `.next`; confirmar que no aparece `Cannot find module './14.js'`. Nunca ejecutar dev/start simultáneos sobre el mismo distDir.

- [ ] **Step 5: Commit.**

  Commit frontend: `perf: verificar presupuestos y carga diferida`.
  Commit backend: `perf: verificar consulta de progreso`.

### Task 6: Ejecutar la puerta automatizada final

**Files:**
- Create: `EVRY/scripts/verify-release.ps1`
- Create: `EVRY/docs/quality/release-verification.md`

**Script order:**

```powershell
$ErrorActionPreference = 'Stop'
$frontendRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = Split-Path -Parent $frontendRoot
$backendRoot = Join-Path $workspaceRoot 'EVRY-Backend'
Push-Location $backendRoot
npx.cmd prisma validate
npm.cmd run prisma:generate
npm.cmd run lint:check
npm.cmd run test:unit -- --runInBand
npm.cmd run test:integration -- --runInBand
npm.cmd run openapi:check
npm.cmd run exercises:verify
npm.cmd run exercises:check-import
npm.cmd run test:load
npm.cmd run build
Pop-Location
Push-Location $frontendRoot
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run test:a11y
npm.cmd run type-check
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run test:performance
Pop-Location
```

- [ ] **Step 1: Implementar script fail-fast.**

  Resolver frontend con `Split-Path -Parent $PSScriptRoot` y backend como hermano bajo el workspace, no desde el directorio actual. Verificar al inicio Node/npm, URLs y puertos. No mutar código; guardar resumen en consola y permitir log opt-in fuera de git.

- [ ] **Step 2: Ejecutar desde checkout limpio.**

  Todos los comandos exit 0. Verificación de medios debe decir exactamente `1324 records; 1324 images; 1324 gifs; 0 missing` o el formato actualizado equivalente con los mismos conteos.

- [ ] **Step 3: Repetir checks sensibles.**

  Repetir backend integración y frontend E2E una segunda vez si hubo cambios después de la primera puerta. No aceptar “flaky pass”.

- [ ] **Step 4: Documentar evidencia y commit.**

  Registrar commit, entorno, duración, suites/casos, rutas/build budgets y limitaciones. Commit: `chore: automatizar verificacion del candidato`.

### Task 7: Revisión de código y seguridad final

**Files:**
- Modify only if findings require it.

- [ ] **Step 1: Revisar diff completo por repositorio.**

  Propiedad/autorización, secretos, transacciones, fechas, nulls, estados API, accesibilidad, cleanup de efectos, tipos, dead code, español visible y afirmaciones del producto.

- [ ] **Step 2: Ejecutar auditoría de dependencias.**

  `npm.cmd audit --omit=dev` en ambos repositorios y auditoría completa informativa. Corregir vulnerabilidades aplicables sin upgrades ciegos; documentar las no explotables con evidencia.

- [ ] **Step 3: Buscar residuos.**

  `TODO/FIXME`, `console.log`, mocks, métricas inventadas, “Comunidad”, URLs Google, `dev-secret`, catches que devuelven vacío, `new Date('AAAA-MM-DD')`, GIF en thumbnails, strings inglesas visibles y archivos generados.

- [ ] **Step 4: Ejecutar puerta otra vez si cambia código.**

  Toda corrección recibe prueba de regresión y commit específico.

### Task 8: Publicar GitHub sin desplegar

**Files:**
- No source changes; Git operations only after green gate.

- [ ] **Step 1: Verificar repositorios y remotos.**

  ```powershell
  git -C EVRY status --short --branch
  git -C EVRY remote -v
  git -C EVRY log --oneline --decorate -15
  git -C EVRY-Backend status --short --branch
  git -C EVRY-Backend remote -v
  git -C EVRY-Backend log --oneline --decorate -15
  ```

  Confirmar `origin` de `GabrielCano22/EVRY.git` y `GabrielCano22/EVRY-Backend.git`, worktrees limpios y ausencia de secretos/artefactos.

- [ ] **Step 2: Sincronizar de forma no destructiva.**

  `git fetch origin`; si origin avanzó, inspeccionar y rebase/merge solo con worktree limpio y nueva puerta. Nunca force-push ni reset destructivo.

- [ ] **Step 3: Push de ambos main.**

  ```powershell
  git -C EVRY push origin main
  git -C EVRY-Backend push origin main
  ```

- [ ] **Step 4: Verificar publicación.**

  Comparar `HEAD` con `origin/main` y comprobar URLs remotas. No iniciar deploy ni configurar Vercel/hosting.

- [ ] **Step 5: Detener procesos y entregar.**

  Detener solo procesos locales iniciados para QA en puertos 3000/4000. Informar hashes, suites, comandos de ejecución/pruebas, puertos, comando PowerShell para detenerlos, decisiones y limitación de licencias.
