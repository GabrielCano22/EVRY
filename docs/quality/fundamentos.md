# Fundamentos verificables de EVRY

Este documento reúne fundamentos del frontend y el backend. El frontend actual
es un monorepo: ejecuta los comandos de workspace desde su raíz, no desde
`apps/web`. La matriz de tareas de agosto se conserva como historial; consulta
el [estado de implementación](../operations/implementation-status.md) para
conocer los resultados y límites vigentes. Este documento no acredita una
puerta verde ni sustituye las pruebas automatizadas.

## Matriz de datos remotos

| Estado | Significado | Datos disponibles |
| --- | --- | --- |
| `idle` | Aún no se inició una carga o se canceló sin datos previos. | No. |
| `loading` | Hay una solicitud en curso. | No. |
| `success` | La solicitud terminó correctamente. | Sí. |
| `empty` | La solicitud terminó correctamente, sin elementos según el criterio de la vista. | Sí, vacíos. |
| `error` | La solicitud falló. | Puede conservar `staleData`. |

`ApiResult<T>` conserva el resultado discriminado de cada solicitud. Los fallos contienen estado, código, mensaje seguro y si son reintentables. Se consideran reintentables los timeouts, red, 429 y 5xx; una cancelación intencional no se presenta como falla reintentable.

## Frontera de fecha civil

La fecha civil usa el formato `AAAA-MM-DD` y la zona `America/Bogota`. En frontend se valida por componentes y los timestamps se convierten a día local. En backend una fecha civil se parsea sin delegar `AAAA-MM-DD` a `new Date(string)` y los filtros convierten el límite final inclusivo a un intervalo de base de datos semiabierto. Las pruebas cubren año bisiesto, fin de mes/año, rango invertido y los límites de Bogotá.

## Seguridad y configuración

El backend valida al arrancar la URL PostgreSQL, el puerto, el opt-in de Swagger y dos secretos JWT distintos de al menos 32 caracteres. No hay valores de respaldo para secretos. Las pruebas de integración exigen una `TEST_DATABASE_URL` distinta de la URL de runtime y con marcador explícito de prueba; el guard configura Prisma solamente después de comprobarlo.

El frontend usa una frontera HTTP que no degrada errores a datos vacíos. La sesión distingue comprobación, autenticación, anonimato y error; el refresh se comparte por generación de sesión y no invalida la sesión por un problema temporal de red.

## Estrategia de datos: expandir, normalizar y verificar

La migración de invariantes primero añade columnas nullable para compatibilidad. Luego reporta y normaliza sesiones activas duplicadas conservando la más reciente y cancelando las anteriores. Finalmente verifica la ausencia de duplicados y crea los índices y unicidades. La prueba de integración inspecciona columnas e índices y comprueba que PostgreSQL rechaza una segunda sesión activa. No hay borrado de sesiones ni series en ese flujo.

## Evidencia histórica de las tareas 1 a 6

| Tarea | Evidencia presente |
| --- | --- |
| 1 | Configuraciones Vitest, accesibilidad y Playwright; guard de base de prueba y runners de Jest. |
| 2 | `apps/web/lib/civil-date.ts`, `packages/domain/src/civil-date.ts` y sus pruebas de fronteras de calendario. |
| 3 | `src/common/dates/civil-date.ts`, tipo `CycleEstimate` y pruebas de rango/zona. |
| 4 | `apps/web/lib/api.ts`, `apps/web/lib/remote-data.ts`, pruebas de API y estados remotos. |
| 5 | Validación de entorno, cookies de refresh, DTOs acotados, filtros y pruebas de autenticación/configuración. |
| 6 | Filtros Prisma, migración `20260819090000_release_invariants`, esquema e integración contra PostgreSQL aislado. |

## Comprobación básica local

Con las variables de prueba aisladas configuradas en la sesión de PowerShell, ejecute primero el backend:

```powershell
npm.cmd run lint:check
npm.cmd run test:unit -- --runInBand
npm.cmd run test:integration -- --runInBand
npm.cmd run build
```

Después, desde la raíz del monorepo frontend:

```powershell
npm.cmd run api:test
npm.cmd run api:check
npm.cmd run test:mobile:backend:safety
npm.cmd run lint
npm.cmd run type-check
npm.cmd run test
npm.cmd run build
```

`type-check` y `build` del frontend deben ejecutarse secuencialmente. Los directorios `.env`, `dist`, `.next`, `.next-dev`, `coverage` y los artefactos de Playwright no se incluyen en commits.

`test` ejecuta primero los controles de seguridad del ejecutor E2E y después
los workspaces, incluidos los casos móviles, controles nativos,
controles de seguridad del YAML de Maestro, pruebas web, accesibilidad y
paquetes compartidos. `test:unit` no existe en la raíz; para ejecutar únicamente
las unitarias web selecciona el workspace `@evry/web`. No interpretes una
comprobación separada como resultado del comando raíz.

## Límites y verificaciones adicionales

La comprobación básica anterior no es toda CI: faltan auditoría de dependencias,
compatibilidad con el backend fijado, integración PostgreSQL, migraciones,
Playwright, rendimiento, Expo Doctor y exports móviles. Revisa los pasos
actuales en [CI frontend](../../.github/workflows/ci.yml) y la configuración
equivalente del repositorio backend. Un fallo en esas puertas impide declarar
el checkpoint verificado aunque los comandos básicos pasen.

Sí existen especificaciones E2E en `apps/web/tests/e2e/`, entre ellas login,
entrenamiento, calendario, contexto de usuario e historial paginado. No se
ejecutan mediante `npm run test`: la entrada raíz es `npm run test:e2e`.
Playwright requiere Chromium, ambos proyectos compilados y una base local de
pruebas explícita y separada mediante `TEST_DATABASE_URL`; la configuración
resuelve el backend con `EVRY_BACKEND_ROOT`. La entrada raíz descubre los casos
con el propio Playwright y crea una base nueva y migrada por archivo; ejecuta
ambos proyectos y comprueba que todos los casos descubiertos pasan, sin saltos
ni reintentos. El rol de la conexión de aprovisionamiento requiere `CREATEDB`.
No se borran ni reinician bases o cuotas: las bases e informes quedan conservados
en `.worktrees/web-e2e-isolated-*` para diagnosticar fallos. La entrada directa
del workspace sigue disponible para diagnósticos explícitos, sin este aislamiento
automático; no sustituye la puerta raíz completa. No apuntes estos ejecutores a datos
reales ni reinicies una base para facilitar una prueba. Consulta los requisitos
de aislamiento y el [registro de rendimiento](../operations/web-performance.md)
antes de iniciar los servicios. La existencia de las especificaciones no
certifica su ejecución actual ni los presupuestos de rendimiento.
