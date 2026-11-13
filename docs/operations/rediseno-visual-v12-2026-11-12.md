# EVRY — Rediseño visual v12 inspirado en Hevy: entrega y prueba

**Fecha:** 12 de noviembre de 2026, zona America/Bogota.
**Alcance:** rediseño visual integral de la app Android (Inicio, Entrenar, Progreso y Perfil) sobre el comportamiento funcional ya entregado en v11. No cambia el contrato, la base de datos ni la lógica de entrenamiento.
**Ramas:** solo `dev`. `prod` no se tocó.

## 1. Entrega

| Repositorio | Commit | Rama | Estado |
|---|---|---|---|
| Frontend | `3289ced` — `feat(mobile): rediseno visual v12 inspirado en Hevy` | `dev` | Publicado en `origin/dev` |
| Backend | `230791e` — sin cambios en esta entrega | `dev` | Sin cambios |

- Frontend: **36 archivos**, 2.938 inserciones y 791 eliminaciones; incluye el nuevo `apps/mobile/src/ui/icon.tsx`.
- El backend no se modificó: la v12 es una entrega de interfaz.
- Se conservaron el paquete `com.gabrielcano.evry.local`, la firma, la sesión y los datos locales; la instalación fue in-place.
- Se conservaron los textos y `accessibilityLabel` que usan las pruebas (`Tipo de serie: …`, `Serie N`, `Ocultar capa de ciclo`, `Restar/Añadir quince segundos`, `Omitir descanso`, etc.).

Comportamiento funcional que se mantiene sin cambios:

1. `setType` (`WARMUP | NORMAL | FAILURE | DROP`) como fuente de verdad.
2. Solo las series con `completedAt` cuentan para volumen y progreso; los calentamientos no cierran la sesión.
3. Descanso al 100 % para normal y fallo, al 50 % para calentamiento y drop, con suelo de 30 s y `+15` persistido por ejercicio.
4. Calendario único con entrenamientos y capa de ciclo, con ocultar/mostrar coherente en calendario y hoja del día.
5. Guardado local, modo offline y sincronización al reconectar.

## 2. Sistema visual

La app abandona el azul marino de v11 y adopta un lenguaje oscuro casi negro, denso y con acento azul, inspirado en Hevy pero con identidad propia.

### 2.1 Tokens (`src/ui/theme.ts`)

| Rol | Valor |
|---|---|
| Fondo | `#0A0B0D` |
| Fondo elevado | `#101216` |
| Superficie / alta / máxima | `#16181D` / `#21242B` / `#2B2F37` |
| Borde | `#2E323B` |
| Texto / atenuado / tenue | `#F4F6F9` / `#98A2B3` / `#6C7686` |
| Primario / pulsado / suave | `#168DFF` / `#0F7AE0` / `rgba(22,141,255,0.14)` |
| Éxito / aviso / error | `#30D158` / `#FF9F0A` / `#FF453A` |
| Ciclo | `#FF8A8A` |
| Radios | `20` y `28` para tarjetas y hojas; `full` para píldoras |
| Escala tipográfica | 34 / 28 / 20 / 16 / 15 / 12 / 10 |

Se conservan los tokens compartidos de marca para semántica y se añade la escala móvil específica. No se introdujo una fuente personalizada: se usa la tipografía del sistema.

### 2.2 Iconografía y componentes

- `AppIcon` envuelve `expo-symbols` (Material Symbols) con tamaño y `tintColor` uniformes, y se oculta de accesibilidad para no duplicar etiquetas.
- `components.tsx` reúne tarjetas, botones (`primary`, `secondary`, `ghost`, `danger`, compactos), campos, píldoras de estado, estados vacíos y el indicador de sincronización.
- `bottom-sheet.tsx` estandariza la hoja inferior: asa, título, descripción, cierre accesible y área segura.
- Se ocultó la cabecera nativa de las pestañas (`headerShown: false`); cada pantalla usa su propio `ScreenHeader` para controlar densidad y jerarquía.
- Icono de app: «E» azul inclinada con punto coral; icono adaptativo, monocromo, favicon y splash con fondo `#0A0B0D`.

## 3. Pantallas rediseñadas

| Área | Cambios principales |
|---|---|
| Login y registro | Fondo oscuro, marca centrada, campos y botones del nuevo sistema, mensajes de error con contraste alto |
| Inicio | Saludo y fecha, estado de sincronización, tarjeta de sesión en curso, accesos y resumen del día |
| Entrenar | Cabecera propia, estado vacío, sesión activa con métricas, tarjetas de ejercicio densas, lista de rutinas |
| Serie | Fila con tipo, ordinal, anterior, objetivo, kg, reps y check; estados completado y no completado |
| Tipo de serie | Hoja con las 4 opciones, descripción y color por tipo; selección persistente por ejercicio |
| Opciones de ejercicio | Hoja con descanso por ejercicio, historial y acciones |
| Descanso | Barra con tiempo grande, pausa/reanudar, `±15`, omitir y anuncio de fin |
| Selector de ejercicio | Búsqueda por nombre, equipo o músculo; filas con grupo principal y acción de añadir |
| Rutinas | Tarjetas con ejercicios y acciones; editor con nombre `1. Sentadilla` en línea |
| Progreso | Calendario con capa de ciclo, rangos 30/90 días, 6 meses, 1 año y todo; mapa muscular y detalle por ejercicio |
| Hoja del día | Resumen, detalle inline de la sesión y registro de ciclo, con capa oculta coherente |
| Perfil | Objetivos, seguimiento de ciclo, promedios, readiness, descanso y cuenta |
| Readiness | Cuatro contadores (sueño, estrés, dolor, motivación), «Dejar sin registrar» y guardado |
| Descanso (Perfil) | Base y corto, `±15`, guardado automático y texto de alcance local |

## 4. Puertas locales

| Puerta | Resultado |
|---|---|
| Móvil `type-check` | Correcto (`tsc --noEmit`, salida 0) |
| Móvil `expo lint` | Correcto, sin advertencias (salida 0) |
| Móvil Jest | **456/456 pruebas, 53 suites**, 0 fallos, 226,9 s |
| `RoutineManager` | 47 pruebas correctas |
| `posttest` `native-theme` | 4/4 |
| `posttest` `maestro-safety` | 2/2 |
| `posttest` `metro-cache` | 2/2 |

Registro completo: `D:\DatosPC\Temp\opencode\v12-gates.log`.

> Matiz honesto: estas puertas son locales. No sustituyen a CI y no incluyen una prueba visual automatizada de píxeles.

## 5. APK v12

| Dato | Valor |
|---|---|
| Paquete | `com.gabrielcano.evry.local` |
| Versión | `1.0.11-local` (`versionCode 12`) |
| Tamaño | 34.896.113 bytes |
| SHA-256 del APK | `f544dfccac77ca8c6776123ce75a7eca32514bc98e2d744b4f274cb4a73f7d50` |
| Certificado SHA-256 | `f673b39fb0e8543e6a96a2b9250b9e1a5ec2c80faa2a09ad25b726f06e045ac0` |
| Firma | v2, idéntica a v10 y v11 |
| Arquitectura | `arm64-v8a` |
| minSdk / targetSdk | 24 / 36 |
| Instalación | `adb install -r`, actualización in-place |
| `lastUpdateTime` | 2026-11-12 17:11:08 |
| Primera instalación | 2026-10-19 01:53:25 (intacta) |
| `dataDir` | `/data/user/0/com.gabrielcano.evry.local` (sin cambios) |
| Compilación | `BUILD SUCCESSFUL in 24m 3s` |

La APK se compiló desde la copia `D:\e58src` (sin `.git`), con el árbol `android` regenerado mediante `npx expo prebuild --platform android --clean --no-install`, salida en `D:\e58out12` y `-PreactNativeArchitectures=arm64-v8a`. Se mantiene la limitación conocida de `ninja 1.10.2` con rutas largas al incluir `armeabi-v7a`; la APK instalada es solo `arm64-v8a`.

## 6. Pruebas en dispositivo

Dispositivo `CPH2239` (Android 11), serie `WCOBNF798LNZJVNZ`, API local por `adb reverse tcp:4447`. Salvo las limitaciones del apartado 8, no aparecieron errores `ReactNativeJS`, cierres ni ANR.

### 6.1 Inicio y navegación

- La app arrancó conservando la sesión «Verificacion local» y los datos previos.
- Se ven las 4 pestañas fijas (Inicio, Entrenar, Progreso, Perfil), sin pestaña condicional de ciclo.
- Inicio muestra el saludo, el estado «Sincronizado» y la tarjeta «SESIÓN EN CURSO» cuando existe una sesión reanudable.

### 6.2 Entrenamiento

- Sesión libre creada; el selector de ejercicios abrió con búsqueda y catálogo, y se añadió «Abdominal 3/4».
- La hoja de tipo mostró las 4 opciones con su descripción: Calentamiento, Normal, Al fallo y Drop set.
- Se marcó la serie como calentamiento: la API guardó `setType=WARMUP` y la fila adoptó el color y la etiqueta correspondientes.
- La serie 5 kg × 10 se completó y quedó con `completedAt` en la base.
- Con la serie aún como calentamiento, «Terminar» mostró la validación esperada: «Necesitas al menos una serie completada…» (los calentamientos no cierran la sesión). Al cambiar el tipo a normal, el volumen subió a 50 kg y la sesión terminó correctamente.
- La barra de descanso apareció tras completar la serie, mostró `02:00` y se cerró al agotarse; el detalle se verificó por captura y por API/BD (apartado 7).

### 6.3 Progreso

- Calendario único con relleno de entrenamiento, anillo de ciclo, punto de hoy y leyenda.
- «Ocultar ciclo» retiró el anillo y la leyenda; la acción inversa lo restauró.
- Rangos 30 días, 90 días, 6 meses, 1 año y Todo visibles y seleccionables.
- Mapa muscular con leyenda, notas de alcance y créditos.
- Apareció un error transitorio «No pudimos cargar el progreso»; «Reintentar» lo resolvió y cargaron mapa, notas y detalle.
- Hoja del día con detalle inline de la sesión (`Abdominal 3/4 · 1 serie · 5 kg × 10`).

### 6.4 Perfil, readiness y descanso

- Objetivos, seguimiento de ciclo, promedios de ciclo y periodo, y «Guardar perfil» visibles y usables.
- Readiness: 7 h de sueño, estrés 3, dolor 2, motivación 3; al guardar apareció «Readiness guardado para hoy.».
- Descanso: base `02:00` y corto `01:00`; `+15` llevó a `02:15` / `01:15`, y `−15` volvió a `02:00` / `01:00`; el texto «Guardado automático.» confirmó la persistencia.

### 6.5 Rutinas

- «Reintentar rutinas» cargó «Verificacion OPPO» (1 ejercicio, Sentadilla con barra).
- «Empezar rutina» creó la sesión `Verificacion OPPO` en estado `ACTIVE`, sincronizada con el backend.
- El editor de rutinas **no se abrió en el dispositivo**: la lista seguía marcada como `stale` y `mutationsDisabled = routinesStale || pending` bloquea crear, editar y eliminar. Es el comportamiento intencional documentado; el editor se validó con las 47 pruebas de `RoutineManager` y revisión de código, no en pantalla.

## 7. Verificación en API y base de datos

Sesiones de la cuenta QA en la base local `evry_local` (PostgreSQL 17.11):

| Sesión | Inicio | Estado | Series | Volumen |
|---|---|---|---|---|
| Entrenamiento libre | 20:22:22 | `COMPLETED` 20:27:27 | 2 completadas | 200 kg |
| Entrenamiento libre | 20:32:05 | `COMPLETED` 20:34:01 | 1 completada | 180 kg |
| Entrenamiento libre | 23:22:10 | `COMPLETED` 23:40:24 | 1 completada | 50 kg |
| Verificacion OPPO | 23:51:19 | `ACTIVE` | 3 sin completar | 0 kg |

Series de la sesión de la prueba v12:

| `setType` | Peso × reps | `completedAt` |
|---|---|---|
| `NORMAL` | 5 × 10 | 2026-11-12 23:33:15.282 |

La sesión de rutina quedó con `routineId = cmvexssz50006dsrqulp44wqo` y tres series `NORMAL` vacías, creadas por la plantilla.

Readiness persistido:

| `civilDate` | `sleepHrs` | `stress` | `soreness` | `motivation` | `score` |
|---|---|---|---|---|---|
| 2026-11-12 | 7 | 3 | 2 | 3 | 70 |

## 8. Limitaciones honestas

1. **`uiautomator dump` en la sesión activa.** La pantalla de sesión vuelve a renderizar cada segundo por el cronómetro y `uiautomator` falla de forma intermitente con «could not get idle state». Esa pantalla se verificó con capturas y con API/BD, no con la jerarquía completa.
2. **Editor de rutinas.** No se abrió en el dispositivo por el bloqueo intencional de la lista `stale`; queda pendiente una comprobación manual cuando la lista esté fresca. No se forzó el estado ni se desactivó la protección.
3. **Sesión de rutina activa.** «Verificacion OPPO» quedó `ACTIVE` con 3 series sin completar. No se canceló desde la UI porque el flujo de cancelación no era alcanzable con el dump inestable de la sesión; queda reanudable y cancelable a mano.
4. **Revisión visual.** Las capturas se guardaron, pero no se hizo una comparación píxel a píxel ni una auditoría de contraste instrumentada. La coherencia se sostiene en los tokens, la jerarquía de accesibilidad y la revisión de código.
5. **CI.** GitHub Actions sigue bloqueado por facturación (ticket **#4986721**); no hay ejecución remota que valide `3289ced`.
6. **`versionName`.** Se mantiene `1.0.11-local` con `versionCode 12`; Android usa `versionCode` para la actualización, así que no hay downgrade.

## 9. Artefactos

- `D:\DatosPC\Temp\opencode\v12-gates.log` — type-check, lint, Jest 456/456 y posttests.
- `D:\DatosPC\Temp\opencode\evry-android-rediseno-v12-build.log` — `BUILD SUCCESSFUL in 24m 3s`.
- `D:\e58out12\app\outputs\apk\release\app-release.apk` — APK instalada.
- Capturas en `D:\DatosPC\Temp\opencode\`: `v12-start.png`, `v12-home.png`, `v12-inicio.png`, `v12-entrenar.png`, `v12-sesion.png`, `v12-picker.png`, `v12-sesion-ejercicio.png`, `v12-settype.png`, `v12-warmup.png`, `v12-set-filled.png`, `v12-rest-running.png`, `v12-finish.png`, `v12-progreso.png`, `v12-progreso-ok.png`, `v12-progress-scroll.png`, `v12-progress-cards.png`, `v12-daysheet.png`, `v12-daysheet-detail.png`, `v12-cycle-form.png`, `v12-perfil-2.png`, `v12-perfil-3.png`, `v12-readiness-saved.png`, `v12-routine-editor.png`, `v12-routine-editor3.png`, `v12-routine-start.png`.
- Jerarquías `uiautomator` en `D:\DatosPC\Temp\opencode\v12-*.xml`.
- Directorios de compilación `D:\e58src`, `D:\e58out12` y el init script de Gradle se conservan; **no se han borrado**.

## 10. CI bloqueado

GitHub Actions no ejecuta los workflows: la cuenta presenta un bloqueo por facturación con ticket **#4986721**. Consecuencias:

- No se declara CI verde; las puertas del apartado 4 son evidencia local.
- Cuando se resuelva el bloqueo hay que ejecutar CI sobre `3289ced` antes de promover a `prod`.
- El backend no cambió en esta entrega, así que su contrato sigue fijado a `230791e`.
