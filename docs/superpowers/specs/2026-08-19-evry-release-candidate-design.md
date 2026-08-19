# EVRY: diseño de cierre para candidato de lanzamiento

**Fecha:** 2026-08-19

**Estado:** aprobado en conversación; pendiente de revisión de esta especificación

**Repositorios:** `EVRY` y `EVRY-Backend`

**Alcance de entrega:** código terminado, probado, documentado y publicado en GitHub; sin despliegue

## 1. Decisión

EVRY se cerrará como un producto de seguimiento de fuerza confiable, inclusivo y privado. La prioridad no será añadir comunidad, integraciones o programas avanzados, sino garantizar que los recorridos existentes produzcan datos correctos, comuniquen los errores con honestidad y sean seguros para una beta controlada.

La identidad visual se refinará para que EVRY se reconozca por su jerarquía editorial, lenguaje preciso, datos accionables y movimiento contenido. Se eliminarán señales de plantilla genérica: afirmaciones sin respaldo, métricas inventadas, frases fitness inseguras, exceso de gradientes, iconografía remota y tarjetas repetitivas sin propósito.

## 2. Alcance

### Incluido

- Registro, inicio de sesión, renovación y cierre de sesión.
- Perfil, preferencias e inclusión de `Prefiero no decirlo`.
- Creación y edición de rutinas con objetivos independientes por serie.
- Inicio, reanudación, edición, eliminación, cancelación y finalización de sesiones.
- Catálogo de 1.324 ejercicios con búsqueda, zona, músculo y equipamiento.
- Mapa muscular propio para frente/espalda y siluetas masculina/femenina.
- Progreso basado exclusivamente en datos reales y periodos definidos.
- Check-in de disposición y recomendaciones conservadoras.
- Diario menstrual opcional, privado y marcado como estimación.
- Exportación y eliminación de datos personales sensibles.
- Rendimiento, accesibilidad, pruebas automatizadas y documentación.
- Commits por hito y publicación final de ambos repositorios en GitHub.

### Excluido

- Despliegue, dominio, hosting y configuración de infraestructura pública.
- Comunidad social, mensajería, comparaciones o perfiles públicos.
- OAuth, Apple Health, Garmin y otros dispositivos.
- Programas multisemana o prescripción automática avanzada.
- Diagnóstico médico o recomendaciones clínicas.
- Producción de 1.324 animaciones biomecánicas originales.

## 3. Principios del producto

1. **Los datos deben ser verdaderos.** Un error de red nunca se presentará como cero, ausencia de sesiones o falta de progreso.
2. **La aplicación orienta; no prescribe.** Readiness y ciclo aportan contexto. No modificarán automáticamente la carga ni se expresarán como certeza médica.
3. **El ciclo es opcional y privado.** Registrar sexo no será obligatorio para entrenar. El seguimiento se habilitará mediante consentimiento explícito y podrá borrarse.
4. **La sesión es la unidad central.** El producto debe permitir planear, ejecutar, corregir y comprender una sesión sin callejones sin salida.
5. **Sin dependencias remotas de interfaz.** Fuentes e iconos necesarios para renderizar EVRY se servirán localmente. Las dependencias de código y licencias se documentarán.
6. **La personalidad surge de decisiones reales.** El copy, los estados y las visualizaciones responderán al contexto del usuario; no se rellenarán espacios con slogans.

## 4. Arquitectura funcional

### 4.1 Frontera API

El frontend mantendrá una única capa de acceso HTTP tipada. Cada operación devolverá éxito o un error normalizado con código, mensaje seguro y posibilidad de reintento. Las pantallas usarán cuatro estados explícitos: `cargando`, `error`, `vacío` y `éxito`.

Los contratos duplicados se consolidarán en tipos por dominio. Las respuestas no se convertirán silenciosamente en arreglos vacíos. Las mutaciones distinguirán entre `guardado` y `recarga`: si una serie se guardó pero falló la actualización visual, se informará sin ofrecer una acción que pueda duplicarla.

### 4.2 Fechas civiles

Las fechas de calendario se representarán como `AAAA-MM-DD` y se manipularán por componentes, nunca mediante `new Date('AAAA-MM-DD')` ni `toISOString()` para determinar el día local. Una utilidad única cubrirá:

- día local actual;
- parseo y formato de fechas civiles;
- límites inclusivos de mes y periodo;
- conversión de timestamps de sesiones a la zona local;
- etiquetas accesibles en español.

Backend y frontend validarán rangos, fechas futuras y orden `desde <= hasta`. Las pruebas fijarán la zona `America/Bogota` e incluirán las 18:59/19:01, cambios de mes y fin de año.

### 4.3 Rutinas y sesiones

La actualización de una rutina será transaccional. Antes de vincular un ejercicio personalizado, el backend comprobará que sea global o pertenezca al usuario autenticado.

Solo podrá existir una sesión activa por usuario. El inicio será idempotente ante solicitudes concurrentes. Una sesión activa permitirá:

- agregar una serie sin duplicados accidentales;
- editar o eliminar una serie con confirmación adecuada;
- registrar peso, repeticiones, duración y RPE válidos;
- cancelar una sesión explícitamente;
- finalizar únicamente cuando tenga datos útiles.

Después de finalizar, la sesión será inmutable desde la experiencia normal. Si se habilita una corrección histórica, estadísticas y récords se recalcularán dentro de la misma transacción. La finalización y la agregación de estadísticas serán atómicas e idempotentes.

### 4.4 Progreso

Cada tarjeta indicará periodo y definición. El resumen de 30 días solo incluirá datos de esos 30 días. El historial por ejercicio devolverá los registros recientes en orden cronológico para visualización. Los récords se calcularán con reglas documentadas y datasets controlados.

Se eliminará el objetivo móvil `sesiones + 1`. Hasta que exista una meta numérica elegida por el usuario, EVRY mostrará comparaciones verificables: sesiones frente al periodo anterior, volumen, frecuencia semanal, récords y distribución muscular.

Las consultas se agregarán en base de datos y estarán paginadas; no se cargarán todas las series ni 200 entrenamientos completos para pintar una pantalla.

### 4.5 Orientación adaptativa

El motor dejará de aplicar multiplicadores hormonales a la carga. Su resultado será una sugerencia conservadora y explicable:

- `MANTENER` por defecto;
- `PROGRESAR` solo después de dos sesiones comparables completadas con técnica percibida estable, RPE moderado y readiness del mismo día no bajo;
- `REDUCIR` cuando exista fatiga reciente o dificultad repetida;
- datos insuficientes producirán una invitación a registrar más sesiones, no una recomendación numérica.

Cada respuesta incluirá las evidencias que activaron la regla. El ciclo podrá acompañar la explicación como contexto opcional, nunca como orden ni certeza fisiológica.

### 4.6 Ciclo, consentimiento y privacidad

El contrato de visibilidad será único: cualquier persona que active voluntariamente el seguimiento podrá usar el diario, sin deducciones basadas únicamente en sexo. El registro ofrecerá `Prefiero no decirlo` y explicará por qué se pregunta cada dato.

El diario permitirá crear, editar y borrar entradas. Desactivar el seguimiento ocultará el módulo y explicará que los datos se conservan hasta que la persona decida borrarlos. Habrá acciones para exportar los datos propios en JSON y eliminar la cuenta. Las rutas sensibles respetarán el opt-in y evitarán inventar energía o ánimo al editar campos vacíos.

Las fases proyectadas se etiquetarán como estimaciones. Una sola implementación calculará la fase para evitar contradicciones entre calendario, dashboard y backend.

## 5. Seguridad e integridad del backend

- El proceso fallará al iniciar si faltan secretos JWT seguros o variables obligatorias.
- Registro, login y refresh tendrán límites de frecuencia.
- La cookie de refresh usará atributos y ruta coherentes al crearla y eliminarla.
- Los DTO aplicarán límites, valores mínimos/máximos y paginación acotada.
- Las restricciones Prisma previsibles se traducirán a respuestas 4xx comprensibles.
- Todos los accesos a ejercicios, rutinas, sesiones, sets, readiness y ciclo comprobarán propiedad.
- Las operaciones compuestas usarán transacciones y serán reintentables sin duplicar efectos.
- Swagger documentará las rutas reales; producción podrá desactivarlo por configuración.
- Los medios usarán caché revalidable o nombres versionados, no `immutable` sobre nombres mutables.

## 6. Diseño de experiencia

### 6.1 Sistema visual

EVRY conservará su fondo profundo y azul eléctrico, pero reducirá brillos y degradados a momentos de énfasis. La jerarquía se basará en espacio, tipografía, bordes y contraste. Se reemplazará Material Symbols remoto por un conjunto SVG local coherente.

La fuente se servirá desde el proyecto y tendrá licencia documentada. Todas las animaciones respetarán `prefers-reduced-motion`. Los estados de foco serán visibles y el zoom del navegador no se limitará.

### 6.2 Landing y autenticación

La landing mostrará únicamente capacidades demostrables: crear rutinas, registrar sesiones, entender progreso y usar el diario opcional. `Comunidad` se retirará mientras no exista una comunidad real. Las llamadas a la acción serán concretas y no usarán prueba social ficticia.

Login y registro compartirán una estructura clara, autocompletado correcto, errores junto al campo y navegación de regreso. Recordar usuario persistirá solo el correo, nunca la contraseña.

### 6.3 Dashboard

La primera pantalla responderá tres preguntas: qué puedo entrenar hoy, cómo me sentí recientemente y cuál es mi próximo paso. La acción primaria será iniciar o continuar la sesión correspondiente. Motivación y ciclo serán contenido secundario y contextual, no relleno dominante.

### 6.4 Catálogo y mapa muscular

Las listas usarán JPG estático. El GIF se cargará solo al solicitar vista previa o abrir detalle, con control de reproducción y alternativa para movimiento reducido. Los filtros tendrán semántica accesible y conservarán búsqueda, zona, músculo y equipo.

El mapa muscular distinguirá músculo principal y secundario, incluirá leyenda, navegación por teclado y relación entre región y ejercicios seleccionados. Las siluetas no implicarán diferencias de capacidad.

### 6.5 Sesión y progreso

La sesión priorizará lectura rápida bajo esfuerzo: ejercicio actual, serie anterior, campos de la siguiente serie y descanso. Botones, stepper, pestañas y temporizador tendrán nombres accesibles y anuncios no invasivos.

Progreso usará una cuadrícula equilibrada, detalle del día seleccionado y gráficos con resumen textual. No habrá espacios decorativos sin información ni objetivos artificiales.

## 7. Rendimiento

- Las listas de ejercicios no reproducirán GIF simultáneamente.
- Dashboard, calendario y progreso cancelarán solicitudes obsoletas y evitarán refetch innecesario.
- Recharts y módulos pesados se cargarán de forma diferida cuando sea posible.
- Las consultas usarán rangos y selección de campos mínimos.
- Presupuesto orientativo de primera carga: landing y autenticación <= 130 kB; rutas de aplicación <= 160 kB; progreso <= 190 kB.
- Las pruebas de carga medirán login, catálogo, sesiones y progreso con límites documentados.

## 8. Accesibilidad

La meta es WCAG 2.2 AA en los recorridos principales:

- zoom permitido y diseño funcional al 200%;
- navegación completa por teclado;
- foco atrapado y restaurado en diálogos;
- nombres accesibles para iconos, campos, steppers, tabs y temporizador;
- `aria-live` para resultados y descanso sin anuncios excesivos;
- contraste AA y objetivos táctiles suficientes;
- alternativas textuales para gráficos y movimiento;
- auditoría automatizada con axe más inspección manual.

## 9. Estrategia de pruebas

### Frontend

- Vitest y Testing Library para utilidades, estados API y componentes críticos.
- axe para accesibilidad de formularios, navegación y diálogos.
- Playwright en escritorio y viewport móvil para ocho recorridos:
  1. registro inclusivo y opt-in;
  2. login, refresh y logout;
  3. crear y editar rutina;
  4. iniciar y reanudar sesión;
  5. agregar, corregir y borrar serie;
  6. finalizar y comprobar progreso;
  7. editar perfil y recuperar errores;
  8. crear, editar y borrar una entrada del ciclo.

### Backend

- Unitarias para reglas, fechas, permisos y métricas.
- Integración con Supertest y una base PostgreSQL exclusiva de pruebas.
- Casos de concurrencia, propiedad cruzada, transacción fallida, idempotencia y paginación.
- Un guard impedirá ejecutar limpieza de pruebas si `TEST_DATABASE_URL` coincide con `DATABASE_URL`.

### Puerta final

La entrega solo se considerará terminada cuando pasen build, tipos, lint sin mutación, pruebas unitarias, integración, E2E, axe, verificación de 1.324 medios y una inspección manual en navegador sin errores de consola.

## 10. Medios y licencias

Los 1.324 JPG y GIF actuales seguirán alojados en el backend y no requerirán un CDN. Son material de Gym Visual y conservarán atribución y restricciones en `NOTICE-MEDIA.md`; esta excepción impide afirmar que toda la biblioteca visual sea propiedad intelectual de EVRY.

EVRY sí será independiente operativamente: no cargará estos medios, iconos o fuentes desde servicios externos. Una futura biblioteca audiovisual propia podrá sustituir archivos mediante identificadores estables sin cambiar el contrato del catálogo.

## 11. Entrega y control de cambios

Los cambios se dividirán en commits verificables por hito: fundamentos y fechas; seguridad e integridad; sesiones y progreso; privacidad/ciclo; identidad y accesibilidad; pruebas/rendimiento; documentación. Cada commit debe dejar sus verificaciones asociadas en verde.

La entrega final incluirá ambos repositorios limpios, ramas publicadas en GitHub, instrucciones reproducibles de ejecución y pruebas, inventario de decisiones y cualquier limitación externa restante. No se iniciará ni configurará un despliegue.

## 12. Criterio de terminado

EVRY estará terminado cuando los recorridos incluidos sean funcionales en móvil y escritorio, los datos mostrados coincidan con consultas controladas, los errores no se oculten, los datos privados puedan gestionarse, las reglas adaptativas sean conservadoras, no existan dependencias remotas de interfaz, las puertas automatizadas estén verdes y la documentación describa exactamente el comportamiento publicado.
