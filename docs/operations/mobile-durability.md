# Finalización móvil y durabilidad local

## Alcance del checkpoint local — 3 de octubre de 2026

La sesión permanece bloqueada en estado `COMPLETED` mientras termina su
escritura en SQLite. Solo entonces se libera el espacio para otra sesión.
Un fallo conserva la sesión activa y sus series para reintentar; no se declara
éxito ni se pierde la promesa rechazada en la pantalla.

La pantalla muestra «Finalizando sesión…» mientras espera, en lugar de
«Guardado localmente». La confirmación háptica ocurre después del guardado y
únicamente si sigue vigente la sesión de usuario. Un fallo de háptica no
revierte el entrenamiento guardado.

## Evidencia reproducible

Desde la raíz del monorepo:

```powershell
npm run test --workspace apps/mobile -- --runTestsByPath src/training/train-screen.test.tsx src/training/training-store.test.ts
```

Las regresiones reprodujeron primero la apertura prematura de otra sesión,
la confirmación antes del guardado y el rechazo sin consumir al fallar SQLite.
Después del cambio pasaron las 11 pruebas de esos dos archivos. La pantalla,
el estado Zustand, las consultas y el dominio son reales; almacenamiento,
red y hápticas nativas están sustituidos en Node.

La suite raíz pasó 489 pruebas antes de añadir dos casos de feedback. Después
pasó de nuevo la suite móvil completa: 29 suites / 233 pruebas, incluidos
sesión invalidada durante el guardado, háptica rechazada, finalización repetida
y mutaciones bloqueadas durante el guardado. Pasaron tipos y lint de todos
los workspaces, y otra vez los móviles después de ampliar las pruebas.
`expo-doctor` pasó 21/21 comprobaciones y ambas exportaciones locales
Android/iOS terminaron correctamente con API de prueba `.invalid`; son bundles,
no APK, instalación en dispositivo ni build nativo de release.

La revisión independiente no encontró problemas críticos/importantes. Sus
tres sugerencias menores de cobertura se incorporaron a las pruebas. Las
limitaciones de ejecución nativa, autenticación integral y sincronización
backend siguen pendientes; no se consideran aprobadas por esta revisión.

## Límites

Estas pruebas no demuestran durabilidad tras matar el proceso, SecureStore
real, tiempos de arranque, memoria ni aceptación Android/iPhone. No se
encontraron `adb`/emulador en PATH ni un SDK en las rutas convencionales
inspeccionadas; no se concluye que no exista en otra ubicación.

Faltan SDK/dispositivo y pruebas nativas de cierre, reapertura y reconexión.
No se instalaron binarios, borraron datos de dispositivos, crearon recursos
externos ni ejecutaron builds remotos. La corrección cubre la finalización;
no certifica todos los estados de guardado de las demás mutaciones.

La publicación sigue condicionada a la auditoría alta del monorepo. No se
deben omitir avisos, reducir el umbral ni publicar con una puerta conocida roja.
