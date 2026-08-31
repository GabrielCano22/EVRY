# Punto de control solicitado: 31 de agosto de 2026

Instantánea de trabajo en `codex/evry-optimization`; no es una versión lista para producción ni el cierre del plan integral.

## Avance incluido

- Frontend: aislamiento de colas SQLite por cuenta y catálogo móvil paginado con estados de caché recuperables.
- Backend: contrato OpenAPI generado desde Nest y cliente TypeScript generado, hasta el commit `b2407c4`.
- Frontend en desarrollo: importación y verificación cruzada del contrato, pruebas del cliente compartido y configuración CI para fijar la revisión del backend.

## Pendientes conocidos de esta instantánea

- La importación del contrato canónico al frontend no está terminada: faltan `packages/api-client/openapi/backend.lock.json` y el snapshot JSON. El YAML y los tipos anteriores siguen presentes.
- `npm run api:check` falla por ausencia de `backend.lock.json`; los jobs de contrato y calidad no están listos para pasar CI.
- Las pruebas ampliadas del importador cubren correcciones aún pendientes: normalización de finales de línea, lectura de artefactos desde Git, validación del origen, respuestas tipadas y rechazo de referencias externas.
- Falta adaptar y verificar los consumidores web/móvil con los tipos canónicos del backend.
- Las dos pruebas de `@evry/api-client` pasan con los tipos actuales; esto no demuestra compatibilidad con el contrato nuevo.

No se ejecutan migraciones sobre datos reales, despliegues ni cambios en `main` como parte de este punto de control.
