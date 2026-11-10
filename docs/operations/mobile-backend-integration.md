# Sincronización móvil contra el backend compilado

La puerta explícita `npm run test:mobile:backend` usa el cliente generado,
autenticación, stores y motor de sincronización móviles reales, con SQLite de
Node y HTTP real contra NestJS compilado. Solo sustituye los puentes nativos de
SQLite/SecureStore/conectividad y el adaptador HTTP por sus equivalentes locales.
No simula respuestas del backend ni Prisma. No es una prueba en celulares.

## Recuperación de una sesión web — 19 de octubre de 2026

La puerta completa pasó diez casos en cinco suites contra el backend compilado
`4cde28522d2fdb1951018834ffff8ddb77bf36bb`. El nuevo recorrido crea una sesión y
serie por REST, recibe el conflicto de otra sesión móvil y ejecuta la misma
preparación usada por «Continuar versión del servidor»: adopción autenticada,
persistencia SQLite, edición local, finalización y sincronización. PostgreSQL
confirma los IDs originales, una sola sesión/serie y estadísticas sin duplicar.

La adopción asigna identidades UUID persistentes a las filas web que carecen de
ellas; el cliente ya no inventa un UUID de sesión ni usa un CUID como UUID de
serie. Para versiones antiguas sin identidades se necesita conexión antes de
reemplazar la copia local. Un fallo de conexión conserva sesión y revisión
pendientes; las versiones ya identificadas no necesitan ese paso adicional.
Las pruebas de conversión/SQLite/autenticación observaron primero el fallo y
después pasaron, con las aserciones y presupuestos de la aplicación intactos.

Se conservan dos ejecuciones adversas: un quinto escenario agotó el cupo real
de login de su suite; se trasladó íntegro a su propia base sintética, sin cambiar
el límite ni el resto de escenarios. Otra ejecución agotó los cinco segundos
de una fase de reinicio. La repetición completa sin otras verificaciones pesadas
pasó todos los casos con los mismos plazos. No acredita estabilidad universal
en frío. Los informes están en `.worktrees/adoption-backend-contract-*.log`.
No se reconstruyó ni instaló un APK por esta comprobación, ni se desplegó nada.

## Preparación local

El propietario autorizó el 11 de octubre ampliar a 120 segundos únicamente
la preparación del backend compilado en Windows local, con `CI` sin valor.
En CI (también Windows), Linux y macOS se conservan 30 segundos. El cierre
permanece en diez segundos; los casos, aserciones y presupuestos de rendimiento
no cambian. El runner consume `mobile-backend-ready.mjs`; las regresiones
ejecutan la espera con un reloj controlado, no inspeccionan texto fuente.
La prueba de preparación de 81 segundos falló primero con el límite anterior;
después pasan las once regresiones y controles de seguridad. Logs preservados:
`D:/DatosPC/EVRY/windows-backend-deadline-red.log` y
`D:/DatosPC/EVRY/windows-backend-deadline-green.log`. La integración real se
verifica por separado: esto no afirma que la app arranque en 120 segundos ni
que hayan pasado los casos funcionales o las pruebas físicas.

La primera integración con esa autorización supera la preparación del backend
y aprueba siete casos, pero los dos recorridos de progreso exceden sus cinco
segundos. Se conserva `authorized-windows-mobile-backend-integration.log`.
Un diagnóstico temporal registra render/importaciones y duración HTTP sin
payloads ni credenciales: pasa nueve casos; los recorridos duran 1459 y 1272 ms
y HTTP 7–304 ms. No reproduce el fallo ni demuestra una mejora de producto.
Después de retirar la instrumentación, la integración normal completa termina
con salida 0: nueve casos en cuatro suites, progreso 1322/1328 ms, sin cambiar
sus límites ni aserciones. Log: `authorized-progress-final-integration.log`.
El diagnóstico se conserva en `authorized-progress-phases-integration.log`.
Esto verifica el contrato funcional observado, no la estabilidad en frío,
rendimiento físico, E2E web ni la auditoría. El clúster sintético se detuvo
limpiamente con sus archivos intactos; no hubo cambios a datos reales ni push.

Use las dependencias ya instaladas y el backend compatible con el lock del
contrato. Prepare exclusivamente el clúster PostgreSQL sintético y sus
migraciones siguiendo `docs/operations/integration-tests.md` del backend. El
runner usa esa conexión únicamente para aprovisionar bases sintéticas nuevas
con UUID por suite y aplicarles las migraciones existentes. Requiere permiso
local `CREATEDB`; no reinicia, restaura, vacía ni migra la base proporcionada ni
otras bases existentes. Conserva las bases creadas para inspección posterior.

En este equipo, usar las copias autorizadas y las herramientas locales de D:.
No ejecutar estas pruebas desde los originales de C: ni desde OneDrive:

```powershell
Set-Location 'D:\DatosPC\EVRY\frontend'
. 'D:\DatosPC\Herramientas\EVRY-Android\activate.ps1'
$env:EVRY_BACKEND_ROOT='D:\DatosPC\EVRY\backend'
$env:TEST_DATABASE_URL='postgresql://evry_test_admin@127.0.0.1:55438/evry_contract_test'
$env:DATABASE_URL='postgresql://blocked@127.0.0.1:1/evry_runtime'
node 'D:\DatosPC\Herramientas\EVRY-Android\node-on-d.mjs' --npm run test:mobile:backend:safety
node 'D:\DatosPC\Herramientas\EVRY-Android\node-on-d.mjs' --npm run test:mobile:backend
```

El lanzador local redirige cachés y temporales únicamente para la herramienta
y sus procesos hijos, sin cambiar el perfil de Windows. Es necesario además
de la activación: en Windows, Prisma prioriza APPDATA para su caché de motores.
La CI de Linux mantiene sus comandos normales; estas rutas son preparación
local, no requisitos nuevos del contrato ni de GitHub Actions.

La reubicación del 10 de octubre preservó los repositorios originales. La copia
del clúster sintético pasó la comparación SHA256 de sus32.749 archivos antes
de iniciarse en D:. Contenía un PID antiguo sin proceso existente: ese archivo
se conservó con otro nombre únicamente en la copia. PostgreSQL realizó su
recuperación automática y se verificó la identidad exacta del servidor local.
Eso no sustituye las pruebas de integración ni demuestra salud de datos reales.

Nunca copie URLs ni credenciales reales. El runner rechaza bases remotas,
nombres sin marcador `test`, identidad coincidente con runtime y parámetros
que alteren la conexión. Consume también el guard del backend y comprueba la
identidad PostgreSQL antes de abrir Nest. El listener usa loopback y puerto
efímero; al finalizar se solicita su cierre y se espera su salida. Sus secretos
son fixtures sintéticos. La suite crea usuarios/ejercicios aleatorios y limpia
únicamente sus IDs exactos; no trunca ni reinicia tablas.

## Escenarios y límites

- Finalización offline tras recargar módulos, identidad cifrada simulada,
  renovación rotativa y sincronización real al recuperar conectividad.
- Respuesta perdida después del commit: mismo lote y reenvío sin duplicar
  sesiones, series ni contador de estadísticas.
- Dos estados locales independientes: revisión obsoleta produce conflicto,
  conserva la edición local y permite consultar la versión canónica.
- Otra sesión activa en el servidor: no mezcla las series locales y conserva
  el entrenamiento local como borrador recuperable por decisión explícita.
- Sesión creada en web: adopción de identidades del servidor antes de continuar,
  edición/finalización móvil y sincronización sobre las filas originales.
- Recuperación entre tres procesos JS terminados: iniciar y registrar offline,
  reabrir offline y finalizar, reabrir con conexión y sincronizar. Cada proceso
  ejecuta los módulos móviles reales sobre el mismo archivo SQLite sintético;
  no comparte objetos de memoria. Las fases y sus salidas se conservan en
  `.worktrees/native-restart-*/*.log` junto con los archivos sintéticos.
- Readiness: consultas sin registro devuelven `null`; dos upserts concurrentes
  producen una única fila diaria, y respuestas explícitamente nulas se conservan.
- Ciclo opcional: opt-in independiente del sexo, traslado entre meses conservando
  ID, conflicto de destino sin sobrescritura, rechazo de fechas/rangos inválidos
  y borrado del registro propio. Se contrastan los resultados con PostgreSQL.
- Progreso por ejercicio: panel React Native y TanStack Query reales, búsqueda
  de ejercicios propios, catálogo de 30 registros por página, reinicio de página
  al buscar, resultado vacío e historial de 20/20/1 sesiones mediante cursores.
  El fixture contiene 41 series de 60 kg × 10 repeticiones: el resumen debe mostrar
  41 sesiones, 41 series y 24.600 kg, sin duplicar ni perder historial. Solo se
  sustituyen puentes nativos de almacenamiento/crypto y transporte Node; no se
  simulan respuestas HTTP, consultas o componentes.

Los escenarios de sincronización y adopción conservan SQLite en memoria.
El escenario de reinicio utiliza procesos distintos y SQLite en disco; el adaptador SecureStore
es un archivo exclusivamente de credenciales sintéticas, no cifrado nativo.
Ninguno demuestra cierre forzado de Android/iOS, cifrado del dispositivo,
rendimiento Android release ni aceptación en iPhone. La resolución visual de
conflictos y otras carreras siguen requiriendo sus pruebas correspondientes.
Los dos escenarios de dominios usan el wrapper de autenticación y el cliente
generado reales, no las pantallas; no acreditan aceptación visual o en dispositivos.

La CI ejecuta esta puerta contra el backend fijado por el contrato y PostgreSQL
sintético antes de construir la web. Cada suite usa una base nueva y un proceso
Nest independiente, manteniendo el limitador compartido real: los seis logins
de sincronización y adopción juntos excederían su ventana.
No se reinicia el servidor entre solicitudes de una suite, omiten límites ni
añaden esperas para eludirlos. Un fallo no se convierte en `skip`. Las
pruebas unitarias normales siguen ejecutándose sin una base de datos; esta
puerta adicional se ejecuta explícitamente y falla si falta configuración.

## Ampliación local de progreso — 9 de octubre de 2026

La ejecución original pasó los siete escenarios anteriores, pero el nuevo panel
excedió los cinco segundos por defecto. Ese fallo se conserva; no se modificó
el límite ni se atribuye su causa sin evidencia. Una ejecución instrumentada
posterior pasó los ocho escenarios: render a 475 ms y recorrido a 1485 ms.
Tras retirar las trazas, la ejecución final pasa también los ocho y el recorrido
termina en 1358 ms. Son observaciones con caché de herramientas disponible, no
una corrección ni una garantía de arranque en frío. Los seis controles de rechazo
del runner pasan. El panel probado no acredita la pantalla completa, aceptación
en dispositivo, cifrado nativo o rendimiento Android release. Frontend permanece
sin publicar por sus puertas de seguridad y rendimiento pendientes.

## Revalidación en D: — 10 de octubre de 2026

Con dependencias y compilación frescas, PostgreSQL sintético copiado y verificado,
pasaron los siete escenarios de sincronización y dominios. Los dos escenarios de
progreso fallaron en `beforeAll` por el límite existente de 5000 ms; sus cuerpos
no se ejecutaron. Log: `D:/DatosPC/EVRY/mobile-backend-integration.log`, salida 1.

La ejecución diagnóstica posterior, también salida 1, midió la preparación:
constructores HTTP 121 ms, SQLite 161 ms, cliente 202 ms, panel 709 ms,
hash 884 ms, conexión 998 ms, usuario 1024 ms, ejercicios 1119 ms,
sesiones/series 1275 ms, login 1783 ms y usuario autenticado 1831 ms acumulados.
No demuestra corrección del fallo inicial: ahora ambos cuerpos de progreso
excedieron los mismos 5000 ms. Se conserva en
`D:/DatosPC/EVRY/mobile-progress-setup-trace.log`. No se modificaron plazos,
assertions, workers o caché ni se optimizaron las consultas por conjetura.
Task49 sigue incompleta y no hay publicación frontend ni aceptación física.

El diagnóstico posterior de los cuerpos terminó con salida 0 y nueve escenarios
aprobados: preparación 1966 ms, panel 1992 ms y pantalla completa 2155 ms.
Log `D:/DatosPC/EVRY/mobile-progress-body-trace.log`. Es una observación con
caché disponible, no un arreglo ni prueba de estabilidad en frío. Las trazas
temporales se retiraron sin modificar assertions. El clúster sintético se detuvo
limpiamente conservando sus datos y backups; los dos logs fallidos siguen intactos.

## Evidencia local — 8 de octubre de 2026

Pasaron cinco escenarios contra el backend `af9de455` compilado y PostgreSQL
17.11 en `127.0.0.1:55438`, más seis controles de rechazo del runner. Se conservan
los intentos fallidos de preparación: identidad `inet` con máscara, inicialización
en frío, resolución de dependencias entre repositorios y email sintético con
parte local demasiado larga. Ninguno se presenta como fallo de la aplicación
corregido ni como CI remota exitosa. La inicialización usa el mismo watchdog de
30 s que el harness compilado del backend; no modifica los límites de las
pruebas existentes ni los presupuestos de rendimiento. El recorrido de tres
procesos tiene un watchdog nuevo de 90 s y 30 s por hijo; cada prueba de fase
conserva los cinco segundos por defecto. Se conservan también sus fallos de
preparación (ruta de configuración, mezcla de adaptadores Request/fetch y
límite real de login compartido), sin atribuirlos a fallos corregidos de EVRY.

La ampliación posterior pasa siete escenarios con la corrección local de ciclo
sobre `af9de455`. Primero reprodujo un HTTP 500 ante una fecha futura: la
validación civil dejaba escapar `RangeError`. Tras traducir exclusivamente esos
errores de entrada a HTTP 400, pasan los controles de fechas/rangos, conflicto,
persistencia y borrado. El lock aún apunta al backend publicado anterior; deberá
actualizarse después de publicar y verificar la corrección. No se declara CI
remota verde ni se debe publicar el frontend con ese contrato pendiente.

## Revalidación local — 10 de octubre, perfil nativo de pruebas

El runner completo se ejecutó con la configuración actual de Jest/Hermes y el
backend publicado `0b386b8`, sobre el clúster sintético preservado de D:. Terminó
con salida 1 antes de ejecutar escenarios: la inicialización del backend superó
30 s y tampoco respondió al cierre en los diez segundos previstos. El hijo
propio quedó terminado; esto no constituye un fallo funcional de progreso ni
una nueva aceptación de los escenarios anteriores. Log:
`D:/DatosPC/EVRY/mobile-progress-native-profile-integration.log`.

Un diagnóstico con las fases existentes localizó la demora antes de
`IMPORTS_READY`; conservó el watchdog original y terminó con salida 1. Otro
diagnóstico de importaciones, sin iniciar Nest ni conectar a la base, completó
en 12 352 ms: la carga inclusiva de autenticación tomó 6044 ms y su importación
de `class-validator`, 3271 ms. Son observaciones instrumentadas, no una causa
confirmada del intento fallido ni evidencia de estabilidad. No se cambió código
de la aplicación, límites, caché, workers o pruebas para obtener verde.

Los seis controles de seguridad del runner pasan en una ejecución posterior.
PostgreSQL se detuvo limpiamente y se verificó la ausencia del listener propio
55438 y de los procesos de esta prueba. Los datos y logs permanecen conservados.
Task49, la suite raíz fallida y las pruebas físicas siguen pendientes; no hubo
commit, push, despliegue ni cambios adicionales en el teléfono.

### Diagnóstico de lecturas locales — 11 de octubre

Una ejecución de las mismas importaciones compiladas, sin iniciar Nest ni
conectar a PostgreSQL, terminó con salida 0 en 81.173 ms. Se midieron 1886
lecturas públicas de fuentes, con 53.073 ms dentro de `fs.readFileSync`, frente
a 12.860 ms de CPU del proceso. La carga de Nest core tomó 22.630 ms y la de
AppModule otros 50.184 ms. La cobertura de ese contador no incluye todas las
operaciones nativas de archivos.

El perfil V8 también sitúa la mayor parte del tiempo muestreado en lectura,
apertura, stat y metadatos de paquetes. Sus intervalos representan tiempo
transcurrido por frame, no CPU adicional. Esto localiza una demora sustancial
en el acceso a archivos durante la preparación local; no demuestra avería del
disco, interferencia del antivirus, un fallo SQL ni una corrección de EVRY.
Logs: `D:/DatosPC/EVRY/compiled-startup-cpu-fs-profile.log` y perfil preservado
en `backend/.worktrees/startup-profile-20261011/compiled-imports.cpuprofile`.

No se repitió la integración sin cambios para buscar verde, no se precargó un
backend para pruebas ni se desactivaron protecciones. Se consultó al propietario
si autoriza un watchdog de preparación de 120 s solo en Windows, conservando
30 s en Linux/CI, los casos/aserciones y los presupuestos de rendimiento. Esa
ampliación no se ha aplicado. Task49 continúa abierta. La suite normal posterior
ya registró 747 casos aprobados con la autorización distinta de los dos casos
nativos en frío; ese resultado no certifica la integración aquí descrita.
