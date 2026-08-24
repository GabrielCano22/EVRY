# Fundamentos verificables de EVRY

Este documento reúne el contrato que ya implementan el frontend y el backend de la rama de release candidate. No sustituye las pruebas automatizadas.

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

## Evidencia de las tareas 1 a 6

| Tarea | Evidencia presente |
| --- | --- |
| 1 | Configuraciones Vitest, accesibilidad y Playwright; guard de base de prueba y runners de Jest. |
| 2 | `lib/civil-date.ts` y sus pruebas unitarias de fronteras de calendario. |
| 3 | `src/common/dates/civil-date.ts`, tipo `CycleEstimate` y pruebas de rango/zona. |
| 4 | `lib/api.ts`, `lib/remote-data.ts`, pruebas de API y estados remotos. |
| 5 | Validación de entorno, cookies de refresh, DTOs acotados, filtros y pruebas de autenticación/configuración. |
| 6 | Filtros Prisma, migración `20260819090000_release_invariants`, esquema e integración contra PostgreSQL aislado. |

## Puerta reproducible

Con las variables de prueba aisladas configuradas en la sesión de PowerShell, ejecute primero el backend:

```powershell
npm.cmd run lint:check
npm.cmd run test:unit -- --runInBand
npm.cmd run test:integration -- --runInBand
npm.cmd run build
```

Después, desde el frontend:

```powershell
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run type-check
npm.cmd run build
```

`type-check` y `build` del frontend deben ejecutarse secuencialmente. Los directorios `.env`, `dist`, `.next`, `.next-dev`, `coverage` y los artefactos de Playwright no se incluyen en commits.

## Límite de esta puerta

Esta puerta no ejecuta Playwright/Chromium. El comando `test:e2e` queda disponible, pero su resultado no se afirma en este documento.
