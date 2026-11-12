# EVRY — Tipos de serie y calendario único: entrega y prueba v11

**Fecha:** 12 de noviembre de 2026, zona America/Bogota.
**Alcance:** Fase 1 (entrenamiento con tipos de serie) y Fase 1.5 (calendario único y capa de ciclo) en Android, más la validación física de la APK v11.
**Ramas:** solo `dev`. `prod` no se tocó.

## 1. Entrega

| Repositorio | Commit | Rama | Estado |
|---|---|---|---|
| Backend | `230791e` — `feat(training): tipos de serie y series sin completar` | `dev` | Subido a `origin/dev` |
| Frontend | `c012a6e` — `feat(mobile): sesión de entrenamiento con tipos de serie y calendario único` | `dev` | Subido a `origin/dev` |

- Backend: 18 archivos, migración `20261111090000_workout_set_types`, contrato OpenAPI actualizado.
- Frontend: 58 archivos, 3.605 inserciones y 1.874 eliminaciones.
- El contrato del cliente queda fijado a la revisión `230791e1dec5353313e6adb993b8aa5a1b6b0860` (`packages/api-client/openapi/backend.lock.json`).
- La migración se aplicó a la base local `evry_local` en PostgreSQL 17.11: **12 migraciones, esquema al día**.

Cambios funcionales entregados:

1. `setType` (`WARMUP | NORMAL | FAILURE | DROP`) como fuente de verdad; `isWarmup` se conserva derivado.
2. Descanso al 100 % para normal y fallo, y al 50 % para calentamiento y drop, con suelo de 30 s.
3. `completedAt` nullable: solo las series completadas cuentan para volumen, progreso, estadísticas y récords.
4. Tipo de serie «sticky» por ejercicio y preferencias de descanso persistidas por ejercicio en SQLite v4/v5.
5. Calendario único con entrenamientos, ciclo, racha y hoja del día con detalle inline; se eliminó la pestaña condicional de ciclo.
6. Capa de ciclo oculta de forma coherente en calendario y hoja del día, con acción para mostrarla.
7. Modo offline con guardado local, aviso de estado y sincronización al reconectar.

## 2. Puertas locales

| Puerta | Resultado |
|---|---|
| Móvil (Jest) | **456/456 pruebas, 53 suites**, 0 fallos |
| Móvil `type-check` | Correcto |
| Móvil `expo lint` | Correcto, sin advertencias |
| Dominio (`packages/domain`) | **67/67 pruebas, 6 archivos** (repetido el 2026-11-12) |
| Web `type-check` | Correcto |
| Web accesibilidad | **10/10 pruebas, 5 archivos** |
| Web unitaria | **360/360 pruebas, 58 archivos**; el proceso terminó con código 1 por un error del worker de Vitest al cerrar (temporizador no liberado), no por una prueba fallida |
| Backend unitario | 1.835/1.836; el único fallo era el benchmark de concurrencia, corregido en `c939618` y verificado en aislamiento (**41/41**) |
| Backend integración | **104/104 pruebas, 10 suites** |
| `api:check` | Correcto con el contrato fijado a `230791e` |
| `posttest` móvil | `native-theme`, `maestro-safety` y `metro-cache` sin fallos |

> Matiz honesto: la suite unitaria completa del backend no se repitió después de `c939618`; se repitió únicamente el benchmark afectado. El resto de la suite ya había pasado en la misma ejecución.

## 3. APK v11

| Dato | Valor |
|---|---|
| Paquete | `com.gabrielcano.evry.local` |
| Versión | `1.0.10-local` (`versionCode 11`) |
| Tamaño | 35.020.873 bytes |
| SHA-256 del certificado | `f673b39fb0e8543e6a96a2b9250b9e1a5ec2c80faa2a09ad25b726f06e045ac0` |
| Firma | v2, idéntica a la v10 |
| Arquitectura | `arm64-v8a` |
| Instalación | `adb install -r`, actualización in-place |
| Primera instalación | 2026-10-19 01:53:25 (intacta) |
| `dataDir` | `/data/user/0/com.gabrielcano.evry.local` (sin cambios) |
| minSdk / targetSdk | 24 / 36 |

La APK se compiló desde la copia `D:\e58src` con el init script `evry-sdk58-entrenamiento-v11-e58src.init.gradle`, salida en `D:/e58out11/app` y `-PreactNativeArchitectures=arm64-v8a`. Se mantiene la misma limitación conocida: `ninja 1.10.2` falla con rutas de más de 260 caracteres al incluir `armeabi-v7a`; la APK instalada v10 también era solo `arm64-v8a`.

## 4. Pruebas en dispositivo

Dispositivo `WCOBNF798LNZJVNZ`, API local por `adb reverse tcp:4447`. Todas las comprobaciones terminaron sin errores `ReactNativeJS`, sin cierres y sin ANR.

### 4.1 Entrenamiento y descanso

- La app arrancó conservando la sesión «Verificacion local» y los datos previos; se ven las 4 pestañas fijas, sin pestaña «Ciclo».
- Tarjeta de Press banca: descanso base **02:00** y descanso corto **01:00**.
- Serie marcada como calentamiento (`W`): descanso de **00:56 de 01:00**, etiqueta «Calentamiento · descanso corto».
- `+15` ajustó la base a **02:15** y el corto a **01:15**, y el cambio persistió por ejercicio en una sesión posterior y en modo offline.
- «Omitir» cerró la barra; una serie normal posterior arrancó el descanso completo de **02:15**.
- La serie nueva heredó el tipo sticky (`W`) y copió los valores 20 × 10 de la serie anterior.
- Métricas de cabecera tras completar calentamiento y normal: **volumen 200 kg, 1 serie**; el calentamiento no contó.

### 4.2 Calendario, hoja del día y ciclo

- Calendario único: racha «1 día», entrenamientos con relleno azul, anillo de ciclo y leyenda.
- Hoja del día: resumen `5:05 · 200 kg · 2 series`; «Ver sesión» expandió el detalle inline «Press banca 20 kg × 10».
- Formulario de ciclo inline con fecha 2026-11-12.
- Privacidad: «Ocultar ciclo» quitó el anillo, cambió el título y la leyenda, y la hoja del día mostró «La capa de ciclo está oculta…» con la acción «Mostrar capa de ciclo». Al reactivarla, el anillo volvió.

### 4.3 Offline y reconexión

- Sin `adb reverse`, la app entró en modo local con aviso explícito; el catálogo local se mostró con su propio aviso.
- Sesión registrada sin conexión: «Guardado localmente». Las rutinas mostraron «Conéctate para administrar rutinas» y «Reintentar rutinas».
- Al restaurar el túnel, Android no detectó el cambio de red (el túnel es invisible para el sistema); tras reiniciar la app, el estado pasó a «Sincronizado» y la sesión llegó al backend.

## 5. Verificación en API y base de datos

Consulta `GET /workouts/{id}` con la cuenta QA:

| Sesión | Orden | `setType` | `isWarmup` | Peso × reps | `completedAt` |
|---|---|---|---|---|---|
| Online (inicio 20:22:22Z) | 0 | `WARMUP` | `true` | 20 × 10 | 2026-11-12T20:25:09.722Z |
| Online (inicio 20:22:22Z) | 1 | `NORMAL` | `false` | 20 × 10 | 2026-11-12T20:26:57.721Z |
| Offline sincronizada (inicio 20:32:05Z) | 0 | `NORMAL` | `false` | 22,5 × 8 | 2026-11-12T20:33:44.926Z |

La base confirma el contrato completo: tipo de serie, bandera derivada y fecha de finalización por serie.

## 6. Git y artefactos

- Frontend `dev` = `c012a6e`, backend `dev` = `230791e`; ambos en `origin/dev`.
- Checkout principal del frontend limpio; `apps/mobile/android` no está versionado en git.
- No se modificó `prod`.
- Artefactos temporales que siguen en disco y **no** se han borrado: `D:\e58src`, `D:\e58a`, `D:\e58out11`, `D:\evsrc`, `D:\evcxx`, los init scripts `evry-sdk58-entrenamiento-v11*.init.gradle` y las capturas `v11-*.png` en `D:\DatosPC\Temp\opencode`.

## 7. CI bloqueado

GitHub Actions **no ejecuta** los workflows del repositorio: la cuenta presenta un bloqueo por facturación, con ticket de soporte **#4986721**. Los commits están publicados en `origin/dev`, pero no existe una ejecución remota que los valide.

Consecuencias:

- No se declara CI verde. Las puertas locales anteriores son evidencia local, no sustituyen a CI.
- La verificación del contrato y de las suites se hizo en el checkout principal y en la base local.
- Cuando se resuelva el bloqueo hay que ejecutar CI sobre `c012a6e` (frontend) y `230791e` (backend) antes de promover a `prod`.

## 8. Evidencia

- `D:\DatosPC\Temp\opencode\jest-full.json` — 53 suites, 456 pruebas.
- `D:\DatosPC\Temp\opencode\web-unit.log`, `web-a11y.log`, `lint.log`.
- `D:\DatosPC\Temp\opencode\evry-backend-unit-20261110.log`, `evry-backend-benchmark-rerun.log`, `evry-backend-integration-20261110.log`.
- `D:\DatosPC\Temp\opencode\evry-android-entrenamiento-v11-build-7.log` — `BUILD SUCCESSFUL in 12m 8s`.
- `D:\e58out11\app\outputs\apk\release\app-release.apk`.
- Capturas: `v11-start.png`, `v11-train-2.png`, `v11-exercise-added.png`, `v11-rest-warmup.png`, `v11-rest-plus15.png`, `v11-rest-normal-2.png`, `v11-metrics.png`, `v11-progress.png`, `v11-daysheet.png`, `v11-detail.png`, `v11-cycle-form.png`, `v11-cycle-hidden.png`, `v11-daysheet-hidden.png`, `v11-profile-rest.png`, `v11-offline-home.png`, `v11-off-finish.png`, `v11-online-again.png`.
