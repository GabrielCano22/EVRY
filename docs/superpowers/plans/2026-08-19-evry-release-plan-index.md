# EVRY: índice del plan de candidato de lanzamiento

> **Reemplazado el 30 de agosto de 2026.** Este conjunto se conserva como historial. La implementación vigente es la hoja de ruta integral web/móvil/backend y su estado verificable se documenta en `README.md`, `docs/quality/fundamentos.md` y `docs/operations/staging.md`.

> **Para agentes de implementación:** ejecutar con `superpowers:subagent-driven-development` tarea por tarea. No comenzar un plan si su dependencia anterior no está verde.

**Goal:** Coordinar el cierre aprobado de EVRY en cinco planes verificables y publicarlo en GitHub sin despliegue.

**Architecture:** Los planes se ordenan por dependencia. Fundamentos fija contratos y pruebas; entrenamiento y privacidad construyen dominios sobre esa base; experiencia pule superficies ya estables; verificación cierra la puerta y publica.

**Tech Stack:** Next.js/React/TypeScript, NestJS/Prisma/PostgreSQL, Vitest/Testing Library/axe/Playwright, Jest/Supertest, GitHub.

**Spec:** `EVRY/docs/superpowers/specs/2026-08-19-evry-release-candidate-design.md`

## Global Constraints

- La especificación aprobada es la fuente de verdad; un plan no puede ampliar el producto hacia despliegue, comunidad o prescripción médica.
- Cada tarea empieza con una prueba fallida, implementa el mínimo correcto, verifica y crea un commit enfocado.
- Frontend y backend son repositorios separados; toda verificación y publicación se informa por repositorio.
- Los subagentes comparten workspace: nunca editar archivos superpuestos en paralelo.

## Secuencia

1. `2026-08-19-evry-01-fundamentos-seguridad.md`
2. `2026-08-19-evry-02-entrenamiento-progreso-ficha.md`
3. `2026-08-19-evry-03-ciclo-privacidad-inclusion.md`
4. `2026-08-19-evry-04-experiencia-accesibilidad-rendimiento.md`
5. `2026-08-19-evry-05-verificacion-publicacion.md`

Los planes 02 y 03 pueden ejecutar tareas puramente frontend/backend en paralelo solo después de completar los contratos compartidos de 01; la puerta de cada plan se ejecuta de forma serial. El plan 04 espera contratos funcionales estables. El plan 05 no admite trabajo de producto nuevo: cualquier hallazgo vuelve al plan dueño, recibe prueba de regresión y se revalida.
