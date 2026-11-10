# Finalización móvil y durabilidad local

## Recuperación de borradores en EVRY Local 1.0.1

Una segunda prueba física encontró un conflicto de SQLite al conservar la
versión local como borrador, recuperarla como sesión nueva y elegir continuar
la sesión activa del servidor: `UNIQUE constraint failed: workouts.client_id`.
La identidad del servidor ya existía como una copia local cancelada.

La corrección reutiliza esa copia únicamente si está cancelada, sincronizada,
pertenece al mismo ID de servidor, no tiene una revisión superior ni trabajo en
cola. Las comprobaciones y la sustitución canónica son transaccionales. Se
añadieron seis regresiones con SQLite real: recuperación válida y cinco casos
que deben preservar filas y cola sin sobrescribirlas. El archivo completo pasó
47 pruebas; tipos, lint y revisión independiente también terminaron correctamente.

La compilación privada de Android se verificó con 470 pruebas móviles sobre
las mismas fuentes. El 29 de octubre pasaron las siete comprobaciones nativas
y de seguridad, los tipos, el lint y la comprobación del contrato. La suite
global tuvo fallos de arranque de ejecutores web.

El 6 de noviembre se actualizó `com.gabrielcano.evry.local` a `1.0.1-local`
con código de versión `2`, usando la misma firma. Se comprobó el hash de la
APK instalada y la continuidad del UID y la fecha de instalación. El OPPO abrió
Inicio con la cuenta autenticada y sincronizada. La consulta posterior de solo
lectura confirmó los mismos cuatro entrenamientos, tres series y estadísticas
de la base local. Las otras cuatro instalaciones quedaron desactivadas con sus
datos conservados. EVRY Local es la única app de EVRY habilitada.

El caso específico de recuperación tiene cobertura de regresión en SQLite.
La prueba física de esta actualización cubrió la instalación, el arranque y
la conservación de sesión y datos. El caso de pérdida de respuesta y el primer
conflicto físico se documentan a continuación como pruebas anteriores.

## Pérdida de respuesta y conflicto verificados en el OPPO — 24 de octubre

La APK release de QA `530a4be0edc8…` compiló correctamente y se instaló como
`com.gabrielcano.evry.syncqa`, conservando EVRY Local. Se verificaron firma
privada, HTTPS solo para localhost, ausencia de HTTP, debugging, perfilado y
permisos de cámara/micrófono. Las 298 fuentes comprobadas permanecieron
estables durante la compilación y siete fuentes críticas coinciden con el
contenido del mapa del bundle. Además, las 1.406 entradas de fuentes, incluidos
duplicados y contenidos, coinciden con el mapa de la APK Local existente; las
63 fuentes propias son iguales. Los paquetes, certificados y orígenes de API
son distintos: no se afirma igualdad binaria entre APK.

En el teléfono se creó una sesión sintética con una serie de 10 kg y ocho
repeticiones. El servidor confirmó su finalización y cortó intencionalmente la
respuesta antes de entregarla. La APK mostró `Guardado localmente`; una lectura
independiente confirmó una sesión completada, una serie y una estadística, sin
ningún reintento entregado todavía. Se cerró únicamente el proceso de QA, sin
borrar datos, y se reabrió con un PID distinto. Recuperó el lote persistido y
mostró `Sincronizado`. El servidor recibió el mismo `syncId`, `clientId` y hash
del payload: todos los campos canónicos, revisión 7 y estadísticas permanecieron
exactamente iguales. No es únicamente una repetición de entrada al primer plano.

Después, un segundo cliente autenticado avanzó una sesión activa de revisión 6
a 7 y dejó doce repeticiones. La APK conservaba ocho y registró un cambio local
de técnica. Mostró `Requiere revisión`, el conflicto y ambas opciones de
resolución. La lectura independiente confirmó que la versión ganadora y la
sesión completada anterior no se alteraron. Al elegir explícitamente continuar
la versión del servidor, desapareció el aviso y la APK recuperó 10 kg, doce
repeticiones y técnica sin registrar. Todos los campos del servidor siguieron
intactos. Se usó un teléfono y un segundo cliente de API; no dos teléfonos, ni
se capturó la respuesta HTTP 409 del dispositivo.

Durante la preparación, el primer servidor de QA quedó sin stdin. Se detuvo
solo ese proceso, comprobando su ejecutable, comando y puerto, y se inició con
terminal interactiva. Las filas canónicas antes/después coincidieron. No se
presenta esa parada como un cierre limpio ni como un fallo del producto.

EVRY Local quedó nuevamente abierta en Inicio, autenticada y sincronizada.
Una lectura final confirmó sus cuatro sesiones, tres series y estadísticas
exactamente iguales al checkpoint previo a QA. La opción física de conservar
el conflicto como borrador y los presupuestos de rendimiento siguen pendientes.
Los informes y capturas de UI sanitizadas permanecen en el directorio ignorado
`.worktrees/mobile-sync-qa-20261024`; el resumen es `acceptance.verification.json`.
Estas verificaciones no suponen push, despliegue ni cierre del plan completo.

## Preparación aislada de reintentos Android — 24 de octubre

Se creó una base PostgreSQL nueva exclusivamente sintética, con un usuario, un
ejercicio y ninguna sesión. La API Nest de QA escucha solo en `127.0.0.1:4449`,
con certificado propio vigente hasta el 23 de noviembre. Se comprobaron el
rechazo TLS sin confianza explícita, el certificado esperado, readiness de la
base, rechazo de peticiones sin autenticar y login/logout móvil real. La API y
la base de EVRY Local conservan sus puertos e identidades originales.

Un middleware temporal, fuera del código distribuible, permite cortar una sola
respuesta exitosa de finalización del usuario sintético después de que Nest la
produce. Su prueba HTTP comprueba que deja pasar otras rutas, otros usuarios,
sesiones activas y errores; el reintento del mismo lote se entrega normalmente.
Esa prueba valida el instrumento, **no** demuestra aún recuperación en Android.

La variante `com.gabrielcano.evry.syncqa` usa el código actual previamente
verificado: las 298 fuentes coinciden con el snapshot de la suite de 952 casos.
Se compila con salida independiente en D:, firma privada, HTTPS y sin modificar
la UX. Antes de instalar se exigirán manifiesto, origen, certificado, firma,
hash del artefacto y procedencia de siete fuentes críticas dentro del bundle.
Todavía no se declara instalada ni superada la pérdida de respuesta o conflicto
de revisión en el teléfono. Las claves, credenciales y herramientas temporales
permanecen en el directorio ignorado `.worktrees/mobile-sync-qa-20261024`.

La observación ampliada de EVRY Local, en el mismo proceso, registra 109.220 KiB
de `TOTAL PSS` y 35.543 KiB de `TOTAL SWAP PSS`. La
[implementación de Android](https://android.googlesource.com/platform/frameworks/base/+/ef0a402f5811d326e4e8d35758ab5c348297f9f4/core/java/android/os/Debug.java)
incluye SwapPss en el total; no se debe sumarlo de nuevo ni atribuir todo el
rótulo «System» al sistema operativo. No hubo cambios de producto entre esa
medición y la inicial: su diferencia no prueba una optimización, fuga ni
cumplimiento del presupuesto. No se ajustó el objetivo de memoria.

## Reconexión de la APK Android instalada — 24 de octubre

Se verificó por SHA-256 que la APK instalada es exactamente `b76c0ae3…`, sin
reinstalarla ni borrar sus datos. El arranque normal recuperó la identidad y el
modo local. La observación de memoria fue 130.145 KiB PSS: continúa por encima
del presupuesto. Los 2.308 ms del arranque nativo no prueban el tiempo hasta que
React está listo ni la aceptación estadística del arranque.

Antes de recuperar PostgreSQL se conservó su directorio completo, con el servidor
detenido, y se comparó el SHA-256 de sus 1.739 archivos, 103.430.382 bytes. Es una
copia de preservación previa a recuperación, no una restauración ensayada. El
mismo clúster PostgreSQL 17.11 completó su recuperación WAL normal; no hubo
reinicialización, migración, seed, reset ni debilitamiento de durabilidad.

La lectura de la cuenta reservada confirmó tres sesiones y tres series: dos
completadas y una cancelada. Después se recuperó la API normal por HTTPS, se
verificaron su certificado y base, y se habilitó únicamente el mapeo USB del
puerto 4447 sin reemplazar otros mapeos ni cerrar el servidor ADB de otra tarea.

Volver al primer plano hizo desaparecer el modo local y mostró `Sincronizado`.
El servidor recibió una cuarta sesión cancelada sin series nuevas. Su inicio y
cancelación son anteriores a este diagnóstico y su `clientId` es distinto: era
un elemento local pendiente, no una cancelación realizada por el operador.
Las tres sesiones anteriores, las tres series y las estadísticas se conservaron
exactamente. Otra vuelta al primer plano mantuvo las mismas cuatro sesiones,
tres series, IDs, revisiones y estadísticas, sin crear más registros.

La evidencia resumida está en el informe local ignorado
`android-reconnect-20261024.verification.json`; las instantáneas canónicas y la
copia de preservación permanecen protegidas en el backend. No reutilizar los
verificadores históricos que esperaban tres sesiones ni resetear la base para
hacerlos pasar. Este recorrido no acredita la pérdida artificial de una respuesta,
el reenvío del mismo lote, conflictos físicos entre dispositivos ni Maestro.
No se modificaron el código de producto ni la UX, y no se generó otra APK.

## Edición de rutina y ciclo voluntario en OPPO — 19 de octubre

Se editó la rutina reservada de tres a cuatro series objetivo. SQL confirmó el
mismo ID, nombre, ejercicio y orden, sin añadir otra rutina. No se modificó UX.

Con sexo «Prefiero no decirlo» sin alterar, se activó voluntariamente el ciclo
desde Perfil y apareció su pestaña. El estado inicial tenía cero registros.
Desde la UI se creó un registro sintético del 19 de octubre con flujo Ligero,
se editó a Moderado conservando el mismo ID y se eliminó tras confirmar su
fecha y que era el único registro creado en esta prueba. No se borraron datos
preexistentes. Se conserva su evidencia en los informes protegidos.

Después se desactivó el seguimiento y se comprobó que desaparece la pestaña y
el switch queda apagado. SQL confirma opt-out, sexo conservado, cero registros,
la rutina de cuatro series y un readiness. La comparación completa de IDs,
revisiones, series, pesos y estadísticas mantiene las dos sesiones previas sin
cambios; activar el ciclo no alteró cargas históricas.

Evidencia privada: backend `native-parity-{baseline,routine-edited,cycle-enabled,cycle-created,cycle-edited,cycle-deleted,cycle-disabled}-20261019.json`.
Es un recorrido de creación/edición/borrado y opt-in/opt-out real del APK actual;
no cubre todas las fronteras de fecha, conflictos, accesibilidad ni rendimiento.
No repetir los verificadores históricos que esperaban tres series: la rutina
persistente tiene ahora cuatro. No se deshabilitaron pruebas ni se publicó un
checkpoint con puertas conocidas como rojas.

## Offline, reinicio y reconexión del APK privado — 19 de octubre, posterior

El mismo APK `33d1554b…` completó ahora el recorrido que estaba pendiente. Al
retomar, la API local ya no estaba ejecutándose: se comprobó la ausencia del
proceso/listener y del handle anterior antes de actuar. No se repitió ni eludió
el cierre rechazado, no se quitaron forwards para provocar la caída y no se
cambiaron redes ni ajustes de seguridad. «Offline» significa API inaccesible,
no Internet desactivado ni pérdida física de conectividad del dispositivo.

1. Sin API, iniciar sesión libre, agregar Sentadilla con barra de 20 kg × 5 y
   editar a 6. La UI mostró `Guardado localmente`.
2. Terminar únicamente el proceso del paquete local independiente y reabrirlo:
   recuperó identidad, modo local, sesión activa y valores 20 kg × 6. La búsqueda
   usó explícitamente la copia local del catálogo.
3. Finalizar aún sin API. SQL conservó solamente la sesión anterior de 10 kg × 12:
   la nueva finalización no existía en servidor. La UI quedó sin sesión activa y
   con guardado local pendiente.
4. Cerrar/reabrir de nuevo, sin borrar datos: se conservó la cola completada y
   la identidad local. Una lectura inmediata se negó durante la transición de
   foco; se esperó el mismo proceso, sin relanzarlo ni debilitar el guard.
5. Restaurar normalmente la misma API HTTPS/base y el mapeo USB del puerto 4447;
   volver al primer plano activó la sincronización normal. SQL confirmó dos
   sesiones completadas, dos series (10×12 y 20×6), 240 kg, dos sesiones en la
   estadística y e1RM 24 kg. Progreso mostró dos sesiones y 240 kg.
6. Otro primer plano y una consulta independiente conservaron exactamente los
   IDs, revisiones y conteos. Esto no sustituye el ensayo de respuesta perdida
   o conflicto entre dos dispositivos.

Evidencia protegida: backend `native-offline-{baseline,queued,synced,repeat}-20261019.json`;
perfil frontend `native-offline-before-restart-20261019.json`,
`native-offline-after-restart-20261019.json`,
`native-offline-completed-before-restart-20261019.json` y captura real
`native-offline-progress-20261019.png`. El helper de PostgreSQL agotó 45 segundos,
pero el mismo proceso terminó la recuperación WAL/fsync y quedó disponible;
no se reinició ni se relajó durabilidad. Se mantuvieron datos, rutina y cuenta
de prueba persistentes; no hubo cambios de UX ni de código del producto.

Esta evidencia verifica un recorrido offline real del APK actual, no toda la
matriz, Maestro, memoria/arranque ni aceptación integral. La base local ahora
contiene dos sesiones de esa cuenta: no repetir el recorrido ni resetearla para
hacer pasar verificadores anteriores que esperaban una sola sesión.

## Perfil, readiness y rutina en OPPO — 19 de octubre

El propietario difirió los cambios de UX: esta continuación no modificó diseño
ni código del producto. Se verificó el mismo APK privado `33d1554b…` mediante su
UI real y la cuenta reservada del entorno local normal:

- Guardar el objetivo Fuerza preservó sexo «Prefiero no decirlo», fecha de
  nacimiento nula y ciclo desactivado; SQL confirmó los valores.
- El readiness de Bogotá del 19 de octubre se guardó con 7 h, estrés 3, dolor 2
  y motivación 3 (70/100). Aumentar el sueño a 7,5 h y guardar actualizó el mismo
  ID a 73/100; siguió existiendo un único registro diario.
- La UI creó «Verificacion OPPO» con Sentadilla con barra y tres series objetivo,
  sin peso/repeticiones prefijados. Mostró confirmación y la rutina guardada;
  SQL confirmó una rutina y su relación de ejercicio/orden. No se inició otra
  sesión: permanece una única sesión completada del recorrido previo.

Informes protegidos del backend:
`native-readiness-initial-20261019.json`,
`native-readiness-updated-20261019.json` y `native-routine-created-20261019.json`.
El verificador SQL inicial recibió el enum-array como texto PostgreSQL; se
normalizó con `to_json(goals)` manteniendo la aserción exacta del objetivo. No
fue un fallo del guardado ni se alteró la aplicación para hacer pasar el check.
Los registros son sintéticos, persistentes y propios de esa cuenta; no se borran
ni se repite el recorrido para fabricar un estado vacío. No acredita ciclo,
edición/borrado de rutinas, modo offline ni presupuestos de rendimiento.

## APK privado conectado en OPPO — 19 de octubre

El APK `33d1554b…`, paquete independiente `com.gabrielcano.evry.local`, pasó
la revisión del artefacto final y se instaló sin reemplazar las otras versiones.
Tras el desbloqueo manual del propietario, el login con la cuenta reservada
existente funcionó contra la API normal local por HTTPS en el puerto 4447.

Recorrido real **online**: catálogo y búsqueda, sesión libre, una serie de
Sentadilla con barra de 10 kg × 8, edición a 12 repeticiones y finalización.
Progreso mostró una sesión y 120 kg. PostgreSQL confirmó una sesión completada
revisión 9, una única serie de 10 kg × 12, una estadística con `sessionsCount=1`
y e1RM de 14 kg. La segunda consulta de solo lectura mantuvo IDs y conteos.
La captura de la pantalla real está en
`.worktrees/mobile-local-mvp-20261018/native-progress-20261019.png`; los informes
SQL están protegidos en el directorio local privado del backend.

No es una repetición de la prueba offline del 16 de octubre: la herramienta
rechazó el envío de cierre al listener HTTPS. No se reintentó por otro método,
no se cambiaron redes/ajustes ni se declaró una desconexión inexistente. Siguen
pendientes offline/reinicio en este APK, matriz completa, Maestro y presupuestos
de memoria/arranque. El tiempo de espera de `am start -W` incluyó el bloqueo de
pantalla y no puede usarse como medición de arranque. No se tocó el contenido de
los paquetes propietario, Validación o Pruebas; la sesión nueva pertenece solo
a la cuenta reservada del entorno privado nuevo. No repetir este recorrido
estatal automáticamente: ya dejó una sesión persistente y no debe resetearse.

## Protección del smoke Maestro

El flujo original apuntaba al paquete personal y solicitaba `clearState: true`.
No se ejecutó. Se corrigió para usar exclusivamente EVRY Pruebas, conservar
estado y mantener todas las comprobaciones de login y pestañas, sin omitir el
caso si ya existe una sesión. Dos controles sobre el YAML real fallaron antes
del cambio y pasan después; se incorporaron al `posttest` móvil. La ejecución
real de Maestro sigue pendiente: véase [aislamiento del smoke](maestro-safety.md).

## Recorrido físico aislado en OPPO A54 — 16 de octubre

El APK local `9be38ca0…` (`com.gabrielcano.evry.contractqa`, **EVRY Pruebas**)
se instaló como aplicación independiente, sin reemplazar EVRY Validación ni
acceder a su borrador. Se verificaron hash instalado, firma, siete fuentes,
ausencia de backup y de deep links compartidos, CA limitada a localhost y API
propia en `https://localhost:4445/api/v1`. Es QA local, no distribución final.

Contra una base sintética nueva, con once migraciones y dos ejercicios globales:

1. Registro desde la UI real y carga de catálogo.
2. API apagada, sin cambiar Wi-Fi, datos ni ajustes del teléfono: crear sesión,
   agregar una serie de 10 kg × 8 y editarla a 12 repeticiones.
3. Terminar el proceso Android y reabrir todavía sin API: se recuperan la
   identidad, sesión y valores 10 kg × 12 desde el almacenamiento nativo.
4. Finalizar sin API: aparece `Guardado localmente`; PostgreSQL conserva cero
   sesiones, series y estadísticas. Cerrar de nuevo el proceso Android.
5. Reiniciar la misma API/base y abrir el cliente: aparece `Sincronizado`.
   La consulta directa confirma una sesión `COMPLETED`, revisión 2, una serie
   de 10 kg × 12, una estadística, una sesión contada y e1RM de 14 kg.
6. Progreso muestra una sesión y 120 kg de volumen. Volver al primer plano
   conserva esos conteos; no acredita por sí solo el reenvío de un mismo lote.

Los XML por etapa y las herramientas se conservan localmente en
`.worktrees/mobile-contract-20261016/`; la base sintética no se elimina. Esta
evidencia sí usa SQLite/SecureStore del dispositivo, pero cubre un recorrido,
no toda la matriz de aceptación, fallos de transporte ni presupuestos de RAM
o arranque. La API y los datos originales no se usaron para esta prueba.

## Integración real actual y aislamiento de cuotas — 16 de octubre

El ejecutor completo pasa nueve casos en cuatro suites contra Nest compilado y
PostgreSQL: sincronización offline, respuesta perdida sin duplicados, conflictos,
borradores recuperados, tres procesos terminados/reabiertos, readiness, ciclo y
progreso paginado. Las respuestas API no se simulan; los servicios nativos se
sustituyen en Node, por lo que no equivale al recorrido físico completo.

La primera ejecución falló con un 429 al iniciar la segunda suite: las cuotas
persisten entre procesos. El ajuste cambia solo el ejecutor: crea una base local
vacía por suite, aplica sus once migraciones y suministra esa misma identidad a
API y cliente. El rol de pruebas necesita `CREATEDB`; no se cambian privilegios,
límites ni guardas, no se reinician cuotas y no se omiten casos. Se conservan
las bases y el fallo inicial. La conexión suministrada solo aprovisiona las
nuevas bases, nunca se reinicia ni elimina. Pasan los once controles de seguridad
y, después del ajuste, la suite raíz de 854 casos, tipos y lint no mutativo.
Los logs `mobile-isolated-backend-*-20261016.log` y
`suite-isolation-regression-*-20261016.log` se conservan en D:. Las cuatro bases
mantienen cuotas reales y cero usuarios/sesiones/series de fixture tras su
limpieza exacta. PostgreSQL y las cuatro APIs de prueba cerraron limpiamente.

## APK de arranque actualizado — memoria aún fuera de presupuesto

El código posterior al APK `f660c00c…` elimina únicamente la importación lateral
de Reanimated del layout raíz: no hay consumidores propios de sus APIs y la
importación inicializa el runtime nativo/worklets. Se conservan paquetes,
versiones y navegación. La prueba de arranque offline usa los efectos y stores
reales, el puente SQLite y una identidad persistida, con el backend opcional de
animación no disponible; falló antes del cambio y pasó después. No es una
prueba de memoria. La suite raíz posterior pasa sus 854 pruebas; tipos de todos
los workspaces y lint no mutativo también terminaron con salida cero. El primer intento agotó el plazo con la carga de
módulos dentro del caso: el diagnóstico posterior separó 26.958 ms de
importación y unos 233 ms de render/restauración. La importación real pasó a
la preparación de la suite sin cambiar aserciones ni plazos, y una mutación
verificó que sigue detectando el runtime innecesario.

El APK candidato compiló en 8 min 21 s y pasó el verificador del binario y las
siete fuentes del mapa. Archivo conservado:
`.worktrees/mobile-local-tls-20261011/evry-validation-20261016-c5347701.apk`,
35.772.819 bytes, SHA-256
`c53477011dac0e78ce1ea775996a5d73339ba6336d48a04989299a8f42d819c8`.
Bundle de 2.724.000 bytes, SHA-256
`491636cdb3628dd7db1479e9ce54a391072dd091c938978c46702627d6ff4ba1`.
Reanimated pasa de 295 a cero fuentes en el mapa; Worklets de 43 a 42. Las
dependencias nativas siguen presentes. La misma firma permitió actualizar sin
desinstalar; `-r` terminó con `Success` tras el desbloqueo manual del OPPO.
El hash leído del APK instalado coincide con `c5347701…`, mantiene UID 10132 y
primera instalación del 11 de octubre; última actualización 16 de octubre a
las 22:07:03. No se borran
datos ni se cambian ajustes de seguridad. Una nueva línea base del APK anterior
verifica identidad y borrador visibles y mide PSS de 132.952, 134.745 y 126.862
KiB, mismo PID 21549: no son tres arranques independientes ni un intervalo de
confianza del 95 %. El APK nuevo conserva las cinco comprobaciones visibles de
identidad, modo offline y borrador y registra PSS de 130.556, 128.086 y 127.998
KiB, PID 27070: 125,0–127,5 MiB. Se solapa con el rango anterior y sigue sobre
100 MB/100 MiB; no se declara mejora estadística ni aceptación del presupuesto.
Los logs completos `android-memory-before-root-*-20261016.log` y
`android-memory-after-root-*-20261016.log` se conservan en D:. El arranque de
Activity de 2557 ms no mide React listo. No hubo edición, finalización o borrado
del borrador, logout ni cambios en la app original.

## APK anterior f660c00c — verificado antes del cambio de arranque

La compilación del 15 de octubre terminó con salida cero en 11 min 51 s:
569 tareas, 24 ejecutadas y 545 actualizadas. El APK estable es
`.worktrees/mobile-local-tls-20261011/evry-validation-20261015-f660c00c.apk`.
Ocupa 36.544.287 bytes y su SHA-256 es
`f660c00cfb7d69b069bb71502a730e80143b9aa60011562e653989cd5bc3e952`.
El bundle ocupa 3.495.468 bytes, SHA-256
`5a87413c4137eed531a13ecb5a16df771559a7dbc802a9e140a450a5983ebbab`.

Pasan la inspección del APK final y la comparación con el bundle generado:
arm64, SDK mínimo 24/objetivo 36, no depurable, sin almacenamiento compartido
ni overlay y sin instrumentación de navegación. El mapa de Metro coincide
exactamente con los tres archivos de Ciclo/Perfil/Entrenar corregidos, SQLite,
registro y validación compartida de contraseña. El control previo falló sobre
el bundle anterior, de modo que no se presenta un artefacto viejo como nuevo.

Antes de actualizar se comprobó que el binario instalado era idéntico al APK
del 12 conservado en D: y que ambos firmantes coincidían. La actualización
`install -r` terminó con `Success`; el SHA-256 leído del APK instalado coincide
con `f660c00c…`. Se conserva UID 10132 y la fecha de primera instalación del
11 de octubre; no hubo desinstalación ni limpieza de datos. No se tocó la app
original, solo `com.gabrielcano.evry.validation`.

El instalador mostró la solicitud opcional de enviar la app desconocida a
Google, diferenciada de un bloqueo por malware en la
[guía oficial de Play Protect](https://developers.google.com/android/play-protect/warning-dev-guidance?hl=en).
Se eligió no enviar este APK: no se activaron envíos automáticos ni se
desactivó Play Protect. Esto no constituye un análisis de malware aprobado
por Google.

Tras abrir el APK nuevo sin backend, la jerarquía nativa confirma la misma
identidad QA, modo local y borrador «Entrenamiento libre» con cero series y
«Continuar sesión». La comparación anterior/posterior pasa sin editar ni
finalizar ese borrador. Es una comprobación de persistencia visible, no una
copia de seguridad completa de las bases privadas ni una sesión E2E nueva
con series, finalización y sincronización real.

El arranque de Activity informó 2642 ms; no se interpreta como React listo.
Una muestra válida de Inicio en primer plano registra PSS 138.021 KiB
(134,79 MiB), por encima del presupuesto de 100 MB. Las muestras siguientes
se detuvieron al cambiar el primer plano. El historial de Android atribuye
el cierre de ese PID a `USER REQUESTED / remove task`, no a un crash; no se
forzó otra apertura ni se inspeccionó la otra app. Una muestra no acredita
estabilidad estadística ni una mejora de memoria.

Los logs `android-haptics-*` están en `D:/DatosPC/EVRY`; los XML anterior y
posterior están en el directorio ignorado de validación. Continúa siendo un
APK QA con firma de prueba y API HTTPS localhost 4443: la CA vence el
18 de octubre de 2026 a las 14:57:07 UTC. No es una entrega de producción ni
un despliegue. Auditoría alta, rendimiento, pruebas conectadas completas y
aceptación integral permanecen pendientes.

## Reconexión USB anterior a la actualización — 15 de octubre

El OPPO A54 (`CPH2239`, serie `WCOBNF798LNZJVNZ`) vuelve a responder como
`device` autorizado. La instancia ADB es local, usa el puerto 5038 y está
restringida a ese único dispositivo; descubrimiento mDNS y búsqueda de
emuladores están desactivados. La consola se guarda en D:. No se cambió el
perfil de Windows, el registro, permisos del sistema ni la confianza del móvil.

La revisión anterior no había comprobado la existencia de credenciales en la
ruta predeterminada de Windows. Ya existían una clave ADB y su pública, ambas
del 10 de octubre. El [código de autenticación de ADB](https://android.googlesource.com/platform/packages/modules/adb/+/HEAD/client/auth.cpp)
genera una clave solo cuando no existe y carga la existente en modo lectura.
Se comprobó su existencia antes de arrancar; no se generaron, copiaron ni
modificaron claves. Sus fechas de modificación siguen siendo las del día 10.
Esto permite reutilizar las credenciales existentes sin instalar herramientas
ni crear claves en C:, no demuestra una redirección del perfil ADB a D:.

El primer intento de escucha con una IP numérica fue rechazado por ADB antes
de inicializar autenticación; el log se conserva. La sintaxis documentada
`tcp:localhost:5038` sí inicia una escucha loopback. Antes de usar el cliente se
verifican el proceso propietario, su ejecutable en D: y la restricción de serie.

Antes de la actualización, la inspección confirmó que el APK QA instalado era
el del 12 de octubre, versión 1.0.0/código 1. Su SHA-256 coincidía con la
copia conservada `before-registration-sqlite-20261014.apk`; esto respalda el
binario anterior, **no** constituye una copia de seguridad de los datos privados.

Después de comprobar la conexión se abrió únicamente esa app QA, sin reinstalar,
limpiar ni editarla. La jerarquía de Inicio confirma la cuenta sintética guardada,
el modo local y la sesión «Entrenamiento libre» con cero series y botón
«Continuar sesión». Se conserva el XML anterior a la actualización. El arranque
de Activity informó 2629 ms, pero no mide React listo ni certifica el presupuesto
de arranque; tampoco corresponde al nuevo APK, todavía en compilación.

## Respuesta háptica opcional: corrección posterior al APK — 14 de octubre

Las regresiones reprodujeron siete fallos cuando la vibración rechaza o queda
pendiente: lista de ciclo desactualizada tras un DELETE confirmado, guardados
de Perfil/Readiness bloqueados en «Guardando…», rechazo sin manejar al editar
o agregar una serie y finalización esperando feedback nativo. El control de
error HTTP real conserva el registro y muestra el error correspondiente.

La corrección limita el cambio a los callbacks de Ciclo, Perfil y Entrenar:
las operaciones de datos se siguen esperando y sus errores se mantienen;
únicamente la vibración es no bloqueante y maneja su rechazo. Pasan los 63
casos cercanos de las tres pantallas y los tipos móviles. La ejecución raíz
del 14 de octubre dejó resultados de 449 pruebas móviles, tres controles
nativos y 333 pruebas web aprobadas, pero se interrumpió antes de completar
accesibilidad y los paquetes compartidos; no constituye una suite raíz verde.
La repetición del 15 de octubre encontró un timeout de 30 segundos en el
primer render de la prueba de Readiness, además de fallos de arranque del
ejecutor web. Se conservan los resultados fallidos. Con la ampliación de pruebas
nativas en frío ya autorizada y un solo worker web únicamente en Windows local,
el comando raíz completo pasó después **853 pruebas**, incluidas las 449 móviles
y los tres controles nativos. No se omitieron casos ni se cambiaron aserciones.
CI conserva sus plazos y concurrencia. La validación integral y física, los
presupuestos de rendimiento y la auditoría de dependencias siguen pendientes.

El APK `cb1f3714` verificado más abajo **precede** a esta corrección. Se conserva
como artefacto QA anterior; no se afirma que incorpore estos cambios de fuente.

## APK anterior y límite de almacenamiento de herramientas — 14 de octubre

La compilación release QA del 14 de octubre terminó con salida cero en 8 min 31 s
(569 tareas: 24 ejecutadas y 545 actualizadas). Antes de compilar se verificó el
SHA-256 del APK del 12 de octubre y se conservó una copia idéntica en
`before-registration-sqlite-20261014.apk`, dentro del directorio ignorado de
validación. No se reinstaló ni se borraron datos del teléfono.

Ese APK ocupa 36.544.607 bytes; SHA-256
`cb1f37147b301ddd4754c6a41f05445bd2ae0ce3103170580a7cac4df9ab55d8`.
El verificador del archivo final pasa: paquete `com.gabrielcano.evry.validation`,
firma v2 de pruebas, arm64, no depurable, permisos limitados, HTTPS sin tráfico
claro y CA restringida a localhost. No incluye la actividad ni los logs nativos
de diagnóstico. El bundle incorporado coincide byte a byte con el generado:
3.495.788 bytes, SHA-256
`59723c1ed5de440ef067b6223ece9613e3c227e2bf2c0f39fed46de334fea189`.
El mapa de fuentes de Metro coincide con los archivos actuales de SQLite,
formulario de registro y validación compartida de contraseña. Esto verifica
procedencia del código, no su ejecución física. Los avisos de deprecación
Gradle y shell del verificador se conservan; no son errores ocultados.

Logs `android-current-release-build-20261014.log` y
`android-current-apk-verification-20261014.log` en `D:/DatosPC/EVRY`.
Es un APK QA para API local HTTPS 4443 y certificado de prueba vigente hasta
el 18 de octubre, no un APK conectado a staging ni una entrega final.
La memoria y el arranque actuales no se han vuelto a medir; los resultados
físicos del 12 de octubre no certifican este nuevo archivo.

Windows detecta actualmente OPPO A54 e interfaz ADB. Esto **no acredita** una
conexión ADB autorizada. El ejecutable instalado informa 37.0.1-15733141; una
inspección de sus cadenas encuentra `ADB_VENDOR_KEYS`, `ANDROID_ADB_LOG_PATH`
y `SHGetFolderPathW`, pero no `ANDROID_USER_HOME`, `ANDROID_SDK_HOME` ni
`USERPROFILE`. Esta inspección no prueba por sí sola el comportamiento completo,
pero invalida asumir que la configuración Java/Expo redirige también ADB.

El [código oficial de autenticación de ADB](https://android.googlesource.com/platform/packages/modules/adb/+/HEAD/client/auth.cpp)
carga o genera la clave de usuario antes de cargar `ADB_VENDOR_KEYS`: indicar
solo una clave adicional en D: no garantiza evitar una clave predeterminada en
otro disco. No se encontró una clave previa en las carpetas D: inspeccionadas.
No se inició el daemon, no se generó una clave ni se modificó el perfil Windows.
Antes de otra prueba física debe demostrarse la ubicación efectiva de claves y
logs; no basta con exportar `ANDROID_USER_HOME`. El APK puede compilarse y
verificarse estáticamente sin iniciar ADB. El presupuesto de memoria y la
aceptación física siguen pendientes.

## APK reducido: verificación e instalación físicas — 12 de octubre

La compilación terminó con salida 0 en 13 min 56 s (569 tareas, 51 ejecutadas).
El APK QA reducido ocupa 36543075 bytes frente a 46304762: aproximadamente
21,1 % menos. SHA-256:
`7e394b12267d9463c64f58453cc3d48e4d1a30a2a1af21ea7d06dadc11ec3cd5`.
El bundle JavaScript conserva exactamente el hash anterior
`237905dd1995c308521d59e5010dd52c402068df801b656ff51696f8c4ef1ef6`
(3494256 bytes); el cambio no se presenta como optimización de lógica JS.
El verificador normal aprobó paquete, firma v2, permisos, certificado limitado
a localhost, ausencia de HTTP y ausencia de actividad/clase/log diagnóstico.
Su advertencia de shell permanece en el informe; un primer intento de leer el
informe completo como JSON fue rechazado **antes** de instalar. Después se
seleccionó la única línea de metadatos JSON y se volvió a comprobar el hash
del archivo exacto antes de ejecutar la actualización `-r`.

Instalación: salida 0, `Success`; firstInstallTime conserva 11 de octubre
11:00:19 y lastUpdateTime es 12 de octubre 01:24:07. La app original no se
actualizó ni borró. Inicio mantiene cuenta sintética, sesión activa vacía y
«Sincronizado». El inventario canónico posterior coincide con el anterior en
IDs, clientId, revisiones, estados y número de series; siguen una completada
60 kg × diez repeticiones/600 kg y una activa vacía. Los cuatro taps nativos
abren Entrenar, Progreso, Perfil e Inicio. Otra reapertura con únicamente el
reverse 4443 retirado conserva cuenta y sesión SQLite y muestra «Modo local»;
al restaurarlo y reabrir, vuelve a «Sincronizado» sin cambiar el inventario.
No se creó, finalizó o eliminó ningún entrenamiento durante esta revalidación.

La referencia comparable, con el APK anterior recién abierto en Inicio,
registró PSS 135932 KB y primer frame 3589 ms. Con el actualizado en la misma
pantalla, PSS 137963 KB y primer frame 2772 ms. El componente de código fue
49728/49772 KB y heap nativo 36648/37772 KB, respectivamente. Por tanto,
**no hay reducción de memoria demostrada** y el presupuesto de 100 MB sigue
incumplido. Los otros primeros frames nuevos fueron 2737 ms sin servidor y
2401 ms al reconectar; son observaciones, no una muestra suficiente ni medida
de disponibilidad React para certificar arranque completo. La reducción del
APK no se confunde con reducción de RAM o aceptación integral del MVP.

Informes `android-shrink-{apk-verification,qa-install,baseline-memory,
updated-memory,updated-navigation,updated-canonical,offline-home,
reconnected-canonical}-20261012.log` bajo `D:/DatosPC/EVRY`.
Después de verificar, HTTPS se cerró limpiamente; PostgreSQL también, tras
comprobar que no quedaban otros clientes. No se borró ni reinició el clúster.
La auditoría alta continúa en rojo; sin push ni despliegue. La medición nativa
guiada por la metodología móvil conserva memoria como tarea pendiente y
justifica mantener la reducción únicamente como mejora de empaquetado.

## Revalidación física y optimización preparada — 12 de octubre

El mismo clúster de pruebas recuperó su cierre interrumpido y alcanzó readiness
a las 00:52:19 Bogotá. Se respetó fsync y no se recreó, migró o limpió la base.
El primer inicio HTTPS rechazó un usuario de conexión incorrecto; se corrigió
usando el rol del archivo de entorno del fixture y se comprobó la identidad
`evry_contract_test`, loopback 55438, antes de abrir HTTPS 4443. Se conservó
también el rechazo del primer inventario cuando HTTPS todavía no estaba listo.

Una inspección nueva, limitada a la cuenta sintética y a GET de entrenamientos,
comprueba la sesión completada original, revisión 2, su serie 60 kg × diez
repeticiones y 600 kg de progreso. Encuentra además la sesión activa vacía
observada antes, revisión 1: dos sesiones distintas, no dos activas ni dos
finalizaciones. No se debilita el verificador original que esperaba una sola
sesión en el ensayo anterior ni se borra la activa para satisfacerlo.

Se restituyó exclusivamente el reverse USB 4443 y se reabrió el paquete QA
sin borrar datos. Inicio muestra la misma cuenta, «Sincronizado» y cero series
en la sesión activa. Los inventarios completos antes/después son idénticos
en IDs, clientId, revisiones, estados y cantidades; Progreso nativo muestra
una sesión y 600 kg. Logs `physical-preserved-{before-reconnect-ready,
after-reconnect}-20261012.log` y `physical-qa-progress-restored-20261012.log`
en `D:/DatosPC/EVRY`. Es preservación/reconexión de estos datos, no aceptación
de todos los conflictos, reenvíos, iPhone o rendimiento.

El muestreo puntual de Inicio sin servidor alcanzó PSS 144665 KB: continúa
incumpliendo 100 MB. De ese PSS, código ocupa 60760 KB, heap nativo 35296 KB
y gráficos 12974 KB. El arranque previo informó 4155 ms y otra reapertura
2702 ms; ninguno mide disponibilidad completa de React ni permite certificar
el presupuesto de arranque. No se atribuyen diferencias a cambios de código.

Se preparó reducción de código/recursos release mediante el plugin oficial
`expo-build-properties`, en la línea ~57.0.22 recomendada por el Expo instalado.
La regresión de configuración nativa falló por ausencia de la propiedad antes
y pasa después, junto con los otros dos controles de apariencia/permisos.
Se mantienen Hermes, CNG, firma, permisos y JS sin compresión añadida.
Referencias: [opciones oficiales de Expo](https://docs.expo.dev/versions/latest/sdk/build-properties/).
Todavía falta regenerar, compilar y medir ese APK; no se presenta configuración
como mejora física demostrada. La instalación añade dos paquetes; la auditoría
raíz posterior sigue con 55 altas y 18 moderadas (el informe parcial de instalación
por workspace no sustituye la puerta raíz). La cadena completa posterior está
activa: tipos/lint, 430 casos móviles y tres controles nativos pasan; la parte
web/compartida aún no tenía resultado final en esa observación. Posteriormente
la cadena completa terminó con salida 0: tipos, lint y 756 casos, incluidos
274 web, diez de accesibilidad y 39 compartidos. No demuestra resueltos los
timeouts anteriores. Prebuild `--no-clean --no-install` generó las propiedades
release activas, conservando React/RN; se restituyeron los scripts de desarrollo
que Expo modificó automáticamente. El APK anterior `73e0d13a` está archivado
como `before-release-shrink-20261012.apk`. La compilación del APK reducido está
activa (`android-shrink-release-build-20261012.log`); sin instalarlo ni afirmar
una reducción física demostrada todavía. Sin push o despliegue.

## Estado posterior verificado — 11 de octubre

Revisión física posterior de navegación: la captura de Inicio muestra la
barra de gestos Android sobre las etiquetas inferiores. La regresión que
inspecciona únicamente el paquete QA, con densidad real 320 dpi, falla por
bounds de accesibilidad de Inicio de 12,5 dp frente al mínimo de 44 dp. Se conservó el
rechazo anterior de la herramienta cuando otra app estaba en primer plano;
solo el segundo resultado, con foco QA comprobado, reproduce el defecto.
La causa entre insets, cálculo y layout sigue en investigación mediante un
APK diagnóstico separado de la configuración normal. No se declara corregido.
Ese APK se compiló y verificó antes de actualizar el paquete QA sin borrar
datos. Las mediciones reales muestran inset inferior cero, altura calculada
y medida de 49 dp y padding inferior cero; no hay evidencia de un cálculo
obsoleto del router. La regresión física sigue fallando por 12,5 dp de bounds
de accesibilidad, mientras la barra de gestos tapa las etiquetas. Falta resolver esa
discrepancia de espacio utilizable, no desactivar los gestos del teléfono.
La nueva inspección de la jerarquía nativa del mismo paquete QA muestra
contenedores de pestaña de 97 px (48,5 dp), no 25 px. Por tanto, los bounds de
UIAutomator no demuestran que la superficie táctil real mida 12,5 dp; sigue
pendiente explicar la discrepancia de accesibilidad y corregir la superposición
visible. Se prepara una actividad diagnóstica aislada que lee los insets públicos
de navegación y gestos sin modificar ajustes, listeners ni la app original.
La actividad ya se compiló, verificó (incluido DEX) e instaló exclusivamente
en QA, conservando el primer tiempo de instalación y los datos. La lectura
nativa confirma `navigationBars.bottom=0` incluso ignorando visibilidad,
pero `systemGestures.bottom=mandatorySystemGestures.bottom=30 px` (15 dp).
El contexto de safe-area solo consume navegación, status y cutout, no gestos;
esa omisión explica que la barra no reserve espacio para el indicador.
Registro numérico: `D:/DatosPC/EVRY/native-window-insets-measurement.json`.
El APK diagnóstico `521fe43d` no es una entrega normal ni acepta el MVP.

La corrección de EVRY reserva un gutter propio de 24 dp solo en Android cuando
el inset informado es menor, sin fingir que mide los gestos del dispositivo.
Conserva insets mayores y los insets reales de iOS, eleva el contenido mínimo
a 64 dp y deja crecer la altura con el texto del sistema. Cinco regresiones de
las opciones que EVRY entrega al router fallaron antes y pasan después, sin
ampliar sus límites. Esa prueba de frontera no verifica layout nativo, VoiceOver
ni que otro Android con una zona gestual mayor quede cubierto. Falta el APK
normal sin instrumentación y la comprobación física en ese punto del diagnóstico.
Tipos y lint posteriores pasan (se corrigió un nombre de componente anónimo
solo en el doble de prueba, sin omitir reglas). La suite raíz posterior termina
con salida 1: 430 casos móviles y dos controles nativos pasan, pero dos workers
web no inician a tiempo (`cycle-opt-in-lifecycle.test.tsx` y
`calendar-month.test.tsx`). Vitest informa 247 casos web correctos y dos errores
no capturados; accesibilidad web no se ejecuta porque falla la puerta unitaria.
Los 39 casos compartidos pasan. No es un resultado raíz verde ni una causa
confirmada del fallo intermitente de preparación. Log íntegro:
`D:/DatosPC/EVRY/tab-layout-full-workspace-tests.log`. No hubo publicación.

La comprobación física posterior sí valida la corrección en el OPPO con
font scale 0,9: el APK normal `73e0d13a` compiló, se verificó sin actividad,
clase DEX ni marcadores diagnósticos y se actualizó sin borrar datos. Los cuatro
bounds de accesibilidad miden 51,5 dp de alto, con etiquetas visibles contenidas;
la captura ya no presenta superposición con el indicador de gestos. Los cuatro
taps observados muestran Entrenar, Progreso, Perfil e Inicio, respectivamente.
No se guardó ninguna serie, rutina ni perfil durante esos recorridos. Logs:
`tab-layout-physical-tabs.log` y `tab-layout-native-navigation.log`; captura
`frontend/.worktrees/mobile-local-tls-20261011/qa-current-screen.png`.
Esto valida esa navegación en ese dispositivo, no lectura de pantalla completa,
texto grande en dispositivo, iPhone, rendimiento o aceptación integral del MVP.
La app mantiene la sesión local de cero series ya observada antes; no se limpió
ni sustituyó por la sesión completada del ensayo anterior. La última inspección
encontró listeners de API/PostgreSQL activos, pero ningún reverse USB; no se
presenta esta navegación local como una nueva sincronización contra el servidor.
Memoria puntual de Inicio: PSS 135620 KB, todavía sobre 100 MB. No es una
mejora atribuible a código: difiere del estado posterior al registro.
La auditoría completa volvió a fallar: 55 entradas altas, 18 moderadas y
cero críticas; no se aplicaron las sugerencias de downgrade/actualización
mayor ni se relajó CI. Logs `native-navigation-physical-tabs-owned-red.log`,
`native-navigation-current-memory.log` y `native-navigation-current-audit.json`.

Revalidación previa al commit offline: tipos y lint móvil pasan. La primera
suite completa tuvo 424 casos correctos y un timeout en el primer render de
readiness (límite de diez segundos), durante compilación y recuperación de
PostgreSQL concurrentes. Una ejecución aislada sin caché conserva todos sus
37 casos y pasa; el primer render tarda 7485 ms y la respuesta visible 7558 ms.
La suite móvil completa posterior, sin esos trabajos concurrentes, pasa 425
casos más dos controles nativos, con el mismo límite y las mismas aserciones.
Esto no demuestra resuelto el timeout intermitente ni aprueba el rendimiento
de la app. Se retuvo instrumentación numérica opt-in solo en el test.
La corrección de transporte y sus regresiones están en el commit local
`472f819d23b8be71123eabda9ad352970215e34f`; no se publicó con auditoría en rojo.

Los servicios de prueba se encontraron detenidos posteriormente. PostgreSQL
recuperó el mismo clúster después de un cierre interrumpido; el controlador
agotó su espera, pero el proceso siguió recuperándose y alcanzó readiness.
No se reinició otra vez ni se recreó, migró o borró la base. Con HTTPS local
restablecido se verificaron los mismos IDs, revisión 2, una sesión completada,
una serie 60 kg × diez repeticiones y 600 kg de progreso. Los datos sintéticos
del recorrido físico sobrevivieron a la recuperación.

Actualización de transporte nativo: la compilación `79153` terminó con salida
0 en 9 min 48 s. El APK actualizado pasó la verificación de paquete QA,
arquitectura, permisos, firma v2, bundle generado y certificado limitado a
localhost, sin tráfico HTTP. Tamaño 46304538 bytes; SHA-256
`5e90e33777c3d281c60a04e63bddad6518eab20a87b0b36b982ec8bd91d8848b`.
La actualización `-r` terminó con salida 0 y `Success`; firstInstallTime se
conservó en 11:00:19 y lastUpdateTime cambió a 11:38:56. Play Protect apareció
durante la espera; no se aceptó automáticamente ni se desactivó. Con reverse
USB 4443 ausente, la reapertura recuperó la cuenta sintética, «Modo local» y
el entrenamiento; se verificaron los valores persistidos 60 kg y diez
repeticiones. Se finalizó desde la interfaz sin backend y otra reapertura
mantuvo «Guardado localmente» sin sesión activa. El arranque observado tras
actualización fue 4006 ms, no un presupuesto de rendimiento aprobado.

Antes de reconectar, la API verificó cero sesiones de ese usuario en el
servidor. Se restituyó solo el reverse 4443 y se reabrió la app. Inicio mostró
«Sincronizado»; la API verificó exactamente una sesión `COMPLETED`, una serie
de 60 kg × diez repeticiones y progreso de 600 kg. Progreso nativo mostró una
sesión y 600 kg. Otra reapertura no creó duplicados ni cambió IDs/revisión.
Es recuperación/finalización/sincronización física del recorrido básico, no
prueba de conflicto entre dispositivos, reenvío idéntico de lote, modo avión,
rendimiento aprobado ni aceptación integral del MVP. La primera comprobación
auxiliar de progreso falló al pedir `limit=30`; el contrato admite máximo 25.
Se corrigió únicamente ese helper y se conservó el log fallido.
Logs `native-fetch-qa-{offline-restored-series,offline-finished,
offline-completed-home,reconnected-home,physical-progress}.log` y
`native-fetch-qa-server-{before-sync,after-sync-correct-limit,repeat-open}.log`.

La instalación original `93946` terminó con salida 0 y `Success`; no se
desinstaló ni borró la app. Conserva la API `.invalid` y no se declara un MVP.
Después se comprobó que `com.gabrielcano.evry.validation` no estaba instalado
y se inició su instalación independiente, sin `-r`. La operación `13063`
terminó con salida 0 y `Success`; firstInstallTime y lastUpdateTime son
11 de octubre, 11:00:19. No se aceptó automáticamente el diálogo ni se
desactivó Play Protect. Se abrió el componente QA y se verificó su foco antes
de inspeccionar/interactuar únicamente con su interfaz.

El arranque frío inicial devuelve `Status: ok`, TotalTime 3245 ms y WaitTime
3276 ms. Es el tiempo observado por Android, no una medición completa de
disponibilidad React; ya supera el objetivo de 3 s y no se declara aprobado.
La observación protegida muestra el formulario de acceso. El registro real
desde el teléfono con credenciales sintéticas abre Inicio con el usuario
«EVRY Physical QA» y «Sincronizado», comprobando conexión HTTPS real, auth y
preparación del almacenamiento nativo. No constituye todavía aceptación del MVP.
Memoria posterior a registro: TOTAL PSS 162046 KB, superior al presupuesto
de 100 MB; medición inicial puntual, no benchmark agregado ni fallo resuelto.
Logs `physical-qa-first-launch.log`, `physical-qa-login-observation.log`,
`physical-qa-registration-actions.log`, `physical-qa-registration-result.log`
y `physical-qa-first-memory.log`.

Se preparó exactamente un ejercicio personalizado para ese usuario sintético
por la API HTTPS, con comprobación de identidad/propiedad y sin datos reales.
El primer diagnóstico usó `search`, rechazado por el contrato; se corrigió a
`q`, conservando ambos logs. La sesión de ese cliente auxiliar se cerró sin
cerrar la sesión Android. Los IDs de limpieza están en el directorio ignorado.
El catálogo se observó en el formulario nativo de rutina. Luego se retiró
solo el reverse USB de QA (4443), sin cambiar las radios/red del teléfono:
se prueba backend inaccesible, no modo avión ni eventos NetInfo offline.
Se inició una sesión libre en esas condiciones y la UI muestra «Guardado
localmente» y el ejercicio previamente consultado. Se añadió una serie local
y se verificaron los valores 60 kg y diez repeticiones en la interfaz.

La primera recuperación física falla: se detuvo únicamente el proceso QA
(sin limpiar datos) y se reabrió con el backend todavía inaccesible. Aparece
login con el rechazo nativo de conexión, no la cuenta validada ni su sesión.
Ese segundo arranque Android mide 2648 ms; no invalida la primera medición
fuera de presupuesto ni acredita estabilidad funcional. Se conserva
`physical-qa-unreachable-reopen-home.log` como fallo real.

La regresión reprodujo la diferencia: la recuperación existente acepta un
rechazo `TypeError`, pero el `Error` del transporte nativo deja estado anónimo
(30 casos pasan, uno falla). Se normaliza ahora el rechazo de fetch en la
frontera móvil, sin reinterpretar respuestas HTTP, parsing JSON, middleware,
fallos de SecureStore ni cancelación. La suite enfocada pasa 32 casos y dos
de configuración nativa; conserva los controles de logout y rechazo 401.
Logs `native-fetch-offline-auth-red.log` y `native-fetch-offline-auth-green.log`.
La cadena posterior termina con salida 0: tipos, lint y 749 pruebas (425
móviles, dos de configuración nativa, 273 web, diez de accesibilidad y 39
compartidas). La integración completa contra Nest/PostgreSQL también pasa
nueve casos en cuatro suites y cierra sus servidores IPC; el servidor HTTPS
físico y su PostgreSQL continúan activos. Logs `native-fetch-current-types.log`,
`native-fetch-current-lint.log`, `native-fetch-current-root-tests.log` y
`native-fetch-current-backend-integration.log`. No demuestra corregido el fallo
intermitente de inicio de workers observado antes: esta cadena sí se completó,
sin cambiar configuración ni límites web.

Una revisión de código de solo lectura no encontró problemas críticos,
importantes ni menores en estos dos archivos; admite continuar la validación
física, no publicar ni declarar listo el proyecto completo. El APK anterior
se archivó tras verificar su SHA y se está compilando el actualizado por la
misma configuración QA aislada. Todavía no se instaló ni revalidó la corrección
en el teléfono: el instalado sigue mostrando el fallo; su SQLite no se borró.
Log `native-fetch-qa-release-build.log`.

Los dos recorridos reales de progreso sí pasan desde el cliente en Node por
HTTPS: ejecución normal, salida 0, 2326/1920 ms; ejecución `--no-cache`, salida
0, 3954/5049 ms. Solo estos fixtures de Windows local admiten preparación
de 30 s y recorrido de 15 s; CI y otros sistemas mantienen 5 s. Es una decisión
de configuración de pruebas bajo la autorización general de continuar, no
una autorización numérica explícita ni una optimización medida de la app.
No cambian casos, aserciones, limpieza, ni presupuestos de rendimiento.
La ejecución normal ya pasó dentro del límite anterior: ampliar el límite no
demuestra una corrección de la latencia intermitente observada.

Logs: `physical-https-progress-local-deadlines.log`,
`physical-https-progress-cold-verification.log` y
`android-isolated-validation-install.log`, en `D:/DatosPC/EVRY`.
La cadena completa actual (`88872`) terminó con salida 1: tipos y lint pasan,
423 pruebas móviles y dos de configuración nativa pasan; web ejecuta 247 pruebas
en 51 archivos, pero dos workers no inician y la accesibilidad no se ejecuta.
Los 39 casos compartidos pasan. No es una suite completa verde.
El diagnóstico de los dos archivos afectados pasa 26 casos, con respuestas
de inicio de workers en unos 3,1 s; no reproduce ni resuelve el fallo inicial.
Se conserva `physical-progress-current-root-tests.log` y
`physical-web-worker-reproduction.log`. La reproducción instrumentada de la
suite web completa termina con salida 0: 273 casos en 53 archivos, 53 workers
iniciados; los dos iniciales responden en 2825/2899 ms y el máximo es 3757 ms.
Log: `physical-web-full-worker-reproduction.log`. No se cambiaron límites,
pool ni workers y no se reprodujo el fallo; no se presenta como corrección.
La puerta de accesibilidad ejecutada por separado, sin instrumentación, termina
con salida 0: diez casos en cinco archivos, 52,70 s. Log:
`physical-progress-current-web-accessibility.log`. La cadena original no la
ejecutó y este resultado separado no sustituye una cadena completa verde.
Los once controles de seguridad/espera del runner pasan y el contrato se verifica
contra el checkout backend autorizado (`physical-progress-current-runner-safety.log`
y `physical-progress-current-backend-pin.log`, salidas 0). La consulta de paquete
Android confirma actualización original a las 10:34:31 del 11 de octubre y
firstInstallTime original del 10 de octubre a las 14:41:42.
El servidor HTTPS `48249` y PostgreSQL sintético siguen activos; no se afirma
cierre limpio. Estos resultados posteriores reemplazan los estados pendientes
de instalación original y de contrato HTTPS descritos históricamente abajo.

## Validación física — instalación release pendiente, 11 de octubre

El OPPO A54 sigue conectado y autorizado por USB. Se volvió a verificar el
SHA-256 del APK release arm64 local antes de enviar `adb install -r`:
`9862F142CDC9195FC3C71D0EAF9C0AC636ADB511A4D66E391126FF15929471C6`.
Se usa actualización que conserva los datos, no desinstalación, limpieza ni
concesión de permisos. La autorización general del propietario cubre esta
validación local; no se pidieron nuevas autorizaciones.

La operación todavía está esperando: la actividad visible identificada por
Android es `PlayProtectDialogsActivity`. La consulta de paquete mantiene
`firstInstallTime=2026-10-10 14:41:42` y `lastUpdateTime=2026-10-10 14:41:42`.
No se declara instalado el APK release ni se inició la aplicación anterior
para simular un resultado. No se desactivó Play Protect ni se aceptó su diálogo
automáticamente. La comprobación de arranque/memoria espera el resultado real
de esa instalación. Además, este APK conserva la API HTTPS `.invalid`: incluso
si se instala, no constituye un MVP conectado ni verifica sincronización física.

### Preparación HTTPS local aislada

Para no rebajar la exigencia HTTPS de release, se preparó un certificado
sintético de localhost mediante el JDK local. Su clave permanece en un
directorio ignorado de `.worktrees` en D:, fuera de los originales/OneDrive;
no se instaló en almacenes de certificados del PC o teléfono. Es material de
QA temporal, no la identidad TLS o firma de distribución de EVRY.
La prueba TLS real sobre un listener efímero loopback comprueba rechazo sin
confianza explícita, conexión autorizada con el certificado exacto y ausencia
de coincidencia para un host externo. Termina con salida 0 y cierra el listener.
El primer probe falló al leer un socket ya desacoplado por keep-alive; se
conserva y se corrigió la lectura, no la validación TLS. Logs:
`mobile-local-tls-handshake-verification.log` (fallo del diagnóstico) y
`mobile-local-tls-handshake-corrected.log` (salida 0).

Se inició una compilación local independiente con ID
`com.gabrielcano.evry.validation`, etiqueta «EVRY Validación», API
`https://localhost:4443/api/v1` y salida `D:/EVRY-Validation-Build/app`.
La configuración de red adicional confía en el certificado solo para
`localhost` sin subdominios y prohíbe HTTP; los otros dominios mantienen
certificados del sistema. Los overlays e init script son locales/ignorados,
no cambios del APK distribuible ni del código de la aplicación. Esta separación
sigue la [configuración de seguridad de Android](https://developer.android.com/privacy-and-security/security-config).
El APK original que lee la instalación pendiente no se sobrescribe.
La compilación está en curso: no hay todavía aceptación de manifiesto final,
instalación, backend conectado, arranque, memoria ni recuperación física.
Log: `D:/DatosPC/EVRY/android-local-tls-validation-build.log`.

El servidor HTTPS local de QA se preparó con NestJS compilado y la configuración
real de la API, sin desactivar validación, autenticación ni rate limiting.
Antes de importar la app o abrir un listener, su guard exige exactamente la
identidad `127.0.0.1:55438/evry_contract_test`, schema público, ausencia de
sobrescrituras de enrutamiento y diferencia respecto al runtime; comprueba además
la identidad devuelta por PostgreSQL. No migra, resetea ni crea bases.
Cuatro regresiones reprodujeron que la frontera inicial demasiado amplia
aceptaba otras identidades locales; la restricción pasa después los nueve casos.
El ejecutable real también rechazó una URL remota en `DATABASE_GUARD` (salida 1
esperada), antes de requerir Nest, conectar o leer la clave TLS. Evidencia:
`physical-fixture-database-guard-red.log`, `physical-fixture-database-guard-green.log`
y `physical-tls-fixture-remote-refusal.log`. Todavía no se inició este servidor
contra el clúster ni se verificó el contrato HTTPS real desde el teléfono.

### APK aislado y backend HTTPS: verificación posterior

La primera compilación terminó con salida 0 (12 min 40 s), pero la inspección
final detectó que `build.gradle` había sobrescrito el applicationId del init
script. Ese APK no se instaló: se preservó como `failed-app-id-release.apk`
(SHA `d195c9b497b4f07bbc625e88d2b39b13491e53e2c0a42800787dcac6eb565207`).
La aserción de paquete reprodujo el fallo. El cambio se aplica ahora en
`androidComponents.finalizeDsl`, después de configurar el DSL. La compilación
corregida termina con salida 0 (4 min 51 s) y el verificador del APK completo
también pasa: paquete `com.gabrielcano.evry.validation`, 46.303.646 bytes,
SHA `8b379dbe698379afe5b3e3b2503c98ddd7008f8685484aa42d89532d4d84dbca`.
Comprueba minSDK 24/target 36, arm64, no depuración/almacenamiento/superposición,
firma v2 Android Debug, política sin HTTP y certificado exacto solo para
localhost. El bundle integrado coincide con el generado y contiene el endpoint
HTTPS local (SHA `df6a520a1dd1b38186b7e33e067eab7fe415cf6d1305807038df24ba790c5935`).
Los nombres de archivos XML/PEM del APK están optimizados por AAPT: el verificador
los resuelve desde la tabla de recursos, sin asumir las rutas fuente.

El backend HTTPS real ya inició con la identidad PostgreSQL comprobada. Las
dos rutas de health devuelven 200, proceso `ok` y base `ready`; la confianza
por defecto rechaza el certificado y la explícita lo valida, sin desactivar TLS.
Se creó solo el reverse USB `tcp:4443 → tcp:4443`, sin reemplazar mapas existentes.
Su primer diagnóstico falló por escape de la expresión regular; la consulta
corregida comprueba el mapa existente sin recrearlo. Esto no prueba tráfico
desde la aplicación Android, todavía no instalada.

La prueba adicional de progreso del cliente sobre HTTPS no está aceptada: el
primer comando usó una ruta de Jest inexistente; corregida la resolución desde
el workspace móvil, falló el `beforeAll` de cinco segundos antes de los dos
recorridos. Se conservan ambos logs, sin aumentar ese límite ni modificar casos.
Se añade temporalmente confianza al certificado público solo en ese proceso
Node; no se instala en el sistema ni se desactiva la verificación.
La instalación original sigue pendiente y no se lanzó otra instalación en paralelo.
El servidor TLS sigue activo: el intento de cerrarlo por stdin informó canal
cerrado, no salida del proceso. Debe cerrarse antes de detener su PostgreSQL;
el próximo arranque necesita canal de control conservado. No se afirma cierre
limpio ni aceptación física, MVP conectado o finalización integral.

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

La ausencia de SDK/dispositivo correspondía a la inspección inicial y quedó
resuelta el 10 de octubre, como se detalla abajo. Siguen pendientes las pruebas
nativas de cierre, reapertura y reconexión.
No se instalaron binarios, borraron datos de dispositivos, crearon recursos
externos ni ejecutaron builds remotos. La corrección cubre la finalización;
no certifica todos los estados de guardado de las demás mutaciones.

La publicación sigue condicionada a la auditoría alta del monorepo. No se
deben omitir avisos, reducir el umbral ni publicar con una puerta conocida roja.

## Preparación física — 10 de octubre de 2026

El usuario autorizó herramientas y copias independientes del proyecto en D:.
JDK, SDK, Gradle, preferencias Android/Expo y cachés de herramientas están
configurados allí. La primera compilación se interrumpió sin producir un APK;
se conserva su registro sin atribuirle un resultado de éxito. La siguiente
compilación local reutilizó artefactos y limitó los trabajadores Gradle a dos,
pero falló tras 19 minutos: Ninja de `react-native-screens` rechazó una ruta
de encabezado de 263 caracteres. La caché corta `D:\EVRY-Gradle` reduce esa ruta
a 234; se conserva la caché original y se comprueban las herramientas con las
nuevas rutas. La copia terminó y coinciden los recuentos y tamaños de archivos
en sus cuatro directorios; el encabezado que falló también conserva su SHA256.
El primer intento con esa caché también falló: el registro binario de
dependencias de Ninja conservaba la ruta antigua, aunque CMake ya generaba
instrucciones con la nueva. Se archivó únicamente ese registro generado,
con checksum conservado y recuperación posible, sin limpiar directorios.
La planificación real de Ninja reprodujo el error antes y pasó después,
con seis pasos de compilación/enlazado. La nueva compilación completa está
en curso; el pase de planificación no demuestra un APK funcional.
Ninguno de estos controles prueba un APK terminado, instalado o funcional.

Se añadió `expo-system-ui` compatible con SDK 57 para que Android aplique el
tema oscuro configurado. Se bloquearon los permisos de almacenamiento externo
y superposición, innecesarios para SQLite interno y miniaturas en caché privada.
Dos regresiones sobre la configuración nativa real fallaron antes de sus
correcciones y pasaron después; mantienen los permisos de red y vibración.
La regeneración Android terminó y se inspeccionaron sus recursos y manifiesto.
Esto no verifica el manifiesto del APK final ni el comportamiento físico.

La inspección del manifiesto combinado de **debug** detectó un límite adicional:
el manifiesto de `src/debug` declara superposición con mayor prioridad que el
marcador de eliminación de `main`. Los dos permisos de almacenamiento están
ausentes, pero superposición permanece en debug. Se conserva este hallazgo;
la prueba de configuración principal no certifica todas las variantes. Falta
comprobar release antes de dar por cerrada la revisión de permisos. El código
instalado de React Native lo utiliza para mostrar FPS/JS FPS en herramientas de
desarrollo (`DebugOverlayController`); se conserva esa función de debug sin
conceder permisos en el teléfono. La funcionalidad de EVRY no requiere esa
superposición y su ausencia en release sigue siendo una comprobación pendiente.

Tipos y lint pasaron; la suite raíz posterior registró 739 pruebas aprobadas y
una fallida de readiness por superar su plazo existente. No se amplió el plazo
ni se omitió la prueba. La auditoría completa sigue con 55 avisos altos y 18
moderados; las comprobaciones parciales no habilitan la publicación.

El OPPO A54 (CPH2239) está conectado y autorizado para ADB: Android 11/API 30
y ABI arm64-v8a confirmados mediante lectura de propiedades. No se instalaron
aplicaciones ni se accedió a sus datos. Esto resuelve la disponibilidad del
equipo para las pruebas, no las pruebas de cierre/reapertura, sincronización,
SecureStore, navegación, accesibilidad o rendimiento release enumeradas arriba.
La aplicación permanece sin publicar por sus puertas pendientes.

La compilación nativa de depuración terminó correctamente el 10 de octubre:
`assembleDebug`, 6 min 20 s y 453 tareas. El APK local tiene firma de depuración
verificada, ABI arm64-v8a, Android mínimo API 24 y destino API 36, compatibles
con las propiedades verificadas del OPPO. No solicita acceso al almacenamiento
externo; conserva el permiso de superposición propio del desarrollo, sin otorgarlo.
Todavía no se ha instalado. Este APK necesita Metro y no sustituye el binario
release independiente ni las pruebas físicas y de rendimiento pendientes.

Con autorización explícita posterior, el APK se instaló en el OPPO el 10 de
octubre a las 14:41. La instalación y la versión 1.0.0 se verificaron en Android;
no existía una instalación anterior de EVRY y no se sobrescribieron datos.
No se concedieron permisos adicionales ni se inició la app. La siguiente etapa
es preparar Metro local y verificar el funcionamiento real, todavía pendiente.

El intento de iniciar Metro fue rechazado por la política de la herramienta
antes de crear el proceso. No se intentaron lanzadores alternativos ni se abrió
la app sin su servidor de desarrollo. La instalación queda verificada, pero
el funcionamiento físico, la reapertura offline y el rendimiento siguen sin
aceptación; no se requiere ninguna acción en el teléfono en este momento.

La revisión posterior del manifiesto **release** generado terminó correctamente:
`:app:processReleaseMainManifest`, 8 min 42 s y 87 tareas. Se analizó el XML
real en `android/app/build/intermediates/merged_manifest/release/` y se confirmó
la ausencia de permisos de lectura/escritura de almacenamiento externo y de
superposición, manteniendo red y vibración. La generación incluyó su paquete
JavaScript local, no un servidor abierto; el puerto 8081 no tenía listeners.
Se conservan las advertencias de marcadores de manifiesto y obsolescencias de
Gradle, con log `D:/DatosPC/EVRY/android-release-manifest-check.log`. Esta
evidencia cierra la comprobación del manifiesto principal combinado de release,
no la del APK empaquetado, su firma ni las pruebas físicas de funcionamiento
y rendimiento. No se generó ni instaló otro APK.

El intento posterior de `assembleRelease` para arm64-v8a terminó con salida 1
(13 min 53 s, 421 tareas): Ninja rechazó la ruta del objeto generado
`RNGestureHandlerDetectorShadowNode.cpp.o` por superar 260 caracteres. Se
conservan `android-release-arm64-build.log` y el árbol `.cxx` original; no hay
APK release aceptado. Es una ruta del módulo app, distinta de la caché Gradle
que se acortó para debug.

Se prepara una configuración local opt-in mediante un init script de Gradle,
sin editar los archivos Android generados. Solo el módulo app cambia su
`buildStagingDirectory` a `D:/EVRY-Cxx/app`; se valida la ruta canónica en D:
y no se limpia ni mueve la salida anterior. Esta propiedad está documentada
en el [DSL CMake de AGP](https://android.googlesource.com/platform/tools/base/+/HEAD/build-system/gradle-api/src/main/java/com/android/build/api/dsl/Cmake.kt).
La generación de CMake con esa configuración está en curso, registrada en
`D:/DatosPC/EVRY/android-short-cxx-configure.log`; todavía faltan verificar el
grafo de Ninja, recompilar, inspeccionar el APK y su firma. No se ha instalado
ni iniciado otro binario, y no se modificaron SDK, código de la app o permisos.

La generación con ruta corta terminó con salida 0 (3 min 10 s, 57 tareas).
Los 66 objetos del grafo conservado tenían rutas de hasta 361 caracteres;
los 66 del grafo nuevo tienen un máximo de 248, todos inferiores a 260.
El primer diagnóstico falló por esperar incorrectamente que `ninja -n`
reprodujera el error: ese modo solo planificó la regeneración de CMake. Se
conserva ese resultado y no se presenta como prueba de compilación.
El control de rutas corregido pasó; la compilación completa se está ejecutando
de nuevo en `android-release-short-cxx-build.log`, aún sin aceptación del APK.

### APK local con código integrado, 11 de octubre

Tras la pausa solicitada por el propietario, el handle anterior ya no existía,
no había procesos de compilación EVRY ni APK terminado. Se conservó el registro
interrumpido y se reanudó incrementalmente con la misma ruta corta, sin limpiar
salidas. `assembleRelease` terminó con salida 0: 16 min 22 s, 532 tareas
(121 ejecutadas y 411 reutilizadas). Registro:
`D:/DatosPC/EVRY/android-release-short-cxx-resumed-build.log`.

Se inspeccionó el APK real de 46.301.734 bytes en
`apps/mobile/android/app/build/outputs/apk/release/app-release.apk`:

- SHA256 `9862F142CDC9195FC3C71D0EAF9C0AC636ADB511A4D66E391126FF15929471C6`.
- Paquete `com.gabrielcano.evry`, versión 1.0.0/code 1, arm64-v8a, mínimo API
  24 y destino API 36; no marcado `debuggable`.
- Bundle integrado de 3.493.148 bytes, idéntico por SHA256 al generado en
  `build/generated/assets/react/release/index.android.bundle`.
- Firma v2 válida con certificado **Android Debug**, el mismo del APK de
  depuración anterior; no constituye firma privada de distribución final.
- Sin permisos de almacenamiento externo ni superposición; red y vibración
  conservados. Registro `D:/DatosPC/EVRY/android-release-apk-verification.log`.

El primer control de equivalencia falló por buscar una ruta generada antigua
que no existe en esta versión de React Native. No demostró una diferencia de
bundles. Tras localizar la salida real, la comparación completa pasó; el hash
del bundle integrado es
`9CCA4937758A2EBF69254C53C254981F1EC5A8AA2D4BB3A587875A88F4D2B745`.

Este APK incluye el código local sin necesitar un servidor de desarrollo para
obtenerlo, pero se compiló con una API HTTPS `.invalid`. Es evidencia de
empaquetado nativo, no una app conectada utilizable ni cierre de pruebas físicas.
No se instaló ni inició en el teléfono. Siguen pendientes autenticación real,
persistencia offline/reapertura, conflictos, accesibilidad, memoria/arranque y
aceptación iPhone. La auditoría frontend sigue bloqueando el checkpoint; no
hubo push, recursos externos ni despliegue.

La configuración local opt-in utilizada está preservada también como
`scripts/windows-short-cxx.init.gradle`, idéntica byte a byte a la que produjo
el APK verificado. Para una compilación local Windows, agregar a Gradle
`--init-script D:/DatosPC/EVRY/frontend/scripts/windows-short-cxx.init.gradle`
y `-Pevry.cxxRoot=D:/EVRY-Cxx/app`, con la activación y el lanzador D-only
habituales. No cambia las fuentes generadas por Expo, firmas, API, pruebas ni
los builds Linux/EAS que no seleccionan ese init script. La copia anterior en
`.worktrees/native-path-evidence` se conserva como evidencia del build.
