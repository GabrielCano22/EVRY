# Estado de implementación de la hoja de ruta integral

Actualizado: 31 de agosto de 2026. Este documento distingue implementación, verificación local y aceptación final. No constituye una declaración de preparación para producción.

## Implementado y comprobado localmente

- Worktrees de frontend y backend fuera de OneDrive, rama `codex/evry-optimization`.
- Monorepo npm: web, Expo móvil, contrato API, dominio y tokens.
- Next.js 16, NestJS 12 y Prisma 7; Node 24.14 fijado.
- API v1 con compatibilidad de rutas, errores normalizados, comprobaciones de salud, configuración obligatoria y límites de frecuencia.
- Modelo de revisión/clientId y sincronización transaccional; autenticación móvil y refresh web sin token en localStorage.
- SQLite móvil: sesión y cola persistidas, reintentos con la misma clave, conservación de envíos de resultado incierto, edición concurrente serializada, recuperación de borradores y conflictos explícitos.
- Almacenamiento móvil por cuenta y servidor: todas las operaciones SQLite reciben un propietario explícito y usan una base con nombre derivado mediante SHA-256. Las escrituras pendientes y los acuses de sincronización conservan ese propietario, incluso después de un cambio de cuenta.
- Reapertura offline con identidad previamente validada por `/users/me` y guardada en SecureStore. El estado de entrenamiento y TanStack Query se reinician al cambiar de sesión; un rechazo definitivo del servidor invalida también el estado visible.
- El refresh token queda asociado a su servidor de origen; no se envía a otro entorno. Los tokens anteriores sin información de origen requieren un nuevo login, sin borrar entrenamientos.
- Catálogo móvil con `q/page`, páginas de hasta 30 ejercicios y búsqueda local acotada en SQLite. La pantalla distingue resultados del servidor, copia local desactualizada, vacío, carga y error recuperable; cancelar o rechazar una consulta no se convierte en una lista vacía.
- Rutinas en caché reemplazadas transaccionalmente por la respuesta completa del servidor, incluida la lista vacía. Los fallos de almacenamiento se propagan y no se confunden con fallos de red.
- Miniaturas JPG en el selector, GIF solo tras pulsar reproducir, URLs del servidor/CDN respetadas y avisos de atribución visibles en la ficha.
- Migración SQLite v1→v2 con índice de búsqueda y metadatos de caché: ensayada sobre 205 ejercicios y datos de sesión, series, cola, rutinas, mapeos y medios. Un fallo durante el índice revierte la transacción sin modificar esos datos; se verificó reintento tras reparar el registro de caché inválido.
- Colas de escritura separadas por conexión SQLite: se mantiene la serialización dentro de una cuenta, sin bloquear la apertura de otra cuenta por una escritura demorada.
- Fuente OpenAPI única: 44 operaciones en 33 rutas y 70 esquemas generados desde Nest. El frontend importa el JSON y el cliente del commit fijado del backend; se retiró el YAML manual. Se corrigieron la paginación opcional numérica y la generación de entradas con valores por defecto.
- Importador reproducible: lee artefactos confirmados en Git, verifica origen y hashes, normaliza LF/CRLF y rechaza referencias externas y entradas/respuestas sin tipos. `api:check` no modifica archivos ni consulta la red; CI obtiene el backend por la revisión del lock.
- Recuperación móvil desde el contrato canónico sin perder notas, rutina, calentamiento, técnica ni fecha de las series. Las versiones de servidor malformadas se rechazan antes de reemplazar datos locales; los errores normales de API conservan su mensaje.
- Conflictos únicos compatibles con los metadatos del adaptador PostgreSQL de Prisma 7: los inicios simultáneos recuperan la sesión ganadora y los reintentos de series conservan su idempotencia.
- Autenticación móvil: refresh compartido entre peticiones concurrentes, reintento único ligado a la sesión original, credenciales inmutables por intento y rechazo de respuestas tardías tras logout/cambio de cuenta. Las escrituras SecureStore están serializadas y el logout borra las credenciales locales antes de esperar al servidor.
- Errores de login/logout visibles sin promesas rechazadas sin manejar; protección del estado de usuario frente a inicializaciones y consultas de perfil obsoletas. Los fallos temporales de refresh conservan credenciales; los rechazos definitivos y fallos de persistencia del token rotado las invalidan.
- Pruebas de SQL SQLite reales sustituyendo únicamente el puente nativo; pruebas unitarias backend y de componentes web/móvil.
- Historial por cursor `(endedAt, id)` además de paginación anterior; frecuencia semanal calculada sobre todo el periodo seleccionado.
- Progreso web migrado al formato actual y tipos compartidos; periodos, comparación real, consulta cancelable y carga incremental del historial.
- Configuraciones CI, PostgreSQL de pruebas en CI, Render, EAS APK y guía Vercel/Neon.

## Última verificación local

- Backend: 52 suites / 296 pruebas unitarias, lint, build, tipos de tests/scripts y `openapi:check` correctos.
- Web: 14 archivos / 50 pruebas unitarias y 1 prueba automatizada de accesibilidad correctos; build Next.js correcto.
- Móvil: 16 suites / 83 pruebas, lint y tipos correctos. Las exportaciones Android/iOS y Expo Doctor (21/21) pasaron antes de la última validación defensiva de conflictos; no hay todavía prueba en dispositivo ni APK release.
- Compartidos: 12 pruebas de dominio y 1 de tokens; tipos de todos los workspaces correctos.
- `api:verify-backend` correcto contra `f291aee`; tres pruebas del cliente compartido correctas, incluidos registro con campos opcionales, paginación y errores normalizados. El importador pasó sus 33 pruebas y `api:check` confirmó que no hay diferencias en los artefactos generados.
- PostgreSQL 17.11 aislado: ocho migraciones aplicadas sobre una base nueva de pruebas; 5 suites / 41 pruebas de integración Supertest/PostgreSQL correctas. Se usaron únicamente datos sintéticos y el servidor temporal se detuvo al terminar.
- No ejecutados: Playwright, Maestro, restauración sobre base poblada, mediciones de rendimiento y despliegues.

## Pendiente de cerrar antes de aceptar el plan

### Contratos e integración

- Ejecutar la nueva CI cruzada en GitHub tras publicar primero el commit del backend fijado por el lock. La fuente y la generación ya están unificadas localmente; falta comprobar el flujo remoto completo.
- Revisar todos los consumidores web restantes: no basta con que TypeScript compile; todavía hay contratos antiguos en pantallas y calendario.
- El catálogo móvil ya usa `q/page` y el contrato canónico; falta comprobar el contrato completo de extremo a extremo contra PostgreSQL.
- Ampliar integración PostgreSQL para autenticación rotativa y sincronización offline; ensayar migración sobre una base poblada y backup/restauración. Las cinco suites actuales ya pasaron en PostgreSQL aislado, sin tocar datos reales.
- Ejecutar Playwright y Maestro; los archivos y jobs existen pero no prueban por sí mismos que los escenarios pasen.

### Móvil

- Paridad completa: registro, creación/edición de rutinas, detalle de progreso, edición de ciclo y campos completos de perfil.
- Validar en dispositivo el aislamiento y la reapertura offline ya cubiertos por pruebas locales. La simulación del proceso JS no prueba todavía el ciclo de vida real de Android/iOS, el almacenamiento del sistema ni la sincronización contra PostgreSQL.
- Si existe un `evry.db` de una versión anterior, se conserva intacto y sin propietario asignado. La recuperación requiere identificar al propietario y una importación explícita; no se copiarán sus datos automáticamente a la siguiente cuenta.
- La migración conserva los datos ante una caché malformada, pero aún falta una recuperación de caché dañada orientada al usuario; el ensayo de reparación fue controlado en una base de prueba.
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

No se ha reiniciado ni migrado una base real ni desplegado recursos externos. Este punto de control reúne los avances para el push solicitado por el usuario en ambas ramas `codex/evry-optimization`; no supone la aceptación del plan completo. No se modificó `main`. Las pruebas de SQL SQLite usan memoria temporal; la suite PostgreSQL exige una base con marcador explícito de pruebas y distinta de la base runtime.

El job frontend obtiene `EVRY-Backend` por el commit exacto de `packages/api-client/openapi/backend.lock.json`. Al publicar, ese commit debe existir primero en el remoto backend. Si el repositorio es privado, configure un token de lectura cruzada mediante `EVRY_REPOSITORY_TOKEN`.
