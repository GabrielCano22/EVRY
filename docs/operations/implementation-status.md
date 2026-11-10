# Estado de implementación de la hoja de ruta integral

Actualizado: 19 de octubre de 2026. Este registro separa implementación, evidencia observada y aceptación final; no declara preparación para producción.

La revisión independiente posterior encontró cuatro fallos funcionales. Se
reprodujeron con pruebas antes de corregirlos: una instantánea obsoleta podía
recrear una serie borrada por REST; una sesión web sin UUID no podía continuarse
desde móvil; añadir tras borrar una serie intermedia repetía el orden; y el
readiness parcial podía conservar respuestas antiguas pero puntuar valores por
defecto. Las correcciones propagan revisiones, rechazan series desaparecidas con
revisión previa, adoptan identidades persistentes, calculan el siguiente orden
desde el máximo y puntúan los datos diarios combinados. `null` sigue borrando
una respuesta; omitir un campo lo conserva.

Una comprobación posterior de concurrencia reprodujo en SQLite otro riesgo:
durante la adopción remota, la respuesta tardía podía sobrescribir una edición
local o eliminar un borrador que acababa de conservarse. La corrección local
compara el estado disputado antes y después de la espera dentro de transacciones
serializadas, sin mantener una transacción abierta durante la red. Si cambió,
conserva los datos y pide revisarlos. Las dos regresiones fallaron antes del
cambio y pasaron después; la suite SQLite enfocada pasó 41 casos. Posteriormente
pasaron los 942 casos de la suite completa, tipos y lint no mutativo. Un registro
de 298 archivos confirmó que ni sus rutas ni sus hashes cambiaron durante esa
ejecución. Esta corrección posterior ya está incluida en el nuevo APK privado
`10f49413`, archivado y verificado: misma firma y permisos, HTTPS local y código
de adopción/protección presentes en el bundle final. Los APK anteriores se
conservan. El nuevo todavía no está instalado en el OPPO; la copia instalada
`91f261a7` no contiene esta última protección. No se publicó en GitHub ni se
declararon aprobados los presupuestos de rendimiento.

La comprobación posterior del OPPO confirmó que conserva el APK `91f261a7`
y una sesión activa; no se interrumpió ni se instaló encima durante ese uso.
Se restableció la API local con la misma base y certificados. Una comprobación
SQL de solo lectura confirmó intactas las dos sesiones completadas anteriores
y sus series; TLS y salud de la base pasaron. La actualización queda preparada
para aplicarla cuando la sesión activa haya terminado.

La compilación de producción web posterior pasó con Next.js 16.3.8 y los mismos
298 archivos fuente verificados. El artefacto usa el origen de API de pruebas
de CI; no se inició un servidor web ni hubo despliegue o medición de Web Vitals.
La investigación nativa encontró un consumidor interno de Worklets en Expo:
no se retiraron dependencias ni se atribuyó una reducción de memoria a su tamaño
en disco. La última comprobación del OPPO lo encontró bloqueado; no se leyó su
interfaz ni se intentó desbloquearlo o instalar encima.

La primera pasada general falló en el primer render de catálogo nativo (20 s)
y en el inicio de un worker web; este último dejó trece casos del ciclo sin
ejecutar. Se conserva como fallida. Se aplicó la ampliación autorizada únicamente
al primer caso nativo en Windows local (60 s; CI y otros sistemas conservan
20 s), sin cambiar sus aserciones ni el presupuesto de arranque de la app. Web
usa ahora un proceso aislado en Windows local: se verificaron sus 59 archivos
y 364 casos, incluidos los trece ausentes. CI conserva dos workers de tipo
thread. Los límites de pruebas, aislamiento y casos web no se modificaron.
La pasada general posterior usó la configuración guardada, sin sustituir el
pool desde la línea de comandos. Esto no certifica rendimiento web/Android ni
estabilidad universal del entorno local.

Evidencia local: 510 unitarias y 104 casos HTTP/PostgreSQL del backend y 942 casos
en la suite principal del monorepo. Se revalidaron tras la última protección los
diez recorridos móviles contra Nest compilado, con cinco bases sintéticas nuevas
e independientes: pasaron todos, junto con las comprobaciones del contrato. Los
298 archivos fuente capturados conservaron sus hashes también en esta fase.
El recorrido de integración de adopción conserva
la sesión/serie web al editar y completar desde móvil. Es evidencia de integración,
no de ese recorrido completo en un dispositivo físico. El backend se publicó como
`fc6afb3b58aaaa0c850961bf0305d4cb3560b020`; las CI de push y PR pasaron sus 23
pasos completos sin omisiones. El PR 18 quedó actualizado, sin merge. La
medición compartida de API falló tres de treinta grupos y se conserva; la
comparación aislada posterior pasó treinta de treinta con los mismos
presupuestos, muestras y confianza. El margen local de preparación Windows
queda separado de las latencias HTTP, y CI conserva 30 segundos de preparación.
Esto no demuestra estabilidad universal ni borra las mediciones adversas.
El anterior APK `91f261a7` terminó de compilarse y se instaló sobre la copia
local del OPPO, conservando firma, identidad y sesión. El verificador estricto
confirmó la API HTTPS del puerto 4447 y el nuevo contrato de adopción dentro del
bundle. Después del cierre manual de la API anterior se inició el backend
actualizado con los mismos datos y certificados: salud de base de datos y TLS
pasaron; la nueva ruta rechaza solicitudes sin autenticar con 401. La interfaz
física conserva la navegación autenticada y muestra «Sincronizado». Esto no
certifica todavía el recorrido de adopción completo en el teléfono. Una muestra
de memoria de Inicio dio 128,50 MiB PSS: sigue superando el presupuesto de 100 MiB.
Continúan abiertos los
bloqueos de auditoría, rendimiento web/Android y Maestro previamente registrados.
No hubo despliegue ni cambios sobre datos reales. Más detalle en
`mobile-backend-integration.md`.

La validación física posterior también comprobó editar la rutina conservando
su identidad (tres→cuatro series), activar el ciclo sin modificar el sexo del
perfil, crear/editar/eliminar únicamente un registro sintético y desactivar el
seguimiento. La pestaña desapareció al optar por no seguirlo. SQL confirmó que
sesiones, series, cargas, estadísticas y revisiones previas quedaron intactas.
No hubo cambios de UX ni borrado de datos preexistentes. Alcance e informes:
`mobile-durability.md`.

El APK privado actual completó un recorrido offline posterior: iniciar, editar,
reiniciar el proceso y recuperar 20 kg × 6 desde SQLite; finalizar sin API,
reiniciar de nuevo y sincronizar al recuperar la API local. PostgreSQL confirmó
dos sesiones completadas y dos series, con 240 kg; otro primer plano conservó
IDs, revisiones y conteos. La caída de API ya existía al retomar: no se eludió
el cierre rechazado previamente. No se desactivó Internet ni se cambiaron ajustes
del dispositivo. Detalles, límites y evidencia en `mobile-durability.md`.

El propietario difirió los cambios de UX. La continuación funcional en el OPPO
verificó guardar el objetivo Fuerza sin alterar los otros campos personales,
guardar y actualizar el mismo readiness diario (70→73, un único ID), y crear una
rutina con Sentadilla con barra y tres series objetivo. SQL confirmó valores y
relaciones, conservando una única sesión de entrenamiento del recorrido anterior.
No hubo cambios del diseño/producto ni se declararon probados los dominios que
no se recorrieron; detalles y evidencia en `mobile-durability.md`.

La validación del primer APK local rechazó su dirección de API: conservaba
`https://localhost:4445/api/v1`, aunque la compilación solicitaba el puerto 4447.
No se instaló. Se reprodujo una colisión de la clave de transformación de Metro
al cambiar únicamente la API pública; la configuración ahora separa esa caché
por dirección y conserva todos los valores monorepo de Expo. Dos pruebas reales
de la clave de Metro fallaron/pasaron antes/después, sin mocks ni borrar cachés.
El segundo caso comprueba estabilidad y que los secretos privados no alteren
la clave. La reconstrucción terminó correctamente. El verificador del APK final
confirma la API del puerto 4447, firma privada, confianza adicional limitada a
localhost, HTTP deshabilitado y ausencia de instrumentación de diagnóstico.
El archivo conservado es `evry-local-20261019-33d1554b.apk` (35.773.191 bytes,
SHA-256 `33d1554bf72a5e84160751112429e3ef50b0fce36885f6467f4603c83d95d033`).
Se verificó que el paquete independiente `com.gabrielcano.evry.local` no existía
en el OPPO CPH2239 y la instalación sin reemplazo terminó con `Success`.
La presencia de la versión `1.0.0-local` se comprobó en Android. La instalación
por sí sola no acredita render, conexión TLS ni presupuestos de rendimiento.

Tras desbloquear el OPPO, el mismo APK completó un recorrido **online** real:
login con la cuenta reservada existente, catálogo, búsqueda de Sentadilla con
barra, inicio libre, una serie de 10 kg × 8 editada a 12 repeticiones y
finalización. La UI mostró una sesión, 120 kg y comparación con el periodo
anterior. Dos comprobaciones SQL de solo lectura confirmaron una sesión
`COMPLETED`, revisión 9, una serie de 10 kg × 12 y una estadística con una sesión
y e1RM 14 kg; la segunda conservó los mismos IDs y conteos. La captura real se
conserva en `.worktrees/mobile-local-mvp-20261018/native-progress-20261019.png`.
Esto acredita ese recorrido básico conectado, no toda la matriz ni rendimiento.
La herramienta rechazó enviar el cierre del listener TLS antes de ejecutarlo;
no se eludió con otro método ni se declaró probada la desconexión en este APK.

La API normal local también escucha por HTTPS en `127.0.0.1:4447`, reutilizando
el AppModule compilado y su configuración normal, sin fixtures ni cambios de
base. La comprobación real acepta la CA privada, rechaza la confianza por
defecto, verifica la identidad localhost/127.0.0.1 y obtiene readiness con base
disponible. Las rutas web siguen ausentes: no sustituye el servidor Next cuyo
arranque fue rechazado. Siete pruebas del guard local pasaron tras fallar antes
de implementarlo; rechaza base remota/de pruebas, rol administrador, host abierto,
puerto ajeno y otra identidad TLS. Se añadió únicamente el mapeo USB del puerto
4447. El primer intento quedó ante el bloqueo de pantalla; el propietario lo
desbloqueó y permitió el recorrido posterior registrado arriba. No se intentó
evadir el bloqueo ni cambiar ajustes de seguridad del teléfono.

La ejecución normal posterior del backend pasó sus **504 pruebas en 62 suites**
(96,905 s), con los avisos experimentales de VM Modules conservados. Además se
ensayó un respaldo del estado local persistente actual: `pg_dump` usó un snapshot
exportado de una transacción de solo lectura y se restauró en una base local
nueva, retenida y separada. Coinciden los datos de las doce tablas, sus columnas,
restricciones e índices. El snapshot incluye 1.344 ejercicios, once migraciones
y una cuenta reservada; no contiene sesiones de entrenamiento. No se reinició,
limpió ni restauró encima de la base original. Este ensayo no acredita una
migración de los datos personales originales ni sustituye los casos poblados
de CI. Evidencia privada: `backups/verified-929ac09f8fe0470188c8b8767725be53.json`.

La suite raíz posterior pasa **929 pruebas**; tipos y lint también pasan.
Lint inicialmente detectó código generado de `.next-local`: se corrigió solo
su exclusión global. La comprobación con ESLint confirma que el código fuente
sigue incluido y que una infracción de fuente sigue siendo rechazada.
No se redujeron reglas, aserciones ni presupuestos para obtener esos resultados.
Logs: `metro-cache-full-test-20261018.log` y
`metro-cache-verified-{lint,type-check}-20261019.log`.

La API normal local pasó once comprobaciones de autenticación y catálogo con
un JPG, sin solicitar GIF. Sus datos, credenciales y firma Android son privados
y se conservan en D:. Esto no acredita navegador ni conexión del nuevo APK:
el arranque web fue rechazado por la herramienta y no se eludió. Los procesos
locales no se observaron escuchando al retomar el 19 de octubre. No se ha
desplegado ni publicado el frontend conocido como rojo. El APK nuevo sí se
instaló posteriormente, como se registra arriba, conservando los otros paquetes.

Backend publicado en `4250b9e03905b645d9bac432bdb10b28ae557870` (PR 18):
listener local opcional y marcas temporales para los informes de rendimiento.
Pasan 504 pruebas unitarias, lint, tipos, build, integración (98 casos), ensayo
de migración/backup (9 casos) y auditoría sin altas/críticas. Un primer ensayo
de rendimiento falló 7 de 30 escenarios en el clúster compartido; la comparación
aislada posterior pasó los 30, con los mismos presupuestos y durabilidad activa.
Se conservan ambos informes: no se afirma una mejora causal de consultas.
El contrato frontend queda fijado al nuevo commit, sin cambios de esquema ni
cliente respecto al backend anterior. Las dos ejecuciones remotas del nuevo
head terminaron con éxito: push `39094930650` y PR `39094932857`, con sus 23
pasos completos y sin omisiones, incluidos rendimiento, auditoría y limpieza.
Pasan también las 33 comprobaciones locales del ejecutor de contratos.
Los bloqueos frontend descritos abajo siguen vigentes: no se publicó frontend
ni se desplegaron componentes.

La ejecución raíz previa, antes de la corrección de caché de Metro, terminó con salida cero:
**927 pruebas** (39 del ejecutor E2E, 451 móviles, 3 de configuración nativa,
2 de seguridad Maestro, 363 web, 10 de accesibilidad y 59 de paquetes).
Log: `frontend-current-full-test-20261018.log`. Incluye las dos pruebas nuevas
del layout restaurado; se conservan los avisos nativos de `act(...)` existentes.
No es evidencia nueva de rendimiento web, medición del APK ni Maestro físico.

Un experimento posterior para adelantar el render tras una restauración de
sesión ya terminada no justificó añadir un camino nuevo al layout: sus dieciocho
visitas siguieron fallando en LCP. Se retiró esa implementación experimental y
se restauró el flujo original. Se conservan dos pruebas nuevas del layout real:
HTML del servidor sin contenido privado, hidratación sin discrepancias ni
peticiones duplicadas, y perfil pendiente sin exponer contenido conocido.
Tras restaurar, inicialmente pasaron **67 pruebas enfocadas** y el build completo
`27uO8SY4BleVrV5ep8RRo`; la ejecución raíz posterior de 927 se registra arriba.
La suite de 925 corresponde al estado anterior y no acredita el rendimiento del
build restaurado. El cierre de PostgreSQL agotó la espera del helper, pero el registro
posterior confirmó el apagado normal completo, sin forzar ni reiniciar.

La corrección posterior del calendario reutiliza un formateador nativo por mes
y evita inicializar su reloj al importar el módulo. Conserva fechas, etiquetas,
selección y cálculo de medianoche en Bogotá; sin caché global de datos personales.
Pasan **925 pruebas**, tipos, lint y build completo. En las dieciocho visitas
controladas de escritorio del build `ys_axXsvNJ6PB2lOvPmo8`, INP (48–184 ms)
y CLS pasan en todas; LCP sigue fallando (2620–3776 ms). El comando de rendimiento
termina con salida 1: no hay aceptación de rendimiento ni publicación frontend.
La ejecución móvil de este build sigue pendiente. Se conservaron todos los datos
sintéticos y los avisos existentes de pruebas nativas. Informes y alcance:
`auth-controlled-performance.md`.

La optimización posterior del historial evita recalcular y formatear volúmenes
al cambiar de pestaña; conserva calentamientos excluidos, redondeo y resultados.
Pasan las quince pruebas cercanas, la suite raíz de **923 pruebas**, tipos,
lint y build completo. Se conservan avisos nativos de `act(...)` ya existentes.
La medición real posterior del build `_JNzfz9Jda6RUX6gvC2-6` cubrió dieciocho
visitas de escritorio: historial INP 176/224/176 ms, antes 272/272/352 ms.
Sigue fallando una visita en INP y las dieciocho en LCP (2996–3916 ms); CLS pasa.
La comparación es exploratoria y no prueba causalidad ni aceptación final.
El perfil móvil posterior a este cambio sigue pendiente. Log de pruebas:
`history-volume-full-test-20261017.log`; medición y límites detallados en
`auth-controlled-performance.md`.

La línea base controlada anterior cubre las 36 visitas: 18 de escritorio y
18 de Chromium móvil, sobre el mismo build y sin relajar presupuestos. Las
36 incumplen LCP (escritorio 3092–5768 ms; móvil 2712–3860 ms). INP falla en
cuatro visitas de escritorio y ninguna móvil; CLS pasa en todas. Ambos comandos
terminaron con salida 1 en la aserción final de presupuestos, después de las
comprobaciones funcionales y de autenticación. No se acredita rendimiento ni
se publica un checkpoint frontend conocido como rojo. Véase
`auth-controlled-performance.md` para los informes y límites del diagnóstico.

El aislamiento E2E ya está corregido y verificado: `npm run test:e2e` descubre
los doce casos con Playwright y ejecuta los cinco archivos contra bases locales
nuevas e independientes. Pasan los doce (seis de escritorio y seis de móvil),
todos en un intento, sin omisiones ni cambios de cuotas, límites o plazos.
Cada base conserva sus once migraciones. Los 36 registros de cuotas de la base
de aprovisionamiento mantienen exactamente la misma huella antes y después.
Informes: `.worktrees/web-e2e-isolated-xIWVbL/`; log
`web-e2e-isolated-full-20261017.log`.

La suite raíz posterior también terminó con salida cero: **922 pruebas**,
incluidos los 39 controles nuevos del ejecutor, más las 883 de aplicación y
paquetes. Log `web-e2e-isolation-full-root-test-20261017.log`. Los servicios se
cerraron conservando los datos: el helper de cierre de PostgreSQL agotó su
espera, pero el registro posterior confirmó un checkpoint completo y apagado
normal, sin matar procesos ni reiniciar. La evidencia funcional no acredita
todavía auditoría, presupuestos de rendimiento, aceptación nativa ni CI remota.

La migración de iconos locales ya cubre los nombres usados por campos,
navegación, métricas, objetivos y registro: dejan de aparecer signos genéricos
por equivalencias ausentes. Se reprodujeron 21 fallos de selección de glifo;
pasan 28 pruebas enfocadas y la suite raíz posterior completa: **883 pruebas**,
tipos, lint y compilación de producción. El primer ensayo raíz falló 20 casos
porque el comando pasó la URL `127.0.0.1` de build a fixtures de `localhost`;
se conserva ese informe. Sin cambiar código, casos ni límites, separar el
entorno de test y build como en CI permitió verificar la suite completa.
Logs `web-local-icons-{red,green}-20261017.log`,
`web-local-icons-root-{type-check,lint,test}-20261017.log` y
`web-local-icons-ci-env-root-{test,build}-20261017.log`.

La compilación nueva pasa cuatro comprobaciones Chromium reales: login y
registro en escritorio y móvil, iconos de correo/contraseña y selección del
registro, foco de teclado, sin desbordamiento, errores JS, llamadas de API
ni dependencias visuales remotas. Se inspeccionaron las capturas nuevas;
log `web-local-icons-browser-smoke-20261017.log`. No se enviaron formularios.
El primer ensayo de los doce E2E funcionales con backend y una base local nueva,
separada y migrada terminó con **nueve correctos y tres fallidos**.
Los seis de escritorio pasan; en móvil fallan historial, entrenamiento y
contexto personal porque comparten las cuotas de ingreso/registro de la misma
base e IP. Dos respuestas de registro son 429 y el historial conserva el aviso
«Demasiadas solicitudes» en login. Se conservan cuotas y artefactos, sin reset,
suplantación de IP ni cambios de límites. El aislamiento posterior descrito
arriba resolvió esta contaminación, como en la integración móvil/backend.
Se conservan el log `web-e2e-functional-20261017.log` y el reporte
`.worktrees/web-e2e-functional-20261017-e26abda8/results.json`.
Web, API y PostgreSQL cerraron; la base sintética queda conservada. Auditoría,
rendimiento y aceptación integral permanecen pendientes, sin nuevo push web.

El contrato actual fija el backend publicado
`0ce10d802e2be4fbca57c0d4f945cea2395700ef`: sus CI de push y PR pasan.
Este último commit cambia solo documentación de autorización de staging;
los bytes de OpenAPI y del cliente generado no cambian respecto de la referencia
anterior. Pasan `api:check` y `api:verify-backend` con la nueva referencia.

El arranque compilado se verificó de nuevo con `npm run start`, limitado a
`127.0.0.1:3000`: Next informó listo en 2,8 s y `/login` respondió 200.
Un navegador Chromium real pasa el recorrido público en 1280 × 800 y
390 × 844: formulario visible, botón habilitado, foco correo→contraseña,
sin desbordamiento horizontal, errores JavaScript, peticiones externas ni
solicitudes de API. Log `web-public-login-smoke-20261017.log`; capturas locales
`frontend/.worktrees/web-public-login-{1280,390}-20261017.png`. El proceso se
cerró después de la prueba. Este resultado permite retomar la verificación
web compilada, pero no acredita login contra backend, E2E privados, zoom,
lector de pantalla ni presupuestos LCP/INP/CLS. La revisión visual de las
capturas detectó iconos genéricos en correo y contraseña; la corrección y su
verificación posterior se describen arriba. No es una aprobación visual completa.

Nuevo candidato móvil: solicitudes simultáneas de una miniatura con la URL del
servidor terminada o no en barra compartían archivo y base de datos, pero
iniciaban dos descargas. Se reprodujo el fallo y se normalizó la clave de
solicitudes en curso con la misma identidad de cuenta que usa la caché.
Pasan 15 pruebas enfocadas de medios y los cinco controles nativos/Maestro.
También pasan tipos y lint de todos los workspaces; la suite raíz posterior
terminó con salida cero: 861 pruebas (451 móviles, cinco controles nativos,
337 web, diez de accesibilidad y 58 compartidas).
Logs `thumbnail-owner-alias-{red,green}-20261017.log` y
`thumbnail-owner-alias-root-{type-check,lint,test}-20261017.log`. Este cambio
no está instalado en el teléfono ni publicado; no acredita resolver memoria,
rendimiento web o auditoría de dependencias.

Nuevo candidato web: se reprodujo en el cliente generado una lectura antigua
de perfil al guardar cambios antes de consumir la instantánea del documento.
La prueba recibió «Eva» después de confirmar «Eva actualizada». Ahora un PATCH
confirmado descarta esa instantánea; el siguiente GET vuelve al servidor sin
otra rotación de cookie ni pérdida del token en memoria. Pasan los 55 casos de
cuatro suites cercanas de autenticación, incluida la regresión.
Logs `web-profile-update-snapshot-{after-probe,green}-20261017.log`.

La comprobación raíz posterior del candidato terminó con salida cero en tipos,
lint y **860 pruebas**: 450 móviles, tres controles nativos, dos controles de
seguridad de Maestro, 337 web, diez de accesibilidad y 58 compartidas. Logs
`web-profile-update-root-{type-check,lint,test}-20261017.log`. La compilación
de producción posterior también terminó con salida cero: Next compiló las
rutas y generó doce páginas estáticas; log
`web-profile-update-production-build-20261017.log`. No se inició un servidor.
Esta puerta no acredita E2E, auditoría o rendimiento del candidato compilado.

Se conserva la ejecución raíz anterior con salida uno: pasaron 450 pruebas
móviles, tres controles nativos, dos controles de seguridad de Maestro,
323 pruebas web y 58 compartidas. El runner no pudo iniciar el worker de
`cycle-opt-in-lifecycle.test.tsx`; no falló una aserción de la aplicación.
Ese archivo pasa sus 13 casos al ejecutarlo aisladamente. Los chequeos
independientes posteriores de tipos y lint de todos los workspaces y las diez
pruebas de accesibilidad pasan. Esto no convierte la ejecución raíz fallida
en una ejecución raíz verde. Logs `maestro-preservation-root-test-20261017.log`,
`web-cycle-worker-isolated-20261017.log` y
`maestro-preservation-separate-*-20261017.log` en `D:/DatosPC/EVRY`.

La auditoría del 17 de octubre sigue fallando con 55 vulnerabilidades altas
y 18 moderadas; no se ha publicado otro checkpoint con esa puerta pendiente.
Se compiló y probó una variante temporal de perfilado nativo exclusivamente del
sandbox sintético, sin habilitar debugging ni cambiar la app personal. La
captura de doce segundos terminó, pero el analizador confirmó cero asignaciones
registradas: no permite explicar el consumo ni acreditar el presupuesto.
Se restauró el APK normal del sandbox mediante actualización conservadora y se
contrastaron su hash, UID, primera instalación y seis campos visibles de
identidad/modo offline/borrador de dos series. No se borró ni editó ese borrador.

Verificación web posterior: **336 pruebas unitarias y diez de accesibilidad**
pasan; tipos y lint web terminan con salida cero. Se añadieron tres casos del
arranque real del documento: perfil anticipado con 401 y rotación posterior
(éxito o rechazo definitivo), y reintento explícito tras un perfil 503 sin otra
rotación ni reutilizar la respuesta fallida. La primera versión de ese último
caso llamó por error a la opción de montaje; se corrigió para usar el mismo
`inicializar()` del botón Reintentar, conservando las aserciones. No se cambió
el comportamiento de producción. Logs `web-document-retry-*-20261016.log`;
esta ejecución no incluye nuevamente móvil, build, E2E, auditoría o rendimiento.

Se completó un recorrido físico adicional en el OPPO con **EVRY Pruebas**, una
instalación independiente (`9be38ca0…`) y base sintética. Registro real, creación
y edición sin API, cierre/reapertura con recuperación de 10 kg × 12,
finalización offline y segundo cierre/reapertura con sincronización pasan.
PostgreSQL confirma una sesión completada, una serie y estadísticas exactas;
Progreso muestra una sesión y 120 kg. Volver al primer plano no duplica conteos.
No reemplaza la app anterior ni acredita toda la matriz o los presupuestos
de rendimiento. Véase [durabilidad móvil](mobile-durability.md).

APK QA actual: `c5347701…`, compilado y verificado, actualizado mediante `-r`
en el OPPO A54 y contrastado con el SHA-256 del binario instalado. Conserva la
identidad y el borrador local visibles al reabrir sin backend. No se editó ni
finalizó ese borrador. Tres muestras de Inicio registran PSS entre 125,0 y
127,5 MiB: memoria sigue fuera de presupuesto. El tiempo de Activity de 2557 ms no acredita
React listo. La app sigue conectada a la API de prueba localhost, no a staging;
la CA local vence el 18 de octubre. Detalles y límites en
[durabilidad móvil](mobile-durability.md).

El cambio de arranque instalado retira del layout
raíz la importación lateral de Reanimated, sin consumidores en el código propio.
No se retiraron dependencias ni se cambió la navegación. Una regresión RED→GREEN
comprueba el arranque offline con identidad y almacenamiento reales del cliente
y el backend opcional de animación no disponible. La medición física no acredita
resolver la memoria: los rangos antes/después se solapan.

El nuevo APK QA `c5347701…` compiló en 8 min 21 s. Pasan la inspección del
binario y la comparación exacta de siete fuentes; el bundle baja de 3.495.468
a 2.724.000 bytes y ya no incluye las 295 fuentes de Reanimated anteriores.
Conserva 42 fuentes de Worklets, las dependencias nativas y la misma firma.
Esto es evidencia de empaquetado, no de mejora estadística de RAM. El artefacto
está archivado en D:; su instalación `-r` terminó con `Success` después del
desbloqueo manual del OPPO. Se contrastó el hash del APK instalado, el mismo UID
y la primera instalación conservada. Antes y después se verificaron
la identidad, el modo offline y el borrador visibles, sin editarlos. Tres muestras del APK
anterior registraron PSS entre 123,9 y 131,6 MiB, con un solo proceso por versión.
Las nuevas muestras de 125,0–127,5 MiB no son tres arranques independientes ni
demuestran cumplir el presupuesto con un 95 % de confianza.

La validación posterior del candidato completa **854 pruebas** con salida cero
del comando raíz: 450 móviles, tres controles nativos, 333 web, diez de
accesibilidad y 58 compartidas (`suite-isolation-regression-test-20261016.log`).
Tipos de todos los workspaces y lint no mutativo también terminaron con salida
cero (cadena `7124`, logs `suite-isolation-regression-*-20261016.log`). La ejecución anterior falló tanto
en el plazo del nuevo caso de arranque como al iniciar un worker web; se
conserva y no se presenta la repetición como prueba de que desapareció la
intermitencia del ejecutor. Un diagnóstico por fases midió 26.958 ms cargando
el módulo raíz frente a unos 233 ms renderizando y restaurando estado. La
resolución real del módulo ahora ocurre en la preparación de la suite, como
en las demás pruebas de pantalla; las aserciones y el límite no cambiaron.
Una mutación que reintrodujo la importación innecesaria hizo fallar la suite;
al retirarla pasó de nuevo. La ejecución interrumpida tampoco se contabiliza.

Última suite raíz completa anterior a ese candidato: **853 pruebas pasan** (449 móviles, tres controles nativos,
333 web, diez accesibilidad y 58 compartidas), con salida cero del comando raíz
en la cadena `62245`. Incluye las regresiones de respuesta háptica opcional y
el ajuste anterior de `const`. La cadena terminó con salida cero también en
tipos de todos los workspaces, lint no mutativo, build web de producción,
`api:check`, las 33 pruebas del contrato y los 11 controles del ejecutor de
integración móvil. Los logs `local-cold-policy-*-20261015.log` se conservan en
`D:/DatosPC/EVRY`. No equivale a CI remota ni a aprobar las restantes puertas
de auditoría, integración, exports y rendimiento. También pasó la comparación
del contrato con el backend limpio fijado en `1a23c67b…` (`api:verify-backend`).

Se conservan los fallos previos: un primer render nativo superior a 30 segundos,
una introspección Expo que agotó ese plazo y cuatro workers web que no arrancaron.
La prueba diagnóstica web con un worker pasó las mismas 333 pruebas; Windows
local usa ahora uno y CI conserva dos. La ampliación previamente autorizada a
120 segundos solo afecta al primer render de Readiness y a la primera
introspección nativa en Windows fuera de CI; los demás casos y límites de CI
permanecen iguales. Estos ajustes del ejecutor no son mejoras ni mediciones
del rendimiento de la aplicación. No se ocultan los fallos anteriores ni se
presenta una repetición parcial como otra suite raíz.
El contrato compartido está fijado al backend publicado
`1a23c67b76b6e8184c904391f5697cb909325d94`. El registro web y móvil valida
caracteres Unicode y 72 bytes UTF-8 sin modificar la contraseña; el campo web
asocia tanto instrucciones como errores del servidor. No se cambian las reglas
históricas de login ni se declara reparada su equivalencia de sufijos bcrypt.

La integración actual móvil/backend también pasa sus nueve casos en cuatro
suites, incluidos tres procesos separados de recuperación offline. El primer
intento detectó contaminación de cuotas entre suites; reiniciar la API ya no
las reinicia. El ejecutor usa ahora una base local nueva y migrada por suite,
sin cambiar límites, borrar cuotas ni omitir casos. Pasan los once controles
de seguridad del ejecutor; cada base conserva cuotas reales y once migraciones,
y sus usuarios, sesiones y series sintéticos se limpiaron por sus IDs exactos.
Se requiere `CREATEDB` para el rol local de pruebas. Las bases de diagnóstico se
conservan; PostgreSQL y las APIs de prueba cerraron limpiamente.

Esto no acredita aceptación completa en dispositivos, rendimiento ni despliegue. La auditoría raíz
del 16 de octubre sigue fallando con 55 avisos altos y 18 moderados; las versiones
actuales de micromatch y las herramientas de firma/CLI de Expo siguen incluyendo
los dos orígenes altos. No se aplica una excepción de auditoría ni una degradación
forzada. El frontend permanece local y sin nuevo push mientras sus puertas
relevantes sigan fallando.

La anticipación del perfil web está implementada y verificada funcionalmente:
tras un refresh JSON válido, el documento inicia `GET /users/me` sin esperar
a cargar React. El cliente generado consume esa respuesta una vez, solo con
el mismo origen/base, token y generación inicial. Cada operación conserva
su plazo de 15 segundos hasta terminar el cuerpo; login/logout invalidan las
respuestas pendientes. No se persisten credenciales ni se renderizan datos
personales en el HTML del servidor. La revisión independiente no encontró
defectos críticos o importantes en este incremento. Quedan como mejoras menores
de cobertura el intercalado PATCH/base/generación; los escenarios combinados
de perfil 401 con retry ya tienen la verificación posterior descrita arriba.
No se declara auditada toda la rama por esa revisión.

Una comprobación aislada del script del HTML **realmente compilado** pasa en
cinco rutas privadas (refresh y perfil antes de React) y tres públicas (ninguna
petición). No inició servidores y no midió hidratación, LCP o INP. Esta mejora
del mecanismo de arranque todavía necesita medición en navegador: las cifras
históricas siguientes no certifican la compilación actual.

Diagnóstico de arranque: la traza conservada del 12 de octubre tiene tiempos
válidos, pero su perfil de muestras CPU conserva cuatro deltas negativos y no
sirve para atribuir costes por función. En esa visita instrumentada, refresh
terminó a 784 ms, users/me se inició a 2350 ms y las consultas del dashboard a
3604 ms. El layout mantiene los hijos desmontados hasta comprobar la sesión.
Hay una espera verificable antes del montaje; no demuestra que cambiarla alcance
los presupuestos. Los intervalos de parseo en segundo plano se solapan con la
descarga y no se interpretan ni suman como tiempo CPU puro. La compilación actual
necesita una nueva medición controlada; ningún informe antiguo la certifica.

## Historial de mediciones y verificaciones

La medición posterior de 18 visitas compiladas (`web-early-auth-controlled-desktop-20261012.log`)
sigue fallando: LCP 4156–6072 ms, ocho INP mayores de 200 ms y todos los CLS
dentro del límite. Arrancar refresh antes de hidratar no demostró mejora de
LCP. Se conservan los presupuestos y el informe fallido; no se publica un
checkpoint frontend con auditoría o rendimiento conocidos en rojo. La cuenta
sintética conservada quedó idéntica y los servidores locales se cerraron.
Próximo diagnóstico acotado: identificar el trabajo de CPU durante el arranque,
sin repetir toda la medición ni inferir una causa de los tiempos de red.

### Perfil web autenticado: aceptación de rendimiento pendiente

El perfil compilado completó 18 visitas de escritorio con datos sintéticos,
restauración por cookie rotativa y cero errores HTTP. Se corrigió solamente
la expectativa obsoleta del medidor: el cliente actual refresca antes de leer
el usuario, sin provocar un 401 artificial. Se conservaron todos los límites.
El resultado sigue fallando: LCP de 3284–4752 ms en las 18 visitas frente a
2500 ms; INP de 304/384/384 ms al abrir historial frente a 200 ms. CLS pasó.
No es aceptación móvil, evidencia de campo ni diagnóstico causal de la demora.
Informe `web-auth-controlled-contract-aligned-20261012.log`, en D EVRY.

La base local de pruebas se detuvo limpiamente y el inventario de la cuenta
física sintética permaneció idéntico. La revalidación raíz posterior fue
interrumpida al empezar accesibilidad; no se declara verde esa cadena.
Las comprobaciones restantes se ejecutan por separado, sin omitir casos.
Se mantienen los cambios locales: auditoría alta y rendimiento impiden publicar
un checkpoint verificado; no hay push, despliegue ni modificación de datos reales.

La cadena raíz posterior `77310` terminó con salida 1: pasan tipos, lint,
432 pruebas móviles, 275 web, diez de accesibilidad y 39 compartidas, pero
solo dos de los tres controles nativos. El primer proceso de configuración
Expo agotó sus 30 s; no se amplió el límite ni se ocultó el fallo. El control
web de edición de rutina reproduce y corrige el botón anidado en enlace:
ahora hay un solo enlace nombrado y la siguiente tabulación llega a eliminar.
Su prueba pasó después de fallar antes del cambio, junto a siete casos
existentes. Esto no equivale a aceptación integral de accesibilidad.

La compilación y los tipos web actuales (`25587`) y lint (`87796`) pasan.
Los intentos posteriores de medir fases del navegador no llegaron a ejecutar
visitas: se agotaron los 60 s de preparación del backend. El diagnóstico
confirma que Next respondió en unos cuatro segundos, mientras el puerto API
no abrió dentro de su plazo. Se preservan esos fallos; no se amplió el límite.
La observación aislada de importaciones pudo abrir la API y cerrarla mediante
su manejador normal, pero no reproduce el mismo contexto ni prueba resuelta
la causa. La instrumentación del navegador sigue sin validación en ejecución.
El inventario sintético ajeno se mantuvo idéntico y PostgreSQL de pruebas se
detuvo limpiamente. No se modificaron datos reales ni se desplegó nada.

El diagnóstico posterior pudo completar 18 visitas: el backend abrió en 6,2 s
en ese intento, sin demostrar resueltos los arranques fallidos anteriores.
El perfil siguió fallando: LCP 4492–6860 ms en todas las visitas y nueve INP
fuera de 200 ms; CLS dentro del límite. Historial registra INP 832/680/752 ms,
con procesamiento de pointerdown de 10,9/6,8/8,8 ms y demora posterior de
766,3/640,7/699,6 ms. Estos no son los tiempos del evento click completo.
Estos tiempos no identifican aún qué componente consume la demora.

Una captura del hilo principal se perdía por leer después de navegar a página
vacía. Se reprodujo la carrera en Chromium real y el finalizador ahora espera
la captura antes de cerrar el documento. Pasan sus cinco sondas, incluyendo
la entrega tardía de INP y el rechazo de métricas ausentes. La suite raíz
posterior terminó con fallo; la captura ya se repitió en la aplicación real.
Los informes anteriores sin esa captura no representan cero tareas largas.

El informe real posterior, `web-interaction-phases-controlled-20261012.log`,
completa las 18 visitas y conserva ambas capturas en cada documento. Sigue
fallando: LCP 3636–6428 ms, nueve INP fuera de presupuesto y CLS dentro del
límite. Historial registra 896/560/720 ms; correlacionar los eventos del mismo
clic revela procesamiento de click de 572,3/266,9/488,6 ms. La interpretación
anterior del pointerdown no excluye trabajo costoso en click. Aún no se ha
identificado una función causal ni implementado una mejora de rendimiento.

La cadena raíz `77034` pasa tipos, lint, 432 pruebas móviles, tres controles
nativos, 248 web y 39 compartidas, pero falla al iniciar dos procesos web.
Quedan 27 casos web sin ejecutar y accesibilidad no corrió. La comprobación
separada de esos casos no reemplaza una cadena raíz verde. Se conservan los
fallos, sin relajar plazos, presupuestos ni desactivar pruebas. Inventario
sintético preservado y PostgreSQL local detenido limpiamente. Sin push ni
despliegue mientras siguen fallando controles relevantes.

La comprobación separada posterior pasa los 27 casos antes no ejecutados y
los diez de accesibilidad, con la configuración original. Informes
`web-missing-worker-{cases,a11y}-20261012.log`; cadena local con salida 0.
Esto confirma esos casos, no corrige el arranque intermitente de procesos ni
convierte el fallo anterior en una suite raíz verde.

El diagnóstico posterior añade muestreo de CPU únicamente al medidor local,
desactivado por defecto. Tipos y lint pasan. Conserva tres perfiles reales del
clic de historial: el formateador de fecha/hora acumula 32,8/401,7/233,5 ms de
tiempo propio; la primera repetición además muestra 423,3 ms al evaluar el
módulo del calendario. Falta separar construcción inicial de formateo y trabajo
solapado antes de elegir una corrección. No se cambió código de la aplicación.
Las 18 visitas completan las comprobaciones funcionales finales, pero siguen
fallando los presupuestos. El muestreo altera los tiempos, por lo que estos
perfiles son diagnóstico, no aceptación ni mejora demostrada. Informe
`web-click-cpu-analysis-20261012.log`, en D EVRY. Datos preservados y servicios
locales propios detenidos limpiamente; sin push ni despliegue.

La comprobación nativa aislada confirma que el coste está en la primera
construcción de Intl (268–380 ms), no en reutilizarlo para 30 filas (menos de
6 ms). La página prepara ahora etiquetas de sesiones completadas al cambiar
los datos remotos y las conserva al cambiar de pestaña, sin modificar formatos,
zonas horarias o contratos ni añadir descargas. La prueba falla antes del cambio
y pasan después los 16 casos de página, paginación y formato. Suite raíz y
compilación actuales en curso; falta medir la aplicación compilada sin muestreo
para comprobar tanto LCP como INP. No es aceptación final de rendimiento.

La cadena corregida `69889` terminó con salida 0: tipos, lint, 760 casos
completos (432 móviles, tres nativos, 276 web, diez de accesibilidad y 39
compartidos) y compilación web actual. Se conservan las advertencias existentes
y el fallo previo de tipos del test, corregido sin relajar sus aserciones.
Empieza la medición compilada sin muestreo, con las 18 visitas originales y
presupuestos intactos. Todavía no hay aceptación de rendimiento ni push.

Ese intento posterior se detuvo antes de las visitas: el login no recibió
respuesta dentro de sus 10 s. La compilación local había omitido la URL pública
del laboratorio y conservó el valor por defecto `localhost`, que el medidor
restringe deliberadamente a `127.0.0.1`. Esa variable se fija al compilar, no
al arrancar; CI ya la especifica. Se conserva el fallo y se recompila únicamente
con la configuración correcta, sin cambiar la aplicación, rutas permitidas o
plazos. Falta confirmar la causa con el login y la medición reales posteriores.

### Recuperación de apertura SQLite sin conexiones abandonadas

Se reprodujo una fuga al fallar la migración o preparación de la cola local:
la promesa se descartaba, pero la conexión nativa permanecía abierta. Ahora
se cierra exclusivamente esa conexión antes del reintento; se preservan el
archivo de la cuenta y el error original, sin reset, borrado o cambio de esquema.
Dos pruebas con SQLite real en archivos independientes fallaron antes y pasan
después, comprobando cierre, conservación de filas y reapertura compartida.

La cadena raíz `37917` terminó con salida 0: tipos, lint y 758 casos
(432 móviles, tres controles nativos, 274 web, diez de accesibilidad y 39
compartidos). Se conservan las advertencias de `act` y SQLite experimental.
También pasan contrato, Expo doctor 21/21 y compilación web de este turno.
Logs `sqlite-open-failure-{green,full-types,full-lint,full-tests}-20261012.log`
y `continuation-{api-check,expo-doctor,web-build}-20261012.log`, en D EVRY.
La generación móvil posterior (`97845`) terminó con salida 0 para Android e
iOS, usando HTTPS `.invalid` reservado: genera artefactos locales, no prueba
conectividad ni aceptación de dispositivos. Informe
`sqlite-open-failure-mobile-exports-20261012.log`. Este cambio de fuente aún
no está en el APK instalado; no demuestra
ahorro de RAM ni resuelve los timeouts históricos. La auditoría alta y la
aceptación integral siguen pendientes; sin push, despliegue o datos reales.

### Resultado más reciente: APK reducido instalado, memoria pendiente

El APK QA normal compiló, pasó la verificación de firma/permisos/HTTPS y se
actualizó sin borrar datos ni tocar la app original. Ocupa 36543075 bytes,
aproximadamente 21,1 % menos; bundle JS idéntico al anterior. Inicio, los cuatro
destinos de navegación, reapertura sin servidor y reconexión conservan cuenta,
SQLite y el inventario canónico exacto, sin duplicados o nuevos entrenamientos.

La comparación física en Inicio no demuestra ahorro de RAM: PSS 135932 KB antes
y 137963 KB después, ambos sobre el objetivo. El primer frame posterior fue
2772 ms, pero no acredita disponibilidad completa de React ni estabilidad del
presupuesto. La mejora verificada es empaquetado y compatibilidad de este
recorrido, no cierre de rendimiento o del MVP. HTTPS/PostgreSQL quedaron
cerrados limpiamente con los datos intactos y sin otros clientes activos.
Siguen pendientes memoria, aceptación integral/iPhone y auditoría alta.
Sin push o despliegue. [Evidencia física](mobile-durability.md).

### Reconexión física y reducción Android en verificación

La recuperación del mismo PostgreSQL terminó a las 00:52:19 Bogotá. El inventario
HTTPS de la cuenta sintética, antes/después de la reconexión USB y reapertura,
conserva idénticos IDs/revisiones: la sesión completada original con una serie
60 kg × diez repeticiones, más la sesión activa vacía ya observada. Progreso
nativo muestra una sesión y 600 kg. No hubo limpieza de datos ni duplicados en
este recorrido; no acredita todos los conflictos o reenvíos.

El muestreo nativo sigue sobre el presupuesto: PSS 144665 KB, con 60760 KB
dedicados a código. Se habilitó reducción de código y recursos release mediante
el plugin oficial Expo BuildProperties compatible con SDK 57. La regresión de
configuración falló antes y pasa después. La nueva cadena raíz termina con
salida 0: tipos, lint y 756 casos (430 móviles, tres controles nativos, 274 web,
diez de accesibilidad y 39 compartidos). Esto no demuestra corregida la causa
de los timeouts intermitentes conservados abajo. Logs
`android-shrink-full-{types,lint,tests}-20261012.log`, en `D:/DatosPC/EVRY`.

El prebuild Android con `--no-clean --no-install` terminó correctamente y
generó las dos propiedades release activas; se conservaron las versiones React/RN
y se restituyeron únicamente los scripts de desarrollo que Expo cambió
automáticamente. El APK QA anterior está archivado por su SHA-256 verificado.
La compilación del nuevo APK está activa, sin instrumentación nativa ni cambio
de firma/paquete; aún no se instaló ni se midió. No se certifica memoria/arranque.
La auditoría raíz fresca sigue fallando con 55 altas y 18 moderadas; la salida
parcial de instalación por workspace no sustituye ese resultado. Sin push ni
despliegue. Detalle en [mobile-durability.md](mobile-durability.md).

### Revalidación local del 12 de octubre

La autorización de preparación del backend queda verificada nuevamente: once
controles pasan; Windows local admite 120 s, mientras Windows CI, Linux y macOS
conservan 30 s. No se modifica el presupuesto de respuesta de la API.

La cadena posterior al calendario terminó con un fallo: 429/430 casos móviles,
274 web, diez de accesibilidad y 39 compartidos pasan; el primer render de
readiness excede sus diez segundos. Los controles nativos posteriores no se
ejecutaron en esa cadena. Tipos y lint raíz pasan. Un diagnóstico sin caché,
con todas las aserciones, pasó los 37 casos de readiness: el primer render
tardó 8247,73 ms y la respuesta quedó visible a los 8335,88 ms. Es evidencia
de coste de preparación nativa en este equipo, no de aceptación Android release
ni prueba causal de todos los fallos anteriores.

Dentro de la autorización previa para pruebas nativas en frío, únicamente los
primeros casos de readiness y Entrenar admiten ahora 30 s en Windows **local**.
CI y otros sistemas conservan 10 s; los demás casos conservan sus plazos,
aserciones y renderizador. La nueva cadena pasa 430 casos móviles, pero el
primer control de configuración nativa de Expo excedió su límite de 30 s;
el segundo pasó. Ese límite no se amplía. La cadena terminó con salida 1:
754/755 casos pasan (430 móviles, un control nativo, 274 web, diez de
accesibilidad y 39 compartidos). La revalidación aislada de ambos controles
nativos pasa con el mismo límite; no reproduce ni resuelve causalmente el
timeout de la cadena. Tipos y lint completos posteriores pasan. Se conservan
también advertencias móviles de actualizaciones fuera de `act`; no se silencian.
No se declara verde la cadena completa ni se inicia compilación como si lo fuera.
Logs: `cold-native-allowance-root-tests-resolved.log` y
`readiness-cold-fs-diagnostic-resolved.log`, bajo `D:/DatosPC/EVRY`;
`native-config-timeout-recheck-20261012.log` conserva la revalidación aislada.

La auditoría sigue impidiendo publicar: 55 altas, 18 moderadas y cero críticas.
Los avisos oficiales de [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
y [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv), consultados
el 12 de octubre, no identifican versiones corregidas. No se desactiva esa
puerta ni se aplica la degradación de Expo sugerida por npm. Sin push,
despliegue ni modificación de datos reales.

Incremento del 12 de octubre: la ejecución de perfil del día anterior quedó
interrumpida, sin resultado final; sus 36 perfiles de trabajadores no acreditan
una suite completa. Un nuevo intento de un solo archivo reprodujo el timeout
de preparación de 60 s sin ejecutar casos. El diagnóstico instrumentado posterior
sí inició: transcurrieron 44,98 s hasta la petición de ejecutar casos, con 37,90 s
dentro de 1182 lecturas síncronas y 6,06 s de CPU del hilo. La instrumentación
no cubre todo el I/O nativo ni prueba antivirus, disco averiado o causa del intento
fallido. No se ampliaron plazos, cambiaron workers ni desactivaron protecciones.

Ese diagnóstico permitió observar una regresión real de renderizado: 120
formatos de etiquetas civiles al seleccionar dos días de un mes de 30 días.
El calendario ahora conserva únicamente los textos públicos del mes actual;
las anotaciones de sesión/ciclo siguen calculándose con los datos actuales.
La regresión pasa con 30 formatos en septiembre y 61 acumulados al cambiar a
octubre, conservando selección y etiquetas accesibles. Los 14 casos del archivo
pasan sin instrumentación. Esto optimiza renderizado, no corrige ni certifica
el arranque intermitente de trabajadores. Los tipos raíz pasan; lint y la suite
raíz posterior siguen en ejecución. La auditoría fresca vuelve a fallar con
55 altas, 18 moderadas y cero críticas. No se publicó este incremento.
Logs: `calendar-worker-startup-diagnostic.log`, `calendar-label-reuse-green.log`
y `calendar-label-current-audit.json`, bajo `D:/DatosPC/EVRY`.

Estado más reciente: la instalación del APK original terminó correctamente,
pero su API `.invalid` no permite declarar MVP conectado. El APK QA independiente
ya se instaló y abrió en el OPPO; el registro nativo real abre Inicio contra
HTTPS local con una cuenta sintética. Se inició entrenamiento con backend
inaccesible y se verificó una serie local de 60 kg × diez repeticiones. La
recuperación al reabrir falló y devolvió al login; se reprodujo en pruebas la
diferencia entre rechazo de red nativo `Error` y `TypeError`. La corrección
local de transporte pasa 32 casos enfocados, la cadena tipos/lint/749 pruebas
y nueve integraciones reales. La revisión de los dos archivos no encontró
problemas; el APK actualizado terminó de compilar y pasó la verificación de
paquete, firma, bundle y confianza HTTPS limitada a localhost. La actualización
sin borrar datos terminó con `Success`. En el OPPO, la cuenta y la serie
60 kg × diez repeticiones sobrevivieron a la reapertura con backend inaccesible;
se finalizó localmente y se reabrió antes de reconectar. Después se verificaron
«Sincronizado», una sesión completada, una serie y 600 kg de volumen tanto por
API como en Progreso nativo. Otra reapertura conservó los mismos IDs/revisión
sin duplicar datos. Esto valida ese recorrido básico, no la aceptación integral
del MVP, los conflictos entre dispositivos ni un reenvío idéntico de lote.
La corrección offline quedó en el commit local `472f819`; no se hizo push por
la auditoría en rojo. Se recuperó el mismo PostgreSQL de pruebas tras un cierre
interrumpido y se verificaron esos mismos datos por HTTPS. La navegación
inferior sigue fallando físicamente: Android comunica margen inferior cero,
la barra mide 49 dp y UIAutomator informa bounds de accesibilidad de 12,5 dp.
La jerarquía nativa muestra contenedores de 48,5 dp: falta explicar esa
discrepancia, sin confundirla con la superficie táctil real, y corregir las
etiquetas superpuestas por el indicador de gestos.
La lectura nativa posterior confirmó 15 dp reservados para gestos y cero inset
de navegación. La corrección local agrega gutter Android, mantiene los insets
iOS y adapta la altura al texto; sus cinco regresiones pasan tras fallar antes.
El APK normal posterior `73e0d13a` se verificó sin instrumentación y se actualizó
sin borrar datos: los cuatro bounds accesibles ahora miden 51,5 dp, las etiquetas
no se superponen al indicador de gestos y los cuatro taps muestran las pantallas
esperadas. Es aceptación de esa navegación en el OPPO, no del MVP completo.
La revalidación
móvil más reciente pasa 425 casos y dos controles nativos; conserva un fallo
anterior de timeout de readiness como evidencia pendiente, sin cambiar plazos.
La suite raíz posterior con la corrección termina con salida 1: 430 casos
móviles, dos controles nativos y 39 compartidos pasan; dos trabajadores web
no inician, quedan 247 casos web correctos y accesibilidad web no se ejecuta.
Se conservan los errores de `cycle-opt-in-lifecycle` y `calendar-month`; no se
declara resuelto el fallo intermitente de preparación ni CI/publicación verde.
Primer arranque Android 3245 ms y
PSS 162046 KB: no cumplen aún los presupuestos. Los dos recorridos del cliente de progreso pasan por HTTPS
normal y sin caché, con límites ampliados únicamente para esos fixtures locales
Windows (preparación 30 s, recorrido 15 s; CI/otros sistemas 5 s). Esto no cambia
presupuestos ni prueba rendimiento físico. La última cadena completa pasa
749 pruebas, incluida accesibilidad. Una ejecución anterior falló al iniciar
dos workers web; el diagnóstico de esos archivos pasó 26 casos sin reproducir
el fallo. La ejecución posterior verde no demuestra una corrección causal
de ese fallo intermitente. Detalles y resultados históricos en
[mobile-durability.md](mobile-durability.md). Sin nuevo push frontend mientras
la auditoría relevante continúa pendiente.

### Preparación Windows autorizada e integración funcional verificada

El propietario autorizó continuar sin nuevas consultas hasta tener un MVP.
La preparación del backend de integración admite ahora 120 segundos solo en
Windows local; CI y otros sistemas conservan 30 segundos, cierre diez segundos,
casos y presupuestos originales. La regresión reprodujo el rechazo de una
preparación de 81 segundos y después pasan once controles de espera/seguridad.
La primera ejecución real aprobó siete casos y falló los dos recorridos de
progreso por sus cinco segundos; se conserva el resultado, no se amplió ese
límite. El diagnóstico no reprodujo los fallos y, tras retirar sus trazas,
la integración normal completa pasó nueve casos en cuatro suites (salida 0).
Esto verifica el recorrido real de progreso contra HTTP/PostgreSQL, no su
estabilidad en frío ni rendimiento físico. El fixture quedó detenido e intacto.
La cadena completa posterior terminó con salida 0: tipos, lint y 747 pruebas
(423 móviles, dos de configuración nativa, 273 web, diez de accesibilidad,
39 compartidas). Se conserva `windows-deadline-current-root-tests.log` junto
con los logs de tipos/lint. Auditoría, aceptación física y MVP conectado
continúan pendientes. Sin push.
Evidencia y límites en [mobile-backend-integration.md](mobile-backend-integration.md).

### Empaquetado Android release local verificado, 11 de octubre

La ruta corta de CMake permitió terminar `assembleRelease` con salida 0
(16 min 22 s, 532 tareas). Se verificó el APK arm64 de 46.301.734 bytes:
firma v2 de depuración válida, API mínima 24/destino 36, código integrado
idéntico al generado y ausencia de almacenamiento externo/superposición.
La app no está marcada `debuggable`, pero el certificado sigue siendo Android
Debug y la API utilizada es HTTPS `.invalid`. No se instaló ni inició este
APK: empaquetado no equivale a uso real, sincronización o rendimiento físico.
Se conservan la pausa, los intentos fallidos/interrumpidos y el error inicial
del diagnóstico que buscaba una salida generada inexistente. Detalles y hashes
en [mobile-durability.md](mobile-durability.md). Auditoría, Task49, presupuestos,
iPhone y distribución final siguen abiertos; no hay nuevo push frontend.

### Evaluación de Expo 58: no resuelve por sí sola la auditoría

El propietario autorizó evaluar actualizaciones necesarias. La consulta del
registro confirma que `expo@58.0.7` está en el canal `next`, mientras `latest`
sigue en `57.0.27`. La documentación oficial de SDK 58 describe React Native
0.88 Release Candidate; las consultas de RN y su preset estables `@0.88`
devolvieron E404. `jest-expo@58.0.9` cambia a Jest 30, pero requiere el preset
`^0.88.0-rc.4`. Esto exige una migración nativa coordinada, no un cambio aislado
de Jest.

Además, `expo@58.0.7` depende de `@expo/cli@^58.1.6`, cuyo `node-forge` sigue
siendo `^1.4.0`. El registro mantiene `node-forge@1.4.0` y `braces@3.0.3`
como últimas versiones; ambas están afectadas en la auditoría conservada.
Por tanto, actualizar Expo no demuestra que la puerta de seguridad pase.
Se conserva SDK 57 y la suite normal aprobada; no se han forzado overrides,
degradado versiones, exceptuado avisos ni modificado el lockfile por esta
evaluación. La auditoría sigue pendiente y bloquea el checkpoint frontend.

Fuentes: [SDK 58 beta](https://expo.dev/changelog/sdk-58-beta), metadatos npm
de las versiones exactas anteriores y `frontend-current-audit.json` en D:.

La revisión de upstream del 11 de octubre confirma que los dos avisos siguen
sin versiones corregidas publicadas. La propuesta de `node-forge`
[PR 1152](https://github.com/digitalbazaar/forge/pull/1152) continúa abierta,
sin fusionar (revisión `ceba34402e329f0365134f23fe19898756527d65`). Para
`braces`, el [issue 70](https://github.com/micromatch/braces/issues/70) y las
propuestas 78, 79, 82, 87 y 88 permanecen abiertos. Una propuesta no revisada
no equivale a una versión de seguridad aceptada: no se instaló ningún fork,
se alteró la puerta de auditoría ni se modificó el lockfile por esta revisión.
Avisos oficiales: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
y [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv).

### Plazo nativo en frío autorizado por el propietario (verificación)

Después de los fallos descritos abajo, el propietario autorizó ampliar solo el
plazo de las pruebas nativas en frío. Se asignaron 10 segundos únicamente al
primer caso de Entrenar (campos nulos y técnica) y al primer caso de Readiness
(carga frente a ausencia diaria). Se conservan sus cuerpos y aserciones, todos
los casos restantes, los límites por defecto, workers y configuración de Jest.
No se ampliaron el inicio del backend de integración ni los presupuestos de
arranque Android release, API o rendimiento web. Las verificaciones en frío y
raíz se describen a continuación; el cambio no es una corrección del
rendimiento de la aplicación ni habilita el push por sí solo.
La ejecución posterior en frío (`--no-cache`) aprobó los 81 casos de los dos
archivos y las dos regresiones de configuración nativa, con salida 0. Se
conservan las advertencias de `act` de TanStack Query. El log es
`D:/DatosPC/EVRY/authorized-cold-native-tests.log`. No se extrapola este resultado a
integración, auditoría o funcionamiento físico.
La ejecución raíz posterior terminó con salida 0, junto con tipos y lint:
423 casos móviles, dos de configuración nativa, 273 web, diez de accesibilidad
y 39 compartidos (747 en total). Se conserva el log completo
`D:/DatosPC/EVRY/authorized-cold-root-tests.log`. El error intermitente de
arranque web no se reprodujo y no se atribuye a una corrección no demostrada.
Este resultado verifica la suite normal con la autorización de plazo limitada;
no cierra Task49, auditoría, pruebas físicas ni presupuestos de rendimiento.

### Agrupación de avisos de sincronización, 10 de octubre

- La regresión reprodujo once GET autenticados de perfil simultáneos al recibir
  avisos de conexión y primer plano. El coordinador ahora comparte una operación
  por identidad de sesión y conserva un recorrido posterior si llegan avisos
  durante el trabajo; no bloquea la cuenta siguiente detrás de una sesión antigua.
- Las tres pruebas del coordinador pasan dentro de la suite móvil actual. Usan
  stores, cliente generado, motor y SQL SQLite reales, sustituyendo únicamente
  notificaciones/almacenamiento/crypto nativos y HTTP externo. Comprueban la
  conservación y sincronización única del entrenamiento offline, cambio de cuenta
  y recuperación tras un fallo. No equivalen a funcionamiento físico del OPPO.
- Tipos y lint de todos los paquetes pasan. La suite móvil registra 422 aprobadas
  y una fallida de 423: el primer caso de `train-screen.test.tsx`, sobre duración,
  RPE, calentamiento y técnica, excede cinco segundos. Readiness pasó en esta
  ejecución; no demuestra que su fallo previo en frío esté corregido. El resultado
  raíz terminal y los errores de arranque web se detallan a continuación.
- No se modificaron límites, workers, caché ni presupuestos de rendimiento. Se
  consultó al usuario sobre el plazo de preparación de las pruebas nativas antes
  de cualquier ajuste. Este incremento es independiente de Task49 y no la cierra.
  Los archivos y logs siguen locales, sin commit, push, despliegue o cambios al APK.

La ejecución raíz posterior terminó con salida 1: 708 casos aprobados, un caso
móvil fallido y dos errores de arranque de workers web. Web ejecutó 247 casos
en 51 archivos; `cycle-opt-in-lifecycle.test.tsx` y `calendar-month.test.tsx`
no pudieron iniciar sus workers y no se presentan como escenarios aprobados.
Accesibilidad no se ejecutó después del fallo de las unitarias web. Los 39 casos
compartidos sí pasaron. Se conserva el log completo
`D:/DatosPC/EVRY/sync-coordinator-resumed-test.log`; no se repite sin cambios
para buscar verde ni se atribuyen los errores de arranque a una causa no probada.
La exportación local Android/iOS del código actualizado terminó con salida 0
(sesión 68855): Android compiló 1734 módulos e iOS 1644. Se verificaron los
artefactos Hermes generados en D: Android de 4.277.808 bytes e iOS de 4.071.369
bytes. El log completo es `D:/DatosPC/EVRY/sync-coordinator-mobile-exports.log`.
Se usó una API HTTPS `.invalid`, sin despliegue, llamadas a datos reales ni
reinstalación. Esta compilación JavaScript no prueba ejecución en dispositivos,
conectividad, compilación nativa iOS ni rendimiento release, y no convierte la
suite raíz fallida en una puerta aprobada.

Un diagnóstico posterior observó los límites de creación, conexión y respuesta
de cada worker sin editar Vitest, su configuración ni los límites: los dos
archivos afectados ejecutaron sus 26 casos y después la suite unitaria completa
ejecutó 273 casos en 53 archivos, con salida 0. Los 53 workers respondieron;
el arranque más lento fue de 4602 ms. El error previo no se reprodujo en esta
ejecución instrumentada y su causa sigue sin demostrarse; no se presenta como
corrección ni sustituye el resultado raíz fallido. Se conserva el diagnóstico
en `D:/DatosPC/EVRY/vitest-full-worker-start-diagnostic.log`.
La puerta independiente normal `test:a11y`, sin instrumentación, terminó con
salida 0: diez casos en cinco archivos (54,56 s), log
`D:/DatosPC/EVRY/sync-coordinator-web-a11y.log`. Esto completa la ejecución
automatizada que había quedado sin iniciar, no las pruebas físicas de
accesibilidad ni el resto de las puertas del proyecto.
La revisión de compatibilidad `expo:doctor` terminó con salida 0 y sus 21
comprobaciones aprobadas sobre la configuración móvil actual. Se ejecutó
`expo-doctor` 1.20.4 desde la caché redirigida a D:, log
`D:/DatosPC/EVRY/mobile-doctor-current-source.log`. No sustituye la auditoría
de seguridad de dependencias ni demuestra ejecución física, sincronización
offline tras cerrar la app o rendimiento release.
La compilación raíz `npm run build` terminó con salida 0. Su opción
`--if-present` ejecuta la compilación web; los otros workspaces no declaran ese
script, por lo que no se les atribuye una compilación nativa. Next.js 16.3.8
compiló en 92 s, terminó TypeScript en 39,9 s y generó 12 de 12 páginas estáticas.
Los artefactos quedaron en D:, con log
`D:/DatosPC/EVRY/current-source-workspace-build.log`; no se inició un servidor.
Los exports móviles se verificaron por separado y ninguna de estas puertas
sustituye las pruebas raíz, integración, seguridad o rendimiento pendientes.
La auditoría actual `npm audit --audit-level=high --json` terminó con salida 1:
55 entradas de paquetes de severidad alta y 18 moderadas, ninguna crítica;
estos conteos incluyen propagación transitiva, no 73 vulnerabilidades distintas
demostradas en EVRY. El informe está en
`D:/DatosPC/EVRY/frontend-current-audit.json`. Los avisos oficiales de
[braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) y
[node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv) todavía no
publican versiones corregidas. No se aplicaron degradaciones automáticas de
Expo/React Native/Next ni excepciones para ocultar esta puerta fallida.

### Revalidación local y conexión física, 10 de octubre

- Las copias autorizadas en D: preservan los originales. Backend: 449 unitarias, 84 de integración y ocho de migración/backup pasan con dependencias y compilación frescas. La medición local posterior terminó con 30/30 comprobaciones aceptadas, seis cierres limpios y cero errores. El checkpoint documental `0b386b8` se subió y su PR 18 quedó actualizado: ambas ejecuciones de Actions del commit (push y PR) pasaron, incluidos integración, backup, rendimiento y auditoría. Esto no cierra las puertas pendientes del frontend.
- La última suite raíz frontend conserva 740 aprobadas y una fallida de readiness: 418 móviles, 273 web, 10 de accesibilidad y 39 compartidas pasan. Se añadió una regresión para reutilizar un formateador nativo de fechas sin almacenar el día calculado; primero reprodujo 40 asignaciones innecesarias y luego pasó con una, junto con tipos y las 33 pruebas del dominio. No corrige ni oculta el plazo de readiness. La integración móvil conserva siete aprobadas y dos fallidas de progreso: primero falla la preparación, después los cuerpos, con los límites originales. La medición posterior de preparación (1831 ms) no demuestra una corrección del fallo inicial. Detalle y logs en la guía de integración móvil.
- El OPPO A54 (CPH2239, Android 11/API 30) está conectado y autorizado para ADB. Con autorización explícita se instaló y verificó EVRY 1.0.0 de depuración, tras confirmar que no existía una instalación anterior. No se sobrescribieron datos ni se otorgaron permisos adicionales. El inicio local de Metro fue rechazado por la política de la herramienta antes de ejecutarse; no se intentó eludirla. La app no se ha iniciado ni tiene aceptación funcional física. El frontend sigue sin publicar y Task49 continúa abierta.
- La configuración nativa aplica el tema oscuro mediante `expo-system-ui` y elimina permisos de almacenamiento externo; sus dos regresiones pasaron después de fallar. La superposición permanece en el manifiesto debug para el monitor FPS de React Native; falta comprobar release. Después del fallo de Ninja por rutas de 263 caracteres, se preservó la caché original, se verificó la copia corta `D:\EVRY-Gradle` y se archivaron únicamente los registros generados de dependencias obsoletos de las dos etapas fallidas. La compilación real terminó correctamente (6 min 20 s, 453 tareas); firma, ABI arm64-v8a y SDK mínimo 24 se verificaron en el APK. No equivale a binario release independiente ni aceptación física. Detalles en [mobile-durability.md](mobile-durability.md).

### Verificación posterior del perfil de pruebas, 10 de octubre

- Se alineó el objetivo Babel de Jest con Hermes del APK, conservando el preset
  completo de Expo, Flow/codegen, transformaciones de assets y límites existentes.
  Una regresión ejecuta el código Flow realmente transformado: primero detectó
  un campo privado visible bajo el perfil antiguo y luego pasó con el actual.
  Esto verifica la fidelidad del entorno de pruebas, no un fallo de privacidad
  demostrado en EVRY ni el comportamiento físico del teléfono.
- Tipos y lint pasan. La suite completa registra 741 aprobadas y una fallida:
  419 móviles, 273 web, 10 de accesibilidad y 39 compartidas pasan. Sigue fallando
  el caso inicial de readiness por superar cinco segundos; el intento aislado
  sin caché tampoco pasó. No se aumentaron plazos, precargaron dependencias ni
  omitieron casos, y los cambios permanecen sin publicar.

### Gráficas únicamente con datos representables, 9 de octubre

- La ficha de progreso iniciaba el chunk de Recharts incluso con puntos vacíos o sin 1RM; el módulo descubría la ausencia después de cargarse. Ahora muestra la ausencia directamente y solo inicia la gráfica cuando existen puntos representables. Se conservan métricas, comparación, carga dinámica y reintentos con datos.
- Dos regresiones reprodujeron el problema ante un chunk de gráfica no disponible y después pasan; las 18 pruebas específicas incluyen errores/reintentos/foco y el caso original de progreso. No se retiró la barrera de limpieza ni se aumentaron límites. La guía Frontend Developer orientó esta reducción de carga innecesaria, no una sustitución de la gráfica.
- La cadena local terminó correctamente: tipos, lint, las 739 pruebas (418 móviles, 273 web, 10 de accesibilidad y 38 compartidas) y compilación web. El cierre de tarea repitió las 18 específicas y también pasó. Esto verifica el cambio local, no la estabilidad móvil en frío ni los presupuestos del navegador; se conservan todos los intentos fallidos anteriores. Cambios sin publicar: auditoría, rendimiento y dispositivos siguen pendientes.

### Progreso móvil integrado con HTTP real, 9 de octubre

- Se amplió la puerta local explícita al panel de progreso real: búsqueda, catálogo de 30 registros, reinicio de página, vacío e historial por cursores de 20/20/1 sesiones. El resumen se contrasta con 41 series fuente (60 kg × 10 repeticiones): 41 sesiones, 41 series y 24.600 kg, sin duplicados ni pérdidas. No se simulan respuestas API ni componentes.
- Pasan los ocho escenarios en la ejecución final sin trazas y los seis controles de seguridad del runner. Se conserva el intento inicial que excedió cinco segundos: los pases posteriores no resuelven ni certifican estabilidad en frío. No hubo cambios al límite, prewarm, SDK, EAS o datos reales. La pantalla completa y las pruebas en Android/iPhone siguen pendientes; el frontend no se publicó.
- Tipos y lint completos pasan, pero la suite raíz termina en rojo: Readiness móvil excede cinco segundos (417/418 pasan) y el `afterEach` de `ExerciseDetail.test.tsx` excede diez segundos (270/271 web pasan). Las 38 compartidas pasan. La accesibilidad no se ejecutó en esa cadena porque depende del éxito web; su ejecución separada pasa 10/10. Total observado: 735 aprobadas y dos fallidas de 737. Estos fallos se conservan y prohíben publicar este incremento; no se declara la tarea completa ni se aumentaron límites.

### Contrato frontend alineado localmente, 9 de octubre

- La verificación original rechazó el pin viejo. El generador importó el backend limpio, publicado y con CI verificada `00c57b204a1932bbb67c690aa45724b79c3234ce`; después pasan la regeneración y la comprobación de identidad de fuente. No se editaron hashes a mano.
- Solo cambia la revisión de `backend.lock.json`; los hashes del OpenAPI y cliente permanecen iguales. Pasan los 33 controles de seguridad/contrato, sin skips, y también tipos y lint completos. El alineamiento está preservado en el commit local `90bb42606820d569f8e5a2becb44834e7f19f221`; no se publicó el frontend.
- La auditoría frontend fresca conserva 55 altas, 18 moderadas y cero críticas. No contiene Handlebars: no se trasladó ciegamente el parche del backend. Este alineamiento permanece local y no certifica seguridad, rendimiento ni aceptación física del frontend.

### Checkpoint backend publicado y CI remota verificada, 9 de octubre

- Se publicó `00c57b204a1932bbb67c690aa45724b79c3234ce` en `codex/evry-optimization`: validación de fechas de ciclo, parche compatible de Handlebars y diagnóstico seguro del benchmark. El push y el SHA remoto están verificados; el backend quedó limpio y el PR 18 fue actualizado por Codex.
- La cadena local completa con instalación limpia pasó: Prisma, OpenAPI sin diferencias, lint, tipos, build, 449 unitarias, 84 de integración, ocho escenarios de migración/backup, los 30 grupos de rendimiento y auditoría con cero altas/críticas (20 moderadas pendientes). El nuevo reporte `api-performance-2nSDTv` conserva límites y muestras; los fallos anteriores no fueron eliminados ni se declaró su causa resuelta.
- Actions de push `38007920631` y PR `38007923217` terminaron correctamente para ese SHA exacto. Se inspeccionaron ambos jobs completos y todas las etapas, incluidas evidencias, auditoría y cierre de contenedores. El PR registra los enlaces y distingue esta CI backend de la aceptación integral. No hubo merge, despliegues, EAS ni cambios a datos reales; el clúster sintético se detuvo conservando sus archivos. Frontend y aceptación física permanecen pendientes.

### Dependencia crítica detectada antes de publicar, 9 de octubre

- La repetición de CI backend completó 449 unitarias, 84 de integración, ocho casos de migración/backup y las puertas estáticas, pero falló en la auditoría final: Handlebars 4.7.9, dependencia de desarrollo de ts-jest, apareció con avisos críticos. No se hizo push.
- Se confirmó la actualización compatible 4.7.10 y se generó un cambio acotado a ese único paquete del lock, sin cambiar el manifiesto, versiones mayores o excepciones de auditoría. La nueva auditoría pasa el nivel alto y registra cero altas/críticas; quedan 20 moderadas. No se encontró uso propio de Handlebars y el consumidor identificado compila una plantilla fija, pero eso no se presenta como evaluación exhaustiva de exposición.
- Lint, tipos, compilación y las 449 unitarias posteriores pasan. El cambio puntual está preservado en el commit local `7fca894246641cbfa2a4ede2ab2ee32aeeae9a6e`. Los resultados anteriores de integración/migración/rendimiento no se presentan como nuevas ejecuciones contra el lock actualizado. No hay publicación ni CI remota para este incremento todavía.

### Medición API con diagnóstico de arranque, 9 de octubre

- Una única ejecución completa adicional, con las trazas nuevas y sin otros checks propios en paralelo, terminó con salida 0: `api-performance-424bUg`, 30/30 grupos aceptados, seis procesos cerrados y cero errores. Se mantuvieron dataset, muestras, calentamiento, concurrencia, repeticiones, fórmula y presupuestos.
- La mayor cota superior es 496,170 ms en historial concurrente frente a 500 ms; el margen es pequeño. No se cambió la implementación de latencia ni se confirmó la causa de los outliers anteriores. Los dos reportes fallidos permanecen preservados; una ejecución verde no garantiza estabilidad ni aceptación desplegada.
- Las demás puertas de CI backend se están verificando de nuevo antes de considerar un checkpoint de ese repositorio. El frontend continúa local por sus propias puertas de seguridad, rendimiento y dispositivos pendientes. Sin publicación ni CI remota para los cambios nuevos todavía.

### Diagnóstico seguro del arranque del benchmark, 9 de octubre

- Se añadieron fases permitidas/deduplicadas, tiempos tomados por el padre y códigos de fallo acotados al starter del benchmark. Mensajes desconocidos no terminan la espera ni entran en los reportes; no se conservan payloads IPC, tokens, excepciones o stacks. La limpieza informa su resultado sin ocultar la causa inicial. El modo de fases es opt-in del hijo del benchmark, no una modificación del protocolo móvil por defecto.
- Cinco casos de procesos/IPC reales fallaron antes de implementar el diagnóstico. Después pasan esos cinco y los dos controles de cierre anteriores; la suite completa backend ejecuta 449/449. Se preserva también el fallo inicial de tipos y su corrección compatible, sin actualizar dependencias ni desactivar comprobaciones. Tipos, lint y compilación posteriores pasan.
- Un probe sobre el fixture sintético preservado registra ready a 7778 ms y cierre limpio; casi 6,75 s de ese arranque se observan entre el inicio y fin de importaciones. Es diagnóstico instrumentado, no aceptación de arranque o rendimiento caliente, y no explica retrospectivamente el fallo anterior. La primera repetición de integración móvil coincidió con la compilación y falló al faltar `dist/app.module`; se conservó el log y se ordenó esperar salida 0 de la compilación antes del siguiente intento. La repetición final terminó con salida 0 y los siete escenarios pasan (4 de sincronización, 1 de reinicio entre procesos y 2 de dominios); también pasan nuevamente los siete controles de arranque/cierre. El clúster sintético se detuvo limpiamente conservando sus archivos. No hubo push, despliegues, recursos remotos ni cambios a datos reales. La puerta de rendimiento continúa rechazada: estos diagnósticos no la sustituyen.

### Verificación pendiente de publicación backend, 9 de octubre

- Las comprobaciones locales terminaron: 444 unitarias, 84 de integración, ocho casos de migración/backup, Prisma, OpenAPI, compilación, lint, tipos y auditoría sin vulnerabilidades altas/críticas. La corrección de fechas de ciclo está preservada en el commit local no publicado `65204d4fe4813427396fd6b6220acfa08dd4b9d5`; una nueva ejecución focal pasa sus ocho controles. No se hizo push ni se actualizó el pin del frontend. El cuerpo del commit registra explícitamente la puerta de rendimiento rechazada; no equivale a aceptación integral.
- Rendimiento no está aceptado: el reporte `api-performance-qnOE6N` mide los 30 grupos y cierra seis servidores sin errores HTTP, pero dos grupos de la primera repetición secuencial superan el límite superior de confianza de 500 ms (538,706 ms en overview y 672,272 ms en historial). Sus p95 observados de 259,101 y 384,593 ms no convierten esa puerta en verde.
- El único control adicional `api-performance-Clc3y4` terminó durante el arranque inicial, sin tomar muestras. No se presenta como evidencia de regresión de consultas ni como resultado comparable. PostgreSQL recuperó el clúster sintético después de un cierre interrumpido, sin borrar ni reiniciar sus archivos. Un probe posterior del mismo backend compilado llegó a ready en 4924 ms y cerró limpiamente; no explica retrospectivamente el fallo de arranque.
- Un diagnóstico read-only ejecutó las consultas reales del repositorio compilado sobre el fixture sintético preservado. Los once planes observados tardan 0,35–60,78 ms y no muestran JIT; no prueba aceptación HTTP ni establece la causa de los outliers. Ambos fallos y los planes se conservan. No se cambiaron límites, descartaron muestras, atribuyeron problemas al host sin evidencia ni repitieron mediciones hasta conseguir verde.

### Contratos móviles de readiness y ciclo, 8 de octubre

- Se añadieron dos escenarios contra HTTP y PostgreSQL locales reales: readiness diario concurrente y con respuestas nulas; ciclo voluntario independiente del sexo, traslado entre meses, conflicto, validación y borrado. Usan el wrapper de autenticación y cliente generado móviles, no las pantallas ni respuestas simuladas.
- La primera ejecución reprodujo HTTP 500 para una fecha futura. Dos controles de servicio también fallaron al exigir HTTP 400. La corrección backend traduce solo `RangeError` en los límites de validación de fechas/rangos a `BadRequestException`, sin cambiar consultas, opt-in ni convertir errores internos arbitrarios en errores de usuario.
- La repetición pasa los siete escenarios de integración (4 de sincronización, 1 de reinicio y 2 de dominios), los ocho controles focales del servicio y la suite normal de 737 pruebas. La comprobación completa backend está en curso; no constituye CI remota ni publicación. El lock frontend sigue en el backend publicado anterior y requiere actualizarse después de verificar/publicar la corrección. Siguen abiertas seguridad, rendimiento y aceptación física; instalar las herramientas Android continúa pendiente de autorización.

### Recuperación offline entre procesos separados, 8 de octubre

- Una prueba adicional inicia y registra offline, termina ese proceso, reabre y finaliza offline en otro, y sincroniza en un tercero al recuperar conexión. Los tres procesos tienen PIDs distintos, usan los módulos móviles reales y el mismo SQLite sintético en disco; cada uno termina con salida 0 antes de iniciar el siguiente. PostgreSQL confirma una sesión completada, una serie editada y un único contador de estadísticas.
- El puente de pruebas conserva su comportamiento en memoria por defecto. Se reprodujo la falta de persistencia solicitada y de protección de nombres de archivo; sus seis controles posteriores pasan, incluidos rollback, aislamiento y rechazo de rutas que salgan del directorio. El adaptador de credenciales en disco es exclusivamente sintético: no equivale a SecureStore cifrado ni a cierre forzado del sistema operativo.
- Pasan los cinco escenarios adicionales de integración, las tres fases hijas, seis controles del runner, tipos/lint completos y la suite normal de 737/737 (418 móviles, 271 web, 10 de accesibilidad y 38 compartidas). Se conservan los fallos de preparación de los procesos y el rechazo real por seis logins en una ventana compartida; cada suite usa ahora un servidor Nest independiente, sin cambiar límites ni desactivar guards.
- La primera suite completa también reprodujo una aserción web que buscaba el mapa de músculos antes de terminar su carga diferida. Se corrigió solo la espera del mismo elemento accesible, con iguales límites, alcance y aserción de título. La reproducción focal falló antes y sus seis casos pasan después. No se modificó el comportamiento web ni se precargaron mapas.
- Se conservaron los logs de cada proceso y los archivos SQLite sintéticos. CI recoge únicamente los `.log`, no los archivos de credenciales o SQLite. Los fixtures PostgreSQL propios fueron eliminados por IDs exactos y la consulta final confirmó cero restantes; el clúster se detuvo preservando sus archivos. Backend limpio en `af9de455`, sin cambios de contrato, datos reales, despliegues ni builds remotos. El trabajo sigue local por las puertas globales abiertas y no constituye aceptación Android/iPhone.

### Sincronización móvil contra backend y PostgreSQL reales locales, 8 de octubre

- La nueva puerta explícita conecta cliente generado, autenticación, stores, motor de sincronización y SQL SQLite móviles al backend compilado, sin simular respuestas ni servicios. Se reemplazan solo puentes nativos y el adaptador HTTP por equivalentes locales. Las guías de ejecución, pruebas y desarrollo móvil mantuvieron separadas esta evidencia y la aceptación en celulares.
- Pasan cuatro escenarios: finalizar offline tras recargar módulos y renovar credenciales; perder la respuesta después del commit y reenviar sin duplicar sesiones, series ni estadísticas; conflicto de revisión entre dos estados locales independientes conservando ambas versiones; y otra sesión activa en el servidor conservando la local como borrador recuperable sin mezclar series. La rotación se contrasta también con los tokens revocados/vigentes de PostgreSQL.
- El runner rechaza destinos remotos, rutas de conexión alteradas, bases sin marcador de prueba y la identidad runtime. Pasan seis controles; antes de iniciar Nest comprueba la identidad de PostgreSQL y consume el guard del backend. Se añadió esta puerta a CI sin eliminar las comprobaciones existentes; no se ha ejecutado ni publicado CI remota para estos cambios.
- Pasan tipos/lint completos y la suite normal de 731/731, además de los cuatro escenarios adicionales. El backend se reconstruyó en `af9de455` y permanece limpio. Se preservan los fallos de preparación del harness y las advertencias de Node; no se presentan como defectos de aplicación corregidos. La guía reproducible está en [mobile-backend-integration.md](mobile-backend-integration.md).
- Solo se usó el clúster sintético existente en `127.0.0.1:55438`. La suite limpió únicamente sus IDs aleatorios y la consulta final confirmó cero usuarios propios restantes; el clúster se detuvo conservando sus archivos. No hubo migraciones, datos reales, despliegues, SDK nuevos ni recursos remotos. El incremento permanece local por las puertas globales abiertas; recargar módulos con SQLite en memoria no demuestra reinicio de proceso ni pruebas Android/iPhone.

### Transformación exacta del renderer en pruebas, 8 de octubre

- Jest conserva el preset y las exclusiones originales de Expo. Solo ejecuta directamente los dos archivos generados de implementación `ReactFabric-dev.js`/`ReactFabric-prod.js`, que ya son JavaScript válido para Node, sin pasarlos de nuevo por Babel. No se reemplazaron componentes, modificaron límites, ignoraron pruebas ni cambiaron código de aplicación o contratos.
- Dos controles reprodujeron el trabajo redundante antes del cambio. Los quince controles posteriores usan la configuración normalizada real y la decisión del transformador: siguen transformándose fuentes Flow, shims, TypeScript y nombres similares; se conservan las exclusiones de dependencias y se verifican las rutas canónicas del host. Se conserva el ensayo fallido cuyo fixture usaba separadores Unix contra patrones normalizados para Windows; solo se corrigió ese dato de entrada según el comportamiento observado de Jest.
- La última ejecución normal termina con salida 0: 63 casos focales, tipos/lint completos y 731/731 pruebas (412 móviles, 271 web, 10 de accesibilidad y 38 compartidas). Tras cambiar la configuración también terminaron las exportaciones locales Android/iOS; la corrección posterior afectó únicamente al fixture de rutas.
- El perfil muestra menos trabajo asociado al shim del renderer (1405→37 ms), pero el render total sigue alrededor de 7,8 segundos y la consulta sin caché mantiene el timeout de cinco segundos. No se demuestra una mejora global ni se da por resuelto ese fallo. Se preservan ambos perfiles y todas las ejecuciones adversas; la instrumentación se retiró. Las exportaciones no son APK ni aceptación en dispositivos.
- Todo sigue local por las puertas globales abiertas de seguridad/rendimiento y las verificaciones pendientes. Backend limpio en `af9de455`; sin publicación, despliegues, bases remotas ni cambios a datos reales.

### Diagnóstico del render nativo sin caché, 8 de octubre

- Un perfil de CPU reprodujo el timeout original sin ampliar los cinco segundos ni reemplazar pantalla, cliente o componentes. Las marcas monotónicas del caso coinciden con el intervalo del perfil: primer render de 7867 ms. La atribución por pila asigna 6663 ms a transformación, 481 a resolución de módulos, 256 a evaluación nativa, 79 a aplicación y llamadas asociadas, y 388 a otras tareas. Es una medición del ejecutor de pruebas con sobrecarga de perfilado, no del arranque de Android/iOS.
- El preset instalado de React Native carga componentes reales y el renderer mediante `requireActual`. Los archivos generados `ReactFabric-dev.js` y `ReactFabric-prod.js` ya son JavaScript sin Flow y ambos pasan la comprobación sintáctica directa de Node 24.14. Se identificó como siguiente candidato evitar solo su transformación redundante, conservando ejecución real, transformaciones de Flow/TypeScript y límites. Aún no se aplicó ese cambio ni se declaró resuelto el timeout.
- Se conservan el perfil, el análisis y el ensayo adverso de 36/37. La instrumentación temporal se retiró; no hubo cambios de producción, configuración de Jest, dependencias, datos reales o despliegues.

### Limpieza de cargas diferidas y verificación normal, 8 de octubre

- Se observó una carga de módulo todavía pendiente tras desmontar la ficha en una prueba. La limpieza espera únicamente las importaciones que ya se solicitaron, antes del siguiente caso; no precarga contenido, cambia límites ni simula el flujo de paginación. Se retiró toda la instrumentación temporal y el acceso diagnóstico al estado interno del ejecutor.
- La verificación posterior normal termina con salida 0: tipos/lint completos y 716/716 pruebas (397 móviles, 271 web, 10 de accesibilidad y 38 compartidas). El cambio definitivo en la prueba conserva sus aserciones y añade solo la espera de limpieza.
- La paginación completó el diagnóstico en 144–150 ms, pero no se confirmó que la carga anterior de gráficas causara su timeout: la cola de esa prueba estaba vacía en la observación focal. Se conservan los fallos anteriores y el diagnóstico nativo sin caché; la suite normal verde no demuestra que la intermitencia o el coste del primer render estén resueltos.
- Sin push por las puertas globales de seguridad/rendimiento/dispositivos aún abiertas; backend sigue limpio en `af9de455`. No hubo nuevas compilaciones de producción, acceso a datos reales, despliegues ni recursos externos.

### Campos canónicos y nulos de readiness móvil, 8 de octubre

- El formulario recupera las cuatro respuestas existentes, incluidos los valores sin registrar (`null`), sin reemplazar campos editados mientras llega una consulta o actualización. Hay controles explícitos para dejar una respuesta sin registrar; guardar no transforma esos nulos en ceros ni valores estándar.
- La respuesta confirmada del guardado actualiza formulario y caché sin otra consulta. Una consulta anterior se cancela para no sobrescribirla. Se conservan las ediciones realizadas durante el envío y los guardados fallidos; la confirmación compara los valores reales, incluso si se modifica y luego se deshace una respuesta. Se rechazan respuestas incompatibles del servidor sin inventar puntajes.
- Se reprodujeron las brechas con pantalla, autenticación y transporte generado reales: once fallos iniciales, un control de límites y dos casos de deshacer cambios. Los últimos casos funcionales pasan, pero la verificación focal completa permanece abierta: 47/48, con el primer caso excediendo los cinco segundos. El diagnóstico sin caché localizó 9,8 segundos en el primer render, antes de resolver el transporte; con caché se observaron 1,1 segundos. No se incrementaron límites, precalentaron pantallas ni omitieron pruebas. Los reportes adversos se conservan; no se declara una suite estable ni aceptación física.
- Tipos y lint completos pasan. En la ejecución raíz normal pasan 397 casos móviles y 38 compartidos, pero web queda en 270/271: `ExerciseDetail.test.tsx`, «paginates by canonical cursor, preserves earlier sessions after errors and deduplicates retry», excede cinco segundos. Los diez casos de accesibilidad no se ejecutan porque el script web se detiene tras ese fallo. No se atribuye todavía su causa ni se presenta esta ejecución raíz como verde.
- Las exportaciones locales de Android/iOS terminan correctamente, sin generar APK ni ejecutar la app en un teléfono. No sustituyen las comprobaciones fallidas ni acreditan arranque, memoria, accesibilidad o vibración física.
- La auditoría del 8 de octubre mantiene 55 vulnerabilidades altas y 18 moderadas. Las versiones más recientes disponibles de `braces` (3.0.3) y `node-forge` (1.4.0) siguen dentro de los rangos afectados. No se publica un checkpoint que se sabe que fallaría en CI. Backend limpio en `af9de455`; sin despliegue, cambios a datos reales ni builds remotos.

### Readiness móvil por fecha civil, 7 de octubre

- La fecha visible y la caché usan el día de Bogotá compartido con el dominio, no una clave fija `today` ni la medianoche UTC del teléfono. Al volver del segundo plano o alcanzar la medianoche en primer plano se consulta el día vigente. Hay un único temporizador de cambio de día; se cancela en segundo plano y se retira junto con el listener al desmontar.
- Solo se renueva el formulario diario al cambiar día, cuenta o versión de login. No arrastra el puntaje, la confirmación ni los campos temporales del día anterior; el borrador de datos personales permanece intacto. Los registros persistidos no se mueven ni eliminan. Las respuestas tardías de consulta se cancelan y una finalización de guardado de un formulario reemplazado no anuncia éxito ni produce vibración.
- Si el día cambia antes de enviar, el formulario anterior no hace POST y pasa al día actual. Un POST ya enviado no se cancela ni repite: la API sigue asignando la fecha al procesarlo; este incremento no introduce una fecha solicitada por el cliente ni promete resolver ese cruce durante el transporte.
- Se reprodujeron siete fallos diarios antes de la corrección. Pasan 31 casos focales, tipos/lint completos y la suite raíz normal con salida 0: 699/699 (380 móviles, 271 web, 10 de accesibilidad y 38 compartidas). Exportaciones locales correctas: Android 1734 módulos/4,3 MB e iOS 1644 módulos/4,1 MB. No acreditan APK, ejecución en teléfonos, arranque, memoria o lector de pantalla.
- Se conserva el ensayo que quedó abierto por GC de mutaciones en la prueba y su interrupción controlada después de terminar los casos; la limpieza ahora resuelve transportes pendientes sin temporizadores de retención. También se conservan los avisos de detección de timers y el fallo de lint. El render usa una confirmación de estado, no consultas del reloj, siguiendo la [regla de pureza de React](https://react.dev/reference/rules/components-and-hooks-must-be-pure). No se desactivaron reglas, cambiaron límites ni forzó la salida de Jest.
- El trabajo sigue local por las puertas globales conocidas de seguridad/rendimiento/dispositivos. Backend limpio en `af9de455`; sin push, despliegues, builds remotos, SDK nuevo o cambios en datos reales.

### Estados recuperables de readiness móvil, 7 de octubre

- Perfil distingue consulta pendiente, ausencia confirmada de registro, puntaje disponible y fallo recuperable. Permite reintentar o actualizar sin reiniciar valores editados. Si falla una actualización, conserva el puntaje consultado con un aviso explícito; una respuesta sin contenido no se interpreta como ausencia ni cero.
- La consulta pasa la señal de cancelación al cliente generado y usa claves por origen, cuenta y versión de login. Las regresiones con pantalla, Zustand, autenticación y cliente reales verifican el transporte autorizado, cancelación al desmontar, respuestas tardías y separación incluso con un QueryClient conservado. El proveedor raíz ya reinicia toda la caché por sesión; no se presenta esta defensa adicional como prueba de una fuga previa en el flujo normal.
- Ocho casos reprodujeron las brechas. Pasan 22 casos focales y la suite raíz normal con salida 0: 690/690 (371 móviles, 271 web, 10 de accesibilidad y 38 compartidas), además de tipos/lint completos. Se conserva un ensayo adicional fallido: esperaba el nombre de error durante el reintento, aunque Query ya había cambiado a estado pendiente; se corrigió únicamente ese selector sin modificar límites o comportamiento de producción.
- El cambio de día en una pantalla montada sigue pendiente: la clave todavía usa `today`, no la fecha civil. Estas pruebas no acreditan aceptación física ni nuevos bundles. Sin push por las puertas globales conocidas, sin despliegues, modificaciones backend ni acceso a datos reales.

### Confirmación de readiness independiente de vibración, 7 de octubre

- Una regresión reprodujo un error visible de guardado después de que el servidor confirmara el readiness: el dispositivo rechazaba la vibración opcional y ese rechazo cambiaba el resultado de la mutación. La guía móvil mantiene ese feedback separado de la persistencia.
- El rechazo háptico ya no invalida el guardado confirmado ni su puntaje actualizado. Un rechazo del servidor sigue mostrando error, conserva el puntaje anterior y no anuncia éxito ni solicita vibración. No se repite la mutación confirmada ni se modifican cálculos, contratos o datos reales.
- Pasan los 11 casos de perfil, tipos/lint completos y la suite raíz normal con salida 0: 679/679 (360 móviles, 271 web, 10 de accesibilidad y 38 compartidas). Se conservan el ensayo fallido y los avisos del entorno. Esta prueba usa pantalla y QueryClient reales con límites de transporte/nativos simulados; no acredita vibración física, rotación diaria o aislamiento de perfil entre cuentas.
- Sin push mientras fallen las puertas globales conocidas de seguridad/rendimiento; sin despliegue, build remoto o cambios backend. Las exportaciones nativas del incremento anterior no se presentan como una compilación nueva de este cambio.

### Descanso integrado en Entrenar móvil, 7 de octubre

- Entrenar muestra controles nativos para iniciar/reiniciar 120 segundos, pausar/reanudar y ajustar diez segundos. Recupera el estado local y calcula el tiempo al volver al primer plano; detiene actualizaciones periódicas en segundo plano. Los botones tienen nombre accesible, área táctil nativa y distribución con ajuste de línea, pendiente de validar físicamente.
- El estado visual cambia solo después de guardar: se bloquean toques duplicados, los errores conservan el estado canónico y permiten reintentar. Cuenta, origen, versión de login y entrenamiento delimitan los resultados tardíos. No hay controles en sesiones terminadas ni cambios a las series o su cola de sincronización.
- Se reserva un único intento de aviso háptico al persistir el fin del descanso. Solo se solicita en primer plano; una interrupción o rechazo del dispositivo puede omitir ese aviso opcional, pero no genera vibraciones repetidas al reabrir. No hay notificaciones de fondo, permisos nuevos ni servicios externos.
- La recuperación inicial responde a los callbacks del almacenamiento, sin reinicios de estado síncronos durante el efecto ni excepciones a la [regla de React](https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect). Se conserva el fallo de lint previo y otro fallo de prueba que esperaba el inicio HTTP, no la notificación visual asíncrona de Query; esa prueba ahora espera el estado visible con el mismo límite original.
- Verificación corregida con salida 0: 94 casos focales, tipos/lint completos y suite raíz normal 677/677 (358 móviles, 271 web, 10 de accesibilidad y 38 compartidas). Exportaciones locales Android/iOS correctas: 1733/1643 módulos, bundles 4,3/4,1 MB. No equivalen a APK, arranque/memoria de release, vibración física ni aceptación de accesibilidad en celulares.
- Se preservan los avisos del entorno y las puertas abiertas de seguridad, rendimiento y dispositivos. Backend limpio en la revisión publicada anterior; no hubo push, despliegue, cambios a datos reales, SDK ni build remoto.

### Base persistente del descanso offline, 7 de octubre

- Se añadieron reglas puras compartidas para iniciar, pausar, reanudar, ajustar y finalizar descansos. Se usa una hora límite absoluta, no el número de ticks recibidos mientras la app está abierta. Se conservan los milisegundos al pausar y una confirmación durable para que la futura integración háptica no repita el aviso al reabrir.
- La duración se limita a segundos enteros de 1 a 3600, con 120 por defecto. Es una decisión local de seguridad contra valores accidentales y desbordamientos; aumentar ese límite no requeriría cambiar datos del servidor.
- La migración local v2→v3 añade únicamente la tabla de descanso, aislada por cuenta/origen y entrenamiento. Las lecturas y escrituras usan la cola transaccional existente. Se rechazan sesiones ausentes o terminadas; los datos dañados se conservan y generan error, sin borrado ni reinicio silencioso.
- Pasan 32 casos de dominio y 20 focales de SQLite sintético, incluidas migraciones pobladas v1/v2 sin alterar catálogo, sesiones, colas, mapeos ni medios, aislamiento, rollback y reapertura offline en procesos JS nuevos. Pasan tipos/lint completos y la suite raíz normal: 666/666 (347 móviles, 271 web, 10 de accesibilidad y 38 compartidas).
- Esta base sigue pendiente de controles de pantalla, ciclo de vida y aviso háptico reales: no es un temporizador móvil terminado ni aceptación física. Se conservan los avisos y reportes; backend, contratos y datos reales no cambiaron. Sin push, despliegue, SDK nuevo o recursos externos.

### Recomendaciones de carga en Entrenar móvil, 7 de octubre

- La ficha del ejercicio activo permite consultar y actualizar recomendaciones del contrato generado: mantener, progresar o descargar, con motivos del backend. No calcula cargas en el teléfono, no modifica series automáticamente y no inventa objetivos numéricos cuando falta historial comparable.
- La consulta es opcional: muestra carga, error recuperable y reintento sin impedir entrenar sin conexión. No presenta consejos anteriores tras fallar una actualización; cambiar ejercicio, entrenamiento o sesión de autenticación cancela y separa la consulta. El backend sigue siendo la fuente del contexto de readiness y ciclo estimado.
- Las regresiones reprodujeron la consulta ausente. Pasan 66 casos focales con pantalla, observadores, cliente generado y validación de sesión reales, reemplazando solo los límites nativos y HTTP. Pasan tipos/lint completos y la suite raíz normal: 637/637 (338 móviles, 271 web, 10 de accesibilidad y 18 compartidas), además de exportaciones locales Android/iOS.
- Las guías de desarrollo móvil mantuvieron las recomendaciones independientes del almacenamiento offline. No son pruebas físicas ni APK; sigue pendiente el temporizador de descanso y la aceptación global. Se conservan los avisos y reportes, sin push mientras fallen las puertas globales conocidas, sin cambios backend, datos reales ni despliegues.

### Edición móvil de series por tiempo, esfuerzo y técnica, 7 de octubre

- Entrenar ahora permite editar duración en segundos, RPE entero de 1 a 10, calentamiento y técnica estable/inestable/sin registrar, además de peso y repeticiones. Los campos numéricos vacíos se conservan como `null`; los valores inválidos muestran un error por campo y no se guardan como cero. Se mantienen los límites del DTO de sincronización y el bloqueo de campos en sesiones terminadas.
- Los controles son nativos y usan la misma persistencia serial offline, rollback e IDs existentes. La sincronización del borrador visual con un valor canónico cambiado no usa un efecto que provoque otra actualización posterior al commit, siguiendo la [guía de React para ajustar estado ante cambios de props](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes). No se remonta el campo ni se desactiva el lint.
- Las regresiones reprodujeron controles ausentes y conversión incorrecta de datos. Pasan 53 casos focales con pantalla/store reales y SQLite sintético, incluida reapertura y finalización por duración sin inventar repeticiones. Pasan tipos/lint completos y la suite raíz normal con salida 0: 626/626 (327 móviles, 271 web, 10 de accesibilidad y 18 compartidas), además de exportaciones locales Android/iOS.
- Son bundles y pruebas locales, no aceptación física ni cierre de toda la paridad de entrenamiento. Los informes fallidos y avisos de observadores/SQLite/bundler se conservan; el incremento sigue sin push por las puertas globales abiertas. Backend, contratos y datos reales permanecen intactos; no hubo despliegues.

### Segundo toque durante el guardado de Inicio móvil, 7 de octubre

- Dos regresiones reprodujeron navegación prematura al pulsar «Continuar sesión» durante el guardado del inicio o de un borrador recuperado. El snapshot optimista cambiaba el botón antes de terminar la escritura.
- La acción queda deshabilitada mientras se guarda o el almacenamiento no está listo. Una sesión previamente guardada sigue disponible para reintentar una edición fallida; no se descartan series, snapshots ni colas.
- Pasan los 28 casos focales, tipos/lint completos y la suite raíz normal con salida 0: 609/609 (310 móviles, 271 web, 10 de accesibilidad y 18 compartidas). Pasan también las exportaciones locales Android/iOS con una URL HTTPS `.invalid`, sin solicitudes a datos reales ni builds remotos. Son bundles, no APK ni aceptación en celulares; se conservan los avisos de observadores `act` y del entorno de color del bundler.
- Se conserva el trabajo local sin push mientras estén abiertas las puertas globales de seguridad, rendimiento y dispositivos. No hubo despliegue ni modificación de datos reales.

### Navegación de entrenamiento móvil por cuenta y guardado, 7 de octubre

- Se reprodujeron cinco fallos en Inicio: navegar al terminar un inicio de la cuenta anterior o una sesión de autenticación anterior, navegar sin inicialización local, navegar tras fallar el guardado y navegar al recuperar un borrador después de cambiar de cuenta.
- Inicio comprueba después de la escritura que sigue siendo la misma sesión, que el almacenamiento está listo y que existe un entrenamiento activo guardado. Recuperar un borrador comprueba otra vez después de actualizar la lista; los errores tardíos no se muestran a otra sesión. Se preservan los avisos de fallo del almacenamiento y no se modifican ni eliminan datos.
- Las regresiones fallaron antes de la corrección. Pasan 25 casos focales, incluidos inicio y recuperación correctos tras persistir. Pasan tipos/lint completos y la suite raíz normal con salida 0: 606/606 (307 móviles, 271 web, 10 de accesibilidad y 18 compartidas). Los dobles de almacenamiento conservan la escritura y lectura posterior del snapshot; no reemplazan pantalla, consultas ni lógica del store.
- Se conservan dos ensayos fallidos del control positivo: primero buscó un botón antes de renderizarse y después su doble de escritura no exponía el snapshot a la lectura de sincronización. No son arreglos de producción adicionales. Persisten avisos de `act` de observadores de consultas en el ensayo focal; no se ocultan ni se presenta como aceptación física. El incremento sigue local por las puertas globales de seguridad/rendimiento/dispositivos, sin push ni despliegue.

### Aislamiento de las pruebas de entrega de progreso, 7 de octubre

- El diagnóstico reprodujo la espera fallida de `ModuleContent`: Activity ya estaba disponible, pero la consulta aún no había comenzado. La prueba anterior dejaba pendiente la importación real de la gráfica incluso después de desmontarse. Al terminar esa importación durante la limpieza, los dos casos pasan con los mismos componentes, consultas, verificaciones y límites.
- Se retiraron todas las mediciones temporales. El único ajuste permanente es esperar la importación ya solicitada después del desmontaje del primer caso; no se precargan módulos antes de la interacción, no se reemplazan gráficas ni se modifica código de producción. La ejecución enfocada sin mediciones pasó 2/2; tipos y lint completos posteriores también pasan. La suite raíz normal posterior terminó con salida 0: 599/599 (300 móviles, 271 web, 10 de accesibilidad y 18 compartidas).
- Otro ensayo completo falló en el límite original de la prueba de paginación de la ficha; su informe se conserva y esta corrección no establece su causa. Tampoco demuestra rendimiento de navegador o aceptación nativa. Seguridad, rendimiento real y dispositivos siguen pendientes; no hubo publicación ni despliegue.

## Implementado

- Monorepo npm con web, Expo móvil, contrato API, dominio y tokens; Next.js 16, NestJS 12, Prisma 7 y Node 24.14 fijado.
- API v1 con rutas compatibles, errores normalizados, salud, configuración requerida y límites de frecuencia.
- Sincronización transaccional por `clientId` y revisión; autenticación móvil y refresh web sin token en `localStorage`.
- El móvil persiste sesión y cola SQLite por cuenta/origen, conserva reintentos y resultados inciertos, serializa edición concurrente y muestra conflictos. El catálogo usa `q/page`, caché transaccional, búsqueda acotada y medios diferidos.
- La fuente OpenAPI es única. El frontend importa el JSON y cliente generados desde el backend fijado; el importador verifica origen, hashes, normalización LF/CRLF, tipos y ausencia de referencias externas.
- Historial por cursor `(endedAt, id)`, frecuencia semanal de todo el periodo y progreso web con tipos compartidos, periodos, comparación real, consulta cancelable y carga incremental. La evolución conserva volumen y máximos, pero agrupa en SQL y devuelve como máximo 120 intervalos cronológicos.
- Configuraciones de CI y política Vercel/EAS presentes. Render fue retirado. No hay despliegues autorizados.
- El acceso web al ciclo depende de la elección explícita, no del sexo registrado: registro, perfil, inicio, calendario y página directa. Desactivarlo o cambiar de cuenta desmonta el formulario del ciclo y descarta respuestas tardías de la vista anterior.
- Las fechas del ciclo serializadas por la API a medianoche UTC conservan su fecha civil en calendario, historial y edición; no se convierten al día anterior en Bogotá. Las fechas horarias de entrenamiento mantienen su conversión local.
- Inicio consume `ProgressOverview` generado: sesiones/volumen, racha histórica y cinco sesiones recientes escalares son canónicos; la comparación es real y las marcas separan unidades por tipo. Ya no solicita `/workouts?take=20` ni descarga series para reconstruir la racha o el volumen. Sus consultas independientes usan TanStack Query, cancelación y claves por cuenta/día; no presenta ceros o marcas vacías durante carga/fallo inicial, y distingue datos conservados tras fallar una actualización.
- El estado diario comparte una sola consulta entre formulario y métrica. Guardar actualiza ambas vistas; un fallo conserva valores y permite reintentar. La fecha civil de readiness tiene prioridad sobre el timestamp, con compatibilidad para registros antiguos sin fecha civil.
- El calendario web consulta actividad agregada y registros de ciclo por el mes visible. Ya no descarga sesiones completas ni reconstruye fechas o volumen en el navegador; conserva nombre, series, volumen y fase almacenada, limita actividad hasta hoy y solo solicita proyecciones de ciclo con consentimiento explícito.
- El móvil ya permite crear, editar y eliminar rutinas con el contrato generado, conservar rutinas cacheadas para iniciar una sesión sin conexión, previsualizar ejercicios sin descargar GIF antes de reproducirlos y editar todos los campos de perfil soportados por la API.
- Catálogo, rutinas, lista de entrenamientos, creación rápida, sesión activa e historial web consumen tipos y operaciones derivados de OpenAPI mediante TanStack Query. Sus consultas se cancelan, aíslan por cuenta y conservan datos canónicos ante fallos; las mutaciones muestran errores estructurados, evitan navegación prematura y refrescan únicamente las cachés correspondientes.
- Autenticación y perfil web consumen operaciones y tipos generados desde OpenAPI. El access token permanece sólo en memoria, las transiciones obsoletas no navegan ni restauran sesiones, el logout limpia localmente antes de propagar un fallo remoto y el perfil usa TanStack Query con todos los campos soportados, errores por campo y respuesta canónica sin un segundo GET.
- Ciclo, progreso y readiness web ya cruzan límites de transporte derivados de OpenAPI; ningún componente web llama directamente a `requestOrThrow`, `request` o `api`. El diario usa TanStack Query con cancelación y aislamiento por cuenta/generación, conserva valores nulos, limita fechas futuras y permite eliminar entradas con confirmación. Calendario, dashboard, búsqueda, gráfica paginada y estado diario mantienen errores explícitos en vez de fabricar datos vacíos.
- Los controles de series web nombran por separado las acciones de peso, repeticiones y RPE, y anuncian el valor actual en una región de estado accesible; el recorrido E2E usa esos nombres semánticos.
- Las miniaturas móviles visitadas tienen un caché propio de 20 MiB por cuenta/origen con índice SQLite y expulsión LRU física. Al reabrir reconcilia archivos ausentes o parciales sin tocar entrenamientos; un fallo de expulsión conserva el índice recuperable. Las listas y vistas previas no usan el caché de disco automático de Expo Image; los GIF siguen requiriendo reproducción explícita.

## Evidencia observada

### Contrato fijado al checkpoint de cookies, 7 de octubre

- El backend publicado es `af9de45592f9cd050fdd1d9dae88ef8bca8d4785`, con CI de push y PR completas y exitosas. Se comprobó que checkout limpio y rama remota corresponden a ese commit antes de importarlo.
- El verificador real detectó la referencia anterior; el importador existente actualizó la revisión y después pasaron verificación local y contra backend, 33 pruebas de seguridad del importador, tipos y lint. OpenAPI y cliente generados no tienen diferencias y conservan sus hashes anteriores.
- La suite raíz posterior no fue verde: pasaron 300 pruebas móviles, 270/271 web y 18 compartidas; las 10 de accesibilidad no se ejecutaron tras fallar las unitarias web. Falló la espera del resumen en el caso de respuesta obsoleta de `ModuleContent`, antes de rechazar la respuesta antigua. El DOM ya mostraba el módulo de progreso, pero su consulta seguía cargando. El archivo aislado pasó 2/2 sin modificaciones: no demuestra la causa del fallo ni una corrección.
- Se conserva el informe fallido y la referencia nueva localmente. No hubo push del frontend, cambios de límites o pruebas omitidas para forzar éxito, despliegues ni acceso a datos reales. El siguiente diagnóstico debe separar entrega del módulo, consulta y notificación/renderizado antes de atribuir el fallo a un componente.

### Nombre accesible del acceso móvil al perfil, 7 de octubre

- El enlace superior al perfil contenía únicamente un SVG decorativo oculto a tecnologías de asistencia: el DOM exponía un enlace sin nombre. Antes de corregirlo, fallaron tanto su búsqueda por propósito como la regla `link-name` de axe sobre el AppShell real.
- El enlace ahora expone «Abrir perfil» y conserva `/profile`, icono y presentación. Pasaron las 10 pruebas de accesibilidad, tipos/lint de todos los workspaces, suite raíz normal 599/599 (300 móviles, 271 web, 10 de accesibilidad y 18 compartidas) y compilación web de producción.
- Se verificó semántica DOM, no anuncios reales de lectores de pantalla, contraste, zoom o dispositivos físicos. La auditoría raíz renovada sigue con 55 alertas altas y 18 moderadas: sus dos fuentes altas, `braces` y `node-forge`, no tienen parche publicado compatible disponible. No se ocultaron alertas ni se cambiaron versiones, límites o puertas de publicación; el incremento sigue local.

### Recuperación de módulos internos de la ficha, 7 de octubre

- Se reprodujeron tres fallos reales de entrega de módulos: actividad, mapa y gráfica. Cada rechazo desmontaba toda la ficha y el contenido de la aplicación en las pruebas, en vez de ofrecer recuperación. Son defectos distintos del timeout intermitente de carga observado antes.
- La entrega diferida ahora distingue carga, fallo recuperable y módulo disponible antes de renderizarlo. Reintentar vuelve a solicitar el módulo y restaura el foco al cierre; las respuestas obsoletas no reemplazan el contenido vigente. Un fallo de gráfica conserva métricas y consulta; el mapa conserva metadata y medios. Historial, indicaciones y cierre siguen utilizables, sin recarga automática ni mensajes de error internos.
- Los fallos se observaron antes de aplicar cada corrección. Pasaron 30 pruebas focales con componentes, exportaciones y consultas reales, incluidos reintentos persistentes/exitosos y rechazo tardío. Pasaron tipos/lint de todos los workspaces, suite normal 597/597 y build web de producción. Los módulos no utilizados siguen diferidos; no se añadieron dependencias ni se modificaron tiempos o presupuestos.
- El incremento sigue local: no prueba rendimiento real, E2E PostgreSQL ni uso nativo. No hubo commit/push, CI remota, despliegue o modificación de datos reales; las demás puertas de publicación continúan abiertas.

### Puerta de rendimiento autenticado controlado en CI, 7 de octubre

- El workflow local ahora registra el ensayo autenticado con CPU/red limitadas y recoge su directorio de resultados en la subida de artefactos, incluso al fallar el job. No se sustituyó ninguna comprobación ni se añadieron excepciones o cambios de presupuestos.
- La verificación del YAML interpretado y la selección de un informe real fallaron antes del cambio y pasaron después. El comando real de Playwright con `--list` descubre los perfiles controlados de escritorio y móvil; no arrancó servidores ni se conectó a una base. Esto verifica registro y descubrimiento, no ejecución exitosa de GitHub Actions ni aceptación de rendimiento.
- La suite normal posterior terminó con fallo: móvil 300/300, web 265/266 y paquetes compartidos 18/18. La prueba de carga diferida de la ficha permaneció en «Cargando progreso…»; accesibilidad no se ejecutó porque depende del éxito de las unitarias web. El caso aislado con diagnóstico pasó, pero no demuestra la causa ni corrige el fallo completo. Se retiró toda instrumentación temporal y se conservaron los informes. No hubo commit/push ni despliegue; seguridad, rendimiento real, E2E y dispositivos siguen abiertos.
- El diagnóstico del recorrido completo pasó 592/592: importación de Activity en 10,13 ms y resumen 328,12 ms después del clic, sin reproducir el bloqueo. Después de retirar los diagnósticos, la suite normal volvió a pasar 592/592 con los mismos tiempos y workers. Esto no demuestra una corrección causal del fallo intermitente ni borra el informe anterior; no hubo cambio de producción para resolverlo. La puerta de CI y la selección de informes se verificaron de nuevo, pero no se publicaron ni se ejecutaron remotamente.

### Parche compatible y nuevo ensayo web, 5 de octubre

- `source-map-js` se actualizó de 1.2.1 a 1.2.2. La regresión acotada rechazó un offset malicioso sin serializarlo: RED observado en la versión anterior, GREEN 2/2 con un control de mapeo legítimo. Pasaron 507 pruebas raíz, tipos/lint de todos los workspaces, contrato y build web con el origen canónico de CI.
- El nuevo ensayo compilado pasó 6/6 visitas con los mismos límites y sin reintentos: INP 88–136 ms, LCP 1024–1064 ms y CLS <=0,000164. Se añadieron tiempos/tamaños de scripts después de las interacciones, sin retrasar el primer clic ni registrar parámetros o entradas. Las descargas iniciales ya habían terminado antes de ese clic en estas visitas. Es evidencia exploratoria nueva: no atribuye la mejora al parche ni invalida los fallos anteriores; reproducibilidad, confianza estadística y rendimiento autenticado controlado siguen pendientes.
- La auditoría frontend sigue bloqueando su publicación: 74 avisos, 56 altos y 18 moderados. `braces` 3.0.3 y `node-forge` 1.4.0 continúan sin versión corregida publicada. No se modificó el umbral ni se ignoraron avisos.
- El parche `proxy-addr` del backend ya está subido en el [PR 18](https://github.com/GabrielCano22/EVRY-Backend/pull/18), commit `406af9c`, con CI de push y PR verificadas en verde. Esto no acepta el frontend ni el plan completo. No hubo push frontend, despliegues ni modificaciones de datos reales.

### CPU/red web controladas y auditoría nueva, 5 de octubre

- Un probe real de Chromium verifica latencia y transferencia bajo CDP incluso con interceptación de Playwright. Se usa CPU4x relativa al host,150 ms,1,6 Mbps de descarga y750 Kbps de subida; no se presenta como dispositivo calibrado.
- El primer ensayo compilado falló5/6 visitas por INP. EventTiming y CPU localizaron la primera interacción de email en hidratación síncrona. Se separó el marco estático de login del formulario cliente y se limitó TanStack Query al grupo autenticado. Ambos cambios compilan, pero el último ensayo estricto aún falla3/6: INP136–232 ms escritorio y144–312 ms móvil web; LCP1064–1192 ms y CLS<=0,000164. No se ampliaron presupuestos ni se reintentó hasta obtener verde.
- El recorrido autenticado inicial no llegó a medir: el build usaba el origen predeterminado localhost, rechazado por el aislamiento loopback del ensayo. Recompilado con el origen 127.0.0.1 exacto de CI, pasaron 36/36 visitas en 5,4 minutos sin omisiones/flaky, con datos sintéticos poblados, cookies rotativas y acciones reales. Esto verifica la nueva ubicación del proveedor de consultas, no rendimiento autenticado bajo CPU/red limitadas. Se detuvo PostgreSQL sintético conservando sus datos.
- Pasaron nuevamente 505 pruebas de la suite raíz, tipos/lint de todos los workspaces, el probe real 1/1 y el baseline público compilado 12/12. Las comprobaciones pesadas se ejecutaron separadas; no hubo pruebas omitidas. La revisión final y el presupuesto controlado siguen abiertos: no se confunde funcionalidad verde con aceptación completa.
- La auditoría fresca cambió: frontend75 avisos (57altos,18moderados), incluyendo `source-map-js` con parche compatible. Backend21 avisos (1crítico,20moderados): [`proxy-addr`](https://github.com/advisories/GHSA-jqcg-44mw-7w3h)2.0.7 tiene corrección2.0.8. Esto identifica una dependencia afectada; no prueba explotación de EVRY ni que su configuración active el camino vulnerable.
- No hubo commit/push, CI remota ni despliegue de este incremento. Se mantienen pendientes INP controlado, actualización compatible de dependencias, revisión final y aceptación física. La guía `web-controlled-performance.md` conserva alcance e informes fallidos.

### Estado de guardado móvil y aislamiento, 5 de octubre

- Inicio y Entrenar separan escritura local pendiente/fallida de sincronización remota: ya no describen series optimistas como guardadas. Solo la escritura de la edición vigente confirma durabilidad; los fallos restauran datos y conservan el aviso.
- Las colas se aíslan por cuenta/origen y se conservan ordenadas al volver a la misma cuenta. La reinicialización espera su cola sin bloquear otras cuentas; finalizar/cancelar tarde no invalida la versión de inicialización ni deja el entrenamiento bloqueado.
- La revisión independiente detectó una carrera importante; cuatro casos de éxito/fallo de finalizar/cancelar la reprodujeron y verificaron su corrección. Pasaron 33 pruebas focales y la suite raíz final de 505 pruebas (247 móviles, 237 web, 3 de accesibilidad, 18 compartidas). Tipos/lint y ambas exportaciones locales Android/iOS pasaron; las exportaciones no sustituyen builds nativos.
- Dos ensayos previos bajo concurrencia registraron timeouts/arranque fallido de workers y una búsqueda tardía del récord de Inicio. El archivo afectado pasó 6/6 sin cambios y la suite raíz separada terminó con exit 0; no se ampliaron timeouts ni se omitieron pruebas. No se certifica cualquier nivel de saturación del entorno.
- Commit local frontend `1340bd3`, sin push ni nueva CI remota: audit mantiene 67 avisos, incluidos 56 altos. Backend limpio, sin commit vacío. Se conservaron datos y trabajo web pendiente, sin despliegues ni recursos externos.
- El usuario confirma que dispone de Android e iPhone, sin Android Studio. Falta confirmar Expo Go/red/USB y ejecutar aceptación física. Guía: `mobile-save-state.md`; el plan integral sigue abierto.

### Finalización móvil durable, 3 de octubre

- Se reprodujo una carrera que permitía iniciar otra sesión antes de persistir la finalización anterior. El móvil retiene el snapshot completado y bloquea nuevas sesiones, series y finalización repetida hasta que termina la escritura; un fallo restaura la sesión activa.
- La pantalla espera el resultado, muestra «Finalizando sesión…», consume el rechazo visible de SQLite y confirma por háptica solo tras el guardado y con la cuenta vigente. Un fallo de háptica no deshace el entrenamiento.
- Las regresiones fallaron antes del cambio y pasaron después. La suite raíz pasó 489 pruebas; tras ampliar la cobertura pasó de nuevo el móvil completo con 233 pruebas, tipos y lint. También pasaron tipos/lint de todos los workspaces, `expo-doctor` 21/21 y exportaciones locales Android/iOS. La revisión independiente no encontró problemas críticos/importantes; se incorporaron sus tres sugerencias menores de cobertura.
- No son pruebas nativas: falta SDK/dispositivo para cierre/reapertura, SecureStore/SQLite reales, APK y presupuestos Android. No se instalaron binarios ni ejecutaron builds remotos. La auditoría fresca mantiene 67 avisos, 56 altos, por lo que se conserva el trabajo local sin commit/push ni CI remota. Backend sin cambios; datos reales intactos. Alcance exacto en `mobile-durability.md`.

### Rendimiento autenticado y estabilidad visual, 3 de octubre

- La web compilada se midió contra Nest y PostgreSQL sintéticos locales, con 30 sesiones completadas, 90 series y 54.000 kg por cuenta. El guard rechaza bases remotas, parámetros que redirijan conexiones y coincidencias runtime por alias loopback; doce regresiones incluyen mayúsculas y punto DNS final. El runner conserva módulos/guards reales y verifica el listener `127.0.0.1:4000`, sin exposición por wildcard.
- La medición reprodujo CLS 0,196 en Inicio: quitar el aviso movía contenido 78 px, y la llegada de métricas cambiaba tarjetas de columna. Se corrigieron el aviso fuera de flujo y posiciones/alturas reservadas. En ciclo móvil, CLS 0,144 se debía al formulario desplazándose 194 px al aparecer la fase; el panel reserva espacio durante carga y conserva información insuficiente si falta contexto.
- Pasaron 36/36 visitas autenticadas (seis pantallas × tres repeticiones × escritorio/móvil web), sin fallos, omisiones ni flaky, en 351,7 s. Escritorio: LCP 468–796 ms, INP 16–88 ms y CLS hasta 0,0336261; Pixel 5 emulado: LCP 436–624 ms, INP 24–72 ms y CLS 0 en estas visitas. No son percentiles, confianza estadística, aceptación nativa ni prueba de todas las condiciones de red/CPU.
- Cada visita valida datos reales de la cuenta sintética, refresh rotativo y flags HttpOnly/ruta/SameSite sin adjuntar tokens. Se rechazan errores HTTP web/API y fallos de transporte, diferenciando cancelaciones de ciclo de vida y el cuerpo del 401 recuperado. Los límites de frecuencia siguen activos. La serie temporal de interacción se elimina; se conservan los datos fuente y los informes fallidos.
- La suite completa pasó 484 pruebas antes de ampliar dos alias del guard; después pasó de nuevo toda la web con 237 unitarias y 3 de accesibilidad. También pasaron tipos/lint de todos los workspaces, 33 pruebas del importador, verificación del contrato y build web. El contexto insuficiente del ciclo se reprodujo RED y verificó GREEN mediante una aserción adicional. Login compilado volvió a pasar 12/12 en 55,5 s, concurrente con comprobaciones locales; no se usa ese ensayo para nuevas afirmaciones estadísticas.
- Se prepararon ambos pasos de rendimiento y retención JSON en CI. La revisión independiente no encontró hallazgos críticos/importantes pendientes; se difieren adjuntos de diagnóstico detallados de preparación/login. No hubo commit, push, CI remota ni despliegue: la auditoría fresca sigue fallando con 67 avisos, incluidos 56 altos; las últimas versiones publicadas de `braces`/`node-forge` siguen afectadas. PostgreSQL sintético y servidores web/API quedaron detenidos, sin borrar datos.
- Guía e informes exactos en `web-performance.md`. El siguiente hito requiere CPU/red controladas, muestreo estadístico y aceptación nativa; el plan integral sigue abierto.

### Primera medición web compilada y legibilidad, 3 de octubre

- Se agregó un ensayo local Playwright con el observador oficial `web-vitals` incluido en Next.js, sin instrumentar producción o enviar telemetría. Solo admite el origen loopback web y no consume API, bases o datos reales. Rechaza métricas ausentes y aplica los presupuestos estrictos del plan.
- El baseline reprodujo visitas con documento visible pero sin FCP/LCP. La regresión de la animación real al instante inicial confirmó opacidad cero; `rise-in` conserva desplazamiento/escala y ya no oculta el contenido. Después de recompilar pasaron 12/12: seis regresiones de legibilidad y seis visitas medidas de login. LCP observado 164–204 ms, INP 32–48 ms, CLS 0–0,0000331; no son percentiles poblacionales o aceptación global.
- La ejecución final completa de `npm run test` pasó: 228 pruebas móviles, 225 web, 3 de accesibilidad y 18 de paquetes compartidos. Build, tipos y lint web también pasaron. Se agregó el paso de CI y retención de informes JSON, pero no se han publicado ni ejecutado en GitHub por el bloqueo de auditoría.
- La revisión independiente no encontró hallazgos críticos/importantes. Se difiere un detalle de diagnóstico: los fallos anteriores a la navegación final pueden carecer del adjunto numérico, aunque el informe conserva el fallo y no concede un aprobado falso.
- Guía y límites en `web-performance.md`: tres visitas por perfil son exploratorias. En ese primer hito seguían pendientes recorridos autenticados; condiciones de CPU/red, confianza estadística, aceptación visual completa de Inicio y pruebas nativas aún no están cerradas. No se declara terminado EVRY.

### Bloqueo de publicación por auditoría, 3 de octubre

- La auditoría local fresca del frontend informa 67 avisos: 56 de nivel alto, 11 moderados y ninguno crítico. Son paquetes afectados, no 56 vulnerabilidades independientes. Los avisos altos proceden de `braces` y `node-forge`, y se propagan a herramientas de Expo, Metro, Jest y Tailwind.
- El aviso de [`braces`](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), revisado el 2 de octubre, afecta a todas las versiones publicadas hasta `3.0.3`; el registro npm y el aviso oficial no ofrecen una versión corregida. [`node-forge`](https://github.com/advisories/GHSA-86w9-cpqp-85rv) sigue sin versión corregida publicada: la última disponible es `1.4.0` y está afectada.
- Se conservan localmente el parche Next.js `16.3.8` y el contrato fijado al backend publicado `f87fa5ae8ae2a42519959d80378b80c4f3c65841`. No se publica este checkpoint mientras falle `npm audit --audit-level=high`; tampoco se omiten dependencias, se cambian umbrales ni se aplican los retrocesos incompatibles sugeridos por `npm audit fix --force`.
- La auditoría local fresca del backend informa cero vulnerabilidades. Esto no representa una nueva ejecución completa de CI ni un nuevo push. Las salidas completas de ambas auditorías se conservan en `.worktrees/audit-current.json` de sus respectivos worktrees autorizados.
- Siguiente paso de desbloqueo: comprobar una corrección oficial compatible de ambas dependencias y, cuando exista, regenerar el lock y ejecutar todas las puertas locales antes de publicar. La medición web y la aceptación nativa continúan pendientes; no se declara terminado el objetivo ni se han desplegado componentes o tocado datos reales.

### Migración poblada y restauración sintética, 30 de septiembre

- El backend incorpora una puerta reproducible de ocho casos con Prisma migrate deploy y PostgreSQL 17.11 local. Conserva los 34 registros fuente del baseline histórico, valida estados y readiness en Bogotá, reconstruye estadísticas con valores independientes y comprueba restricciones reales.
- Los backups anterior y posterior se restauran en bases nuevas, con comparación completa de campos y repetición idempotente de la migración. Tres clases de duplicados heredados detienen la expansión sin perder filas; no se hace limpieza automática.
- La suite HTTP completa pasó 9 suites / 83 pruebas también contra la copia poblada restaurada; una comparación posterior confirmó los fixtures originales intactos. Las unitarias backend pasaron 56 suites / 392 casos. La guía reproducible está en `EVRY-Backend/docs/operations/migration-runbook.md`.
- La revisión independiente llevó a aislar también el entorno de los binarios PostgreSQL dentro de Docker. Se conservaron los dumps y bases sintéticas; no se accedió a datos reales ni se desplegaron componentes. La migración futura de una base real aún requiere backup y revisión autorizados propios.

### Contexto diario y ciclo de extremo a extremo, 30 de septiembre

- Playwright pasó 10/10 contra API NestJS y PostgreSQL sintético, en escritorio y móvil web. El recorrido nuevo guarda readiness con puntuación exacta, edita y rehidrata perfil, activa el ciclo con sexo registrado masculino, crea un registro con energía ausente, conserva su ID al moverlo al mes anterior, verifica el detalle del calendario y lo elimina. El opt-out persiste y la ruta directa no consulta datos del ciclo.
- La prueba descubrió dos fallos reales: respuestas vacías donde OpenAPI promete JSON `null`, y sobrescritura del `Retry-After` calculado por el limitador. Se corrigieron en el backend sin simular respuestas ni desactivar protección. El ensayo respeta el plazo real y comprueba que un segundo fallo de login no queda oculto.
- La prueba usa controles de usuario para las escrituras y lecturas HTTP independientes para comprobar persistencia. Una recarga completa de ciclo descarta el estado del navegador; al revisitar Inicio y Perfil se verifican los valores rehidratados. Las cuentas son sintéticas y únicas; esta evidencia no sustituye Android/iPhone ni un ensayo de migración poblada.

### Miniaturas móviles acotadas, 30 de septiembre

- Las 28 suites / 228 pruebas móviles pasaron con SQLite sintético. Incluyen recencia, expulsión física, tamaño excesivo, aislamiento de cuentas, archivos perdidos, recuperación al reabrir y rollback ante fallo de borrado. Las pruebas del adaptador simulan el límite nativo y los archivos parciales de Android; no equivalen a evidencia en dispositivo.
- La revisión independiente del cambio no encontró hallazgos bloqueantes. La comprobación física de persistencia, cierre/reapertura y consumo de disco en Android/iPhone sigue pendiente.
- Expo, Constants y Router se alinearon con los parches exigidos por Expo Doctor, que pasó 21/21. Se actualizaron dentro de sus rangos compatibles `brace-expansion`, `undici` y `postcss-selector-parser`; la auditoría con umbral alto pasó y conserva 14 avisos moderados. No se aplicaron correcciones forzadas ni se desactivaron puertas.
- Las puertas locales completas pasaron: 217 pruebas web, 3 de accesibilidad, 18 de los paquetes compartidos, 33 del importador de contrato, lint, tipos, contrato y build. Las exportaciones Android/iOS y Playwright 8/8 contra PostgreSQL sintético también terminaron correctamente. El lock fija el backend publicado `e201cacdc0f4b58491661ecd1f246877845d6073`; no cambia el OpenAPI.

### Cierre de registro, ciclo, progreso, rutinas y perfil móvil, 9–11 de septiembre

- El backend de registro móvil y traslado seguro de entradas del ciclo se publicó mediante el PR `#4`, con merge `b86eb6b2254df14b0d3735e07e8a0a6d07e9f8d5`; la CI `34311153231` terminó correctamente. La integración PostgreSQL final pasó 8 suites / 78 pruebas sobre un clúster sintético limpio de PostgreSQL 17.11.
- El frontend de registro, ciclo y progreso móvil se publicó mediante el PR `#6`, con merge `5033e38f4ae7e6f32a464d7df5486673db17d211`; la CI `34312961468` terminó correctamente en calidad, contrato y E2E.
- El bloque posterior de rutinas y perfil móvil siguió TDD y dos niveles de revisión. La verificación final pasó 23 suites / 172 pruebas móviles, lint y tipos. Rutinas cubre CRUD, confirmación, límites compatibles con backend, caché obsoleta, borrado idempotente en UI, previsualización y GIF bajo demanda. Perfil cubre los siete campos generados, fechas civiles, objetivos, ciclo opcional, errores por campo y respuesta canónica.
- Sigue pendiente la comprobación física en Android/iPhone y la distribución privada APK. Ninguno de estos cambios autoriza o realiza un despliegue.

### Cliente generado de entrenamiento web, 11 de septiembre

- El contrato backend hizo explícitamente anulables las notas de rutina y ejercicio en `6038b7f`; el frontend fijó esa revisión y eliminó los contratos manuales de ejercicios, rutinas, sesiones, series y recomendaciones. La puerta backend completa pasó Prisma, OpenAPI, lint, tipos, build, 53 suites / 337 pruebas unitarias, las ocho migraciones existentes, 8 suites / 78 pruebas PostgreSQL y auditoría sin vulnerabilidades.
- Las regresiones focales de catálogo/rutinas/medios pasaron 15/15. Las de lista, creación, detalle y medios de entrenamiento pasaron 4 archivos / 19 pruebas e incluyen bloqueo de envíos duplicados, caché tras iniciar, estados terminales, errores de actualización, reintentos e idempotencia de series. El transporte suma 34 pruebas para cancelación, refresh, multipart y un único presupuesto de timeout.
- La puerta completa local pasó contrato 33/33, comparación exacta contra backend, lint y tipos de todos los workspaces, móvil 23 archivos / 172 pruebas, web 27 archivos / 152 pruebas, accesibilidad 1/1, build web, Expo Doctor 21/21 y exportaciones Android/iOS. La auditoría con umbral alto terminó sin vulnerabilidades altas; conserva 15 avisos conocidos (1 bajo y 14 moderados) que no se corrigieron de forma forzada.
- Estas pruebas usan componentes, caché y transporte autenticado reales con HTTP simulado. Todavía no demuestran el flujo completo de entrenamiento en Playwright contra PostgreSQL, uso en dispositivo físico ni los presupuestos de rendimiento. No se realizó ningún despliegue.

### Autenticación y perfil web generados, 13 de septiembre

- El límite web de autenticación deriva registro, login, logout, lectura y actualización de usuario del cliente OpenAPI. Las regresiones comprueban errores 422 estructurados, normalización, respuestas tardías, hidratación fallida después de adoptar un token nuevo y propagación de fallos de logout.
- El perfil edita nombre, sexo registrado, fecha civil de nacimiento, metas, consentimiento y longitudes de ciclo. La respuesta canónica actualiza Zustand conservando `createdAt`; los fallos conservan los valores editados y el opt-out retira inmediatamente los controles privados.
- El foco de perfil/ciclo pasó 3 archivos / 24 pruebas. La suite web completa pasó 29 archivos / 169 pruebas unitarias y 1/1 de accesibilidad; contrato, comparación con backend, lint, tipos y build Next.js de producción terminaron correctamente. No se realizó ningún despliegue.

### Ciclo, progreso y readiness web generados, 14 de septiembre

- Tres límites tipados cubren todas las lecturas y mutaciones vigentes de ciclo, progreso y readiness, incluidas rutas parametrizadas, rangos civiles, cursor, borrado y errores estructurados. Una prueba arquitectónica impide reintroducir transporte manual o DTO de respuesta duplicados en estos consumidores.
- El foco pasó 10 archivos / 58 pruebas. La suite web completa pasó 33 archivos / 190 pruebas unitarias y 1/1 de accesibilidad; `api:check`, comparación contra el checkout backend fijado, lint, tipos y build Next.js de producción terminaron correctamente.
- El diario conserva la cancelación de lecturas al retirar consentimiento o cambiar de cuenta, descarta finalizaciones tardías, preserva `energy`/`mood` nulos, limita la fecha seleccionable al día civil de Bogotá y actualiza diario/calendario después de crear, mover o eliminar. Esta evidencia sigue siendo de componentes con HTTP simulado; aún falta el recorrido Playwright de CRUD completo contra PostgreSQL. No se realizó ningún despliegue.

### Backend, 4 de septiembre

- Contrato y sincronización publicados en `4ee7342cdd85fc6c46fca8033104804ab6ada1fe`. La corrección posterior `e211dce` aísla la configuración de origen en las pruebas sin cambiar producción ni el contrato.
- `lint`, `test:type-check`, `test:unit` (53 suites / 308 pruebas), `build` y `openapi:check` terminaron correctamente.
- Integración PostgreSQL sintética: 7 suites / 60 pruebas correctas en 60,48 s. Solo quedó la advertencia conocida de Jest sobre VM Modules experimental.
- El foco de sincronización pasó 10/10. Usa solicitudes HTTP contra `AppModule` real y PostgreSQL aislado; para las carreras, el test identifica el advisory lock concedido por OID de base, `classid`, `objid`, `objsubid` y PID, y exige exactamente los waiters de esa identidad. Una revisión independiente aprobó esa identidad completa.
- La integración incluye autenticación HTTP real (registro/login/refresh/logout de web y móvil, rotación, revocación, cookies y límites) y sincronización offline (idempotencia, carreras, conflictos, rollback, sesiones terminales y estadísticas). No equivale a una prueba de carga ni a un ensayo con datos poblados.

### Contrato y CI, 4 de septiembre

- En esa verificación, el lock del frontend quedó fijado a `4ee7342cdd85fc6c46fca8033104804ab6ada1fe`. `api:sync`, `api:verify-backend` y `api:check` terminaron correctamente contra esa revisión; el diff importado documentó únicamente respuestas `401` de logout web/móvil. La revisión vigente se registra en la evidencia del calendario mensual.
- Las CI frontend `33878020665` y `33878849934` fallaron únicamente en Expo Doctor (20/21), después de pasar contrato, E2E y los pasos anteriores de calidad. Se alinearon `expo ~57.0.20` y `expo-router ~57.0.19`, junto con cuatro dependencias transitivas de Expo. La verificación local posterior pasó lint, tipos, 16 suites / 83 pruebas móviles, Expo Doctor 21/21, exportaciones Android/iOS y auditoría de nivel alto. Las CI de push `33880175386` y de PR `33880178454` sobre `4231385` terminaron correctamente en calidad, contrato y E2E, incluidas las exportaciones móviles. No se presenta una exportación estática como prueba en dispositivo.
- Verificación local fresca: móvil 16 suites / 83 pruebas; web 14 archivos / 52 pruebas unitarias; accesibilidad 1 prueba; cliente API 3; tokens 2; dominio 12 y las 33 pruebas del importador, todas correctas. El importador tardó 161,65 s.

### Verificación local de frontend, 4 de septiembre

- Lint de todos los workspaces y type-check de todos los workspaces correctos.
- El build de producción web terminó correctamente (compilación 25,1 s; tipos 11,8 s).
- Las suites locales de móvil pasaron 16/83, las unitarias web 14/52, accesibilidad 1, cliente API 3, tokens 2, dominio 12 y el importador 33/33 (161,65 s).
- La ejecución completa de pruebas de todos los workspaces terminó correctamente.
- El origen de los dos fallos E2E de contraste quedó confirmado: la misma página de login tenía una animación real pausada a 100 ms con opacidad `0.717649`, que Axe interpreta con contraste insuficiente; al finalizar la animación, opacidad `1`, ya no hay violación. El cambio es solo de prueba: espera `animation.finished` y opacidad `1`, sin cambio de CSS, color ni producción. E2E normal/reduced × desktop/mobile pasó 4/4 en 17,8 s, recibió revisión independiente aprobada y pasó también en CI `33878020665`.
- La CI backend `33876893755` falló 59/60 porque una prueba rechazaba `127.0.0.1` aunque CI lo permitía explícitamente. Se reprodujo y corrigió en `e211dce` mediante dos aplicaciones reales con orígenes aislados y limpieza de configuración. La revisión independiente fue aprobada y una verificación local nueva con el origen de CI pasó 7 suites / 60 pruebas en 46,80 s. Las CI posteriores `33878691475` y `33878837563` terminaron correctamente, esta última sobre `2268a78`.
- El E2E de Playwright existente solo abre `/login`, comprueba navegación por teclado, 200 % de zoom y Axe sin violaciones graves/críticas. No envía autenticación ni cubre entrenamientos, por lo que no se debe afirmar cobertura E2E de login real ni de workouts.
- La regresión de opt-in web se reprodujo antes de corregirla. Las pruebas de componentes usan controles, sesión Zustand y cliente HTTP reales con transporte simulado; cubren consentimiento, guardado/recarga, hidratación, calendario, cancelación, cambio de cuenta y finalización tardía de guardado. La respuesta real de ciclo (fecha ISO a medianoche UTC y `userId`) también reprodujo el desplazamiento de día y el error al editar. Tras corregirlos, pasaron 17 pruebas focales y la suite completa web (16 archivos / 69 pruebas más 1 de accesibilidad), build y Expo Doctor 21/21. Esto no equivale a integración HTTP/PostgreSQL de ciclo ni a una prueba en navegador de esos flujos.
- El caso adicional de 1 de enero llevó la cobertura focal a 18 pruebas correctas. Sobre `555815d`, una ejecución final completa confirmó 16 archivos / 70 pruebas web más 1 de accesibilidad; el type-check posterior también pasó. La revisión independiente aprobó cumplimiento y calidad. El build anterior corresponde al mismo código de producción: después solo se añadió esa prueba de frontera de mes.
- La regresión de Inicio reprodujo métricas canónicas ignoradas, ceros durante carga/fallo y respuestas antiguas sin cancelar. También reprodujo puntuación diaria sin actualizar, fallo de guardado sin manejar y selección incorrecta de fecha de readiness. La suite nueva usa componentes, caché y transporte autenticado reales con HTTP simulado; verifica además recuperación, fechas civiles, aislamiento de cuentas y actualización fallida con datos previos. La suite web completa pasó 17 archivos / 81 pruebas más 1 de accesibilidad. No equivale a un flujo de navegador contra PostgreSQL.

### Calendario mensual web, 5 de septiembre

- El contrato frontend se importó desde el commit backend `fcd5e62fdde227b5e1dc80c7ae17cffddf76dc9d`. `api:sync`, `api:check` y `api:verify-backend` confirmaron el mismo OpenAPI y cliente generado, sin tipos manuales para las respuestas mensuales.
- Las pruebas focales pasaron 4 archivos / 32 casos. Cubren rangos mensuales y bisiestos, meses futuros, etiquetas civiles del servidor, detalles agregados, ausencia de descargas `/workouts`, estados de lectura parciales y conservados, semilla anterior del ciclo, consentimiento, invalidación acotada, cancelación y respuestas tardías al cambiar mes o cuenta.
- La suite web completa pasó 18 archivos / 92 pruebas unitarias más 1 de accesibilidad. Lint, tipos y build de producción también terminaron correctamente; la compilación tomó 22,8 s y su comprobación de tipos 7,9 s.
- Estas pruebas usan el calendario, TanStack Query, Zustand y transporte autenticado reales con HTTP simulado. No sustituyen el flujo Playwright contra API y PostgreSQL ni una medición de rendimiento en navegador.

### Resumen canónico de Inicio, 6 de septiembre

- El backend `e0864b09fcf46166c2b96b2ab489f31c7a8801ec` agregó al contrato `ProgressOverview` la racha diaria histórica y un máximo de cinco sesiones recientes escalares. La consulta reciente limita primero las sesiones y solo agrega sus series; la respuesta no expone series anidadas. Pasaron 53 suites / 307 pruebas unitarias, 8 suites / 75 pruebas de integración PostgreSQL, lint, tipos, build y OpenAPI. La CI del PR terminó correctamente.
- El frontend importó exactamente ese contrato y eliminó la consulta adicional de sesiones completas en Inicio. La regresión focal pasó 3 archivos / 23 pruebas; la suite completa confirmó móvil 16/83, web 19/95, accesibilidad 1/1, cliente API 3/3, tokens 2/2 y dominio 12/12. Lint, tipos, contrato y build de producción también terminaron correctamente.
- Playwright pasó 6/6 en escritorio y viewport móvil contra la API real y PostgreSQL sintético: login, cookie de refresh tras navegación completa, sesión finalizada y calendario mensual, además de teclado, zoom 200 % y movimiento reducido. El ensayo local requiere compilar Next.js con `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000/api/v1`, igual que la CI; una compilación previa con el valor por defecto `localhost` usa otro sitio de cookies y no representa la configuración de la puerta automatizada.

### Evolución por ejercicio acotada, 6 de septiembre

- El backend `3f09cd4a070a8bcd140da001a1388636773a8423` cambió los puntos por sesión a intervalos agregados mediante `NTILE` en PostgreSQL. Una regresión real con 121 sesiones exige 120 puntos, suma exacta de 73.810 kg, máximos correctos y orden cronológico. Pasaron 307 pruebas unitarias, 76 de integración y la CI del PR.
- El frontend importó el nuevo contrato, usa el final del intervalo como eje y expone rango y cantidad de sesiones en los datos accesibles de la gráfica. La suite completa local pasó móvil 16/83, web 19/96, accesibilidad 1/1, cliente API 3/3, tokens 2/2, dominio 12/12 y Playwright 6/6; lint, tipos, contrato y build también terminaron correctamente.

## Pendiente de cerrar antes de aceptar el plan

### Registro móvil (evidencia histórica previa al cierre), 7 de septiembre

- El contrato local incorpora `/auth/mobile/register` del backend `ef60c351659b84c6598355cb09714aa01c4c305e`, todavía sin publicar. El backend aprobó nueve pruebas focales, tipos, lint, build y generación OpenAPI; la integración PostgreSQL sigue pendiente porque el entorno rechazó arrancar el clúster de pruebas.
- El cliente móvil generado envía el registro nativo y guarda el refresh token con la cola SecureStore existente. La acción de sesión obtiene el perfil autenticado antes de abrir la cuenta y descarta respuestas tardías. La suite del cliente pasó 29 pruebas, incluido registro y logout concurrente; los tipos móviles también pasaron.
- El formulario nativo ya está conectado desde login: valida nombre/correo/contraseña y confirmación, conserva entradas ante error y requiere elección explícita para el ciclo. La suite móvil completa pasó 17 suites / 88 pruebas; tipos, lint y exportaciones Android/iOS también pasaron. Las pruebas del formulario usan controles React Native reales, pero no sustituyen una prueba en dispositivo.
- Falta ejecutar la integración real y completar las puertas antes del push de ambos repositorios. El lock apunta a un commit local: no publicar el frontend antes del backend correspondiente.
- Ajuste posterior: una respuesta de registro exitosa seguida de fallo al obtener el perfil muestra una cuenta creada y ofrece login, sin presentar otra vez el formulario. El perfil no validado permanece fuera de la sesión. La regresión llevó el cliente a 30 pruebas correctas; tipos y lint móviles pasaron después del ajuste. Las exportaciones anteriores corresponden al formulario previo a este ajuste.

### Edición móvil del ciclo (evidencia histórica previa al cierre), 7 de septiembre

- La pantalla permite crear y editar fecha civil, flujo, síntomas, energía, ánimo, notas e inicio del periodo con el contrato generado. Conserva los campos previos y envía `previousDate` al mover un registro. Rechaza fechas imposibles/futuras y valores fuera de rango; advierte si otra entrada cargada ya ocupa la fecha.
- El consentimiento y la identidad controlan el montaje de la pantalla; cambiar de cuenta o desactivar el ciclo descarta el formulario. La consulta admite cancelación y guardar ofrece confirmación visible.
- Pasaron 18 suites / 91 pruebas móviles, tipos y lint. Las dos pruebas nuevas del formulario verifican fechas y conservación de campos con controles reales; falta integración HTTP de la pantalla, prueba en dispositivo y exportación posterior a este cambio.
- La prevención de colisiones en pantalla solo conoce las entradas cargadas. El backend local `a3f84f4b3386af39e7792ded914ddba678201edb` ahora traslada mediante UPDATE conservando ID/campos, con 409 para destino ocupado y 404 para origen ausente. Pasaron siete pruebas focales, tipos, lint, build y generación OpenAPI; la integración PostgreSQL y la carrera real siguen pendientes. El frontend importó ese contrato y `api:check` pasó; ambos commits del backend aún deben publicarse antes de este lock.

### Detalle móvil del progreso (evidencia histórica previa al cierre), 7 de septiembre

- Progreso incluye selector de ejercicios con búsqueda cancelable y catálogo de 30 elementos por página, reutilizando su caché local. El detalle usa el contrato generado, resumen y comparación canónicos, intervalos de evolución y carga incremental del historial por cursor (20 sesiones por petición).
- Peso, repeticiones, duración y RPE conservan sus unidades y valores ausentes; los estados de carga/error/vacío se muestran por separado y el historial conserva lo ya cargado cuando falla una página posterior.
- Pasaron 19 suites / 93 pruebas móviles, tipos, lint y exportaciones Android/iOS. Las pruebas nuevas verifican representación de valores ausentes, series temporizadas y agregados del servidor. Falta probar la interacción completa de búsqueda/paginación contra HTTP real y en dispositivo; no se declara verificada por las pruebas de presentación.

### Contratos e integración

- Mantener la CI cruzada en GitHub tras cualquier cambio posterior del lock.
- Todos los consumidores HTTP web vigentes usan límites derivados del cliente generado. Los recorridos principales de entrenamiento, progreso, ciclo, readiness y perfil tienen evidencia E2E real; falta ampliar escenarios de error de red, cancelación y cambios concurrentes entre dispositivos.
- Comprobar de extremo a extremo el contrato móvil completo contra PostgreSQL. Ampliar la matriz de autenticación/sync a dispositivos y condiciones de red reales.
- El ensayo automatizado de migración poblada y backup/restauración sintéticos está verificado con conteos, campos y estadísticas contrastados. Antes de una futura migración real autorizada sigue siendo obligatorio ensayar su copia y revisar sus inconsistencias; no se ha restaurado una base real.

### Móvil

- La paridad funcional principal de registro, rutinas, perfil, ciclo y detalle de progreso está implementada y verificada en pruebas automatizadas. Falta su aceptación en dispositivos físicos y condiciones reales de red.
- La edición de duración/RPE/calentamiento/técnica, la consulta opcional de recomendaciones adaptativas y los controles de descanso con persistencia, primer plano y aviso háptico opcional tienen evidencia local. Falta validar la paridad completa y el comportamiento del ciclo de vida, almacenamiento y hápticos en dispositivos físicos; las pruebas y exportaciones locales no cierran esa aceptación.
- Validar aislamiento y reapertura offline en Android/iOS reales, incluida la vida real de SecureStore/SQLite y sincronización contra PostgreSQL.
- Si existe un `evry.db` heredado sin propietario, conservarlo intacto: la recuperación exige identificar al propietario e importación explícita; no se asignan automáticamente esos datos a la siguiente cuenta.
- La migración ya abre los entrenamientos y la cola aunque una ficha del catálogo tenga JSON inválido. Las lecturas offline omiten fichas o rutinas dañadas, avisan que la copia está incompleta y conservan intactas las filas originales para revisión; al volver la conexión se puede reintentar la consulta. Aún falta probar corrupción fuera de estas cachés y recuperación en dispositivos físicos.
- Completar feedback visible ante fallo de guardado local, reconexión y arranque frío del servidor gratuito.
- Verificar en dispositivos el presupuesto de 20 MiB por cuenta/origen y la recuperación del caché LRU implementado; el límite corresponde a archivos retenidos, no a descargas transitorias en curso.
- Ejecutar cierre/reapertura reales, Android release, iPhone/Expo Go y APK privado.

### Web, rendimiento y operación

- El cliente generado reutiliza deliberadamente el transporte autenticado común para conservar refresh, cancelación y errores seguros. Mantener la prueba arquitectónica verde ante nuevos consumidores.
- Ampliar accesibilidad a lector de pantalla y más pantallas. El E2E real cubre login, refresh, entrenamiento mediante interfaz, progreso/historial, calendario y contexto diario en escritorio/móvil web; no sustituye la aceptación con tecnología asistiva o aplicación nativa.
- Medir LCP/INP/CLS, latencias p95 calientes y memoria/arranque Android release; aún no se han demostrado esos presupuestos.
- No se autorizan despliegues. Render y Cloudflare quedan fuera de alcance. Si se autoriza expresamente un despliegue futuro, solo se evaluará Vercel después de diseñar/aprobar configuración, credenciales, orígenes y recuperación.

## Preservación de datos y límites

No se reinició, migró ni restauró una base real, ni se desplegaron recursos externos. La integración usa solo PostgreSQL sintético con una URL de prueba explícita, diferente de la URL runtime bloqueada. Este estado todavía no acepta el plan completo.

Los clústeres PostgreSQL de integración son sintéticos y están detenidos fuera de las pruebas. El clúster limpio de PostgreSQL 17.11 se conserva para ejecuciones reproducibles; el clúster temporal antiguo que perdió `global/6100` no debe reutilizarse. La guía está en `EVRY-Backend/docs/operations/integration-tests.md`.

## Auditoría de dependencias

La auditoría local del 4 de septiembre, posterior a los parches de Expo, terminó correctamente con umbral alto y reportó 15 avisos: 1 bajo y 14 moderados. No equivale a ausencia de vulnerabilidades ni demuestra que todos los avisos sean preexistentes. Las propuestas automáticas incluyen cambios incompatibles fuera de este ajuste; requieren revisar compatibilidad y alcance. No se ejecutó `npm audit fix --force`.

### Evidencia posterior del 5 de octubre

La auditoría anterior es histórica: la comprobación posterior reportó 56 avisos
altos y 18 moderados, bloqueando la publicación del frontend. No se relajó el
umbral ni se forzaron actualizaciones incompatibles.

La nueva medición autenticada controlada tampoco cumple los presupuestos: las
18 visitas de escritorio excedieron LCP (3500–4288 ms) y rutinas excedió INP
(392–400 ms). En móvil web se completaron seis visitas con LCP 3692–4580 ms;
rutinas y ciclo excedieron INP. La séptima no produjo INP y detuvo la prueba: no
se consideró aprobada ni se contaron las once visitas restantes como ejecutadas.
Las condiciones se aplicaron antes del documento y se verificaron solicitudes
afectadas. Detalles y reportes: [medición autenticada](auth-controlled-performance.md).
No son pruebas en celulares físicos ni aceptación integral.

La continuación corrigió la pérdida de métricas al cerrar el documento: las 18
visitas posteriores de escritorio entregaron LCP/INP/CLS completos, pero siguen
fallando los presupuestos (LCP 3504–4272 ms; INP de rutinas 336–360 ms). El
formateador horario reutiliza una instancia sin almacenar fechas del usuario.
Pasan 509 pruebas, tipos, lint, build web y cuatro pruebas reales de medición.
La recogida móvil posterior al cambio aún debe verificarse. El historial de
entrenamientos también requiere comprobar el acceso a páginas antiguas: el límite
de 20 sesiones del backend no demuestra por sí solo paginación accesible en la UI.

### Continuación del 6 de octubre: historial web

La UI permite solicitar páginas antiguas de 20 sesiones, conservar las ya cargadas
ante errores, reintentar la página fallida y descartar respuestas de otra cuenta.
Deduplica sesiones y comunica el límite actual de offset del backend sin afirmar
que todo el historial está disponible. El inicio de sesión actualiza la caché
observada sin mezclar arrays con páginas. No se modificaron contratos ni datos reales.

La suite completa posterior pasa 514 pruebas (247 móvil, 246 web, 3 accesibilidad,
18 compartidas), además de tipos, lint y build. La ejecución inicial fallida queda
registrada; se corrigió la regresión de caché y se verificó sin otras comprobaciones
pesadas simultáneas, manteniendo los límites y todas las pruebas.

La nueva prueba E2E de 24 sesiones todavía **no está verificada**: el servidor
local no estuvo listo dentro del límite de arranque y el diagnóstico directo fue
bloqueado por la política de ejecución. No se amplió el timeout ni se contabilizó
como aprobada. Se detuvo PostgreSQL sintético conservando sus datos. Este avance
permanece local: no se publicó un checkpoint con verificaciones relevantes fallidas.

La auditoría nueva detectó un aviso crítico en `shell-quote` de las herramientas
de desarrollo de React Native. Se actualizó únicamente esa dependencia a 1.12.0
dentro del rango compatible existente, sin overrides ni actualizaciones mayores.
Cuatro pruebas reprodujeron la falta de rechazo de saltos de línea tras comentarios
y pasaron después del parche; también pasa el control de entradas normales.
No se ejecutaron las cadenas construidas ni se presume exposición de EVRY en
producción por la mera presencia de la dependencia. El aviso está documentado
en [GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).

La comprobación posterior pasa 519 pruebas, tipos, lint, build web y exportaciones
Android/iOS. La auditoría ya no reporta críticos ni `shell-quote`, pero mantiene
57 altos y 18 moderados. Expo Doctor falla una de 21 comprobaciones porque ahora
requiere cinco parches compatibles de Expo, constants, linking, router y sqlite;
no se excluyeron esos paquetes de la validación. Siguen pendientes esos parches,
las vulnerabilidades restantes, el E2E que no arrancó y los presupuestos de
rendimiento previamente fallidos. Las exportaciones no equivalen a pruebas en
dispositivos ni a un APK release. No hubo push, PR nuevo ni despliegue.

### Compatibilidad móvil y decodificador de imágenes, continuación del 6 de octubre

Los cinco parches compatibles de Expo están instalados y Expo Doctor vuelve a
pasar 21/21 comprobaciones. El lock conserva sus dependencias transitivas
compatibles y los cambios locales anteriores; no se añadieron exclusiones.

Se actualizó `sharp` de 0.35.4 a 0.35.5 dentro del rango existente de Next.
La biblioteca nativa cargada pasó de librsvg 2.62.91 a 2.63.2. Una prueba rechazó
el decoder anterior y ahora pasa; un SVG inocuo sigue convirtiéndose a PNG con
las dimensiones y el color esperados. No se ejecutó un payload de corrupción de
memoria ni se reprodujo un ataque Linux desde Windows. El parche recomendado
está en [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).

La verificación final pasa 521 pruebas y 33 verificaciones del contrato, tipos,
lint, build web, Doctor y exportaciones Android/iOS. Se conservaron los informes
de los intentos fallidos: el último fallo de suite procedía de heredar la URL
temporal del build en las unitarias; se repitió el comando completo con el mismo
entorno que su paso de CI, sin modificar las pruebas ni sus límites.

La auditoría permanece fallida con 55 altos, 18 moderados y cero críticos.
Los avisos de `sharp` y `@expo/metro-file-map` ya no aparecen, pero siguen
pendientes los restantes, los presupuestos web y la prueba E2E que no pudo
arrancar. No se publicaron commits/push/PR ni se desplegaron recursos. Esta
verificación no acepta todavía el plan completo ni sustituye pruebas físicas.

### Lectura segura de sesiones offline, continuación del 6 de octubre

La lectura de la sesión activa y de los borradores valida ahora su estructura y
su identidad frente al registro SQLite. Ante datos dañados, conserva el contenido
y la cola, muestra un error sin incluir notas privadas y no habilita una sesión
inválida. Inicio muestra los errores al leer borradores y permite reintentar.
No se eliminan ni se reparan registros automáticamente; se conservan IDs antiguos
y campos adicionales. La protección de las otras lecturas transaccionales queda
pendiente: esto no constituye una recuperación completa de corrupción.

Las regresiones se reprodujeron antes de corregirlas con SQLite real en memoria,
reinicio del estado JavaScript sin red y pantalla con consultas reales. Se corrigió
un fixture incompleto de migración conforme al contrato móvil original, manteniendo
todas sus comprobaciones de preservación. La ejecución final pasa 535 pruebas
(266 móvil, 248 web, 3 accesibilidad y 18 compartidas), tipos/lint móviles,
Doctor 21/21 y exportaciones Android/iOS. Los intentos fallidos se conservan.

La auditoría recién ejecutada sigue fallida: 55 altos y 18 moderados. Los bloqueos
de rendimiento y E2E anteriores no se consideran resueltos. No hubo commit, push,
PR, Actions nuevas, despliegue ni cambios en datos reales. Las exportaciones no
equivalen a pruebas en celulares ni a un APK aceptado.

### Preservación transaccional offline, continuación del 6 de octubre

Las lecturas previas a editar/sincronizar, listar conflictos, conservar un borrador
y aplicar una confirmación del servidor reutilizan la validación del registro
local. Si el contenido está dañado, se rechaza la operación sin modificar sesiones,
series, eliminaciones pendientes, cola ni mapeos de IDs. La confirmación revierte
incluso la eliminación inicial de su fila de cola. Inicio muestra los errores de
lectura de conflictos y permite reintentar, sin presentarlos como una lista vacía.

Las cuatro regresiones SQLite y la de pantalla fallaron antes del cambio. La
verificación final pasa las 271 pruebas móviles y sus comprobaciones de tipos y
lint, incluyendo una serie útil, una eliminación pendiente y un mapeo existente
en las comprobaciones de preservación. No se afirma una nueva ejecución global
web/contrato ni aceptación física. Los cambios siguen locales: los bloqueos de
auditoría, rendimiento y E2E impiden publicar un checkpoint conocido fallido.
Queda por comprobar la fuente del borrador al archivarlo tras una lectura anterior
y el tratamiento del contrato distinto de los lotes de la cola.

### Recuperación de borradores desactualizados, continuación del 6 de octubre

La recuperación verifica dentro de su transacción que el borrador todavía existe,
es válido, sigue siendo un borrador y coincide con la versión mostrada. Un cambio
de contenido se detecta incluso si no aumentó la revisión. Si falla, no sobrescribe
el original ni crea una sesión o una fila de cola fantasma; el estado optimista de
la app también vuelve atrás. Se archiva la copia leída del almacenamiento, sin
modificar el objeto del usuario.

La comparación respeta el orden de las series y metadatos en listas, pero no
depende del orden de campos de objetos. Se verificó además la preservación de
claves JSON literales mediante pruebas SQLite. La ejecución final pasa 280 pruebas
móviles, tipos y lint. Los informes anteriores fallidos se conservan; no hubo
publicación, despliegue, cambios de dependencias ni modificación de datos reales.
La auditoría, el rendimiento web, E2E y la aceptación en celulares siguen pendientes.

### Restauración web sin solicitud no autorizada previa, continuación del 6 de octubre

Al arrancar sin token en memoria, la web renueva primero la sesión de la cookie
HttpOnly y después obtiene el usuario. La restauración válida pasa de tres
solicitudes a dos; con un token disponible no renueva innecesariamente. Comparte
la renovación entre llamadas simultáneas y no aplica una respuesta tardía después
de cerrar sesión. Los fallos del servidor siguen siendo errores recuperables,
no perfiles vacíos. Las llamadas ordinarias de perfil/login/registro no cambian.

Las pruebas usan el almacén, cliente generado y transporte reales con la frontera
HTTP sustituida. Se corrigió el fixture de consentimiento para representar la
renovación y validar el token de lectura/guardado, conservando sus comprobaciones.
Pasan 254 unitarias web, 3 de accesibilidad, tipos, lint y build de producción.
Esto demuestra una solicitud menos, no el cumplimiento de LCP/INP ni la rotación
de cookies contra un backend real en este incremento. Los cambios siguen locales;
no hubo push, PR, Actions nuevas, despliegue o cambios en datos reales. Los bloqueos
globales anteriores siguen pendientes.

### Cola offline dañada y carga web diferida, continuación del 6 de octubre

Los lotes offline se validan como contrato de sincronización, separado del modelo
local de sesión, antes de contar un intento o enviarlos. Un lote dañado conserva
su contenido exacto, la sesión, los mapeos existentes y las ediciones posteriores;
se marca para revisión local sin atribuirlo a un conflicto del servidor. Se evita
marcar una versión nueva usando una lectura anterior. Las pruebas móviles finales
de este incremento pasaron 300/300, tipos y lint; no sustituyen pruebas en celulares.

La ficha web carga el mapa muscular al mostrar el resumen y su módulo de actividad
al abrir progreso o historial. Conserva el diálogo inmediato, cierre, teclado,
foco y GIF bajo demanda. La regresión reprodujo primero las importaciones con la
ficha cerrada; pasan 20 casos de ficha, carga y contexto. El build de producción
y tipos pasan. Los scripts iniciales del HTML compilado de Inicio bajan de
734.840 a 717.908 bytes sin comprimir; los módulos siguen presentes en chunks
diferidos. Esto no mide transferencias reales, compresión ni LCP/INP.

La primera verificación global posterior no pasa: dos casos móviles exceden su
límite de cinco segundos (guardado de rutina y aviso de lote local dañado); Vitest
no logra iniciar los workers de ciclo/perfil y ficha, por lo que no ejecuta esas
unitarias ni accesibilidad. Los 18 casos compartidos pasan. Se conservan los
informes y se investigan los casos sin aumentar límites, excluir pruebas ni
cambiar workers. No se afirma suite global verde hasta repetirla y comprobarla.

La auditoría nueva sigue con 55 altos y 18 moderados. Los avisos principales de
[braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) y
[node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv) aún indican que no hay
versión corregida. No hubo commit, push, PR/Actions nuevas, despliegue, cambios de
dependencias ni modificación de datos reales. Los presupuestos y E2E siguen
pendientes de ejecución real; no se reintentó el arranque rechazado por otra vía.

La repetición global posterior terminó con 300/300 móviles, 252/255 unitarias
web y 18/18 compartidas. Accesibilidad no se ejecutó después del fallo web.
Los tres fallos fueron una carga de historial que no terminó, la carga tras
cambiar de sesión y el timeout de un caso de sesión cancelada. Los dos archivos
afectados pasan luego 26/26 aislados, sin cambiar pruebas ni límites; no se
presenta ese resultado como arreglo ni como suite global verde.

El analizador estático instalado de Next completó su informe sin iniciar servidor.
Identificó que Ciclo incluye el diccionario de ejercicios por el proveedor de
la ficha cerrada; Inicio y Entrenar sí lo consumen directamente. La siguiente
optimización debe diferir ese contenido conservando el marco accesible inmediato,
no eliminar traducciones. Los tamaños del informe son partes emitidas, no medidas
de red ni de tiempo. No hubo más cambios funcionales, publicación o despliegue.

Se inició localmente la separación del contenido de la ficha: el marco, cierre y
gestión de foco permanecen disponibles mientras carga el módulo. La regresión
reprodujo primero el diccionario cargado con la ficha cerrada. Después del cambio,
esa comprobación pasa, pero el conjunto enfocado queda en 18/20: el mapa muscular
sigue cargando al vencer una espera y otro caso no termina de cargar metadatos.
Se conservan ambos informes; todavía no es un cambio aceptado ni publicado.
Faltan las comprobaciones completas y la investigación de esos fallos, sin
aumentar límites, desactivar pruebas ni afirmar mejoras de LCP/INP.

La investigación posterior identificó una secuencia módulo → metadatos → mapa.
Los metadatos ahora se consultan solo al abrir, en paralelo con el módulo, evitando
esa espera encadenada. Los 20 casos enfocados pasan con las mismas comprobaciones
y límites; esto no demuestra que la suite global ni los presupuestos estén verdes.
Se agregaron casos de entrega demorada y fallo del módulo; el de fallo reprodujo
primero la ausencia de aviso recuperable y se restauró el tratamiento seguro.
La verificación ampliada sigue pendiente. No hubo push ni despliegue.

Los 22 casos ampliados de ficha/contexto pasan, incluidos teclado durante carga,
restauración del foco, marco estable y error recuperable de entrega del módulo.
La suite completa se inició y aún no tiene resultado verificado. Compilación y
comprobación posterior del grafo siguen pendientes; no se afirma aceptación global.

La ejecución completa terminó correctamente: 578 pruebas (300 móviles, 257 web,
3 de accesibilidad y 18 compartidas). Los informes anteriores fallidos se conservan;
este resultado no demuestra por sí solo la causa de su variabilidad.
Después se reprodujo un problema adicional al activar Reintentar con foco de
teclado: el botón desaparecía y dejaba el foco en el cuerpo de la página.
El reintento ahora lleva el foco al cierre estable antes de cambiar el contenido;
la regresión y los 22 casos de ficha/contexto pasan. La suite completa anterior
precede este último ajuste y debe verificarse de nuevo. Tipos/lint completos están
en ejecución; build, grafo y presupuestos siguen pendientes. No hubo push.

Tipos y lint de todos los workspaces, compilación web y análisis estático posterior
pasaron. El grafo comprueba explícitamente que Ciclo ya no alcanza el diccionario
de ejercicios de forma síncrona; Inicio y Entrenar siguen usándolo, como requieren
sus pantallas. El contenido de la ficha es asíncrono en las tres rutas. Los tamaños
del analizador no son bytes transferidos ni una medida de LCP/INP.
La nueva suite completa, posterior al arreglo del foco, está en curso. Permanecen
pendientes rendimiento real, auditoría, E2E y aceptación física; sin publicación.

La suite posterior al ajuste del foco terminó con 578/578 pruebas correctas.
Después se incorporó MSW 3.0.2 exclusivamente al entorno de pruebas web, con
handlers tipados por el contrato generado y rechazo de peticiones desconocidas.
Sus tres casos comprueban error de red distinto de vacío, recuperación explícita,
metadatos disponibles tras fallo de progreso y cancelación de una lectura cerrada.
Pasan 25/25 casos enfocados junto con las pruebas existentes de la ficha.
La cancelación se observa en el límite fetch de la aplicación, conservando el
transporte de MSW; su parser HTTP construye otra señal, que no representa la señal
original. No se cambió el código de la aplicación ni se simularon componentes.
Todavía faltan suite completa, tipos/lint, compilación y auditoría posteriores a
esta dependencia. El informe de instalación limitado al workspace no sustituye
la auditoría raíz. No hubo commit, push, despliegue ni cambios de datos reales.

Tipos/lint completos posteriores a MSW pasan. La auditoría raíz recién ejecutada
mantiene 55 altos y 18 moderados, sin críticos; no se relajó ningún umbral.
La nueva suite completa seguida de compilación está en curso; los 578 casos
anteriores no se presentan como verificación de esta nueva dependencia.

La ejecución posterior a MSW terminó correctamente: 581/581 pruebas (300 móviles,
260 web, 3 de accesibilidad y 18 compartidas), seguida de compilación web exitosa.
Estos resultados no sustituyen la auditoría raíz, que sigue con 55 altos y 18
moderados, ni las mediciones de rendimiento, E2E y pruebas físicas pendientes.
La consulta del registro no encontró versiones nuevas de braces ni node-forge;
decode-uri-component 0.5.0 queda fuera del rango de su consumidor actual y
sprintf-js continúa en 1.1.3. No se forzaron versiones ni se omitieron avisos.
Los cambios se conservan localmente; no hubo push, despliegue ni cambios de datos.

También pasan la comprobación del cliente generado y las 33 pruebas de los
scripts del contrato, sin casos omitidos. Siguen separados de los E2E pendientes.

La verificación móvil posterior a MSW pasó Expo Doctor 21/21 y las dos
exportaciones locales Android/iOS. Se generaron bundles Hermes de 4,2 MB y 4 MB
respectivamente usando una API HTTPS `.invalid`, sin conexión a datos reales.
Son artefactos locales, no APK, builds nativos de release ni pruebas en celulares;
no demuestran arranque, memoria, SecureStore o recuperación tras cerrar el proceso.

El contrato del frontend ahora fija el backend `406af9c`, que incluye el parche
de `proxy-addr` 2.0.8; antes fijaba `f87fa5a`, previo a ese parche. Los dos
artefactos OpenAPI comprometidos son idénticos entre ambas revisiones y se
conservan sus hashes: no cambian tipos ni respuestas. Se verificaron nuevamente
la rama remota y las CI de push/PR exitosas de ese SHA. La comprobación contra el
backend local reprodujo primero la discrepancia de revisión y pasa después de
actualizarla; también pasa `api:check`. Las suites completas posteriores están
en curso y esta actualización todavía no se ha publicado.

La suite posterior al cambio de referencia terminó con 581/581 pruebas correctas
y las 33 pruebas del importador. Después, la revisión de accesibilidad de los
formularios reales reprodujo cuatro barreras de marcado en registro:

- Regreso sin nombre accesible y selección sin estado expuesto: impacto moderado
  en orientación/confirmación de opciones, relacionado con [WCAG 4.1.2](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html).
- Preferencias sin agrupación semántica: impacto moderado al relacionar el título
  con los controles, relacionado con [WCAG 1.3.1](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html).
- Validación visual sin región de alerta: impacto moderado al descubrir el error
  después del envío, relacionado con [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

Se añadió nombre al enlace, `fieldset/legend`, estado `aria-pressed` y `role=alert`,
sin cambiar registro ni consentimiento del ciclo. Las regresiones fallaron antes
y pasan después; la suite de accesibilidad ampliada pasa 8/8 casos. Sus nuevas
pruebas renderizan las páginas reales y escanean seis reglas semánticas de axe
(nombres de enlaces/botones, etiquetas y atributos ARIA), sin desactivar reglas
existentes. No equivalen a una auditoría completa: NVDA/VoiceOver, contraste real,
zoom y movimiento reducido siguen sin verificar. Tipos/lint, suite raíz y build
posteriores a esta corrección están en curso; no hubo publicación o despliegue.

Los informes completos posteriores a la corrección de registro muestran 586/586
pruebas correctas y compilación web terminada. La sesión desapareció tras una
interrupción intencional: su código de salida ya no está disponible y no se
reconstruye como evidencia adicional. Los informes se conservan.

Después se reprodujeron problemas del Input compartido: errores sin estado
inválido/descripción, IDs repetidos entre controles con la misma etiqueta y
texto de validación incorporado al nombre accesible. Se mantienen nombre visual,
IDs explícitos, referencias y ayudas del formulario; los IDs automáticos ahora
usan [useId de React](https://react.dev/reference/react/useId). La descripción
combina ayuda y error propio, y elimina la asociación al retirar el error.
Las regresiones y el registro real pasan dentro de 45 pruebas enfocadas; también
pasan los 8 casos de accesibilidad. Un primer ensayo no arrancó dos workers y
no ejecutó casos: se conserva como fallo de infraestructura, no como regresión
RED ni como causa resuelta. Los casos posteriores sí reprodujeron fallos antes
del cambio y pasaron después, sin modificar workers ni límites.
Tipos/lint, suite raíz y compilación posteriores a este Input están en curso.
Las comprobaciones DOM no prueban anuncios reales de NVDA/VoiceOver ni aceptación
de la aplicación completa. Sin publicación, despliegues o cambios de datos reales.

Tipos y lint completos posteriores al Input pasan. La suite raíz todavía está
activa y ya registra un fallo móvil: crear una rutina excedió los 5 segundos de
su prueba en `RoutineManager.test.tsx`. No se aumenta ese límite ni se omite el
caso; el informe se conserva para investigar al finalizar la ejecución. No se
declara verde la suite completa ni la compilación posterior.

Ese ensayo terminó con dos timeouts: creación móvil y paginación de la ficha web;
pasaron 299/300 móviles, 265/266 web y 18 compartidas. Accesibilidad no se ejecutó
tras fallar las unitarias web y la compilación posterior se omitió por el fallo.
El diagnóstico de ambos archivos pasó 47 y 13 casos respectivamente. Después,
una ejecución completa instrumentada pasó 592/592, midiendo los recorridos
afectados en 697 ms y 471 ms. No reprodujo una espera bloqueada ni demuestra la
causa de los timeouts anteriores. Se retiraron las mediciones temporales y ambos
archivos originales quedaron sin diferencias; los informes fallidos se conservan.
La verificación normal completa y compilación posteriores están en curso. No se
cambiaron límites, workers o reglas de CI ni se publicó un checkpoint.

La ejecución normal posterior, sin instrumentación, terminó correctamente:
592/592 pruebas (300 móviles, 266 web, 8 de accesibilidad y 18 compartidas),
seguida de compilación web exitosa (22,7 s de compilación, 10,5 s de tipos).
Tipos/lint completos también pasan para el Input corregido. Los informes previos
fallidos se conservan y no se atribuye su causa a un arreglo que no se demostró.
Continúan pendientes auditoría alta, rendimiento real, E2E posteriores y pruebas
físicas; esta evidencia local no declara terminado ni publicado el plan integral.

Verificación posterior del 12 de octubre: cadena69889 terminó0 con tipos/lint,
760 casos (432 móvil,3 configuración nativa,276 web,10 accesibilidad,39
compartidos) y compilación web. Compilación local corregida9672 terminó0 con
API pública127.0.0.1; no se cambió el contrato ni las restricciones del ensayo.
El ensayo31832 terminó1 tras completar18 visitas reales, login y refresh
rotativo, datos poblados y aserciones canónicas. Solo la aserción final de
presupuestos falla: LCP3804–6504ms en18/18, INP falla8/18; CLS pasa18/18.
Historial INP592/512/248ms sigue por encima de200ms. Informe conservado en
.worktrees/web-auth-controlled-performance-1791830736118-f734c40e-9e35-4049-83dd-3a3d838b1329/results.json.
Cuenta sintética preservada idéntica tras el ensayo; PostgreSQL8700 de prueba
detenido limpiamente, procesos web/API cerrados. No prueba aceptación global,
auditoría resuelta o publicación; no se ejecutará otra medición sin cambio
concreto sobre el camino crítico de carga/autenticación.
