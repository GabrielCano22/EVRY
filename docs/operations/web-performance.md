# Medición web local

## Alcance actual

El primer ensayo mide únicamente `/login` compilado, con tres visitas aisladas por
perfil Chromium (escritorio y Pixel 5 emulado). Usa escritura real por teclado y
activación de la casilla de recordar usuario, sin enviar credenciales ni crear
cuentas. No cubre autenticación, entrenamiento, progreso o ciclo; no representa
Android nativo, iPhone, datos de campo o una aceptación global de rendimiento.

El observador oficial `web-vitals` incluido en la versión instalada de Next.js se
inyecta exclusivamente desde Playwright antes de cargar la página. No hay
instrumentación de producción, telemetría externa ni nueva dependencia. Una
navegación real a `about:blank` finaliza los observadores; no se simulan eventos
de visibilidad. Una métrica ausente, negativa o no finita hace fallar el ensayo,
en vez de sustituirse por cero. Las fronteras son estrictas: LCP < 2500 ms,
INP < 200 ms y CLS < 0,1.

Solo se permiten solicitudes a `http://127.0.0.1:3000`. Cualquier otro origen se
bloquea y se registra sin ruta, parámetros o contenido. Por ello no se usa API,
base de datos, medios remotos ni datos reales. El servidor compilado debe estar
libre en el puerto 3000; Playwright no reutiliza procesos existentes y administra
el inicio y cierre del servidor de este ensayo.

## Reproducir

En PowerShell, desde el worktree frontend autorizado:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL='http://127.0.0.1:4000/api/v1'
Remove-Item Env:NEXT_PUBLIC_API_URL -ErrorAction SilentlyContinue
npm run build --workspace @evry/web
npm run test:performance --workspace @evry/web
```

Se requiere Chromium previamente instalado para la versión de Playwright del
lock. El informe JSON y los adjuntos quedan bajo
`.worktrees/web-performance-<timestamp>-<uuid>`. Cada ejecución tiene un directorio
nuevo para conservar también los fallos anteriores. Cada adjunto incluye los tres valores,
presupuestos, perfil, repetición, versión del navegador, versión de Next.js y
`BUILD_ID`, sin credenciales o contenido del formulario.

## Interpretación y siguiente etapa

Tres repeticiones por perfil son una línea base exploratoria, no evidencia con
95 % de confianza. No se publican percentiles poblacionales, intervalo de
confianza ni afirmaciones de aceptación a partir de esta muestra. El ensayo es
local, sin limitación de CPU o red; el caché del navegador se aísla por visita y
el servidor ya está caliente por su comprobación de disponibilidad.

La siguiente etapa debe ampliar los recorridos autenticados locales descritos
abajo, incluir condiciones de CPU y
red explícitas y reunir muestras suficientes para intervalos de confianza. Debe
conservar fallos y observaciones completas, no seleccionar solamente visitas
rápidas. Se medirán entrada directa y navegación dentro de la aplicación por
separado: los Web Vitals de una navegación de documento no justifican atribuir
el mismo LCP a todas las rutas de una SPA.

La [documentación oficial de Web Vitals](https://github.com/GoogleChrome/web-vitals)
describe el observador y sus límites; la [guía de INP](https://web.dev/articles/inp)
explica por qué una visita sin interacciones no prueba respuesta interactiva.

## Ensayo autenticado local

`npm run test:performance:authenticated --workspace @evry/web` prepara mediante
la API compilada una cuenta nueva por perfil, 30 sesiones completadas con 90
series y 54.000 kg, una rutina, una sesión activa con tres series, readiness y
un registro del ciclo voluntario. No borra los registros de ensayos anteriores.
Solo admite una `TEST_DATABASE_URL` PostgreSQL loopback con nombre explícito de
prueba, sin redirecciones de conexión, distinta de `DATABASE_URL` incluso si
ambas usan alias diferentes de loopback. El rechazo se comprueba antes de
iniciar los servidores. Doce regresiones verifican estas protecciones, incluidos
alias `LOCALHOST` y `localhost.` de la base runtime.

Se necesita el backend compilado en el worktree autorizado, las migraciones
compatibles aplicadas únicamente al clúster sintético y los puertos 3000/4000
libres. `EVRY_BACKEND_ROOT` identifica el checkout local; no existe reutilización
de servidores. El runner propio carga los mismos módulos compilados y guards de
Nest, escucha explícitamente en `127.0.0.1:4000` y comprueba la dirección real del
listener. No se debe apuntar este ensayo a una base real, aunque sea local.

La entrada inicial usa el formulario real. Cada visita posterior abre un contexto
aislado con la cookie HttpOnly vigente conservada únicamente en memoria. Se
exige la secuencia real `GET /users/me → 401`, `POST /auth/refresh → 200`,
`GET /users/me → 200`; cualquier otro error HTTP falla. El transporte cancela
intencionalmente el cuerpo de ese primer 401 antes de refrescar; se reconoce solo
la solicitud que recibió ese 401, conservando la obligación del reintento exitoso.
No se desactivan guards,
rotación o límites de frecuencia: hay una pausa de siete segundos entre visitas.
El anunciador accesible oculto de Next no cuenta como error de la aplicación;
los demás elementos `role=alert` siguen prohibidos durante el recorrido exitoso.

Inicio, perfil, progreso/detalle/historial, rutinas, sesión activa y ciclo tienen
tres visitas directas por perfil y acciones reales. La serie adicional se crea
y elimina mediante interfaz; las cuentas y las series fuente se conservan. Los
informes incluyen respuestas HTTP por método/ruta/estado y métricas parciales
también ante fallos, nunca cookies, credenciales, tokens o cuerpos de respuesta.
Se guardan en `.worktrees/web-auth-performance-<timestamp>-<uuid>/results.json`.
También se rechazan fallos HTTP del frontend y fallos de transporte. Las
cancelaciones GET `net::ERR_ABORTED` al finalizar el documento, o de prefetch RSC
identificado también por `next-router-prefetch: 1`,
se registran por separado como cancelaciones de ciclo de vida, no como éxitos HTTP.
Los adjuntos incluyen desplazamientos reales con geometría/clases de los nodos,
sin texto de usuario, para investigar CLS sin alterar los valores del observador.

El ensayo pasó en ambos perfiles y se preparó su paso de CI con informes JSON.
Ese paso no se ha publicado ni ejecutado remotamente. No demuestra confianza
estadística, red/CPU limitada, navegación SPA ni
rendimiento nativo. Un fallo de presupuesto es evidencia pendiente de resolver,
no una razón para elevar los límites del plan.

El primer recorrido completo de las seis pantallas pasó una visita por pantalla,
pero la segunda visita a Inicio falló con CLS `0,19551432291666665`. El informe
fallido se conserva en
`.worktrees/web-auth-performance-1791042930137-ec3d1529-53fc-4dd1-9891-4f8227141d42/results.json`.
Una ejecución diagnóstica posterior, ya con API restringida a loopback, reprodujo
el mismo CLS y mostró la frase y métricas moviéndose 78 px hacia arriba al retirar
el aviso de carga. El ajuste mantiene el aviso visible y accesible fuera del
flujo, sin capturar clics. Otra visita mostró tarjetas moviéndose horizontalmente
al aparecer dos métricas anteriores: ahora hay posiciones estables y altura
mínima de 150 px, sin datos ficticios en los esqueletos. Se eliminó el transform
de entrada del contenedor de Inicio para no alterar la referencia del aviso fijo.

El primer recorrido de escritorio pasó 18 visitas, pero ciclo móvil falló con
CLS `0,1439711370986131`: el formulario bajaba 194 px al aparecer la fase. El
panel reserva ahora 240 px durante carga, fase e información insuficiente; el
contenido puede crecer y no se inventa una estimación si falta contexto.

La ejecución final pasó ambos casos completos (36 visitas: seis pantallas × tres
repeticiones × dos perfiles), sin flaky, omisiones ni fallos, en 351,7 s. Informe:
`.worktrees/web-auth-performance-1791044156936-0dbdd7ae-1a77-4324-9183-45c719766e98/results.json`.
Build `ZEOB-VW766-LsE_gmeTqu`, Next.js 16.3.8, Chromium 151.0.7922.34.
Escritorio: LCP 468–796 ms, INP 16–88 ms y CLS 0–0,0336261.
Pixel 5 emulado: LCP 436–624 ms, INP 24–72 ms y CLS 0 en estas 18 visitas.
No hubo otra suite concurrente durante este ensayo autenticado. Se verificaron
flags HttpOnly/ruta/SameSite y cambio de valor de cada cookie rotada mediante
booleanos: ningún valor de cookie fue adjuntado. Las cuentas fuente se conservan.

La revisión independiente no encontró hallazgos críticos/importantes pendientes.
Se difieren adjuntos detallados para fallos durante preparación/login: el informe
general sigue registrando esos fallos. No se aceptan globalmente todos los tamaños,
zoom o textos de longitud arbitraria a partir de estos dos perfiles.

## Evidencia local del 3 de octubre

El baseline previo reprodujo visitas visibles con `first-paint` pero sin FCP o
LCP; el evaluador las rechazó. Una prueba separada pausó la animación CSS real
al inicio y reprodujo que la tarjeta tenía opacidad cero. Se eliminaron únicamente
las propiedades de opacidad de `rise-in`, manteniendo el desplazamiento y escala.
El [algoritmo de LCP](https://web.dev/articles/lcp) excluye elementos totalmente
transparentes: no se debe resolver este problema inventando una métrica.

Tras recompilar, Playwright pasó 12/12 en 31,4 s: seis regresiones de legibilidad
y seis visitas medidas, sin casos omitidos ni flaky. Informe conservado:
`.worktrees/web-performance-1791040744041-7cdaebf4-a7fd-481b-9816-9598f1536b9f/results.json`.
Build `NHbBVjEAwiEU2FGNq1hsA`, Next.js 16.3.8, Chromium 151.0.7922.34. Las visitas
observadas dieron LCP 164–204 ms, INP 32–48 ms y CLS 0–0,0000331. Son rangos de
estas seis visitas, no percentiles o intervalos de confianza. Hubo una suite
unitaria concurrente en el mismo equipo; el ensayo no prueba un presupuesto de
dispositivos reales ni permite estimar una mejora porcentual respecto al baseline
con métricas incompletas. Los informes de los ensayos fallidos posteriores a la
introducción de directorios únicos también se conservan.

El paso de CI y la retención de informes JSON están preparados localmente. No se
han publicado ni ejecutado en GitHub por el bloqueo de auditoría documentado en
`implementation-status.md`; una configuración escrita no equivale a CI verde.
