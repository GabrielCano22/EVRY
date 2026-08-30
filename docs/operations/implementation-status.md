# Estado de implementación de la hoja de ruta integral

Actualizado: 30 de agosto de 2026. Este documento distingue implementación, verificación local y aceptación final. No constituye una declaración de preparación para producción.

## Implementado y comprobado localmente

- Worktrees de frontend y backend fuera de OneDrive, rama `codex/evry-optimization`.
- Monorepo npm: web, Expo móvil, contrato API, dominio y tokens.
- Next.js 16, NestJS 12 y Prisma 7; Node 24.14 fijado.
- API v1 con compatibilidad de rutas, errores normalizados, comprobaciones de salud, configuración obligatoria y límites de frecuencia.
- Modelo de revisión/clientId y sincronización transaccional; autenticación móvil y refresh web sin token en localStorage.
- SQLite móvil: sesión y cola persistidas, reintentos con la misma clave, conservación de envíos de resultado incierto, edición concurrente serializada, recuperación de borradores y conflictos explícitos.
- Pruebas de SQL SQLite reales sustituyendo únicamente el puente nativo; pruebas unitarias backend y de componentes web/móvil.
- Historial por cursor `(endedAt, id)` además de paginación anterior; frecuencia semanal calculada sobre todo el periodo seleccionado.
- Progreso web migrado al formato actual y tipos compartidos; periodos, comparación real, consulta cancelable y carga incremental del historial.
- Configuraciones CI, PostgreSQL de pruebas en CI, Render, EAS APK y guía Vercel/Neon.

## Última verificación local

- Backend: 45 suites / 236 pruebas unitarias, lint y comprobación de tipos de tests/scripts correctos.
- Web: 14 archivos / 50 pruebas unitarias y 1 prueba automatizada de accesibilidad correctos; build Next.js correcto.
- Móvil: 10 suites / 26 pruebas correctas; exportaciones Android/iOS verificadas (no equivalen a pruebas en dispositivo ni a un APK release).
- Compartidos: 12 pruebas de dominio y 1 de tokens; tipos de todos los workspaces correctos.
- Regeneración sin diferencias de cada snapshot OpenAPI por separado. Todavía no existe una comprobación cruzada backend/clientes.
- No ejecutados: PostgreSQL/Supertest, Playwright, Maestro, restauración sobre base poblada, mediciones de rendimiento y despliegues.

## Pendiente de cerrar antes de aceptar el plan

### Contratos e integración

- Unificar la fuente OpenAPI: el snapshot generado por Nest y el YAML consumido por los clientes aún son distintos. Completar respuestas DTO y hacer que CI detecte diferencias entre repositorios.
- Revisar todos los consumidores web restantes: no basta con que TypeScript compile; todavía hay contratos antiguos en pantallas y calendario.
- Corregir el contrato del catálogo móvil (`q/page` del servidor frente a `search/cursor` del YAML) y no ocultar fallos HTTP como cachés vacías.
- Ejecutar integración/Supertest y migraciones sobre PostgreSQL aislado. No se ha configurado `TEST_DATABASE_URL` local ni ejecutado sobre datos reales.
- Ejecutar Playwright y Maestro; los archivos y jobs existen pero no prueban por sí mismos que los escenarios pasen.

### Móvil

- Paridad completa: registro, creación/edición de rutinas, detalle de progreso, edición de ciclo y campos completos de perfil.
- Aislar caché/SQLite y cola por usuario; probar cambio de cuenta sin mezclar entrenamientos.
- Serializar refresh móvil concurrente y proteger resultados tardíos después de logout/cambio de cuenta.
- Completar feedback de errores al guardar localmente, reconexión y servidor gratuito en arranque frío.
- Límite explícito y expulsión LRU de miniaturas; actualmente no se descargan GIF en listas pero falta el presupuesto de caché.
- Pruebas de cierre/reapertura reales, Android release, iPhone/Expo Go y APK privado.

### Web, rendimiento y operación

- Completar migración de todas las pantallas al cliente generado y TanStack Query.
- Sustituir carga global del calendario por actividad agregada acotada al mes; quitar condicionamiento de ciclo por sexo en consumidores restantes.
- Agregar puntos de progreso acotados/agregados en SQL: el historial está paginado, pero la serie temporal aún puede crecer con todo el historial.
- Validar accesibilidad con navegador, teclado, zoom, lector de pantalla y movimiento reducido.
- Medir LCP/INP/CLS, latencias p95 calientes y memoria/arranque Android release; no se han alcanzado ni demostrado esos presupuestos.
- Crear recursos de staging y configurar credenciales/orígenes; publicar en orden, ensayar backup/restauración y contrastar conteos/estadísticas.

## Auditoría de dependencias

La auditoría local encontró un aviso alto en `brace-expansion` 1.1.14, transitivo de ESLint. Se actualizó únicamente esa dependencia a 1.1.18, una versión corregida según el [aviso del mantenedor](https://github.com/advisories/GHSA-rgw5-rvv9-x895). Quedan 11 avisos moderados en la cadena de herramientas Expo/xcode/uuid, asociados al [aviso de uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq); requieren revisar compatibilidad y alcance antes de aplicar una actualización. No se ejecutó `npm audit fix --force` ni se degradó Expo.

## Preservación de datos y límites

No se ha reiniciado ni migrado una base real, ni desplegado recursos externos, ni enviado cambios a GitHub. Los commits son locales en los worktrees. Las pruebas de SQL SQLite usan memoria temporal; la suite PostgreSQL exige una base con marcador explícito de pruebas y distinta de la base runtime.

Las configuraciones de CI deben revisarse al publicar ambas ramas: el job frontend que obtiene `EVRY-Backend` usa su rama predeterminada, por lo que necesita que los cambios compatibles del backend estén disponibles allí o un ref explícito coordinado.
