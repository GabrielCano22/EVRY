# EVRY 04: experiencia, accesibilidad y rendimiento

> **Para agentes de implementación:** SUB-SKILL OBLIGATORIA: usar `superpowers:subagent-driven-development` o `superpowers:executing-plans`. Completar después de que los contratos funcionales de los planes 01–03 estén estables.

**Goal:** Dar a EVRY una identidad editorial propia, accesible y rápida, sin contenido ficticio ni dependencias remotas de interfaz.

**Architecture:** Un sistema visual pequeño y local —tipografía, iconos SVG, tokens, estados y motion— alimenta landing y aplicación. Las pantallas priorizan datos/acciones reales; los módulos pesados se difieren y todos los recorridos respetan WCAG 2.2 AA y reduced motion.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, `next/font/local`, SVG React, Vitest/Testing Library/axe, Playwright.

**Spec:** `EVRY/docs/superpowers/specs/2026-08-19-evry-release-candidate-design.md`

## Global Constraints

- No llamar Google Fonts, Material Symbols, CDN de iconos ni imágenes remotas en runtime.
- Mantener el fondo profundo y azul EVRY, pero reservar gradientes/brillos para énfasis funcional.
- No publicar comunidad, porcentajes, testimonios, metas ni beneficios que el producto no pueda demostrar.
- Toda animación debe tener propósito, durar de forma contenida y respetar `prefers-reduced-motion`.
- Zoom 200%, teclado, lector de pantalla, contraste AA y objetivos táctiles son puertas, no mejoras opcionales.
- Presupuestos orientativos: landing/auth <=130 kB; aplicación <=160 kB; progreso <=190 kB de First Load JS, medidos y documentados.

---

### Task 1: Localizar tipografía e iconografía

**Files:**
- Create: `EVRY/public/fonts/manrope-latin-variable.woff2`
- Create: `EVRY/public/fonts/OFL.txt`
- Modify: `EVRY/app/layout.tsx`
- Create: `EVRY/components/ui/icons.tsx`
- Delete: `EVRY/components/ui/Icon.tsx`
- Modify: `EVRY/app/globals.css`
- Modify: `EVRY/tailwind.config.ts`
- Create: `EVRY/components/ui/icons.test.tsx`

**Interfaces:**

```ts
export const icons = {
  add, remove, dashboard, training, progress, cycle, settings, person,
  close, menu, search, info, warning, error, check, save, edit, delete,
  chevronLeft, chevronRight, arrowUp, arrowDown, arrowBack, arrowForward,
  play, pause, replay, forward, timer, calendar, calendarWeek, history,
  weight, email, password, logout, trophy, book, quote, heart, water,
  flag, list, insights, trend, sparkle, more,
} as const;
export type IconName = keyof typeof icons;
export function Icon(props: { name: IconName; size?: number; title?: string; className?: string }): JSX.Element;
```

- [ ] **Step 1: Añadir fuente y licencia oficiales.**

  Vendorizar Manrope variable bajo OFL, registrar hash/origen en documentación y cargar con `next/font/local`. Eliminar `next/font/google`; sustituir las clases huérfanas `font-lexend`/`font-grotesk` por tokens tipográficos reales de la familia local y usar peso/espaciado para jerarquía.

- [ ] **Step 2: Probar iconos decorativos e informativos.**

  Sin `title`, SVG `aria-hidden`; con `title`, `role=img` y nombre. El nombre es unión tipada: una ligadura inexistente deja de ser posible.

- [ ] **Step 3: Migrar todos los usos.**

  Buscar `material-symbols`, nombres string y `Icon` actual. Mapear todos los nombres existentes (incluidos goals y navegación dinámica) a `IconName`; tipar `itemsNavegacion` y `etiquetasMeta` para que ninguna cadena quede sin SVG. Curar trazos coherentes y eliminar import remoto de CSS.

- [ ] **Step 4: Permitir zoom y verificar red.**

  Retirar `maximumScale: 1`. Prueba Playwright confirma cero solicitudes a `fonts.googleapis.com`, `fonts.gstatic.com` o Material Symbols.

- [ ] **Step 5: Commit.**

  ```powershell
  npm.cmd run test:unit -- components/ui/icons.test.tsx
  npm.cmd run type-check
  npm.cmd run build
  ```

  Commit: `refactor: servir tipografia e iconos desde evry`.

### Task 2: Consolidar tokens, componentes y movimiento

**Files:**
- Modify: `EVRY/app/globals.css`
- Modify: `EVRY/tailwind.config.ts`
- Modify: `EVRY/components/ui/Button.tsx`
- Modify: `EVRY/components/ui/Input.tsx`
- Modify: `EVRY/components/ui/Card.tsx`
- Create: `EVRY/components/ui/AsyncState.tsx`
- Create: `EVRY/components/ui/LiveStatus.tsx`
- Create: `EVRY/components/ui/Skeleton.tsx`
- Create: `EVRY/components/ui/ConfirmDialog.tsx`
- Create: `EVRY/components/ui/ui-a11y.test.tsx`
- Create: `EVRY/tests/a11y/ui.a11y.test.tsx`

- [ ] **Step 1: Definir tokens semánticos y contraste.**

  Fondo/superficie/texto/primario/peligro/foco sin duplicados. Verificar texto azul y botones que fallaron auditoría; foco de 2 px con offset y contraste >=3:1.

- [ ] **Step 2: Normalizar estados.**

  `AsyncState` distingue loading/error/empty/success y acepta retry; `LiveStatus` controla `polite/assertive`. Skeleton mantiene dimensiones para evitar CLS.

- [ ] **Step 3: Normalizar movimiento.**

  Entradas 160–240 ms, hover/focus sin animar grandes blurs. Media query reduced-motion lleva duración a casi cero, elimina transformaciones y scroll suave.

- [ ] **Step 4: Probar y commit.**

  ```powershell
  npm.cmd run test:unit -- components/ui
  npm.cmd run test:a11y -- ui
  npm.cmd run type-check
  ```

  Commit: `refactor: consolidar sistema visual accesible`.

### Task 3: Reescribir landing con navegación y promesas reales

**Files:**
- Refactor: `EVRY/app/page.tsx`
- Create: `EVRY/components/landing/LandingHeader.tsx`
- Create: `EVRY/components/landing/Hero.tsx`
- Create: `EVRY/components/landing/TrainingSection.tsx`
- Create: `EVRY/components/landing/ProgressSection.tsx`
- Create: `EVRY/components/landing/CycleSection.tsx`
- Create: `EVRY/components/landing/HowItWorks.tsx`
- Create: `EVRY/components/landing/FinalCta.tsx`
- Create: `EVRY/components/landing/Reveal.tsx`
- Create: `EVRY/components/landing/LandingHeader.test.tsx`
- Create: `EVRY/tests/a11y/landing.a11y.test.tsx`

- [ ] **Step 1: Probar navegación real.**

  Anclas con `id`, estado activo por IntersectionObserver, skip link, menú móvil con nombre/estado/foco y CTA a registro/login. Retirar `href="#"` y enlaces/button anidados.

- [ ] **Step 2: Sustituir contenido ficticio.**

  Mostrar solo: rutinas por serie, sesiones, progreso real, catálogo y diario opcional. Retirar Comunidad, 8%, prueba social y promesas de transformación/adaptación hormonal.

- [ ] **Step 3: Rediseñar CTA final.**

  Bloque editorial compacto con beneficio verificable, una acción primaria y enlace secundario; sin panel de gradiente genérico. Animaciones de reveal solo al entrar y desactivadas con reduced motion.

- [ ] **Step 4: QA responsive y commit.**

  ```powershell
  npm.cmd run test:unit -- components/landing
  npm.cmd run test:a11y -- landing
  npm.cmd run type-check
  npm.cmd run build
  ```

  Capturar 390×844, 768×1024, 1440×900 y zoom 200%. Commit: `feat: convertir landing en una presentacion honesta de evry`.

### Task 4: Pulir shell y autenticación

**Files:**
- Modify: `EVRY/components/AppShell.tsx`
- Modify: `EVRY/components/auth/AuthFrame.tsx`
- Modify: `EVRY/components/auth/LoginForm.tsx`
- Modify: `EVRY/components/auth/RegisterForm.tsx`
- Create: `EVRY/components/AppShell.test.tsx`
- Create: `EVRY/tests/a11y/shell.a11y.test.tsx`

- [ ] **Step 1: Probar navegación responsive.**

  `aria-current`, navegación nombrada, safe-area móvil, máximo número de items dinámico sin grid roto, foco al contenido al navegar, y ciclo visible solo por opt-in.

- [ ] **Step 2: Evitar scroll interno frágil.**

  Usar `min-h-screen`, sidebar sticky/fixed segura y un flujo de scroll compatible con zoom/teclado. Perfil móvil tiene nombre accesible.

- [ ] **Step 3: Aplicar composición de auth.**

  Layout editorial sobrio, jerarquía clara, recordar usuario, volver al menú, estados por campo; no efectos decorativos costosos ni copy genérico.

- [ ] **Step 4: Probar y commit.**

  ```powershell
  npm.cmd run test:unit -- components/AppShell.test.tsx components/auth
  npm.cmd run test:a11y -- shell auth
  npm.cmd run type-check
  ```

  Commit: `refactor: pulir navegacion y acceso responsive`.

### Task 5: Convertir dashboard en próximo paso accionable

**Files:**
- Refactor: `EVRY/app/(app)/dashboard/page.tsx`
- Create: `EVRY/components/dashboard/DashboardHeader.tsx`
- Create: `EVRY/components/dashboard/NextWorkoutCard.tsx`
- Create: `EVRY/components/dashboard/RecentReadiness.tsx`
- Create: `EVRY/components/dashboard/RecentProgress.tsx`
- Modify: `EVRY/components/ReadinessCheckin.tsx`
- Create: `EVRY/components/dashboard/Dashboard.test.tsx`
- Create: `EVRY/tests/a11y/dashboard.a11y.test.tsx`

- [ ] **Step 1: Probar cargas independientes.**

  Fallo de overview no convierte métricas a cero; fallo de rutina no oculta readiness; cada módulo tiene loading/error/empty/success y retry. Abort al desmontar.

- [ ] **Step 2: Responder tres preguntas.**

  Acción principal: iniciar/continuar sesión. Contexto: disposición reciente. Progreso: comparación verificable. Frase/ciclo quedan secundarios; no rellenan huecos.

- [ ] **Step 3: Añadir motion funcional.**

  Entrada escalonada pequeña solo al primer render, hover/focus de tarjetas accionables y skeletons estables. Reduced motion elimina escalonado.

- [ ] **Step 4: Verificar y commit.**

  ```powershell
  npm.cmd run test:unit -- components/dashboard components/ReadinessCheckin.tsx
  npm.cmd run test:a11y -- dashboard
  npm.cmd run type-check
  ```

  Commit: `feat: orientar dashboard al siguiente entrenamiento`.

### Task 6: Mejorar mapa muscular propio

**Files:**
- Refactor: `EVRY/components/MapaMuscular.tsx`
- Modify: `EVRY/lib/exercise-muscles.ts`
- Modify: `EVRY/components/MapaMuscular.test.tsx`
- Create: `EVRY/tests/a11y/muscle-map.a11y.test.tsx`

- [ ] **Step 1: Probar semántica anatómica.**

  Principal azul, secundario morado, primario prevalece. Solo regiones activas son focuseables. Lados bilaterales se agrupan con un nombre. `FULL_BODY` no intenta pintar región inexistente.

- [ ] **Step 2: Implementar interacción útil.**

  Vista/figura con `aria-pressed`, leyenda real, hover/focus/activar región, lista de ejercicios relacionados y resumen textual siempre disponible. Siluetas no implican capacidad.

- [ ] **Step 3: Verificar en ficha/editor y commit.**

  ```powershell
  npm.cmd run test:unit -- components/MapaMuscular.test.tsx lib/exercise-muscles.test.ts
  npm.cmd run test:a11y -- muscle-map
  npm.cmd run type-check
  ```

  Commit: `feat: hacer explicativo el mapa muscular`.

### Task 7: Auditoría accesible de componentes críticos

**Files:**
- Modify: `EVRY/components/ExercisePicker.tsx`
- Modify: `EVRY/components/RestTimer.tsx`
- Modify: `EVRY/components/ui/Stepper.tsx`
- Modify: `EVRY/components/cycle/ActivityCalendar.tsx`
- Modify: `EVRY/components/EditorRutina.tsx`
- Modify: `EVRY/app/(app)/workout/page.tsx`
- Modify: `EVRY/app/(app)/workout/[id]/page.tsx`
- Create: `EVRY/tests/a11y/core-components.a11y.test.tsx`

- [ ] **Step 1: Corregir nombres y controles inválidos.**

  No icon-only sin label, no botón dentro de link/botón, no `aria-label` inválido en `div`, steppers con contexto, inputs de serie nombrados, chevrons de calendario etiquetados, tabs móviles con nombre aun si ocultan texto.

- [ ] **Step 2: Corregir diálogos.**

  Selector y ficha atrapan/restauran foco, fondo inert, Escape superior, backdrop, scroll lock. Confirmaciones usan componente común.

- [ ] **Step 3: Probar zoom/teclado/axe.**

  Recorrer solo teclado, zoom 200%, viewport móvil y desktop. Cero violaciones axe críticas/serias en los recorridos acordados.

- [ ] **Step 4: Commit.**

  ```powershell
  npm.cmd run test:a11y
  npm.cmd run type-check
  ```

  Commit: `fix: cerrar barreras de accesibilidad del flujo principal`.

### Task 8: Aplicar presupuesto de rendimiento

**Files:**
- Modify: `EVRY/next.config.ts`
- Create: `EVRY/tests/performance/budgets.spec.ts`
- Create: `EVRY/scripts/report-route-budgets.mjs`
- Modify: `EVRY/package.json`
- Modify: `EVRY/components/exercise-detail/ExerciseProgressTab.tsx`
- Modify: `EVRY/components/cycle/ActivityCalendar.tsx`
- Modify: `EVRY/app/(app)/dashboard/page.tsx`
- Modify: `EVRY/app/(app)/progress/page.tsx`

- [ ] **Step 1: Escribir mediciones antes de optimizar.**

  Añadir `"test:performance": "playwright test tests/performance/budgets.spec.ts --project=performance"` y un proyecto Playwright dedicado. Parsear salida de `next build` y fallar al superar presupuestos acordados con margen documentado. Playwright mide recursos, solicitudes duplicadas, GIF/Recharts diferidos y CLS.

- [ ] **Step 2: Dividir bundles.**

  Recharts dinámico; diálogos/tabs pesados bajo demanda; reducir componentes cliente al borde interactivo; imports directos; evitar barrels que arrastren módulos.

- [ ] **Step 3: Reducir red y trabajo.**

  Consultas por mes/periodo, AbortSignal real, debounce, cache deduplicada por ejercicio, JPG lazy, dimensiones fijas, sin blur animado continuo.

- [ ] **Step 4: Medir y commit.**

  ```powershell
  npm.cmd run build
  npm.cmd run test:performance
  npm.cmd run type-check
  ```

  Registrar antes/después en `docs/quality/performance.md`. Commit: `perf: cumplir presupuesto de carga y medios`.

### Task 9: Puerta de experiencia

**Files:**
- Create: `EVRY/tests/e2e/landing-navigation.spec.ts`
- Create: `EVRY/tests/e2e/dashboard-accessibility.spec.ts`
- Create: `EVRY/docs/quality/accessibility.md`
- Create: `EVRY/docs/quality/performance.md`
- Create: `EVRY/docs/design/system.md`

- [ ] **Step 1: Ejecutar matriz visual.**

  Landing, auth, dashboard, rutina, sesión, progreso, ficha, perfil y ciclo en 390×844, 768×1024, 1440×900, zoom 200% y reduced motion. Revisar consola/red.

- [ ] **Step 2: Ejecutar pruebas.**

  ```powershell
  npm.cmd run lint
  npm.cmd run test:unit
  npm.cmd run test:a11y
  npm.cmd run test:e2e -- tests/e2e/landing-navigation.spec.ts tests/e2e/dashboard-accessibility.spec.ts
  npm.cmd run test:performance
  npm.cmd run type-check
  npm.cmd run build
  ```

- [ ] **Step 3: Documentar y commit.**

  Incluir tokens, fuente/licencia, iconos, motion, patrones de estados, resultados axe/teclado y presupuestos reales. Commit: `docs: registrar sistema visual y calidad de experiencia`.
