# EVRY — Informe integral de estado, trabajo realizado y continuidad

**Fecha de corte: 7 de noviembre de 2026, zona America/Bogota.**

**Propietario:** Gabriel Cano.  
**Frontend:** <https://github.com/GabrielCano22/EVRY>  
**Backend:** <https://github.com/GabrielCano22/EVRY-Backend>  
**Rama de trabajo autorizada en ambos repositorios:** `codex/evry-optimization`.

Este documento reúne el estado técnico, funcional, operativo y de publicación del proyecto. Se apoya en el historial de esta conversación, archivos del proyecto, historial Git, documentación operativa, resultados JSON y registros de pruebas. Incluye fallos, experimentos descartados y tareas pendientes. No contiene contraseñas, tokens, claves de firma ni cadenas privadas de conexión.

Es una fotografía del proyecto, no una certificación de finalización. Las observaciones físicas corresponden a su fecha de ejecución. Consultar un informe guardado no equivale a volver a ejecutar la prueba hoy. Los procesos, la conexión USB y el bloqueo del teléfono pueden cambiar entre sesiones.

## Índice

1. [Situación real y alcance actual](#1-situación-real-y-alcance-actual)
2. [Decisiones, autorizaciones y cambios de prioridad](#2-decisiones-autorizaciones-y-cambios-de-prioridad)
3. [Arquitectura y ubicaciones de trabajo](#3-arquitectura-y-ubicaciones-de-trabajo)
4. [Trabajo realizado en el backend](#4-trabajo-realizado-en-el-backend)
5. [Trabajo realizado en la web](#5-trabajo-realizado-en-la-web)
6. [Trabajo realizado en Android](#6-trabajo-realizado-en-android)
7. [Contrato compartido y paquetes comunes](#7-contrato-compartido-y-paquetes-comunes)
8. [Datos, migraciones y recuperación](#8-datos-migraciones-y-recuperación)
9. [Infraestructura local y herramientas](#9-infraestructura-local-y-herramientas)
10. [Pruebas y evidencia de aceptación](#10-pruebas-y-evidencia-de-aceptación)
11. [Trabajo en curso y último fallo confirmado](#11-trabajo-en-curso-y-último-fallo-confirmado)
12. [Complicaciones y errores encontrados](#12-complicaciones-y-errores-encontrados)
13. [Rendimiento y seguridad pendientes](#13-rendimiento-y-seguridad-pendientes)
14. [GitHub, commits, pushes y PR](#14-github-commits-pushes-y-pr)
15. [Balance frente al plan original](#15-balance-frente-al-plan-original)
16. [Plan de continuidad y cierre](#16-plan-de-continuidad-y-cierre)
17. [Dependencias de intervención del propietario](#17-dependencias-de-intervención-del-propietario)
18. [Estimaciones y causas de la duración](#18-estimaciones-y-causas-de-la-duración)
19. [Riesgos futuros y decisiones técnicas](#19-riesgos-futuros-y-decisiones-técnicas)
20. [Inventario de evidencia y guía de relevo](#20-inventario-de-evidencia-y-guía-de-relevo)
21. [Glosario de estados](#21-glosario-de-estados)
22. Anexos de cambios locales e historial Git.

## 1. Situación real y alcance actual

EVRY ya tiene una base funcional considerable. Existe backend modular, aplicación web en monorepo y una APK privada Android instalada en el OPPO A54. Se han verificado recorridos conectados, almacenamiento offline, reapertura, sincronización, conflictos y conservación de datos. Todavía no está cerrado el plan integral ni aprobada toda la matriz de aceptación.

La prioridad humana más reciente es **una sola aplicación Android**, sin seguir creando instalaciones paralelas y sin trabajar todavía en rediseños de UX. La web conserva el trabajo acumulado y sus pendientes. iOS está diferido. Este informe no cambia esas prioridades.

| Área | Estado al corte | Límite de la afirmación |
|---|---|---|
| Backend | Implementado, publicado hasta `fc6afb3`, checkout limpio | La última CI verificada es histórica. No se volvió a ejecutar toda la suite para escribir este documento |
| Web | Implementación amplia y builds locales exitosos | Rendimiento controlado autenticado pendiente. Numerosos cambios locales sin publicar |
| Android instalado | EVRY Local `1.0.1-local`, código 2 | El último control físico es del 6 de noviembre. Depende de la API local y del enlace USB |
| Android offline | Recorridos reales y pruebas SQLite disponibles | No todos los conflictos se han repetido físicamente en la última APK |
| Expo 58 | Candidata aislada con calidad general verde | Una integración móvil/PostgreSQL falló. No está promovida ni instalada |
| iPhone | Código y exports históricos | Aceptación física y distribución diferidas |
| Despliegue | Preparación local y documentación | No hay despliegue de EVRY acreditado por estas evidencias |
| GitHub frontend | Rama remota detrás del trabajo local | Push pendiente de comprobaciones relevantes, sin ocultar fallos |
| Datos | Preservación y ensayos de recuperación documentados | No se acredita una migración completa de toda base personal original |

**Resultado utilizable actual:** una app Android privada capaz de trabajar con la API local y conservar entrenamiento sin red. **Resultado todavía pendiente:** una entrega única, reproducible, publicada en GitHub con sus puertas completas aprobadas y aceptación Android terminada. Tampoco se ha completado la aceptación web del plan original.

## 2. Decisiones, autorizaciones y cambios de prioridad

### 2.1 Objetivo de partida

El plan original definió una aplicación personal y privada de seguimiento de fuerza, con web responsive, Android instalable e iPhone mediante Expo Go. Mantendría autenticación, rutinas, entrenamiento, catálogo, progreso, readiness, ciclo opcional y perfil. Exigió datos conservados, contrato único, sesiones offline, pruebas automatizadas y operación verificable.

La propuesta inicial estimaba 10–12 semanas con tres personas o 12–14 con dos. Esa estimación no era un plazo contractual para una sola sesión automatizada ni una medición del esfuerzo real ejecutado.

### 2.2 Reglas establecidas por el propietario

- Hacer commits pequeños y coherentes con avances verificables.
- Realizar al menos un push diario cuando existan avances listos, con autorización permanente para esos pushes.
- Gestionar también la creación o actualización de los PR. El propietario no tiene que hacerlos por el agente.
- Ejecutar las comprobaciones equivalentes a CI antes de subir.
- No subir otro checkpoint con una comprobación relevante que se sabe fallida.
- No crear commits vacíos ni desactivar pruebas para aparentar éxito.
- Diferenciar push exitoso de CI exitosa y comprobar Actions después de publicar.
- Mantener mensajes breves y reservarlos para resultados importantes, problemas accionables o cierre verificado.
- Trabajar en D:, fuera de OneDrive, con herramientas y cachés locales allí.
- Preservar los originales y todos los datos existentes.
- Evitar solicitudes repetidas de autorización para acciones ya autorizadas.

La exigencia de push diario y la prohibición de publicar con puertas relevantes rojas entran en tensión cuando los fallos duran varios días. El resultado real fue conservar bastante trabajo local. Esto no cumple una cadencia diaria de entregas y constituye una deuda de proceso que debe corregirse mediante unidades de trabajo más pequeñas y verificables, sin ocultar los fallos.

### 2.3 Evolución del alcance

1. Se inició con web, backend y móvil en paralelo funcional.
2. El propietario pidió priorizar web y APK y posponer iOS.
3. En un momento autorizó avanzar con Vercel.
4. Instrucciones posteriores de los checkpoints volvieron a exigir autorización explícita nueva antes de desplegar o crear recursos externos.
5. Posteriormente pidió concentrarse en terminar la web.
6. Ante bloqueos de esa etapa, aceptó avanzar en Android sin entrar en UX.
7. La instrucción humana más reciente sobre producto fue dejar una sola app. Se consolidó EVRY Local y se deshabilitaron las instalaciones de prueba, conservando sus datos.

### 2.4 Política operativa vigente

El trabajo local, compilación, pruebas, commits, pushes y gestión de PR están autorizados dentro del alcance indicado. No se interpreta la autorización general de continuar como permiso nuevo para despliegues, bases remotas, dominios, suscripciones o compras.

Render y Cloudflare están excluidos. Si se autoriza un despliegue posterior, será en Vercel. Antes habrá que verificar configuración, persistencia PostgreSQL, medios, límites y recuperación. No se ha comprado una licencia ni contratado un servicio como parte de las evidencias de este informe.

## 3. Arquitectura y ubicaciones de trabajo

### 3.1 Estructura actual

```text
D:/DatosPC/EVRY/
├── frontend/
│   ├── apps/web/                 Next.js
│   ├── apps/mobile/              Expo y React Native
│   ├── packages/api-client/      OpenAPI, tipos y cliente
│   ├── packages/domain/          Reglas y utilidades puras
│   ├── packages/design-tokens/   Tokens visuales
│   ├── scripts/                  Contratos y ejecutores seguros
│   ├── docs/operations/          Estado y procedimientos
│   └── .worktrees/               Evidencias y candidatos locales ignorados
└── backend/
    ├── src/modules/              Dominios NestJS
    ├── src/common/               Seguridad y utilidades comunes
    ├── src/health/               Salud de proceso y base
    ├── prisma/                   Modelo y migraciones
    ├── openapi/                  Contrato generado
    ├── test/                     Integración, migraciones y rendimiento
    ├── scripts/                  Herramientas y verificaciones
    ├── docs/operations/          Operación y recuperación
    └── .worktrees/               Runtime y bases sintéticas separadas
```

La carpeta de inicio visible en la aplicación puede seguir apuntando al clon original bajo OneDrive. Los trabajos descritos se realizan en las copias autorizadas `D:/DatosPC/EVRY/frontend` y `D:/DatosPC/EVRY/backend`.

### 3.2 Versiones observadas

| Componente | Fuente principal | Candidata aislada |
|---|---|---|
| Node | 24.14.x exigido | Misma línea |
| npm | 11.x, gestor declarado 11.9.0 | Misma línea |
| Next.js | Línea 16, build reciente 16.4.3 en candidata | 16.4.3 |
| NestJS | 12.0.1, Config/Passport 12.0.0 | Mismo backend |
| Prisma | Línea 7, manifiesto `^7.10.0` | Mismo backend |
| Expo | `~57.0.27` en manifiesto principal | `~58.0.23` |
| Expo Router | `~57.0.25` | `~58.0.30` |
| React Native | 0.86.3 | 0.88.1 |
| React | 19.2.3 | 19.3.0 |
| Jest móvil | 29.7 | 30.5.2 |
| Estado remoto | TanStack Query | Conservado |
| Estado temporal | Zustand | Conservado |
| Persistencia móvil | SQLite y SecureStore | Conservada, pendiente de validación nativa SDK 58 |

No debe confundirse el manifiesto de la candidata con lo que está instalado en el OPPO. El teléfono sigue usando el APK verificado anterior a la promoción de SDK 58.

### 3.3 Decisiones arquitectónicas conservadas

- NestJS sigue siendo un monolito modular.
- Web y móvil comparten contratos, reglas y tokens.
- Los componentes visuales DOM y React Native siguen separados.
- No se introdujeron microservicios, Redis, comunidad, pagos ni servicios de salud.
- SQLite conserva los datos operativos del entrenamiento offline.
- PostgreSQL es la fuente canónica del servidor.
- Las migraciones y pruebas se separan de los datos que deben conservarse.

## 4. Trabajo realizado en el backend

### 4.1 Configuración, transporte y errores

Se implementó API versionada bajo `/api/v1`, manteniendo compatibilidad temporal con rutas anteriores. Se añadieron comprobaciones de entorno obligatorio, secretos y vigencias JWT. La configuración inválida debe impedir el arranque en lugar de usar silenciosamente un secreto inseguro.

Se normalizaron errores para incluir código, mensaje, errores de campo cuando correspondan, posibilidad de reintento e identificador de solicitud. Se añadieron salud de proceso y readiness de base. Los errores de infraestructura no se deben traducir en métricas cero o listas vacías.

El listener puede limitarse expresamente a una interfaz local. Se preparó configuración compatible con Vercel, pero esa preparación no implica que la API esté alojada allí.

### 4.2 Autenticación web

- Login, registro, refresh y logout documentados en contrato.
- Access token del navegador en memoria.
- Refresh mediante cookie protegida, con validaciones de origen y atributos según entorno.
- Rotación y gestión de familias de refresh.
- Rechazo de cookies malformadas antes del procesamiento del token.
- Validación estricta de las vigencias JWT al iniciar.
- Protección frente a restauraciones y respuestas tardías que pertenezcan a una sesión anterior.

El trabajo de cookies tuvo checkpoint publicado, incluido `af9de45` del 7 de octubre. No se debe interpretar el paso de unitarias como prueba de todos los navegadores o configuraciones futuras de dominios.

### 4.3 Autenticación móvil

- Rutas separadas de registro, login, refresh y logout móvil.
- Refresh token rotativo destinado a SecureStore.
- Detección de reutilización y revocación de familia.
- Registro nativo que devuelve la sesión móvil correspondiente.
- Límites de entrada y tratamiento de errores estructurados.
- Validación del límite de contraseña de bcrypt por bytes UTF-8, no solo por número de caracteres.

### 4.4 Límites de frecuencia compartidos

Se detectó que un contador por proceso permitía multiplicar o reiniciar cuotas al usar varias instancias. Se sustituyó por almacenamiento PostgreSQL con actualización atómica.

En la configuración documentada se conservan ventanas de 60 segundos con límites de registro 3, login 5, refresh 10 y rutas generales 100. Se verifica concurrencia HTTP real entre aplicaciones independientes. Las claves almacenadas son hashes, sin guardar direcciones IP en claro, emails ni tokens para este mecanismo.

Se solucionaron dos defectos adicionales de `Retry-After`: pérdida de precisión al guardar vencimientos y cálculo del tiempo antes de una espera de bloqueo. La migración de microsegundos conserva los buckets existentes. No se recortó artificialmente la respuesta a 60 ni se desactivó el guard para pasar pruebas.

La limpieza elimina cuotas vencidas de forma acotada, preservando cuotas activas. El mecanismo falla cerrado cuando la base no permite aplicar el límite.

### 4.5 Rutinas

- Alta, consulta, edición y borrado con DTO y límites de tamaño.
- Reemplazo transaccional de los ejercicios.
- Validación de propiedad y disponibilidad de ejercicios.
- Rechazo de ejercicios duplicados y órdenes incompatibles.
- Posibilidad de limpiar notas explícitamente.
- Inicio de entrenamiento desde rutina con protección de sesión activa única.

### 4.6 Sesiones y series

- Ciclo de vida `ACTIVE`, `COMPLETED` y `CANCELLED`.
- Inicio único por usuario, con protección en aplicación y base.
- Alta, edición y eliminación de series.
- Rechazo de cambios históricos inapropiados.
- Finalización atómica e idempotencia de operaciones repetidas.
- Estadísticas derivadas de series fuente.
- Revisiones coherentes al mutar series mediante REST.
- Identificadores de cliente e identificadores de mutación para evitar duplicación.

Se corrigió que una instantánea móvil antigua pudiera recrear una serie eliminada por REST. También se corrigió el cálculo de orden después de eliminar una serie intermedia. El siguiente orden se deriva del máximo existente, evitando reutilizaciones accidentales.

### 4.7 Sincronización y adopción entre clientes

`POST /api/v1/sync/workouts` aplica sincronización transaccional por UUID y revisión. Un reintento del mismo lote no debe duplicar sesiones, series ni estadísticas. Los conflictos devuelven la versión canónica para revisión.

Se añadió `POST /api/v1/workouts/:id/adopt` para continuar desde móvil una sesión creada en web que todavía no tenía identidades de cliente. Solo admite una sesión activa y propia. Asigna los UUID que falten, conserva IDs y contenido existentes y aumenta las revisiones afectadas. Repetir la adopción no vuelve a cambiarlas.

La adopción no mezcla automáticamente el borrador rechazado con el entrenamiento del servidor. El cliente debe conservar la versión local si falla la preparación remota.

### 4.8 Progreso y estadísticas

- Resumen por periodos y comparación real con el periodo anterior equivalente.
- Actividad mensual agregada para calendario.
- Historial paginado por cursor de fecha e ID.
- Evolución por ejercicio con máximo de 120 intervalos cronológicos.
- Consultas agregadas SQL en lugar de cargar todo el historial con sus series en memoria.
- Exclusión de calentamientos y datos no útiles según la métrica.
- Eliminación de expansión y deduplicación innecesaria de filas antes de paginar mediante consultas `EXISTS`.

Se detectó una diferencia de aritmética entre SQL `numeric` y JavaScript binary64 en el cálculo de e1RM. Se alineó la división en doble precisión y se añadió una migración compatible de reparación de los campos derivados. Se conserva el redondeo de presentación, sin usarlo para decidir el récord fuente.

### 4.9 Readiness

- Un registro por usuario y fecha civil.
- Upsert diario y serialización de actualizaciones concurrentes.
- Campos omitidos conservan su valor.
- `null` explícito limpia una respuesta.
- La puntuación se calcula con los datos combinados y conservados.
- Se corrigió el uso de valores predeterminados que podía producir una puntuación incoherente en actualizaciones parciales.

### 4.10 Ciclo y recomendaciones

- Seguimiento voluntario, independiente del sexo del perfil.
- Alta, consulta, calendario y borrado de entradas.
- Validación de rangos, fechas futuras y fechas civiles.
- Protección contra sobrescribir otra entrada al mover una fecha.
- Contexto diario sin datos representado de manera explícita.
- Recomendaciones conservadoras con `HOLD`, progresión apoyada en sesiones comparables y descarga ante dificultad o fatiga repetida.
- Sin afirmaciones de certeza fisiológica ni multiplicador automático de carga por fase.

### 4.11 Estado de entrega del backend

El commit local y la rama remota de optimización coinciden en `fc6afb3b58aaaa0c850961bf0305d4cb3560b020`. El checkout está limpio al corte de este informe. La última evidencia registrada indica CI de push y PR satisfactoria con sus 23 pasos completos y PR 18 actualizado, sin merge en ese checkpoint.

Esta sesión verificó la referencia remota mediante Git, pero no volvió a consultar todos los resultados actuales de Actions ni el estado vivo del PR. No se atribuye una nueva CI a este documento.

## 5. Trabajo realizado en la web

### 5.1 Organización y contratos

La aplicación Next.js se trasladó a `apps/web` dentro del monorepo. Los dominios de autenticación, perfil, rutinas, entrenamiento, catálogo, progreso, ciclo y readiness consumen operaciones y tipos derivados de OpenAPI.

Se separaron límites de transporte y lógica de pantalla. Las consultas usan TanStack Query con claves por cuenta y contexto, cancelación y actualización dirigida de caché.

### 5.2 Sesión y autenticación

- Se retiró la persistencia del access token en `localStorage` del diseño de autenticación actual.
- Restauración mediante refresh y consulta de usuario con coordinación de peticiones concurrentes.
- Protección frente a login, logout o cambio de cuenta mientras hay respuestas pendientes.
- Logout local inmediato, con manejo separado del fallo remoto.
- Formularios con mensajes por campo y confirmación del resultado canónico.
- Preparación temprana de restauración al cargar un documento, reutilizada durante hidratación.
- Pruebas de que el HTML del servidor no expone contenido privado.

Se ensayó un camino rápido adicional para un layout con restauración ya resuelta. No justificó su permanencia por resultados de rendimiento y se retiró. Permanecieron las regresiones sobre el layout real, sin conservar el experimento de producción.

### 5.3 Inicio y calendario

Inicio usa el resumen canónico generado. Las sesiones, volumen, racha y comparaciones no se reconstruyen descargando cientos de sesiones. Se eliminó la meta artificial de `sesiones + 1` a favor del periodo anterior real.

El calendario consulta el mes visible, con actividad agregada y ciclo solo con consentimiento. Se conservaron fechas civiles de Bogotá y se redujo la creación repetida de formateadores. No hay caché global de datos personales para obtener esa optimización.

### 5.4 Entrenamiento, rutinas e historial

- Flujo de rutinas y sesión activa integrado con el contrato generado.
- Estados de guardado y errores sin navegación prematura.
- Controles de series con nombres accesibles separados para carga, repeticiones y esfuerzo.
- Historial con paginación accesible para llegar a sesiones antiguas.
- Preparación de etiquetas y volúmenes fuera de interacciones repetidas, conservando resultados y exclusiones.
- Pruebas E2E de finalización y paginación con datos sintéticos.

### 5.5 Ficha transversal de ejercicio

- Marco accesible de panel y recuperación de foco al cerrar.
- Separación de consultar detalle y añadir ejercicio.
- Contenido, actividad, mapa y gráfica cargados de forma diferida.
- Estados distintos para carga pendiente, fallo del módulo y fallo de datos.
- Reintentar un módulo no desmonta toda la aplicación.
- Una gráfica que falla no elimina métricas o historial disponibles.
- Respuestas tardías no reemplazan el ejercicio actualmente seleccionado.
- Ausencia de datos representables evita cargar gráficas que no aportan información.

### 5.6 Perfil, readiness y ciclo

- Perfil con campos soportados por API y respuesta canónica de guardado.
- Readiness compartido entre formulario y métrica de Inicio.
- Distinción entre omitir y limpiar valores.
- Uso de fecha civil en lugar de conversiones horarias ambiguas.
- Ciclo voluntario en registro, perfil, navegación y acceso directo.
- Al desactivar seguimiento o cambiar cuenta se desmonta el formulario y se descartan respuestas de la vista anterior.
- Entradas del ciclo editables y eliminables con errores visibles.

### 5.7 Accesibilidad y recursos

- Iconos SVG locales, incluyendo equivalencias que antes mostraban un símbolo genérico.
- Pruebas axe sobre superficies reales de autenticación y navegación.
- Nombre accesible para el enlace móvil de perfil.
- Asociación de errores a los campos compartidos.
- Controles semánticos en los escenarios E2E.
- Recursos y cargas diferidas para evitar descargar visualizaciones innecesarias al entrar.

La cobertura automatizada no certifica por sí sola lector de pantalla real, zoom al 200%, contraste completo, toda navegación de teclado o movimiento reducido en cada pantalla. Esas comprobaciones siguen en la matriz final.

### 5.8 Situación web pendiente

Los builds locales han pasado, incluidos builds de producción recientes. Hay evidencia histórica de E2E funcionales completos. Sin embargo, la medición autenticada con CPU y red controladas sigue incumpliendo principalmente LCP. No se ha aceptado el presupuesto web ni desplegado una versión acreditada por este trabajo.

El arranque de un servidor Next local fue rechazado por la herramienta en una etapa anterior. No se eludió con otro puerto o lanzador. La compilación posterior es evidencia distinta y sí se pudo ejecutar. Antes de una nueva medición debe comprobarse la condición actual, sin tratar un rechazo antiguo como un bloqueo eterno o como permiso para sortearlo.

La UX queda diferida para trabajo conjunto con el propietario.

## 6. Trabajo realizado en Android

### 6.1 App y navegación

Expo Router organiza Inicio, Entrenar, Progreso, Ciclo condicional y Perfil. Se implementaron autenticación y registro nativo, consulta de catálogo, rutinas, entrenamiento, progreso, readiness, perfil y ciclo voluntario.

No se obliga a React Native a reutilizar componentes DOM. Los paquetes compartidos aportan contrato y reglas.

### 6.2 Almacenamiento y aislamiento

- SQLite conserva sesión activa, series, cola y mapeo de identidades.
- Datos aislados por cuenta y origen de API.
- Catálogo y rutinas cacheados para uso sin red.
- Escrituras serializadas y transacciones en cambios relacionados.
- Confirmación de guardado solo después de la escritura durable.
- Reapertura con recuperación desde SQLite.
- Errores de apertura liberan recursos fallidos para permitir un reintento válido.
- Datos locales dañados conservados para revisión en lugar de borrados automáticamente.

### 6.3 Finalización y navegación seguras

Se corrigió que la UI liberara la sesión mientras SQLite seguía guardando la finalización. Ahora se espera la persistencia, se bloquean operaciones incompatibles y un error conserva o restaura la sesión para reintentar.

La confirmación háptica ocurre después del guardado y solo para la cuenta vigente. Si la háptica falla no revierte el entrenamiento. También se protegieron el segundo toque, el cambio de cuenta y respuestas tardías durante guardados.

### 6.4 Series, descanso y recomendaciones

- Edición de cargas, repeticiones, esfuerzo, técnica y campos temporales soportados.
- Temporizador de descanso persistente y reglas compartidas de cálculo.
- Recomendaciones de entrenamiento apoyadas en el contrato adaptativo.
- Estados explicables cuando faltan datos para recomendar una carga.
- Uso del readiness del mismo día civil.

### 6.5 Sincronización

- Coordinación al abrir, volver al primer plano y recuperar conectividad.
- Reintentos persistentes con identidad estable de lote.
- Distinción entre dato guardado localmente, envío pendiente, sincronizado y conflicto.
- Recuperación cuando el servidor aplicó el lote pero se perdió la respuesta.
- Protección frente a respuestas de cuentas o versiones antiguas.
- Conservación de borrador cuando existe otra sesión activa.
- Adopción explícita de sesión del servidor.
- Comparación del estado antes y después de la espera de red para no sobrescribir una edición local más reciente.

No se mantienen transacciones SQLite abiertas durante la petición de red. La comparación y la sustitución local se hacen bajo las transacciones necesarias antes o después de esa espera.

### 6.6 Corrección reciente de colisión de borradores

El recorrido de conservar local como borrador, recuperar como nuevo y después continuar la sesión del servidor encontró `UNIQUE constraint failed: workouts.client_id`.

La sesión canónica ya existía como copia local cancelada. La corrección permite reutilizarla solo si está cancelada, sincronizada, corresponde al mismo ID de servidor, no tiene revisión superior y no tiene trabajo pendiente en cola. Las comprobaciones y la sustitución son transaccionales.

Se añadieron seis regresiones con SQLite real, con un caso válido y cinco casos de preservación. El archivo completo pasó 47 pruebas. La corrección está incluida en la APK actual. Falta repetir el recorrido físico exacto en esa APK, sin crear otra aplicación.

### 6.7 Catálogo y medios

- Búsqueda y paginación acotadas.
- JPG en listas y GIF solo al pedir reproducción.
- Caché de miniaturas visitadas de 20 MiB por cuenta y origen.
- Índice SQLite y expulsión LRU de archivos.
- Reconciliación de archivos ausentes o parciales al reabrir.
- Un fallo de expulsión conserva el estado recuperable.
- Sin descarga masiva del catálogo multimedia.

### 6.8 APK actualmente instalada

| Campo | Evidencia del último control |
|---|---|
| Dispositivo | OPPO A54, CPH2239, Android 11, arm64 |
| Paquete | `com.gabrielcano.evry.local` |
| Versión instalada | `1.0.1-local` |
| Código de versión | 2 |
| Fecha de actualización verificada | 6 de noviembre de 2026 |
| Tamaño de archivo verificado | 35.777.287 bytes |
| SHA-256 | `6b244e0949fbf23db66db9fab92f24055bd82fe3b783dd2794f32d356b6473df` |
| Firma | Privada, misma identidad que la instalación anterior |
| API integrada | `https://localhost:4447/api/v1` |
| HTTP sin cifrar | Deshabilitado |
| Confianza adicional | Limitada a localhost con CA privada de este entorno |
| Perfilado de diagnóstico | Deshabilitado en el artefacto verificado |
| Actualización | Sobre la misma app, preservando UID y fecha inicial de instalación |

Archivo conservado:

`D:/DatosPC/EVRY/frontend/.worktrees/mobile-recovery-collision-20261024/evry-local-6b244e0949fb.apk`.

El informe de verificación del artefacto contiene `installed: false` porque fue emitido **antes** de instalarlo. El informe posterior `local-installation.verification.json` sí verifica el hash instalado y la continuidad de identidad. Es una secuencia temporal, no dos estados simultáneos.

### 6.9 Consolidación en una sola aplicación

Se habían generado instalaciones aisladas para validar contratos, TLS, pérdida de respuesta y conflictos sin afectar el entorno local. El propietario pidió detener esa multiplicación.

El 6 de noviembre se comprobó la identidad y se deshabilitaron las cuatro instalaciones adicionales, incluida la original y las variantes de validación. Se conservaron sus datos. EVRY Local quedó como única instalación EVRY habilitada.

La fuente principal `app.json` y la candidata quedaron alineadas con el paquete `.local`, versión `1.0.1` y código 2. Se añadió una prueba que evita volver accidentalmente al paquete original o a un código de versión inferior al mínimo actual. Las actualizaciones futuras deben mantener paquete y firma e incrementar el código de versión cuando corresponda.

### 6.10 Limitación práctica del modo local

La APK instalada no necesita Metro para cargar su código, pero el acceso al servidor actual usa el PC y el enlace USB del puerto 4447. Fuera de esa conexión, el entrenamiento offline es útil, pero las operaciones que requieren servidor y la sincronización esperan conectividad con la API configurada.

No existe todavía evidencia de una APK final configurada contra un backend remoto disponible desde cualquier red. Para ello falta autorización vigente de despliegue, configuración remota y un nuevo artefacto verificado.

## 7. Contrato compartido y paquetes comunes

### 7.1 OpenAPI como fuente

El backend genera el documento OpenAPI y tipos. El frontend importa un contrato fijado a un commit, con hashes del documento y cliente. La verificación rechaza diferencias inesperadas, referencias externas y origen no permitido, y contempla normalización de saltos LF/CRLF.

Referencia local actual del frontend:

```text
Backend: fc6afb3b58aaaa0c850961bf0305d4cb3560b020
Documento: e4718fd9b3152cc59c53c820ce5b35c24e22425389e91650af550ce551ce5328
Cliente: 945c170dcab42af7d5ffcda7f09ca1547067024e7d5bfac6493878ad79cf557c
```

Se han verificado 33 pruebas del ejecutor de contratos. En la candidata SDK 58 también pasó `api:verify-backend` contra el backend actual. El contrato fijado no se debe rebajar para resolver un conflicto de ramas que trae una referencia más antigua.

### 7.2 Dominio compartido

Incluye fechas civiles, formateo, límites de contraseña por bytes, reglas de descanso y otras utilidades puras. Estas reglas tienen pruebas independientes y evitan divergencias de comportamiento entre web y móvil.

### 7.3 Tokens

Colores y otros tokens se comparten mediante paquete propio. Esto no equivale a que esté cerrada la revisión visual o que las interfaces web y Android deban ser idénticas.

## 8. Datos, migraciones y recuperación

### 8.1 Principios aplicados

- No reiniciar ni limpiar la base que debe conservarse.
- No usar las credenciales del runtime como fixture de integración.
- No restaurar un respaldo encima de la única copia disponible.
- Ensayar migraciones con datos sintéticos y validar inventarios.
- Conservar los casos fallidos para análisis.
- Comparar IDs, revisiones, conteos y campos relevantes después de operaciones físicas.

### 8.2 Modelo actual

El esquema contiene usuarios, refresh tokens, ejercicios, rutinas, ejercicios de rutina, sesiones, series, entradas de ciclo, estadísticas, readiness y cuotas de solicitudes. Hay índices por propietario, fecha, estado y filtros de catálogo, además de unicidades por UUID, orden y fecha civil según dominio.

La sesión activa única incluye protección parcial en SQL. Algunas migraciones históricas normalizan sesiones activas duplicadas conservando la más reciente y marcando otras como canceladas, sin borrar sesiones o series. Por eso aplicar migraciones a datos existentes requiere revisar impacto, no solo confirmar que no usan `DROP TABLE`.

### 8.3 Migraciones observadas

1. `20260426222535_init`.
2. `20260427210953_add_routines`.
3. `20260809120000_enrich_exercises`.
4. `20260813190000_add_routine_series_plan`.
5. `20260819090000_release_invariants`.
6. `20260819130000_exercise_stat_records`.
7. `20260829010000_offline_sync_expand`.
8. `20260829020000_refresh_token_families`.
9. `20261012010000_shared_rate_limits`.
10. `20261012020000_quota_microsecond_precision`.
11. `20261012030000_epley_binary64_records`.

La integración aislada más reciente aplicó las once satisfactoriamente antes de fallar en la aserción de progreso. El fallo posterior no convierte la migración en fallida.

### 8.4 Ensayos de respaldo

Se documentaron pruebas de migración poblada, respaldo y restauración sobre bases sintéticas. También se ensayó un `pg_dump` consistente mediante snapshot exportado del runtime local reservado y restauración en una base nueva, comparando doce tablas, columnas, restricciones e índices.

El snapshot de ese ensayo tenía 1.344 ejercicios y once migraciones, y todavía no tenía los entrenamientos creados después durante QA físico. No debe describirse como respaldo actualizado de las sesiones del 6 de noviembre. Hace falta un respaldo nuevo antes de cambios de datos que lo requieran.

### 8.5 Último inventario local documentado

Después de la actualización Android del 6 de noviembre se conservaron los mismos cuatro entrenamientos, dos completados y dos cancelados, tres series, una estadística, 1.344 ejercicios, una cuenta reservada, una rutina y un readiness. No había entradas de ciclo en ese inventario.

Es la base local usada en recorridos de aceptación con cuenta reservada. No se extrapola ese conteo a toda base personal original ni a un servidor remoto.

### 8.6 Incidente PostgreSQL de septiembre

El propietario mostró errores repetidos de `global/6100` ausente en un clúster temporal antiguo. El servidor aceptaba conexiones, pero el worker de replicación lógica fallaba repetidamente. Ese mensaje no era un estado saludable completo.

No hay en esta revisión prueba suficiente para afirmar la causa exacta, la integridad de todos los catálogos de ese clúster ni que se reparó aquel archivo. Las verificaciones posteriores se realizaron en entornos separados. No debe reconstruirse manualmente un archivo de catálogo ni reinicializar datos conservados como supuesta solución.

## 9. Infraestructura local y herramientas

### 9.1 Cambio fuera de OneDrive

Las copias autorizadas están en D: fuera de sincronización. Se conservaron los originales. Se preparó activación de herramientas y un lanzador que redirige temporales, cachés y directorios de datos de procesos a D:.

Herramientas principales:

- Node en `D:/node/node.exe`.
- Activación en `D:/DatosPC/Herramientas/EVRY-Android/activate.ps1`.
- Lanzador en `D:/DatosPC/Herramientas/EVRY-Android/node-on-d.mjs`.
- JDK, SDK Android y Gradle en ubicaciones autorizadas D:.
- Cachés cortas como `D:/EVRY-Gradle` y `D:/EVRY-Cxx/app` para límites de Windows.

Hubo lecturas de claves ADB preexistentes de C: para autorizar el dispositivo. No se deben confundir esas lecturas con permiso para instalar herramientas o generar nuevas claves allí. La política de trabajo sigue siendo escribir en D:.

### 9.2 Servicios locales

La configuración normal documentada usa PostgreSQL en loopback 55439 y API HTTPS en 4447, reutilizando el AppModule compilado y la base local conservada. Las pruebas usan bases distintas y puertos dedicados.

La sesión ADB privada se configuró en 5038 para no interferir con el daemon compartido 5037. El enlace de dispositivo redirige 4447 al puerto local del PC. Antes de operar se debe volver a comprobar identidad, ejecutable, listener y dispositivo autorizado. Los PID guardados no son identificadores permanentes.

### 9.3 TLS local

- Certificado de localhost con CA privada.
- Verificación de SAN y huellas.
- El cliente sin esa confianza adicional debe rechazarlo.
- El APK confía en esa CA de forma limitada al entorno local.
- No se deshabilitó globalmente la verificación TLS.
- No se instala esa CA como confianza general del sistema para resolver una prueba.

### 9.4 Límites de Windows nativo

Se encontraron rutas de encabezados y objetos C++ superiores a 260 caracteres. Acortar la caché no bastó porque Ninja conservaba rutas antiguas en su registro binario. Se archivaron únicamente artefactos generados identificados y se configuró un directorio CMake corto mediante init script opt-in.

El script preservado `scripts/windows-short-cxx.init.gradle` evita editar permanentemente archivos Android generados por Expo. El uso local no altera los builds que no lo seleccionan.

### 9.5 Rechazos y control de procesos

Hubo acciones de iniciar o cerrar servidores que la herramienta rechazó. En esos casos no se trató una alternativa técnica como permiso para eludir el rechazo. El propietario cerró una API antigua identificada por PID cuando fue necesario.

También hubo handles perdidos o stdin cerrado en procesos de prueba. Un timeout del controlador no se interpreta como prueba de que PostgreSQL está detenido. Se contrastan puerto, proceso y registro antes de reanudar o cerrar.

## 10. Pruebas y evidencia de aceptación

### 10.1 Qué se está verificando

Hay pruebas unitarias, componentes, accesibilidad automatizada, contratos, SQLite real en Node, integración HTTP/PostgreSQL, migraciones y recuperación, E2E de navegador, compilación y revisión de APK, y recorridos físicos.

Una prueba con SQLite real en Node verifica SQL y persistencia, pero no todas las condiciones del SQLite nativo Android. Un export Expo verifica generación de bundle, no instalación o memoria. Un build exitoso no demuestra que el servidor de API sea alcanzable.

### 10.2 Backend, último checkpoint registrado

La documentación de `fc6afb3` registra 510 unitarias y 104 casos HTTP/PostgreSQL, junto con comprobaciones de contrato, migración, build, lint y tipos. Registra además las dos CI completas de push y PR en verde.

Los benchmarks conservaron resultados adversos en entornos compartidos y resultados posteriores de 30/30 grupos en condiciones aisladas, sin cambiar presupuestos. No equivalen a latencia garantizada en despliegue.

### 10.3 Web, evidencia funcional histórica

- Runner E2E aislado con doce casos en cinco archivos, seis escritorio y seis móvil web, todos aprobados en el ensayo documentado del 17 de octubre.
- Cada grupo usa bases sintéticas independientes para evitar contaminación de cuotas.
- Pruebas de autenticación, historial, ciclo, readiness y finalización con datos reales del fixture.
- Auditorías axe automatizadas de formularios y navegación.
- Builds de producción locales satisfactorios.

Estos resultados pertenecen a las fuentes de sus respectivos ensayos. No se trasladan automáticamente a la candidata SDK 58 ni reemplazan una repetición final de las puertas afectadas.

### 10.4 Android físico

| Recorrido | Resultado registrado | Pendiente o límite |
|---|---|---|
| Instalar APK release y abrir | Verificado | No prueba todos los dominios |
| Actualizar misma app | Verificado el 6 de noviembre | Mantener firma, paquete y versión en futuras actualizaciones |
| Conservar sesión tras actualizar | Verificado | No representa todas las expiraciones de token |
| Login y catálogo | Verificado en recorridos locales | Acceso remoto sin USB no disponible |
| Crear, editar y completar serie | Verificado | Matriz completa de validaciones pendiente |
| Guardar perfil y readiness diario | Verificado | Cambios de día y concurrencia total requieren cierre de matriz |
| Crear/editar rutina | Verificado | Todas las combinaciones de borrado/errores no acreditadas físicamente |
| Activar, editar y borrar ciclo | Verificado con registro sintético | Lectores de pantalla y todas las fronteras de mes pendientes |
| Entrenamiento offline y reapertura | Verificado | Cobertura física parcial, no toda plataforma |
| Finalizar offline y reconectar | Verificado | Presupuestos de tiempo aún no aceptados |
| Repetir sincronización sin duplicar | Verificado | No confundir con todos los conflictos |
| Servidor aplica lote y pierde respuesta | Verificado en instalación QA anterior | Repetición final en app única deseable |
| Conflicto con segundo cliente de API | Verificado en QA anterior | No fueron dos teléfonos físicos |
| Continuar versión del servidor | Verificado en conflicto anterior | Recorrido posterior de borrador recuperado pendiente |
| Colisión de UUID de copia archivada | Corregida y probada con SQLite | Repetición física exacta en la APK actual pendiente |
| Maestro | Barreras de seguridad probadas | Suite física completa pendiente |
| Memoria y arranque | Mediciones parciales | Presupuestos sin aceptación |

### 10.5 Calidad de la candidata SDK 58, 6 de noviembre

La candidata está en `frontend/.worktrees/sdk58-audit-20261106` y conserva su propio lock e instalación. Después de corregir el entorno de ejecución de tests, la suite raíz terminó con salida cero.

| Grupo | Casos aprobados |
|---|---:|
| Barreras del ejecutor E2E | 39 |
| Jest móvil | 470 |
| Configuración nativa, Maestro y caché Metro | 8 |
| Unitarias web | 373 |
| Accesibilidad web | 10 |
| API client | 4 |
| Tokens | 2 |
| Dominio | 53 |
| **Total raíz** | **959** |

Comprobaciones adicionales, no sumadas de nuevo a ese total:

- 33 pruebas del ejecutor de contratos.
- 11 barreras del ejecutor de integración móvil/backend.
- `api:check` y `api:verify-backend` satisfactorios.
- Tipos y lint satisfactorios.
- Expo Doctor 20/20 en la fase alineada.
- Auditoría de umbral alto aprobada, con cero altas/críticas, 32 moderadas y una baja.
- Build Next.js 16.4.3 aprobado, doce páginas estáticas generadas.
- Export Android aprobado, 1.346 módulos y bundle Hermes aproximado de 3,3 MB.

Los resultados finales JSON registran el mismo SHA-256 de lock:

`2E5C2D8F2E40AEC691F320EE834F75869489DF86582E32E46AEFA8A5694D8A85`.

**La candidata no tiene aceptación completa.** Su integración posterior falló en progreso. No hay APK SDK 58 instalada ni medición nativa válida de esa candidata. Tampoco se ejecutó una CI remota nueva de ella.

## 11. Trabajo en curso y último fallo confirmado

### 11.1 Objetivo inmediato antes de este informe

Resolver las dependencias altas que bloquean la publicación del frontend sin forzar versiones incompatibles, desactivar pruebas o cambiar el umbral de seguridad. Después, verificar integración y nativo y publicar un checkpoint coherente.

### 11.2 Experimento SDK 57

Se probó una actualización compatible de Expo 57 y CLI. Redujo alertas, pero dejó tres altas en la cadena Router → `query-string` → decodificador. La candidata se conservó aislada y no se promovió.

### 11.3 Experimento SDK 58

La candidata actual elimina las altas/críticas conocidas en la auditoría ejecutada y conserva las funcionalidades en las pruebas generales. Para ello requirió alinear Expo, Router, React Native, React, módulos Expo, Reanimated/Worklets, Jest y tipos.

La resolución fresca del grafo produjo cambios amplios de lock. La comparación registrada frente al grafo SDK 57 encontró 419 rutas añadidas, 199 retiradas y 310 cambios de versión. Son rutas del árbol de dependencias, no funcionalidades añadidas. Debe revisarse ese alcance antes de promoverlo.

### 11.4 Compatibilidad de las herramientas de pruebas

1. Jest 30 empezó a descubrir suites `.cjs` que se ejecutaban por separado con Node. Se limitaron esos patrones en el descubrimiento de Jest conservando sus comandos posteriores y casos.
2. Expo Doctor detectó Jest y tipos de versiones anteriores. Se alinearon con la candidata.
3. Una instalación incremental perdió el shim Windows de Jest. Se reparó mediante rebuild y después una instalación limpia volvió a generar herramientas utilizables.
4. Playwright tenía dos versiones de `playwright-core`, incompatibles para los tipos que consume axe. La fijación compartida en la raíz a 1.62.1 alineó la resolución. Añadirlo solo a web no había bastado y esa modificación intermedia se retiró.

### 11.5 Última integración, resultado real

Se inició PostgreSQL nuevo y aislado en 55440, con autenticación SCRAM y credenciales sintéticas no expuestas, para ejecutar `npm run test:mobile:backend` desde SDK 58 contra `fc6afb3`.

El resultado guardado es **salida 1**, finalizado el 6 de noviembre a las 19:20:25 UTC, 14:20:25 de Bogotá. Las once migraciones se aplicaron. Antes del fallo se aprobaron cuatro grupos, con 4, 1, 1 y 2 casos respectivamente. En el grupo final de progreso pasó un caso y falló otro.

Fallo exacto:

- Archivo `apps/mobile/src/progress/backend-progress.contract.tsx`.
- Caso `changes both real overview and exercise history with the complete progress screen period`.
- Aserción alrededor de la línea 130.
- Se esperaba `Aún no hay series útiles en este periodo.`.
- El árbol mostrado por el fallo contenía datos e historial de ejercicio en la pantalla de Progreso.

**No está determinada la causa.** Hay que distinguir un fixture dependiente de fecha, selección de periodo, estado de consultas, cambio de contrato o comportamiento introducido por las dependencias. No se puede atribuir todavía a Expo 58, a un timeout o a un error de producto concreto.

El PostgreSQL de esa ejecución se apagó normalmente según `postgres.log`. Su estado y registros quedaron conservados en `backend/.worktrees/android-contract-20261106`. No se tocó la base local normal.

### 11.6 Qué se hizo durante esta solicitud

Se consultaron estados Git locales, referencias remotas, manifiestos, esquema, migraciones, procedimientos, informes de la APK y resultados finales de la candidata. Se recuperó el resultado real de la integración anterior, que había quedado fuera de la salida visible. Se redactó este documento y se añadieron inventarios de archivos e historial como anexos.

Para preparar este informe no se instaló otra app, no se repitió el QA del teléfono, no se desplegó, no se migraron datos reales y no se declara un push nuevo. La redacción no resuelve por sí misma la integración roja.

## 12. Complicaciones y errores encontrados

| Problema | Consecuencia | Tratamiento aplicado | Estado |
|---|---|---|---|
| OneDrive y rutas de trabajo largas | Instalaciones y verificaciones lentas | Copias autorizadas fuera de sincronización en D: | Resuelto como ubicación de trabajo, sin promesa causal sobre toda lentitud |
| Rutas C++/Ninja >260 caracteres | Fallos de build nativo | Cachés y directorio CMake cortos, evidencia preservada | Build SDK 57 conseguido, revisar otra vez al migrar |
| Registro Ninja con ruta anterior | Acortar ruta no eliminó el error | Archivo generado identificado y archivado | Resuelto en ese build |
| API de pruebas dentro del APK | Artefacto no conectable | Verificación del bundle antes de instalar | Se rechazó el artefacto incorrecto |
| Caché Metro dependiente de API incompleta | Bundle conservaba 4445 cuando se pedía 4447 | Clave de caché incluye API pública, dos regresiones | Corregido |
| Finalización optimista antes de SQLite | Riesgo de iniciar otra sesión antes de guardar | Espera durable y bloqueo de mutaciones | Corregido y cubierto |
| Respuestas tardías tras cambio de cuenta | Riesgo de restaurar datos de otra sesión | Generaciones, aislamiento y descarte | Cubierto en varios dominios, matriz final abierta |
| Cola o sesión local dañada | Riesgo de pérdida o sobrescritura | Preservación y revisión explícita | Corregido en los casos probados |
| Adopción tardía y edición local concurrente | Pérdida de una edición o borrador | Comparación transaccional del estado disputado | Corregido y probado |
| Serie REST eliminada recreada por sync viejo | Resurrección de datos | Propagación de revisión y rechazo | Corregido en backend |
| Adopción de sesión web sin UUID | Imposibilidad de continuar en móvil | Endpoint de adopción con identidades persistentes | Implementado e integrado |
| Colisión SQLite de copia cancelada | Fallo al continuar servidor tras recuperar borrador | Reutilización solo bajo condiciones seguras | En APK actual, falta repetición física exacta |
| Readiness parcial y nulos | Puntuación distinta de respuestas guardadas | Calcular sobre combinación canónica, distinguir null | Corregido |
| Cuotas por instancia | Límite eludible reiniciando o distribuyendo | Cuotas PostgreSQL atómicas | Corregido |
| Retry-After 61 bajo bloqueo | CI de PR fallida | Precisión microsegundos y reloj posterior a espera | Corregido, fallo anterior conservado |
| Diferencia SQL/JS en e1RM | Selección incoherente de récord | Double precision y reparación compatible | Implementado con migración probada |
| Módulo diferido rechazado | Desmontaje excesivo de ficha | Fallo recuperable y reintento local | Corregido |
| Fuentes/iconos o glifos ausentes | Dependencia remota o símbolo incorrecto | Recursos locales y equivalencias verificadas | Trabajo realizado, revisión visual completa pendiente |
| Workers web bajo saturación Windows | Suite incompleta o intermitente | Aislamiento local y ejecución de cargas separadas | Última candidata pasa, no garantiza cualquier saturación |
| Primer render nativo frío | Timeout antes de evaluar aserciones | Plazo específico local autorizado | No modifica presupuesto de arranque de app |
| Preparación Nest/Windows >30 s | Integración falla antes de medir API | 120 s solo Windows local, CI conserva 30 | Autorizado y probado |
| Varias instalaciones EVRY | Confusión de app y datos | Una habilitada, otras desactivadas conservando datos | Consolidado |
| Pérdida de control stdin/proceso | No poder cerrar mediante handle original | Identidad y estado comprobados, intervención cuando hizo falta | No asumir cierres por timeout |
| Auditoría cambiante | Checkpoint que era verde deja de serlo | Parches compatibles y candidata aislada | Principal sigue bloqueada, candidata sin altas pero integración roja |
| Jest30 descubre Node suites | Suites vacías o dobles en Jest | Separar ejecutores conservando todos los casos | Candidata pasa |
| Doble Playwright core | Error de tipos axe/Playwright | Alineación compartida en raíz | Candidata pasa |
| URL de build heredada por tests | Fallos web con fixtures de otro origen | Separar entorno de tests y build | Error de ejecución corregido |
| Última integración de progreso | Candidata no aceptada | Diagnóstico pendiente con evidencia conservada | Abierto |

### 12.1 Errores de ejecución que no deben ocultarse

En más de una etapa se ejecutaron tests web heredando el origen `127.0.0.1` destinado al build, mientras los fixtures usaban `localhost`. La corrección fue separar entornos, no modificar las expectativas de producto para coincidir con una invocación equivocada.

Un control inicial de bundle buscó una ruta generada antigua. Su fallo no demostró un bundle distinto. Se localizó la salida real y se compararon hashes completos.

Un diagnóstico esperaba que `ninja -n` reprodujera un error de compilación, pero ese modo solo planificaba regeneración. No se presentó como build exitoso y se sustituyó por comprobaciones apropiadas.

Varios archivos históricos mezclan estados de distintas fechas, a veces con encabezados anteriores al último párrafo añadido. Este informe conserva la distinción temporal. La documentación necesita una consolidación final para no obligar a reconstruir el presente leyendo miles de líneas de bitácora.

## 13. Rendimiento y seguridad pendientes

### 13.1 Presupuestos originales

| Métrica | Objetivo | Estado |
|---|---|---|
| Web LCP | <2,5 s con API caliente | No aceptado en perfil controlado autenticado |
| Web INP | <200 ms | Algunas mediciones cumplen, otras fallan |
| Web CLS | <0,1 | Correcciones y mediciones favorables, falta cierre sobre entrega final |
| Android arranque frío | <3 s | Tiempos de actividad parciales, falta medir app lista |
| Android memoria núcleo | <100 MB | Muestras observadas exceden presupuesto |
| API consultas calientes p95 | <500 ms | Ensayos aislados satisfactorios y adversos conservados |
| API mutaciones simples p95 | <300 ms | Evidencia de benchmark, falta contexto remoto futuro |
| Catálogo | 30 registros/página, cero GIF automáticos | Diseño y cobertura implementados, mantener control final |
| Historial | Paginado y agregado | Implementado |

### 13.2 Web

Una línea base controlada completa de 36 visitas incumplió LCP en todas. Las optimizaciones posteriores de historial y calendario mejoraron observaciones específicas, pero no cerraron el objetivo.

En la medición posterior al formateador del calendario, 18 visitas de escritorio registraron LCP entre 2.620 y 3.776 ms. INP estuvo entre 48 y 184 ms y CLS cumplió en ese ensayo. Otra medición de historial conservó una visita INP de 224 ms y LCP fuera de presupuesto. La medición móvil equivalente de los últimos cambios quedó pendiente.

No es válido sustituir ese perfil controlado por un ensayo anterior sin limitación CPU/red que sí dio números bajos. Tampoco es correcto atribuir una mejora causal a un parche por dos corridas no controladas.

### 13.3 Android

Se registraron muestras por encima del límite de memoria, incluida una de 128,50 MiB PSS y otra de 109.220 KiB TOTAL PSS en un APK anterior. TOTAL PSS ya incluye SwapPss en esa salida y no se deben sumar dos veces.

Se observaron tiempos de lanzamiento de actividad de aproximadamente 2.308 ms y 1.814 ms en distintos recorridos. No miden necesariamente el momento en que React terminó de restaurar y deja entrenar. No acreditan el arranque frío funcional de menos de tres segundos.

Se investigó reducir dependencias y se encontró un consumidor interno de Worklets en Expo. No se retiró a ciegas una dependencia solo porque parezca pesada en disco. El tamaño de APK no demuestra por sí mismo el consumo de memoria.

### 13.4 Auditoría

Los avisos cambiaron durante el trabajo. Hubo etapas de decenas de altas y una crítica transitiva en backend, resueltas en checkpoints posteriores. No deben reutilizarse los conteos de septiembre como auditoría actual.

La fuente principal Expo 57 tenía seis altas en la revisión previa a esta candidata. El parche aislado SDK 57 redujo a tres altas sin resolver la cadena completa. La candidata SDK 58 terminó con cero altas/críticas, 32 moderadas y una baja en la auditoría del 6 de noviembre.

Ese resultado es temporal y específico del lock candidato. No se promovió al árbol principal ni elimina la necesidad de revisar las moderadas. Tampoco certifica ausencia de vulnerabilidades de aplicación.

### 13.5 Accesibilidad y Maestro

Hay cobertura automatizada creciente, pero sigue pendiente la matriz manual de teclado, zoom, lector de pantalla, foco, movimiento reducido y viewports. Maestro tiene controles de seguridad para no operar sobre el paquete o entorno equivocado. No se declara aprobada la suite física completa.

## 14. GitHub, commits, pushes y PR

### 14.1 Referencias verificadas durante este informe

| Repositorio | Referencia | Commit |
|---|---|---|
| Frontend | HEAD local | `472f819d23b8be71123eabda9ad352970215e34f` |
| Frontend | Rama remota de optimización | `a4923b6416364a16cfb041846f5b0b701338b124` |
| Frontend | `main` remoto | `0e87acc8ec396b43245348810dcdc4646bb0533f` |
| Backend | HEAD local y rama remota de optimización | `fc6afb3b58aaaa0c850961bf0305d4cb3560b020` |
| Backend | `main` remoto | `f87fa5ae8ae2a42519959d80378b80c4f3c65841` |

Las referencias remotas proceden de `git ls-remote` durante esta revisión. Que la rama de optimización tenga un commit no significa que ese commit esté integrado en `main`.

### 14.2 Frontend

Hay tres commits locales posteriores al head remoto conocido:

- `1340bd3`, 5 de octubre, guardado offline durable por cuenta.
- `90bb426`, 9 de octubre, fijación del contrato API.
- `472f819`, 11 de octubre, restauración de sesiones nativas offline.

Además hay un volumen grande de cambios sin commit. Antes de añadir este informe, Git mostró 84 archivos rastreados modificados con aproximadamente 7.222 líneas añadidas y 939 retiradas. Ese diff no incluye todos los archivos nuevos. El inventario de rutas del anexo permite ver la superficie real sin confundirla con un único cambio pequeño.

La búsqueda GitHub anterior a este informe no encontró PR frontend abierto. No se creó uno durante la redacción. Tras un push verificado deberá crearse o actualizarse el que exista en ese momento.

`main` contiene un commit documental y una referencia de contrato antigua que no están en la misma línea de historial local. El contenido documental relevante ya está presente localmente y el backend fijado local es descendiente del anterior. La integración de ramas debe preservar ese contrato nuevo. No hace falta force push para el avance local conocido sobre la rama remota de optimización.

### 14.3 Backend

La rama de trabajo está publicada y el checkout limpio. El PR 18 fue gestionado y actualizado en los checkpoints registrados. No hay razón para crear un commit vacío solo para simular avance diario del backend.

### 14.4 Qué significa la deuda de publicación

El propietario tiene razón al exigir entregas verificables y rechazar notificaciones repetidas de CI fallida. Guardar semanas de cambios locales reduce visibilidad, hace más difícil revisar y aumenta la distancia respecto a GitHub.

La salida prevista es reducir el tamaño de los próximos checkpoints, conservar pruebas correspondientes a cada conjunto y resolver la puerta real que falla. No consiste en quitar el benchmark del workflow, ignorar la auditoría, publicar con un caso rojo conocido o afirmar que el push arregla CI.

Este informe es un archivo local revisable. No se declara publicado hasta que exista evidencia de commit, push y resultado remoto.

## 15. Balance frente al plan original

| Bloque original | Trabajo conseguido | Lo que falta para cerrarlo |
|---|---|---|
| Desarrollo fuera de OneDrive | Copias y herramientas D-only | Mantener esa política en cada ejecutor |
| Monorepo | Web, móvil y tres paquetes compartidos | Consolidar candidato y documentación |
| Modernización | Next 16, Nest 12 y Prisma 7 | Verificar cada entrega y SDK candidato |
| API v1 y errores | Implementados | QA final de respuestas reales por dominio |
| Autenticación web/móvil | Implementada y probada en varios niveles | Matriz final de expiración, revocación y dispositivos |
| Integridad y concurrencia | Transacciones, restricciones y revisiones | Repetir escenarios afectados en entrega final |
| OpenAPI | Generación y verificación con hashes | Publicar coherentemente ambos clientes |
| Progreso escalable | SQL agregado y cursores | Resolver última integración y cerrar métricas/performance |
| Rutinas y sesiones | Núcleo implementado | Aceptación completa de matriz funcional |
| Offline móvil | Persistencia, reapertura, reintentos y conflictos | Recorrido exacto del último fix, suite física final |
| Readiness/ciclo | Funcional, voluntario y con fechas civiles | Fronteras completas y accesibilidad física |
| Medios bajo demanda | JPG/GIF y caché móvil acotada | Comprobación final de red y atribuciones conservadas |
| Accesibilidad | Semántica y axe, correcciones de foco | Revisión manual completa |
| Pruebas y CI | Suites y workflows amplios | Frontend publicado con CI completa verde |
| Android privado | APK instalada y actualizable | Entrega final, rendimiento y conexión fuera de USB si se despliega |
| iPhone | Base compartida y exports históricos | Diferido por prioridad |
| Staging gratis | Configuración y procedimientos | Nueva autorización y despliegue Vercel verificado |
| Backup/migración | Ensayos poblados y restauración aislada | Validación autorizada sobre datos originales cuando aplique |
| Documentación | Amplia bitácora y runbooks | Consolidar estados contradictorios por fecha |
| Planes anteriores | Existe hoja de ruta y registro actual | Revisar todos los planes del 19 de agosto y marcar reemplazo de forma consistente |

No hay una base objetiva suficiente para afirmar «95% terminado». El porcentaje ocultaría que faltan pocas áreas en número pero algunas concentran integración, rendimiento y entrega. Este informe usa criterios concretos en vez de un porcentaje inventado.

## 16. Plan de continuidad y cierre

### 16.1 Fase inmediata — una sola app, sin UX nueva

1. Preservar el estado y documentar el último fallo de integración, como se hace aquí.
2. Revisar el caso de progreso fallido con sus fechas y payloads sintéticos.
3. Ejecutar el caso de forma enfocada contra una base sintética aislada.
4. Si el fallo viene de fixture temporal, corregir la construcción determinista de datos y demostrarlo sin relajar la aserción.
5. Si es un fallo de producto o contrato, reproducirlo y aplicar el cambio mínimo en la capa responsable.
6. Repetir el ejecutor móvil/backend completo, no solo el caso que falló.
7. Conservar evidencia de resultado y equivalencia de fuentes.

La investigación no debe comenzar por ampliar otro timeout. El DOM ya muestra datos, de modo que hay que comprobar primero qué periodo debería estar vacío y por qué.

### 16.2 Decisión sobre SDK 58

1. Revisar el diff real de manifiestos y lock frente a la fuente principal.
2. Justificar SDK 58 por seguridad y compatibilidad comprobadas, no solo porque es más reciente.
3. Confirmar una instalación limpia reproducible con el lock candidato.
4. Verificar contratos, tipos, lint, tests, Doctor, auditoría y export Android.
5. Generar el proyecto nativo compatible con las nuevas dependencias.
6. Revisar namespace, actividad principal, permisos, confianza TLS y firma. Los verificadores locales antiguos pueden contener rutas del paquete original y deben adaptarse a la configuración real sin debilitar controles.
7. Compilar APK release y revisar el artefacto final.
8. Si la candidata no resulta viable, conservar la APK actual y continuar investigando una corrección compatible. No promover a ciegas.

### 16.3 Actualización del OPPO

1. Mantener `com.gabrielcano.evry.local` y la misma firma privada.
2. Aumentar el código de versión para una entrega nueva cuando proceda.
3. Comprobar dispositivo e identidad instalada y que no se interrumpe un entrenamiento activo.
4. Verificar hash, API integrada, manifiesto, permisos y ausencia de instrumentación de diagnóstico.
5. Actualizar sobre la misma app sin desinstalar ni limpiar datos.
6. Verificar hash instalado, identidad, sesión y registros conservados.
7. Repetir entrenamiento online, offline, cierre/reapertura y sincronización.
8. Repetir el caso exacto de borrador recuperado y adopción del servidor que falló por UUID.
9. Mantener las variantes antiguas deshabilitadas. No crear otra app para cada prueba.

### 16.4 Rendimiento Android

1. Medir arranque hasta una condición funcional observable, no solo ActivityManager.
2. Medir memoria en release después de estabilizar Inicio y durante entrenamiento.
3. Identificar costo nativo, JS, imágenes y módulos con evidencia adecuada.
4. Optimizar la causa identificada sin retirar módulos necesarios.
5. Repetir con el mismo escenario, datos y método.
6. Si el presupuesto original no resulta realista, presentar evidencia al propietario antes de cambiarlo. No redefinir la métrica silenciosamente.

### 16.5 Publicación verificable

1. Separar conjuntos coherentes de cambios y dependencias entre ellos.
2. Revisar secretos, archivos generados y evidencias privadas para que no entren en Git.
3. Confirmar contrato y backend fijado.
4. Ejecutar las puertas de CI que afecten al checkpoint. La presencia de web en el mismo monorepo no permite ignorar una puerta web roja que el workflow sigue exigiendo.
5. Crear commits de alcance revisable.
6. Hacer push autorizado a la rama de optimización.
7. Crear o actualizar PR.
8. Verificar commit remoto y Actions, diferenciando subida de CI.
9. Informar solo del resultado material o de una intervención que de verdad requiera al propietario.

### 16.6 Retomar web cuando corresponda

- Resolver la condición que impide ejecutar servidor de pruebas, si sigue presente.
- Medir el build real bajo condiciones controladas.
- Corregir las causas de LCP e INP demostradas, manteniendo UX diferida.
- Ejecutar E2E y accesibilidad sobre la entrega final.
- Consolidar fuentes/iconos locales y cargas diferidas mediante comprobación de red.
- Publicar el checkpoint con CI completa.
- Trabajar UX junto al propietario en una etapa separada.

### 16.7 Despliegue futuro condicionado

Con una autorización nueva explícita, verificar capacidades y límites actuales de Vercel y PostgreSQL asociado. Preparar base nueva de staging, secretos y orígenes, migraciones compatibles, API, web y pruebas HTTPS. Después generar la APK contra la API remota real.

No reutilizar `.invalid` ni localhost para una entrega que se presente como conectada desde cualquier red. No copiar automáticamente datos reales al entorno nuevo. No comprar planes o dominios asumiendo que una autorización de código cubre costos.

### 16.8 iOS posterior

Verificar compatibilidad de Expo Go con el SDK elegido, probar en el iPhone, validar SecureStore, navegación y reapertura. La disponibilidad de Expo Go instalado o de un iPhone no demuestra compatibilidad de cualquier SDK futuro. TestFlight y binario independiente siguen diferidos.

## 17. Dependencias de intervención del propietario

**Para diagnosticar el fallo de integración actual no hace falta otra autorización.** Se puede trabajar con fuentes y datos sintéticos locales.

Las intervenciones legítimas previsibles son:

- Desbloquear el OPPO o aceptar una solicitud USB presentada por Android.
- Conectar el teléfono cuando se vaya a ejecutar aceptación física.
- Indicar cuándo no hay un entrenamiento activo si no puede comprobarse de manera segura.
- Resolver una autenticación de GitHub/Vercel que solo la cuenta del propietario pueda completar, si aparece.
- Autorizar de nuevo despliegue o recursos externos cuando se llegue a esa fase.
- Revisar UX en una sesión conjunta cuando decida retomarla.

No se debe pedir aprobación para decisiones rutinarias ya cubiertas, nuevos plazos de test como primera respuesta a un fallo sin diagnóstico, commits autorizados o creación de PR. Si una herramienta rechaza una acción imprescindible, la explicación debe indicar qué acción, qué rechazó y qué intervención concreta la resuelve.

## 18. Estimaciones y causas de la duración

### 18.1 Por qué no está cerrado

El trabajo incluyó más que pantallas: contratos, concurrencia, migraciones, recuperación, autenticación, seguridad, Android nativo, un entorno Windows con límites de rutas y pruebas físicas. Durante la ejecución aparecieron errores funcionales reales y avisos nuevos de dependencias.

También hubo problemas de proceso. Se acumuló demasiado trabajo local, se mezclaron comprobaciones pesadas, algunas invocaciones fueron incorrectas y se abrieron más variantes de app de las que el propietario necesitaba. La necesidad de comprobar integridad no justifica indefinidamente la falta de un cierre pequeño y visible.

Las esperas de instalación limpia llegaron a 16–18 minutos y algunas compilaciones nativas a unos 32 minutos. Una ejecución de muchas horas incluye herramientas, esperas, fallos y reanudaciones. No equivale a horas netas de implementación ni permite calcular un porcentaje completado por tiempo transcurrido.

### 18.2 Estimación orientativa desde este corte

Estas son franjas de trabajo efectivo para planificación, no una promesa de ejecución continua o entrega automática en una hora concreta.

| Entrega | Franja orientativa | Incertidumbre |
|---|---|---|
| Diagnóstico y corrección del caso de progreso | 2–6 horas | Puede descubrir diferencia de producto o dependencia más amplia |
| Integración completa y revisión del candidato | 3–8 horas | Instalación, fixtures y resultado de todos los grupos |
| Build release SDK 58 y revisión de artefacto | 4–12 horas | Posibles cambios nativos y límites Windows |
| Actualización y aceptación física enfocada | 3–8 horas | Teléfono disponible, sin sesión activa y con conexión estable |
| Preparar commits, PR y verificar CI | 2–6 horas | Sujeto a puertas web y rendimiento del monorepo |
| Cierre de rendimiento Android | 1–3 jornadas adicionales | No está identificada una única causa suficiente |
| Cierre web técnico | Varias jornadas adicionales | LCP controlado y posibilidad de ejecutar entorno completo |
| UX, iOS y despliegue | Sin fecha comprometida | Diferidos o pendientes de autorización/decisión |

No se suman estas filas como un calendario garantizado: algunas dependen de resultados anteriores y otras de condiciones externas. La siguiente entrega controlable es resolver y demostrar la integración móvil/backend, no prometer de nuevo que todo EVRY queda terminado en unas horas.

## 19. Riesgos futuros y decisiones técnicas

### 19.1 Riesgos altos

- Promover SDK 58 sin build y prueba física puede introducir un problema que los tests Node no detectan.
- Cambiar paquete o firma rompería actualización y acceso al almacenamiento existente.
- Publicar el árbol local sin revisar su gran superficie dificultaría regresiones y revisión.
- Aplicar migraciones sobre una base no identificada puede alterar datos reales.
- Usar evidencia de una versión anterior como aceptación de una nueva puede ocultar fallos.
- Depender solo de USB limita el uso conectado cotidiano.
- Mantener memoria sobre presupuesto sin diagnóstico deja incompleto el compromiso original.

### 19.2 Riesgos medios

- Avisos de dependencias nuevos entre dos checkpoints.
- Saturación de CPU/disco al compilar y probar a la vez.
- Fixtures vinculados a fechas que cambian de periodo con el calendario.
- Respuestas tardías durante cambio de cuenta, foreground o recuperación.
- Huellas, rutas o namespace obsoletos en verificadores locales.
- Documentación histórica que parece describir el estado actual.
- Confundir total de medios originales con ejercicios actualmente importados.

### 19.3 Decisiones que se deben mantener

- Una sola app activa y actualizaciones sobre ella.
- Datos antes que conveniencia de reinicializar.
- No sustituir una métrica fallida por otra más fácil de aprobar.
- Contrato generado y fijado a backend comprobado.
- Separar producción, runtime local reservado y fixtures.
- Conservar las mediciones adversas.
- No agregar productos o infraestructura fuera del alcance para resolver problemas locales.

## 20. Inventario de evidencia y guía de relevo

### 20.1 Documentación frontend

Todos bajo `D:/DatosPC/EVRY/frontend/`:

| Ruta | Contenido |
|---|---|
| `docs/operations/implementation-status.md` | Bitácora principal, implementado y pendientes históricos |
| `docs/operations/mobile-durability.md` | APK, SQLite, offline, conflictos y pruebas físicas |
| `docs/operations/mobile-save-state.md` | Semántica de guardado y aislamiento |
| `docs/operations/mobile-backend-integration.md` | Ejecutor móvil contra Nest/PostgreSQL |
| `docs/operations/maestro-safety.md` | Protección de escenarios Maestro |
| `docs/operations/auth-controlled-performance.md` | Rendimiento autenticado, hipótesis y resultados adversos |
| `docs/operations/web-controlled-performance.md` | Medición controlada pública |
| `docs/operations/web-performance.md` | Evidencia web y límites de interpretación |
| `docs/operations/staging.md` | Política actual de despliegue y app única |
| `docs/quality/fundamentos.md` | Puertas de calidad |
| `.github/workflows/ci.yml` | Configuración local actual de CI, no evidencia de su ejecución |

### 20.2 Documentación backend

Todos bajo `D:/DatosPC/EVRY/backend/`:

- `docs/operations/integration-tests.md`.
- `docs/operations/migration-runbook.md`.
- `docs/operations/api-performance.md`.
- `docs/operations/auth-cookie-validation.md`.
- `docs/operations/shared-rate-limits.md`.
- `docs/operations/epley-record-repair.md`.
- `docs/operations/dependency-security.md`.
- `docs/operations/proxy-dependency-update.md`.
- `docs/operations/password-byte-limits.md`.
- `docs/operations/mobile-registration.md`.
- `docs/operations/cycle-entry-moves.md`.
- `docs/operations/vercel-staging.md`.

### 20.3 Evidencia local de la APK

Directorio:

`D:/DatosPC/EVRY/frontend/.worktrees/mobile-recovery-collision-20261024/`.

Archivos principales:

- `evry-local-6b244e0949fb.apk`.
- `local-apk.verification.json`.
- `local-installation.verification.json`.
- `local-install-attempt.json`.

El archivo de intento de instalación corresponde a una operación ya realizada. No debe reejecutarse automáticamente como si fuera un instalador genérico. Antes de otra actualización hay que revisar su identidad y el nuevo artefacto.

### 20.4 Evidencia de la candidata

Directorio:

`D:/DatosPC/EVRY/frontend/.worktrees/sdk58-audit-20261106/`.

- `source-snapshot.json`, inventario inicial de fuentes.
- `quality-aligned-types.result.json`.
- `quality-aligned-lint.result.json`.
- `quality-ci-env-tests.result.json`.
- `quality-ci-env-audit.result.json`.
- `quality-ci-env-build.result.json`.
- `quality-ci-env-android-export.result.json`.
- Logs con los mismos prefijos.
- Resultados anteriores fallidos de instalación, tipos, Doctor y tests, conservados para trazabilidad.

La candidata no es un checkout Git independiente publicable sin reconciliar. Es una copia aislada para validar dependencias. Antes de promover, comparar manifiestos, lock y fuentes. No copiar encima documentación principal más reciente desde esa copia.

### 20.5 Evidencia del último fallo

Directorio:

`D:/DatosPC/EVRY/backend/.worktrees/android-contract-20261106/`.

- `integration.result.json`, salida 1.
- `integration.log`, casos ejecutados y árbol de la pantalla que falló.
- `initdb.log`, inicialización sintética.
- `postgres.log`, incluyendo apagado normal.

No contiene permiso para reutilizar credenciales del runtime. Las credenciales sintéticas de la ejecución no se publican en este informe.

### 20.6 Otras evidencias de continuidad

- `frontend/.worktrees/mobile-sync-qa-20261024/acceptance.verification.json`, pérdida de respuesta y conflicto físico anterior.
- `frontend/.worktrees/mobile-local-mvp-20261018/`, APK y recorridos locales iniciales.
- `backend/.worktrees/local-mvp/`, runtime local y comprobaciones de TLS/datos.
- Informes `native-android-reconnect-...json`, comparación de datos conservados.
- Directorios `api-performance-*`, mediciones API satisfactorias y adversas.
- Directorios `migration-rehearsal-*`, respaldo y migración sintética.
- Directorios `web-e2e-isolated-*`, recorridos de navegador aislados.

Los directorios `.worktrees` contienen datos privados, artefactos y registros ignorados. No deben agregarse masivamente a GitHub. Un enlace a ellos funciona solo en este equipo y no sustituye evidencia pública seleccionada y sanitizada.

### 20.7 Instrucciones para continuar sin perder contexto

1. Leer este informe y comprobar si existe uno posterior.
2. Confirmar la prioridad de una app Android y UX/iOS diferidos.
3. Trabajar solo en los dos checkouts D: autorizados.
4. Leer `git status` antes de editar. No limpiar los cambios locales acumulados.
5. Leer los resultados finales de la candidata y la integración, sin asumir que un proceso antiguo sigue ejecutándose.
6. Diagnosticar primero el caso de progreso que falla.
7. Mantener separadas fuente principal, candidata y APK instalada.
8. No borrar bases, claves, APK históricos ni datos del teléfono.
9. No volver a crear instalaciones paralelas.
10. Publicar únicamente avances cuya comprobación relevante haya pasado y gestionar el PR completo.

### 20.8 Comandos de verificación y alcance de cada puerta

Estos comandos describen los scripts existentes. En este equipo Windows se deben ejecutar con la activación y el lanzador D-only descritos arriba. La lista no invita a ejecutarlos todos simultáneamente ni contiene credenciales del runtime.

| Repositorio | Comando | Qué comprueba |
|---|---|---|
| Frontend | `npm ci` | Instalación desde el lock, sin actualizarlo deliberadamente |
| Frontend | `npm run api:test` | Seguridad y comportamiento del importador de contrato |
| Frontend | `npm run api:check` | Coherencia de contrato y cliente guardados |
| Frontend | `npm run api:verify-backend` | Coincidencia con backend fijado e identificado |
| Frontend | `npm run test:mobile:backend:safety` | Rechazo de entornos de integración no seguros |
| Frontend | `npm run type-check` | Tipos de workspaces |
| Frontend | `npm run lint` | Reglas de fuente, sin corrección automática |
| Frontend | `npm test` | Suites principales y controles de seguridad configurados |
| Frontend | `npm audit --audit-level=high` | Avisos de dependencias sobre el lock instalado |
| Frontend | `npm run build` | Compilación de workspaces con script build |
| Frontend | `npm run expo:doctor` | Coherencia Expo y dependencias nativas |
| Frontend | `npm run export:mobile` | Generación de bundles Android/iOS, no APK |
| Frontend | `npm run test:mobile:backend` | Recorridos móviles contra Nest/PostgreSQL sintético |
| Frontend | `npm run test:e2e` | Navegador contra servicios y bases aislados |
| Backend | `npm ci` | Instalación reproducible del backend |
| Backend | `npm run prisma:validate` | Validez del esquema |
| Backend | `npm run prisma:generate` | Generación del cliente Prisma |
| Backend | `npm run openapi:check` | Regeneración y ausencia de diferencias contractuales |
| Backend | `npm run lint:check` | Lint no mutativo |
| Backend | `npm run test:type-check` | Tipos de pruebas y código incluido |
| Backend | `npm run build` | Compilación Nest |
| Backend | `npm run test:unit` | Suite unitaria |
| Backend | `npm run test:db:migrate` | Migraciones únicamente después de validar base sintética |
| Backend | `npm run test:integration` | HTTP, base y concurrencia |
| Backend | `npm run test:migration` | Ensayo poblado, respaldo y recuperación |
| Backend | `npm run test:performance` | API compilada con límites y muestras originales |
| Backend | `npm audit --audit-level=high` | Avisos de dependencias del backend |

El entorno de test web no debe heredar automáticamente `NEXT_PUBLIC_API_BASE_URL` de build. La URL de build se aplica al comando correspondiente. Los exports usan una API HTTPS terminada en `/api/v1`; un dominio `.invalid` solo demuestra generación local. Los ejecutores de integración requieren explícitamente base sintética y una URL runtime bloqueada y distinta.

### 20.9 Matriz de aceptación todavía exigible

La siguiente lista preserva escenarios originales y hallazgos posteriores. Un escenario con evidencia histórica debe repetirse cuando el cambio final afecte a su comportamiento. No se marca todo como pendiente desde cero ni todo como aprobado por una sola suite.

- Registro, login, refresh rotativo y logout web y móvil.
- Refresh reutilizado, familia revocada, cookie malformada y credenciales inválidas.
- Arranque con secretos ausentes o vigencias inválidas.
- Rate limit real con concurrencia entre instancias y tras reiniciar proceso.
- Límites de email, contraseña por bytes, nombre, notas, búsquedas, arrays y paginación.
- Crear y editar rutina sin cambios parciales si falla un ejercicio.
- Rechazar ejercicio ajeno, duplicados y órdenes inválidos.
- Empezar simultáneamente sin obtener dos sesiones activas.
- Agregar, editar y borrar series, y rechazar mutaciones históricas.
- Finalizar solo con datos útiles y repetir finalización sin duplicar estadísticas.
- Eliminar una serie por REST y rechazar su recreación desde snapshot antiguo.
- Adoptar una sesión web sin UUID, conservar IDs y continuarla en móvil.
- Editar localmente mientras llega una adopción remota y preservar la edición.
- Empezar, editar, finalizar, matar proceso y recuperar sin red.
- Recuperar respuesta incierta con mismo lote sin crear duplicados.
- Resolver conflicto entre clientes con revisión canónica.
- Conservar local como borrador, recuperarlo como nuevo y luego continuar servidor sin colisión.
- Cambiar de cuenta/origen sin mezclar SQLite, tokens, consultas o respuestas tardías.
- Recuperarse de apertura SQLite fallida sin conexiones abandonadas.
- Preservar registros y colas dañados para revisión.
- Comparar métricas exactas con datasets controlados, calentamientos excluidos y periodos anteriores.
- Historial por cursor con fechas iguales y acceso a páginas antiguas.
- Readiness parcial, nulos explícitos, un ID diario y cambio de día civil.
- Ciclo opt-in, edición, borrado, cambio de mes y fronteras Bogotá.
- Catálogo de 30 elementos por página, cancelación de búsqueda y cero GIF automáticos.
- Caché de miniaturas acotada, expulsión LRU y recuperación de archivos incompletos.
- Ficha de ejercicio con foco restaurado, módulos fallidos y reintento.
- Teclado, zoom al 200%, lector de pantalla y movimiento reducido.
- Memoria y arranque Android medidos en release hasta estado funcional.
- Web Vitals en build de producción con condiciones de medición declaradas.
- Migración poblada, estadísticas coherentes y restauración verificable de respaldo.
- Push y PR del commit final con todas las puertas remotas relevantes aprobadas.

### 20.10 Catálogo, medios y atribuciones

El diagnóstico original describía 2.648 medios y unos 131 MB. La base local verificada posteriormente tiene 1.344 registros de ejercicios. Son unidades diferentes: un ejercicio puede tener varios medios y un inventario de archivos no equivale al conteo de filas importadas. Esta solicitud no volvió a contar ni a medir todos los medios originales.

Se conserva el requisito de mantenerlos y sus atribuciones, evitando descargar GIF antes de reproducir. La exclusión de trabajo legal adicional no es una certificación jurídica ni evidencia de que se compraron licencias. La publicación futura debe conservar las atribuciones existentes y no necesita añadir un catálogo nuevo para cerrar el MVP.

## 21. Glosario de estados

- **Implementado:** existe código que realiza la función.
- **Probado en unidad:** pasó una comprobación aislada con límites concretos.
- **Integrado:** se comprobó interacción real entre capas indicadas.
- **Exportado:** se generó un bundle, sin implicar APK nativa.
- **Compilado:** existe artefacto nativo o web construido.
- **Verificado:** se inspeccionaron propiedades identificadas del artefacto o resultado.
- **Instalado:** Android confirmó instalación de un paquete y versión.
- **Recorrido físico:** se ejecutaron acciones reales en el dispositivo.
- **Publicado:** un commit está en la referencia remota comprobada.
- **CI verde:** Actions terminó satisfactoriamente para ese commit y workflow.
- **Desplegado:** existe una versión alojada y accesible en infraestructura remota.
- **Aceptado:** cumple los criterios de cierre que correspondan, no solo una parte de ellos.
- **Diferido:** el propietario pospuso esa área. No equivale a terminado.
- **Pendiente de diagnóstico:** hay un fallo observado y la causa no está demostrada.

## 22. Anexos generados desde Git

Los anexos siguientes se capturan al redactar el informe. Sirven para trazabilidad, no para afirmar que cada commit pasó pruebas nuevas durante esta solicitud. Las rutas son relativas a su repositorio indicado. Los mensajes originales de commits se conservan como están registrados.

### Anexo A. Estado exacto del frontend al crear el informe

Entradas de estado Git, incluido este documento nuevo: **177**. `M` representa modificación y `??` archivo todavía no rastreado. No se hicieron commits para generar el inventario.

```text
 M .github/workflows/ci.yml
 M README.md
 M apps/mobile/.maestro/smoke.yaml
 M apps/mobile/app.json
 M apps/mobile/app/(tabs)/_layout.tsx
 M apps/mobile/app/(tabs)/cycle.tsx
 M apps/mobile/app/(tabs)/index.tsx
 M apps/mobile/app/(tabs)/profile.tsx
 M apps/mobile/app/(tabs)/train.tsx
 M apps/mobile/app/_layout.tsx
 M apps/mobile/package.json
 M apps/mobile/src/api/client.test.ts
 M apps/mobile/src/api/client.ts
 M apps/mobile/src/auth/AccountQueryProvider.test.tsx
 M apps/mobile/src/auth/AccountQueryProvider.tsx
 M apps/mobile/src/auth/RegistrationForm.test.tsx
 M apps/mobile/src/auth/RegistrationForm.tsx
 M apps/mobile/src/catalog/TrainScreen.test.tsx
 M apps/mobile/src/catalog/thumbnail-cache.ts
 M apps/mobile/src/db/catalog-migration.test.ts
 M apps/mobile/src/db/database.test.ts
 M apps/mobile/src/db/database.ts
 M apps/mobile/src/db/media-cache.test.ts
 M apps/mobile/src/profile/ProfileScreen.test.tsx
 M apps/mobile/src/sync/SyncCoordinator.tsx
 M apps/mobile/src/sync/conflict-resolution.test.ts
 M apps/mobile/src/sync/conflict-resolution.ts
 M apps/mobile/src/sync/sync-engine.test.ts
 M apps/mobile/src/sync/sync-engine.ts
 M apps/mobile/src/testing/sqlite-native.ts
 M apps/mobile/src/training/account-storage.integration.test.ts
 M apps/mobile/src/training/train-screen.test.tsx
 M apps/web/app/(app)/cycle/page.tsx
 M apps/web/app/(app)/dashboard/page.tsx
 M apps/web/app/(app)/layout.tsx
 M apps/web/app/(app)/workout/[id]/page.test.tsx
 M apps/web/app/(app)/workout/[id]/page.tsx
 M apps/web/app/(app)/workout/page.test.tsx
 M apps/web/app/(app)/workout/page.tsx
 M apps/web/app/(auth)/login/page.test.tsx
 M apps/web/app/(auth)/login/page.tsx
 M apps/web/app/(auth)/register/page.tsx
 M apps/web/app/globals.css
 M apps/web/app/layout.tsx
 M apps/web/components/AppShell.tsx
 M apps/web/components/CalendarioActividad.tsx
 M apps/web/components/EditorRutina.test.tsx
 M apps/web/components/EditorRutina.tsx
 M apps/web/components/ExerciseDetail.test.tsx
 M apps/web/components/ExerciseDetail.tsx
 M apps/web/components/ExercisePicker.test.tsx
 M apps/web/components/ExercisePicker.tsx
 M apps/web/components/exercise-detail/Activity.tsx
 M apps/web/components/ui/Icon.tsx
 M apps/web/components/ui/Input.tsx
 M apps/web/eslint.config.mjs
 M apps/web/lib/api.ts
 M apps/web/lib/auth-api.ts
 M apps/web/lib/auth-session.ts
 M apps/web/lib/auth-store.test.ts
 M apps/web/lib/auth-store.ts
 M apps/web/lib/training-api.ts
 M apps/web/lib/utils.ts
 M apps/web/next-env.d.ts
 M apps/web/package.json
 M apps/web/tests/unit/calendar-month.test.tsx
 M apps/web/tests/unit/cycle-opt-in-lifecycle.test.tsx
 M apps/web/tests/unit/cycle-opt-in.test.tsx
 M apps/web/tests/unit/exercise-detail-contexts.test.tsx
 M apps/web/tsconfig.json
 M apps/web/vitest.config.ts
 M docs/operations/implementation-status.md
 M docs/operations/mobile-durability.md
 M docs/operations/staging.md
 M docs/quality/fundamentos.md
 M package-lock.json
 M package.json
 M packages/api-client/openapi/backend.lock.json
 M packages/api-client/openapi/evry-v1.json
 M packages/api-client/src/schema.ts
 M packages/design-tokens/package.json
 M packages/domain/package.json
 M packages/domain/src/civil-date.ts
 M packages/domain/src/index.ts
?? apps/mobile/jest.config.cjs
?? apps/mobile/metro.config.js
?? apps/mobile/scripts/maestro-safety.test.cjs
?? apps/mobile/scripts/metro-cache.test.cjs
?? apps/mobile/scripts/native-theme.test.cjs
?? apps/mobile/src/api/backend-domains.contract.ts
?? apps/mobile/src/api/jest-renderer-config.test.ts
?? apps/mobile/src/api/shell-quote-security.test.ts
?? apps/mobile/src/auth/root-bootstrap.test.tsx
?? apps/mobile/src/cycle/CycleScreen.test.tsx
?? apps/mobile/src/db/database-open-failure.test.ts
?? apps/mobile/src/db/rest-timer-storage.integration.test.ts
?? apps/mobile/src/db/stored-workout.ts
?? apps/mobile/src/profile/ReadinessScreen.test.tsx
?? apps/mobile/src/profile/use-readiness-day.ts
?? apps/mobile/src/progress/backend-progress.contract.tsx
?? apps/mobile/src/sync/SyncCoordinator.test.tsx
?? apps/mobile/src/sync/backend-adoption.contract.ts
?? apps/mobile/src/sync/backend-restart.contract.ts
?? apps/mobile/src/sync/backend-restart.phase.ts
?? apps/mobile/src/sync/backend.contract.ts
?? apps/mobile/src/sync/stored-sync-payload.test.ts
?? apps/mobile/src/sync/stored-sync-payload.ts
?? apps/mobile/src/sync/sync-storage.integration.test.ts
?? apps/mobile/src/testing/sqlite-native.test.ts
?? apps/mobile/src/training/HomeScreen.test.tsx
?? apps/mobile/src/training/RestTimer.test.tsx
?? apps/mobile/src/training/RestTimer.tsx
?? apps/mobile/src/training/TrainingRecommendation.test.tsx
?? apps/mobile/src/training/TrainingRecommendation.tsx
?? apps/mobile/src/ui/tab-layout.test.tsx
?? apps/web/app/(app)/layout.bootstrap.test.tsx
?? apps/web/app/(auth)/login/LoginForm.tsx
?? apps/web/app/(auth)/register/page.test.tsx
?? apps/web/components/ExerciseDetail.failed-loading.test.tsx
?? apps/web/components/ExerciseDetail.inner-failure.test.tsx
?? apps/web/components/ExerciseDetail.loading.test.tsx
?? apps/web/components/ExerciseDetail.map-failure.test.tsx
?? apps/web/components/ExerciseDetail.pending.test.tsx
?? apps/web/components/ExerciseDetail.plot-failure.test.tsx
?? apps/web/components/exercise-detail/Activity.empty-chart.test.tsx
?? apps/web/components/exercise-detail/DetailContent.tsx
?? apps/web/components/exercise-detail/ModuleContent.test.tsx
?? apps/web/components/exercise-detail/ModuleContent.tsx
?? apps/web/components/ui/Icon.test.tsx
?? apps/web/components/ui/Input.test.tsx
?? apps/web/instrumentation-client.ts
?? apps/web/lib/auth-bootstrap.test.ts
?? apps/web/lib/auth-early-entry.test.ts
?? apps/web/lib/document-refresh.test.tsx
?? apps/web/lib/document-refresh.ts
?? apps/web/playwright.auth-controlled-performance.config.ts
?? apps/web/playwright.auth-performance.config.ts
?? apps/web/playwright.conditions.config.ts
?? apps/web/playwright.controlled-performance.config.ts
?? apps/web/playwright.performance.config.ts
?? apps/web/playwright.startup-diagnostic.config.ts
?? apps/web/tests/a11y/authentication.a11y.test.tsx
?? apps/web/tests/a11y/navigation.a11y.test.tsx
?? apps/web/tests/calendar-import.test.ts
?? apps/web/tests/date-time-format.test.ts
?? apps/web/tests/e2e/conditions.controlled-probe.ts
?? apps/web/tests/e2e/dashboard.startup-diagnostic.ts
?? apps/web/tests/e2e/finalization.controlled-probe.ts
?? apps/web/tests/e2e/helpers/
?? apps/web/tests/e2e/history.pagination.spec.ts
?? apps/web/tests/e2e/login-rendering.performance.ts
?? apps/web/tests/e2e/login.performance.ts
?? apps/web/tests/e2e/screens.authenticated-performance.ts
?? apps/web/tests/performance-database.test.ts
?? apps/web/tests/sharp-dependency.test.ts
?? apps/web/tests/source-map-dependency.test.ts
?? apps/web/tests/unit/exercise-detail-network.test.tsx
?? apps/web/tests/web-vitals.test.ts
?? apps/web/tests/workout-history-pagination.test.tsx
?? docs/operations/auth-controlled-performance.md
?? docs/operations/estado-integral-evry-2026-11-07.md
?? docs/operations/maestro-safety.md
?? docs/operations/mobile-backend-integration.md
?? docs/operations/web-controlled-performance.md
?? docs/operations/web-performance.md
?? packages/domain/src/civil-date-formatter.test.ts
?? packages/domain/src/registration-password.test.ts
?? packages/domain/src/registration-password.ts
?? packages/domain/src/rest-timer.test.ts
?? packages/domain/src/rest-timer.ts
?? scripts/mobile-backend-ready.mjs
?? scripts/mobile-backend-test.mjs
?? scripts/mobile-backend-test.test.mjs
?? scripts/web-e2e-test.mjs
?? scripts/web-e2e-test.test.mjs
?? scripts/web-performance-api-server.cjs
?? scripts/windows-short-cxx.init.gradle
```

### Anexo B. Estado exacto del backend al crear el informe

Checkout limpio, sin modificaciones locales observadas.

### Anexo C. Historial frontend desde el 19 de agosto de 2026

Historial alcanzable desde HEAD local, incluidos commits de integración. Orden descendente. No incluye archivos sin commit ni ramas no alcanzables desde este HEAD.

```text
472f819 | 2026-10-11 | fix(mobile): restore native sessions offline
90bb426 | 2026-10-09 | chore: pin API contract to verified backend checkpoint
1340bd3 | 2026-10-05 | fix(mobile): confirm offline saves only after durable account-scoped writes
a4923b6 | 2026-09-30 | Feat: Se agrega "sincronización de la rama con main"
82773eb | 2026-09-30 | Feat: Se agrega "evidencia de recuperación y contrato verificado"
1df15e7 | 2026-09-30 | Feat: Se agrega "verificación E2E del contexto diario y ciclo"
81a3049 | 2026-09-30 | Feat: Se agrega "sincronización de la rama con main"
8e12ae5 | 2026-09-30 | Feat: Se agrega "verificación E2E del contexto diario y ciclo"
8ceed70 | 2026-09-30 | Feat: Se agrega "caché LRU de miniaturas móvil aislado por cuenta"
cb756fa | 2026-09-30 | Feat: Se agrega "sincronización de la rama con main"
0e49ada | 2026-09-30 | Feat: Se agrega "caché LRU de miniaturas móvil aislado por cuenta"
dabc295 | 2026-09-27 | Feat: Se agrega "identificación accesible de controles de series"
1a1ae05 | 2026-09-27 | Feat: Se agrega "sincronización de la rama con main"
b2d277c | 2026-09-27 | Feat: Se agrega "identificación accesible de controles de series"
60f052e | 2026-09-26 | Feat: Se agrega "recuperación de caché móvil dañada"
61fecfd | 2026-09-26 | Feat: Se agrega "sincronización con main tras recuperación de borradores"
e6dd07a | 2026-09-26 | Feat: Se agrega "recuperación de caché móvil dañada"
b2da3d4 | 2026-09-26 | Feat: Se agrega "recuperación atómica de borradores móviles"
0138bec | 2026-09-26 | Feat: Se agrega "sincronización con main tras recuperar guardados locales"
0e55c1b | 2026-09-26 | Feat: Se agrega "recuperación atómica de borradores móviles"
7c3e5b4 | 2026-09-26 | Feat: Se agrega "recuperación visible ante fallos de guardado local"
9bfba15 | 2026-09-26 | Feat: Se agrega "sincronización con main tras integrar cancelación móvil"
c210c7d | 2026-09-26 | Feat: Se agrega "recuperación visible ante fallos de guardado local"
d7dc831 | 2026-09-26 | Feat: Se agrega "cancelación offline de sesiones móviles" (#16)
12ac568 | 2026-09-26 | Feat: Se agrega "compatibilidad de parches Expo SDK 57"
04a269b | 2026-09-26 | Feat: Se agrega "cancelación offline de sesiones móviles"
36007c7 | 2026-09-22 | Feat: Se agrega "sincronización con main tras integrar entrenamiento web"
9e7b290 | 2026-09-22 | Feat: Se agrega "flujo integral de entrenamiento web" (#15)
9f0e0d7 | 2026-09-22 | Feat: Se agrega "flujo integral de entrenamiento web"
db76ef6 | 2026-09-22 | Feat: Se agrega "edición y cierre seguro de sesiones web"
b616541 | 2026-09-22 | Feat: Se agrega "mutaciones tipadas de series web"
27c6a8d | 2026-09-22 | Merge remote-tracking branch 'origin/main' into codex/evry-optimization
e90200b | 2026-09-22 | Feat: Se agrega configuración segura móvil y contrato web (#14)
c0f1968 | 2026-09-22 | Merge remote-tracking branch 'origin/main' into codex/evry-optimization
5e79610 | 2026-09-22 | Feat: Se agrega "etiqueta accesible a pestañas de entrenamiento"
523259e | 2026-09-22 | Feat: Se agrega "contrato seguro para pruebas web"
60e2e63 | 2026-09-19 | Feat: Se agrega "configuración segura de API móvil"
b295475 | 2026-09-19 | Feat: Se agrega "ficha transversal accesible de ejercicios" (#13)
892d364 | 2026-09-19 | Feat: Se agrega "compatibilidad actualizada con Expo SDK 57"
a2bb0c1 | 2026-09-19 | Feat: Se agrega "contrato de paginación segura de entrenamientos"
f5ddb28 | 2026-09-19 | Feat: Se agrega "ficha transversal accesible de ejercicios"
f2ebdf3 | 2026-09-14 | Feat: Se agrega "contratos web generados de ciclo y progreso" (#12)
cddb70a | 2026-09-14 | Feat: Se agrega "contratos web generados de ciclo y progreso"
a970708 | 2026-09-13 | Feat: Se agrega "límites de perfil sincronizados con OpenAPI"
0a52c03 | 2026-09-13 | Feat: Se agrega "límites de perfil sincronizados con OpenAPI"
4e4d9ad | 2026-09-13 | Feat: Se agrega "autenticación y perfil web generado"
e6441f9 | 2026-09-13 | Feat: Se agrega "plan de autenticación y perfil web generado"
0e44aa8 | 2026-09-13 | Feat: Se agrega "perfil web completo con OpenAPI y TanStack Query"
3ceb763 | 2026-09-12 | Fix: Se corrige "integridad de las transiciones de sesión web"
7b6ccbb | 2026-09-12 | Feat: Se agrega "sesión web sobre contrato generado"
affbb86 | 2026-09-12 | Feat: Se agrega "contrato generado de autenticación web"
e071cb6 | 2026-09-12 | Migra entrenamientos web al cliente Open始化 OpenAPI generado (#9)
8364f09 | 2026-09-12 | Feat: Se agrega "entrenamientos web con cliente generado y TanStack Query"
a47f223 | 2026-09-11 | Feat: Se agrega "rutinas web con contrato generado y cache remota"
3472281 | 2026-09-11 | Fix: Se corrige "compatibilidad del transporte web legacy"
a0c3485 | 2026-09-11 | Feat: Se agrega "operaciones tipadas de entrenamientos web"
098cc51 | 2026-09-11 | Fix: Se corrige "transporte autenticado del cliente OpenAPI web"
c68c94f | 2026-09-11 | Feat: Se agrega "transporte autenticado para el cliente OpenAPI web"
c3b6f8b | 2026-09-11 | Feat: Se agrega "plan del cliente generado para entrenamientos web"
b9bde92 | 2026-09-11 | Sincroniza límites del contrato de rutinas (#8)
11c0ad9 | 2026-09-11 | Feat: Se agrega "sincronización de límites del contrato de rutinas"
bd9612b | 2026-09-11 | Paridad móvil de rutinas y perfil (#7)
77f10ad | 2026-09-11 | Feat: Se agrega "parches compatibles de Expo 57"
c76f441 | 2026-09-11 | Feat: Se agrega "estado verificado de paridad móvil"
0141f2a | 2026-09-10 | Feat: Se agrega "correcciones finales de rutinas móviles"
3da199c | 2026-09-10 | Feat: Se agrega "campos completos del perfil móvil"
17536e3 | 2026-09-09 | Feat: Se agrega "validación y bloqueo de eliminación de rutinas"
fbc61e9 | 2026-09-09 | Feat: Se corrige "gestión de rutinas móviles"
fa2ee20 | 2026-09-09 | Feat: Se agrega "CRUD de rutinas móviles"
74d85c5 | 2026-09-09 | Feat: Se agrega "plan de paridad móvil para rutinas y perfil"
5033e38 | 2026-09-09 | Registro, ciclo y progreso completos en móvil (#6)
a9e2ebe | 2026-09-08 | Feat: Se agrega "compatibilidad segura con Expo SDK 57"
3070aaa | 2026-09-08 | Feat: Se agrega "detalle de progreso por ejercicio en móvil"
ea041b9 | 2026-09-07 | Feat: Se agrega "contrato de conflictos al mover registros del ciclo"
bb3b0cb | 2026-09-07 | Feat: Se agrega "edición de registros del ciclo en móvil"
8f5e39a | 2026-09-07 | Feat: Se agrega "recuperación del acceso tras registro parcial"
9696144 | 2026-09-07 | Feat: Se agrega "formulario de registro móvil accesible"
e3fe2f3 | 2026-09-07 | Feat: Se agrega "cliente de registro móvil con sesión segura"
6cab016 | 2026-09-06 | Feat: Se agrega "evolución agregada del progreso web"
b81eb1f | 2026-09-06 | Feat: Se agrega "evolución agregada del progreso web"
878a1f4 | 2026-09-06 | Merge pull request #4 from GabrielCano22/codex/evry-optimization
6a6bb3f | 2026-09-06 | Feat: Se agrega "resumen canónico del inicio web"
a1cd66d | 2026-09-05 | Feat: Se agrega "pruebas web estables en CI"
499c59e | 2026-09-05 | Feat: Se agrega "aislamiento portable de pruebas web"
e4a7287 | 2026-09-05 | Feat: Se agrega "estabilidad mensual del flujo E2E"
1eca9a7 | 2026-09-05 | Feat: Se agrega "prueba E2E mensual y origen API de producción"
1618999 | 2026-09-05 | Feat: Se agrega "actualización civil y accesible del calendario"
dbde879 | 2026-09-05 | Feat: Se agrega "calendario mensual con consultas agregadas"
70d3d5f | 2026-09-04 | Merge pull request #3 from GabrielCano22/evry-optimization
84839bd | 2026-09-04 | fix(web): use canonical dashboard metrics and shared daily readiness
b644fc7 | 2026-09-04 | docs(status): record verified cycle consent and civil dates
555815d | 2026-09-04 | fix(web): make cycle tracking depend on explicit opt-in
1d0fadb | 2026-09-04 | Merge pull request #2 from GabrielCano22/evry-optimization
4231385 | 2026-09-04 | Merge remote-tracking branch 'origin/codex/evry-optimization' into codex/evry-optimization
a8901c6 | 2026-09-04 | docs(status): record Expo patch verification
145ac7a | 2026-09-04 | chore(mobile): align Expo SDK 57 patches
4b1122a | 2026-09-04 | fix(mobile): align Expo SDK 57 patch dependencies
7cde899 | 2026-09-04 | docs(status): record verified contracts and remaining acceptance gaps
d7f49d7 | 2026-09-04 | chore(api): sync verified authentication contract
a4e6d53 | 2026-09-04 | test(web): await login animation before accessibility audit
485bb0d | 2026-09-02 | fix(ci): make login E2E accessible on Chromium
b0f4760 | 2026-09-02 | docs(ops): make Vercel the only deployment path
3de9420 | 2026-09-02 | chore(mobile): align Expo SDK 57 patches
2e461a0 | 2026-09-02 | ci(e2e): generate prisma client before backend build
edb91de | 2026-09-01 | chore(api): pin browser origin contract
d9e4659 | 2026-09-01 | fix(ci): start built apps for Playwright
f453516 | 2026-08-31 | chore: pin verified backend and record checkpoint validation
5be4f0f | 2026-08-31 | fix(mobile): validate canonical conflicts before recovery
421bfa4 | 2026-08-31 | fix(mobile): preserve canonical workout data during conflict recovery
3c2589f | 2026-08-31 | feat(api): consume the pinned backend OpenAPI contract
a7cfe38 | 2026-08-31 | chore(api): checkpoint shared contract integration in progress
88da68a | 2026-08-30 | feat(mobile): complete paginated catalog and recoverable cache states
a8a1f2d | 2026-08-30 | fix(mobile): isolate SQLite write queues across accounts
4286215 | 2026-08-30 | Merge remote-tracking branch 'origin/codex/evry-optimization' into codex/evry-optimization
f9c73bd | 2026-08-30 | chore(mobile): checkpoint catalog pagination and cache work in progress
bc15b5c | 2026-08-30 | feat(mobile): isolate account storage and resume workouts offline
cf664fa | 2026-08-30 | fix(mobile): scope token rotation and retries to their session
8535469 | 2026-08-30 | Merge pull request #1 from GabrielCano22/codex/evry-optimization
f4c7035 | 2026-08-30 | Merge origin/main into codex/evry-optimization
1a160d3 | 2026-08-30 | chore(deps): patch brace expansion and document remaining advisories
fe091d7 | 2026-08-30 | docs: track acceptance gaps and supersede legacy plans
1f6f5f7 | 2026-08-30 | feat(web): consume canonical progress metrics and cursor history
dbd1d86 | 2026-08-30 | chore(ops): configure CI staging and mobile build profiles
83fb47f | 2026-08-30 | feat(mobile): add progress profile and recoverable offline synchronization
3b7d999 | 2026-08-29 | chore(web): upgrade to Next.js 16
cf62950 | 2026-08-29 | feat(mobile): improve catalog and synchronization feedback
03d0b34 | 2026-08-29 | feat(mobile): add offline-first Expo application
7aba2f1 | 2026-08-29 | feat(workspace): establish shared web and mobile foundations
bbe6a0a | 2026-08-23 | fix: aislar origen e2e del entorno
3907da3 | 2026-08-23 | fix: alinear entorno reproducible del frontend
f54216a | 2026-08-23 | docs: documentar fundamentos verificables
7225ab3 | 2026-08-23 | fix: cargar postcss en proyecto esm
ba1a584 | 2026-08-21 | fix: hacer honestos estados remotos
```

### Anexo D. Historial backend desde el 19 de agosto de 2026

Mismo criterio que el anexo anterior. Los mensajes son historial de cambios, no sustituyen sus evidencias de aceptación.

```text
fc6afb3 | 2026-10-19 | Keep the authorized Windows fixture allowance outside API timing
4cde285 | 2026-10-19 | Preserve explicit null answers in daily readiness updates
0ef9d3f | 2026-10-19 | Score partial daily readiness from the preserved inputs
c3138e8 | 2026-10-19 | Preserve workout revisions and adopt web sessions for mobile
4250b9e | 2026-10-17 | Registra ventanas temporales en las mediciones de API
658bfe6 | 2026-10-17 | Permite limitar la API a una interfaz local
0ce10d8 | 2026-10-17 | Actualiza la autorización de staging en Vercel
1a23c67 | 2026-10-13 | Reject registration passwords beyond the UTF-8 bcrypt boundary
701014e | 2026-10-13 | Validate Vercel client identity before consuming shared quotas
f558481 | 2026-10-12 | Align Epley history and cached records with source statistics
d8ef58c | 2026-10-12 | Preserve quota precision after concurrent lock waits
9b79c78 | 2026-10-12 | perf(progress): avoid duplicate rows before paginating history
011f243 | 2026-10-12 | fix(security): share request quotas atomically across API instances
0b386b8 | 2026-10-10 | docs: keep local integration tools and data on D drive
00c57b2 | 2026-10-09 | test: preserve safe API benchmark startup diagnostics
7fca894 | 2026-10-09 | fix: patch transitive handlebars security advisories
65204d4 | 2026-10-09 | fix: return input errors for invalid cycle date ranges
af9de45 | 2026-10-07 | fix: reject malformed refresh cookies before token processing
406af9c | 2026-10-05 | fix: patch proxy address trust dependency
f87fa5a | 2026-10-01 | Feat: Se agrega "benchmark de API verificado y medición segura"
760340b | 2026-10-01 | Feat: Se agrega "alineación del checkpoint con main verificado"
875f14d | 2026-10-01 | Feat: Se agrega "benchmark de API compilada con PostgreSQL sintético"
fb1bc69 | 2026-10-01 | Feat: Se agrega "medición HTTP segura y cierre verificable de procesos"
9250adf | 2026-09-30 | Feat: Se agrega "ensayo poblado de migración y recuperación"
d5bbb2d | 2026-09-30 | Feat: Se agrega "sincronización de la rama con main"
6206404 | 2026-09-30 | Feat: Se agrega "ensayo poblado de migración y recuperación"
a8bf36c | 2026-09-30 | Feat: Se agrega "contexto diario vacío y reintentos coherentes"
ab16b87 | 2026-09-30 | Feat: Se agrega "conservación del plazo real de reintento"
7f71776 | 2026-09-30 | Feat: Se agrega "sincronización de la rama con main"
2c272ba | 2026-09-30 | Feat: Se agrega "respuesta JSON nula para contexto diario sin datos"
27f59f5 | 2026-09-30 | Feat: Se agrega "actualización compatible de dependencias vulnerables"
e201cac | 2026-09-30 | Feat: Se agrega "sincronización de la rama con main"
ed5ad2a | 2026-09-30 | Feat: Se agrega "actualización compatible de dependencias vulnerables"
2d747bb | 2026-09-27 | Feat: Se agrega "progresión conservadora basada en sesiones comparables"
97d8122 | 2026-09-27 | Feat: Se agrega "sincronización de la rama con main"
1c5e9ca | 2026-09-27 | Feat: Se agrega "progresión conservadora basada en sesiones comparables"
e388851 | 2026-09-26 | Feat: Se agrega "descarga conservadora ante dificultad repetida" (#12)
d62a789 | 2026-09-26 | Feat: Se agrega "descarga conservadora ante dificultad repetida"
82ac64c | 2026-09-22 | Feat: Se agrega "sincronización con main tras integrar PostgreSQL"
7a6121a | 2026-09-22 | Feat: Se agrega evidencia reproducible de integración PostgreSQL (#11)
6b32a58 | 2026-09-22 | Feat: Se agrega "evidencia reproducible de integración PostgreSQL"
6dc54e9 | 2026-09-22 | Merge remote-tracking branch 'origin/main' into codex/evry-optimization
0ed9c24 | 2026-09-22 | Exigir vigencias JWT válidas al iniciar (#10)
9f53e80 | 2026-09-19 | Feat: Se agrega "configuración JWT para integración local"
a936559 | 2026-09-19 | Merge remote-tracking branch 'origin/main' into codex/evry-optimization
ebb40a3 | 2026-09-19 | Feat: Se agrega "validación estricta de vigencia JWT"
80e8c07 | 2026-09-19 | Feat: Se agrega "paginación segura de entrenamientos" (#9)
dc9053c | 2026-09-19 | Feat: Se agrega "paginación segura de entrenamientos"
406ef0a | 2026-09-14 | Feat: Se agrega "protección contra registros futuros del ciclo" (#8)
724341f | 2026-09-14 | Feat: Se agrega "protección contra registros futuros del ciclo"
5d7270d | 2026-09-13 | Feat: Se agrega "límites seguros de actualización de perfil"
4335cf3 | 2026-09-13 | Feat: Se agrega "límites seguros de actualización de perfil"
d20f883 | 2026-09-12 | Permite limpiar las notas de rutinas (#6)
6038b7f | 2026-09-11 | Fix: Se permite limpiar notas de rutinas
d3c2e41 | 2026-09-11 | Límites seguros para las rutinas (#5)
cf69006 | 2026-09-11 | Feat: Se agrega "limpieza final del plan de límites"
cf98a42 | 2026-09-11 | Feat: Se agrega "Limites de entrada en DTOs de rutinas"
3a59b24 | 2026-09-11 | Feat: Se agrega "plan de límites para rutinas"
b86eb6b | 2026-09-08 | Registro móvil y traslados seguros del ciclo (#4)
b05cb4a | 2026-09-08 | Feat: Se agrega "verificación integral y dependencias seguras"
a3f84f4 | 2026-09-07 | Feat: Se agrega "protección contra sobrescritura al mover registros del ciclo"
ef60c35 | 2026-09-07 | Feat: Se agrega "registro nativo con sesión móvil"
0328c3b | 2026-09-06 | Feat: Se agrega "base integral del backend EVRY"
3f09cd4 | 2026-09-06 | Feat: Se agrega "agregación acotada del progreso"
e0864b0 | 2026-09-05 | Feat: Se agrega "resumen canónico del inicio"
2672f6b | 2026-09-05 | Feat: Se agrega "aislamiento concurrente por usuario"
db00c56 | 2026-09-05 | Feat: Se agrega "regresiones de concurrencia HTTP estables"
fcd5e62 | 2026-09-05 | Feat: Se agrega "contrato mensual de actividad y ciclo"
2268a78 | 2026-09-04 | docs(test): document isolated PostgreSQL verification
e211dce | 2026-09-04 | test(auth): isolate CORS origin fixtures
4ee7342 | 2026-09-04 | test(sync): scope advisory locks by database
9778df3 | 2026-09-02 | test(sync): scope lifecycle lock waiters
2a62cd5 | 2026-09-02 | test(sync): force PostgreSQL contention
361aa20 | 2026-09-02 | test(sync): cover PostgreSQL offline synchronization
2cbed12 | 2026-09-02 | test(auth): force refresh collision over HTTP
ef87064 | 2026-09-02 | docs(ops): require authorization for Vercel deployment
eea35d4 | 2026-09-02 | fix(auth): handle refresh serialization collisions
c189847 | 2026-09-02 | test(auth): verify HTTP contracts with PostgreSQL
b377e02 | 2026-09-01 | fix(deps): override high severity transitive dependencies
a6ca6fd | 2026-09-01 | docs: track PostgreSQL contract verification
f2482de | 2026-09-01 | fix(auth): enforce trusted browser origins
f291aee | 2026-08-31 | fix(workouts): recover unique conflicts with Prisma 7 adapter
c595451 | 2026-08-31 | fix(api): preserve optional inputs in generated client
b2407c4 | 2026-08-30 | feat(api): generate a complete shared OpenAPI contract from Nest
5bf7e37 | 2026-08-30 | feat(api): publish typed paginated exercise catalog contract
726d6fb | 2026-08-30 | Merge remote-tracking branch 'origin/codex/evry-optimization' into codex/evry-optimization
9434873 | 2026-08-30 | fix(catalog): bound exercise pagination requests
4fac733 | 2026-08-30 | Merge pull request #1 from GabrielCano22/codex/evry-optimization
8b65e36 | 2026-08-30 | Merge origin/main into codex/evry-optimization
9be6fce | 2026-08-30 | test(api): type-check integration fixtures in CI
e209d21 | 2026-08-30 | feat(progress): add stable keyset history pagination
712c48c | 2026-08-30 | fix(sync): preserve unique set order during replacements
4a084ed | 2026-08-30 | chore(ops): add CI OpenAPI snapshots and free staging configuration
e16e128 | 2026-08-30 | fix(config): require explicit CORS origins
1b61a37 | 2026-08-30 | fix(prisma): use PostgreSQL adapter in scripts and tests
e115cc7 | 2026-08-30 | feat(progress): support every documented overview period
e87e22c | 2026-08-30 | chore(prisma): upgrade ORM to 7
2bda102 | 2026-08-30 | chore(prisma): upgrade ORM to 6
1ff759d | 2026-08-30 | chore(api): upgrade NestJS runtime to 12
e40a4e1 | 2026-08-30 | refactor(api): own rate limiting compatibility layer
f86d3f0 | 2026-08-29 | chore(api): upgrade NestJS 10 to 11
7c51170 | 2026-08-29 | test(prisma): assert synchronization migration invariants
92d8bab | 2026-08-28 | feat(domain): make readiness and cycle guidance conservative
007b968 | 2026-08-28 | feat(sync): add offline workout revisions and mobile auth rotation
4ee1309 | 2026-08-28 | feat(api): version routes and standardize operational contract
9e01adc | 2026-08-28 | feat(progress): paginate metrics and harden exercise media
7b7c976 | 2026-08-23 | chore: excluir informe interno de task 2
2bbd4fe | 2026-08-23 | feat: completar sesiones idempotentes y estadisticas
3ed813a | 2026-08-23 | test: respetar base aislada configurable
99035c5 | 2026-08-23 | test: probar rollback atomico de rutinas
846d043 | 2026-08-23 | fix: proteger y actualizar rutinas de forma atomica
485c0dd | 2026-08-23 | docs: documentar configuracion segura
56c97bf | 2026-08-23 | docs: concretar rollback de invariantes
1cc0f65 | 2026-08-21 | fix: imponer invariantes de datos y errores prisma
36e8f26 | 2026-08-21 | fix: cerrar brechas de autenticacion
64d939f | 2026-08-21 | fix: endurecer configuracion y autenticacion
```

### Anexo E. Inventario rastreado de implementación y documentación frontend

Incluye fuentes, configuración, pruebas y documentación rastreadas de las carpetas de aplicación y paquetes. Los archivos nuevos aún sin seguimiento están en el anexo A. Se omiten deliberadamente node_modules, medios públicos masivos, artefactos, claves y archivos de entorno.

```text
.github/workflows/ci.yml
apps/mobile/.env.example
apps/mobile/.gitignore
apps/mobile/.maestro/smoke.yaml
apps/mobile/.vscode/extensions.json
apps/mobile/.vscode/settings.json
apps/mobile/LICENSE
apps/mobile/app.json
apps/mobile/app/(tabs)/_layout.tsx
apps/mobile/app/(tabs)/cycle.tsx
apps/mobile/app/(tabs)/index.tsx
apps/mobile/app/(tabs)/profile.tsx
apps/mobile/app/(tabs)/progress.tsx
apps/mobile/app/(tabs)/train.tsx
apps/mobile/app/+html.tsx
apps/mobile/app/+not-found.tsx
apps/mobile/app/_layout.tsx
apps/mobile/app/login.tsx
apps/mobile/app/register.tsx
apps/mobile/assets/fonts/SpaceMono-Regular.ttf
apps/mobile/assets/images/android-icon-background.png
apps/mobile/assets/images/android-icon-foreground.png
apps/mobile/assets/images/android-icon-monochrome.png
apps/mobile/assets/images/favicon.png
apps/mobile/assets/images/icon.png
apps/mobile/assets/images/splash-icon.png
apps/mobile/eas.json
apps/mobile/eslint.config.js
apps/mobile/package.json
apps/mobile/scripts/validate-release-api.cjs
apps/mobile/src/api/api-config-script.test.ts
apps/mobile/src/api/api-config.test.ts
apps/mobile/src/api/api-config.ts
apps/mobile/src/api/client.test.ts
apps/mobile/src/api/client.ts
apps/mobile/src/auth/AccountQueryProvider.test.tsx
apps/mobile/src/auth/AccountQueryProvider.tsx
apps/mobile/src/auth/RegistrationForm.test.tsx
apps/mobile/src/auth/RegistrationForm.tsx
apps/mobile/src/auth/session-store.ts
apps/mobile/src/catalog/CachedThumbnail.test.tsx
apps/mobile/src/catalog/CachedThumbnail.tsx
apps/mobile/src/catalog/TrainScreen.test.tsx
apps/mobile/src/catalog/catalog.test.ts
apps/mobile/src/catalog/catalog.ts
apps/mobile/src/catalog/media-url.test.ts
apps/mobile/src/catalog/media-url.ts
apps/mobile/src/catalog/thumbnail-cache.ts
apps/mobile/src/catalog/thumbnail-files.test.ts
apps/mobile/src/catalog/thumbnail-files.ts
apps/mobile/src/cycle/CycleEntryForm.test.tsx
apps/mobile/src/cycle/CycleEntryForm.tsx
apps/mobile/src/db/catalog-migration.test.ts
apps/mobile/src/db/database.test.ts
apps/mobile/src/db/database.ts
apps/mobile/src/db/media-cache.test.ts
apps/mobile/src/profile/ProfileScreen.test.tsx
apps/mobile/src/profile/profile-form.test.ts
apps/mobile/src/profile/profile-form.ts
apps/mobile/src/progress/ExerciseProgressDetails.test.tsx
apps/mobile/src/progress/ExerciseProgressDetails.tsx
apps/mobile/src/progress/ExerciseProgressPanel.tsx
apps/mobile/src/progress/progress-view.test.ts
apps/mobile/src/progress/progress-view.ts
apps/mobile/src/routines/RoutineManager.test.tsx
apps/mobile/src/routines/RoutineManager.tsx
apps/mobile/src/routines/routines.test.ts
apps/mobile/src/routines/routines.ts
apps/mobile/src/sync/SyncCoordinator.tsx
apps/mobile/src/sync/conflict-resolution.test.ts
apps/mobile/src/sync/conflict-resolution.ts
apps/mobile/src/sync/queue-policy.test.ts
apps/mobile/src/sync/queue-policy.ts
apps/mobile/src/sync/revisions.test.ts
apps/mobile/src/sync/revisions.ts
apps/mobile/src/sync/sync-engine.test.ts
apps/mobile/src/sync/sync-engine.ts
apps/mobile/src/testing/sqlite-native.ts
apps/mobile/src/training/account-storage.integration.test.ts
apps/mobile/src/training/train-screen.test.tsx
apps/mobile/src/training/training-store.test.ts
apps/mobile/src/training/training-store.ts
apps/mobile/src/training/workout-domain.test.ts
apps/mobile/src/training/workout-domain.ts
apps/mobile/src/ui/components.test.tsx
apps/mobile/src/ui/components.tsx
apps/mobile/src/ui/theme.ts
apps/mobile/tsconfig.json
apps/web/.env.example
apps/web/.env.test.example
apps/web/AGENTS.md
apps/web/app/(app)/cycle/page.tsx
apps/web/app/(app)/dashboard/page.tsx
apps/web/app/(app)/layout.tsx
apps/web/app/(app)/profile/page.test.tsx
apps/web/app/(app)/profile/page.tsx
apps/web/app/(app)/progress/page.tsx
apps/web/app/(app)/workout/[id]/page.test.tsx
apps/web/app/(app)/workout/[id]/page.tsx
apps/web/app/(app)/workout/new/page.test.tsx
apps/web/app/(app)/workout/new/page.tsx
apps/web/app/(app)/workout/page.test.tsx
apps/web/app/(app)/workout/page.tsx
apps/web/app/(app)/workout/routines/[id]/page.test.tsx
apps/web/app/(app)/workout/routines/[id]/page.tsx
apps/web/app/(app)/workout/routines/new/page.tsx
apps/web/app/(auth)/login/page.test.tsx
apps/web/app/(auth)/login/page.tsx
apps/web/app/(auth)/register/page.tsx
apps/web/app/globals.css
apps/web/app/layout.tsx
apps/web/app/page.tsx
apps/web/app/providers.tsx
apps/web/components/AppShell.tsx
apps/web/components/CalendarioActividad.tsx
apps/web/components/EditorRutina.test.tsx
apps/web/components/EditorRutina.tsx
apps/web/components/ExerciseChart.test.tsx
apps/web/components/ExerciseChart.tsx
apps/web/components/ExerciseDetail.test.tsx
apps/web/components/ExerciseDetail.tsx
apps/web/components/ExerciseMedia.test.tsx
apps/web/components/ExerciseMedia.tsx
apps/web/components/ExercisePicker.test.tsx
apps/web/components/ExercisePicker.tsx
apps/web/components/MapaMuscular.tsx
apps/web/components/ReadinessCheckin.tsx
apps/web/components/RestTimer.tsx
apps/web/components/exercise-detail/Activity.tsx
apps/web/components/exercise-detail/ProgressPlot.tsx
apps/web/components/progress/ProgressPage.tsx
apps/web/components/ui/Button.tsx
apps/web/components/ui/Card.tsx
apps/web/components/ui/Icon.tsx
apps/web/components/ui/Input.tsx
apps/web/components/ui/Stepper.test.tsx
apps/web/components/ui/Stepper.tsx
apps/web/components/workouts/SetEditDialog.tsx
apps/web/eslint.config.mjs
apps/web/lib/api-origin.test.ts
apps/web/lib/api-origin.ts
apps/web/lib/api.test.ts
apps/web/lib/api.ts
apps/web/lib/auth-api.test.ts
apps/web/lib/auth-api.ts
apps/web/lib/auth-session.ts
apps/web/lib/auth-store.test.ts
apps/web/lib/auth-store.ts
apps/web/lib/civil-date.ts
apps/web/lib/cycle-api.test.ts
apps/web/lib/cycle-api.ts
apps/web/lib/cycle-date.ts
apps/web/lib/cycle-view-state.test.ts
apps/web/lib/cycle-view-state.ts
apps/web/lib/exercise-i18n.ts
apps/web/lib/exercise-media.test.ts
apps/web/lib/exercise-media.ts
apps/web/lib/generated-api.test.ts
apps/web/lib/generated-api.ts
apps/web/lib/generated-domain-consumers.test.ts
apps/web/lib/motivacion.ts
apps/web/lib/progress-api.test.ts
apps/web/lib/progress-api.ts
apps/web/lib/readiness-api.test.ts
apps/web/lib/readiness-api.ts
apps/web/lib/remote-data.test.ts
apps/web/lib/remote-data.ts
apps/web/lib/remote-read-boundary.test.ts
apps/web/lib/training-api.test.ts
apps/web/lib/training-api.ts
apps/web/lib/types.ts
apps/web/lib/utils.ts
apps/web/next-env.d.ts
apps/web/next.config.ts
apps/web/package.json
apps/web/playwright.config.options.ts
apps/web/playwright.config.ts
apps/web/postcss.config.cjs
apps/web/tailwind.config.ts
apps/web/tests/a11y/exercise-detail.a11y.test.tsx
apps/web/tests/a11y/render-accessible.tsx
apps/web/tests/a11y/smoke.a11y.test.tsx
apps/web/tests/a11y/workout.a11y.test.tsx
apps/web/tests/e2e/calendar.spec.ts
apps/web/tests/e2e/login.spec.ts
apps/web/tests/e2e/training.spec.ts
apps/web/tests/e2e/user-context.spec.ts
apps/web/tests/fixtures/exercise-detail.ts
apps/web/tests/unit/calendar-month.test.tsx
apps/web/tests/unit/cycle-opt-in-lifecycle.test.tsx
apps/web/tests/unit/cycle-opt-in.test.tsx
apps/web/tests/unit/dashboard.test.tsx
apps/web/tests/unit/exercise-detail-contexts.test.tsx
apps/web/tests/unit/exercise-progress.test.tsx
apps/web/tests/unit/package-scripts.test.ts
apps/web/tests/unit/playwright-config.test.ts
apps/web/tests/unit/progress-page.test.tsx
apps/web/tests/unit/smoke.test.ts
apps/web/tsconfig.json
apps/web/vitest.a11y.config.ts
apps/web/vitest.config.ts
apps/web/vitest.setup.ts
docs/operations/checkpoint-2026-08-31.md
docs/operations/implementation-status.md
docs/operations/mobile-durability.md
docs/operations/mobile-save-state.md
docs/operations/staging.md
docs/quality/fundamentos.md
docs/superpowers/plans/2026-08-09-exercise-catalog-integration.md
docs/superpowers/plans/2026-08-19-evry-01-fundamentos-seguridad.md
docs/superpowers/plans/2026-08-19-evry-02-entrenamiento-progreso-ficha.md
docs/superpowers/plans/2026-08-19-evry-03-ciclo-privacidad-inclusion.md
docs/superpowers/plans/2026-08-19-evry-04-experiencia-accesibilidad-rendimiento.md
docs/superpowers/plans/2026-08-19-evry-05-verificacion-publicacion.md
docs/superpowers/plans/2026-08-19-evry-release-plan-index.md
docs/superpowers/plans/2026-09-04-monthly-calendar.md
docs/superpowers/plans/2026-09-04-web-cycle-opt-in.md
docs/superpowers/plans/2026-09-09-mobile-routines-profile-parity.md
docs/superpowers/plans/2026-09-11-web-generated-training-client.md
docs/superpowers/plans/2026-09-12-web-auth-profile-generated.md
docs/superpowers/plans/2026-09-14-web-exercise-detail.md
docs/superpowers/specs/2026-08-09-exercise-catalog-integration-design.md
docs/superpowers/specs/2026-08-19-evry-release-candidate-design.md
docs/superpowers/specs/2026-09-12-web-auth-profile-generated.md
packages/api-client/openapi/backend.lock.json
packages/api-client/openapi/evry-v1.json
packages/api-client/package.json
packages/api-client/src/index.test.ts
packages/api-client/src/index.ts
packages/api-client/src/schema.ts
packages/api-client/tsconfig.json
packages/design-tokens/package.json
packages/design-tokens/src/index.test.ts
packages/design-tokens/src/index.ts
packages/design-tokens/tsconfig.json
packages/domain/package.json
packages/domain/src/civil-date.test.ts
packages/domain/src/civil-date.ts
packages/domain/src/index.ts
packages/domain/tsconfig.json
scripts/api-contract.mjs
scripts/api-contract.test.mjs
```

### Anexo F. Inventario rastreado de implementación y documentación backend

Incluye módulos, esquema, migraciones, pruebas, contrato y procedimientos. Se omiten datos privados, dependencias instaladas y salidas de compilación.

```text
.github/workflows/ci.yml
docs/operations/api-performance.md
docs/operations/auth-cookie-validation.md
docs/operations/cycle-entry-moves.md
docs/operations/dependency-security.md
docs/operations/epley-record-repair.md
docs/operations/integration-tests.md
docs/operations/migration-runbook.md
docs/operations/mobile-registration.md
docs/operations/password-byte-limits.md
docs/operations/proxy-dependency-update.md
docs/operations/shared-rate-limits.md
docs/operations/vercel-staging.md
docs/plans/2026-08-31-postgresql-contracts.md
docs/superpowers/plans/2026-09-11-routine-input-bounds.md
openapi/client.generated.ts
openapi/evry-v1.json
prisma/import-exercises.ts
prisma/migrations/20260426222535_init/migration.sql
prisma/migrations/20260427210953_add_routines/migration.sql
prisma/migrations/20260809120000_enrich_exercises/migration.sql
prisma/migrations/20260813190000_add_routine_series_plan/migration.sql
prisma/migrations/20260819090000_release_invariants/migration.sql
prisma/migrations/20260819130000_exercise_stat_records/migration.sql
prisma/migrations/20260829010000_offline_sync_expand/migration.sql
prisma/migrations/20260829020000_refresh_token_families/migration.sql
prisma/migrations/20261012010000_shared_rate_limits/migration.sql
prisma/migrations/20261012020000_quota_microsecond_precision/migration.sql
prisma/migrations/20261012030000_epley_binary64_records/migration.sql
prisma/migrations/migration_lock.toml
prisma/schema.prisma
prisma/seed-data/exercises.json
prisma/seed.ts
scripts/benchmark-api-server.cjs
scripts/benchmark-api.ts
scripts/generate-openapi.cjs
scripts/migrate-test-database.ts
scripts/verify-exercise-assets.ts
scripts/verify-exercise-import.ts
src/app.module.ts
src/common/dates/civil-date.spec.ts
src/common/dates/civil-date.ts
src/common/decorators/current-user.decorator.ts
src/common/filters/api-exception.filter.spec.ts
src/common/filters/api-exception.filter.ts
src/common/filters/prisma-connection-exception.filter.spec.ts
src/common/filters/prisma-connection-exception.filter.ts
src/common/filters/prisma-exception.filter.spec.ts
src/common/filters/prisma-exception.filter.ts
src/common/http/api-version.middleware.spec.ts
src/common/http/api-version.middleware.ts
src/common/http/nullable-json.interceptor.ts
src/common/http/request-id.middleware.spec.ts
src/common/http/request-id.middleware.ts
src/common/rate-limit/rate-limit.decorator.ts
src/common/rate-limit/rate-limit.guard.ts
src/common/rate-limit/rate-limit.store.ts
src/common/rate-limit/vercel-client-quota.spec.ts
src/common/types/cycle-estimate.ts
src/config/environment.spec.ts
src/config/environment.ts
src/configure-app.ts
src/health/dto/health.dto.ts
src/health/health.controller.ts
src/health/health.module.ts
src/health/health.service.spec.ts
src/health/health.service.ts
src/http-listener.spec.ts
src/http-listener.ts
src/main.spec.ts
src/main.ts
src/media/exercise-assets-verifier.spec.ts
src/media/exercise-assets-verifier.ts
src/media/exercise-media.middleware.spec.ts
src/media/exercise-media.middleware.ts
src/modules/adaptive/adaptive.controller.ts
src/modules/adaptive/adaptive.module.ts
src/modules/adaptive/adaptive.service.spec.ts
src/modules/adaptive/adaptive.service.ts
src/modules/adaptive/dto/recommendation.dto.ts
src/modules/auth/auth-rate-limit.spec.ts
src/modules/auth/auth.controller.spec.ts
src/modules/auth/auth.controller.ts
src/modules/auth/auth.module.ts
src/modules/auth/auth.service.spec.ts
src/modules/auth/auth.service.ts
src/modules/auth/dto/auth-dto.spec.ts
src/modules/auth/dto/auth-response.dto.ts
src/modules/auth/dto/login.dto.ts
src/modules/auth/dto/refresh-token.dto.ts
src/modules/auth/dto/register.dto.ts
src/modules/auth/jwt-auth.guard.ts
src/modules/auth/jwt.strategy.ts
src/modules/auth/mobile-auth.controller.ts
src/modules/auth/refresh-cookie.spec.ts
src/modules/auth/refresh-cookie.ts
src/modules/auth/web-origin.guard.spec.ts
src/modules/auth/web-origin.guard.ts
src/modules/cycle/cycle.controller.ts
src/modules/cycle/cycle.module.ts
src/modules/cycle/cycle.service.spec.ts
src/modules/cycle/cycle.service.ts
src/modules/cycle/dto/cycle-calendar-query.dto.ts
src/modules/cycle/dto/cycle-response.dto.ts
src/modules/cycle/dto/cycle.dto.ts
src/modules/exercises/dto/create-exercise.dto.ts
src/modules/exercises/dto/exercise-page.dto.ts
src/modules/exercises/dto/list-exercises.dto.spec.ts
src/modules/exercises/dto/list-exercises.dto.ts
src/modules/exercises/exercise-catalog.spec.ts
src/modules/exercises/exercise-catalog.ts
src/modules/exercises/exercise-localization.ts
src/modules/exercises/exercise-visibility.spec.ts
src/modules/exercises/exercise-visibility.ts
src/modules/exercises/exercises.controller.ts
src/modules/exercises/exercises.module.ts
src/modules/exercises/exercises.service.spec.ts
src/modules/exercises/exercises.service.ts
src/modules/progress/dto/activity-query.dto.ts
src/modules/progress/dto/exercise-progress-query.dto.ts
src/modules/progress/dto/overview-query.dto.ts
src/modules/progress/dto/progress-query.dto.spec.ts
src/modules/progress/dto/progress-response.dto.ts
src/modules/progress/history-cursor.spec.ts
src/modules/progress/history-cursor.ts
src/modules/progress/metrics.spec.ts
src/modules/progress/metrics.ts
src/modules/progress/progress-period.spec.ts
src/modules/progress/progress-period.ts
src/modules/progress/progress.controller.ts
src/modules/progress/progress.module.ts
src/modules/progress/progress.repository.spec.ts
src/modules/progress/progress.repository.ts
src/modules/progress/progress.service.spec.ts
src/modules/progress/progress.service.ts
src/modules/progress/progress.types.ts
src/modules/readiness/dto/readiness.dto.ts
src/modules/readiness/readiness.controller.ts
src/modules/readiness/readiness.module.ts
src/modules/readiness/readiness.service.spec.ts
src/modules/readiness/readiness.service.ts
src/modules/routines/dto/routine-response.dto.ts
src/modules/routines/dto/routine.dto.spec.ts
src/modules/routines/dto/routine.dto.ts
src/modules/routines/routines.controller.ts
src/modules/routines/routines.module.ts
src/modules/routines/routines.service.spec.ts
src/modules/routines/routines.service.ts
src/modules/sync/dto/sync-workout-response.dto.ts
src/modules/sync/dto/sync-workout.dto.spec.ts
src/modules/sync/dto/sync-workout.dto.ts
src/modules/sync/revision-conflict.exception.ts
src/modules/sync/sync.controller.ts
src/modules/sync/sync.module.ts
src/modules/sync/sync.service.spec.ts
src/modules/sync/sync.service.ts
src/modules/users/dto/update-user.dto.spec.ts
src/modules/users/dto/update-user.dto.ts
src/modules/users/dto/user-response.dto.ts
src/modules/users/users.controller.ts
src/modules/users/users.module.ts
src/modules/users/users.service.ts
src/modules/workouts/dto/list-workouts-query.dto.ts
src/modules/workouts/dto/workout-response.dto.ts
src/modules/workouts/dto/workout.dto.spec.ts
src/modules/workouts/dto/workout.dto.ts
src/modules/workouts/exercise-stats.service.spec.ts
src/modules/workouts/exercise-stats.service.ts
src/modules/workouts/servicio-sesion-activa.spec.ts
src/modules/workouts/servicio-sesion-activa.ts
src/modules/workouts/workout-transaction.spec.ts
src/modules/workouts/workout-transaction.ts
src/modules/workouts/workouts.controller.spec.ts
src/modules/workouts/workouts.controller.ts
src/modules/workouts/workouts.module.ts
src/modules/workouts/workouts.service.spec.ts
src/modules/workouts/workouts.service.ts
src/openapi/assert-complete.spec.ts
src/openapi/assert-complete.ts
src/openapi/auth-user-contract.spec.ts
src/openapi/exercises-contract.spec.ts
src/openapi/ok.dto.ts
src/openapi/openapi-document.ts
src/openapi/routines-contract.spec.ts
src/openapi/training-contract.spec.ts
src/openapi/wellbeing-contract.spec.ts
src/prisma/database-url.spec.ts
src/prisma/database-url.ts
src/prisma/exercise-stat-migration.spec.ts
src/prisma/offline-sync-invariants.spec.ts
src/prisma/prisma-client.spec.ts
src/prisma/prisma-client.ts
src/prisma/prisma.module.ts
src/prisma/prisma.service.spec.ts
src/prisma/prisma.service.ts
src/prisma/refresh-family-invariants.spec.ts
src/prisma/release-invariants.spec.ts
src/prisma/unique-conflict.ts
src/proxy-dependency.spec.ts
src/test-timezone.spec.ts
test/api-benchmark.spec.ts
test/api.performance-spec.ts
test/app.integration-spec.ts
test/auth.integration-spec.ts
test/benchmark-process.spec.ts
test/benchmark-startup.spec.ts
test/cycle-calendar.integration-spec.ts
test/daily-context.integration-spec.ts
test/database-safety.ts
test/fixtures/benchmark-shutdown-child.cjs
test/fixtures/benchmark-startup/scripts/benchmark-api-server.cjs
test/fixtures/legacy-migration.sql
test/guard-test-database.ts
test/helpers/api-benchmark.ts
test/helpers/benchmark-process.ts
test/helpers/create-integration-app.ts
test/helpers/memory-rate-limit-store.ts
test/helpers/migration-rehearsal.ts
test/jest-integration.json
test/jest-migration.json
test/jest-performance.json
test/media.integration-spec.ts
test/migration-safety.spec.ts
test/populated.migration-spec.ts
test/progress.integration-spec.ts
test/rate-limit.integration-spec.ts
test/routines.integration-spec.ts
test/setup-jest.ts
test/sync.integration-spec.ts
test/workouts.integration-spec.ts
```

### Anexo G. Alcance y mantenimiento de este documento

Este informe reúne todo lo reconstruible con las fuentes consultadas, sin inventar decisiones o resultados ausentes. No reproduce cada línea de los logs ni secretos o datos personales. Los registros originales siguen siendo la evidencia primaria. Si cambia el estado, crear una actualización fechada o modificar explícitamente la fecha de corte, preservando la diferencia entre evidencia histórica y comprobación nueva.

