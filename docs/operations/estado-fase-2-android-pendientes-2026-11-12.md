# EVRY — Estado de Fase 2 Android y pendientes

**Corte:** 12 de noviembre de 2026. Este documento recopila el estado observable en el código local y la evidencia histórica disponible; no certifica una entrega final ni una nueva ejecución de CI o de dispositivo. El árbol móvil contiene cambios locales, incluidos archivos aún no versionados.

## Estado resumido

La Fase 2 tiene funcionalidades implementadas y una APK integrada instalada en el OPPO; **la aceptación física aún está incompleta**. La APK v12 anterior fue probada según su [informe](rediseno-visual-v12-2026-11-12.md); esos resultados no prueban automáticamente los cambios posteriores de Fase 2.

**Actualización del corte:** se compiló e instaló in-place la APK integrada `1.0.12-local` (`versionCode 13`) en el OPPO Android 11. La sesión «Verificacion local» permaneció activa y la primera instalación conservó la fecha 2026-10-19. Se observaron los canales `rest` y `supplements`; se creó un suplemento de prueba y se marcó como tomado. La entrega efectiva de avisos y los demás recorridos siguen pendientes de comprobación; no se afirma una aceptación integral.

La APK `D:/e58out13/app/outputs/apk/release/app-release.apk` tiene SHA-256 `9a89fd45fc1c761635c9cb52e639a964dbab48a6cfc6f5601855880082ddbe5f` y certificado SHA-256 `f673b39fb0e8543e6a96a2b9250b9e1a5ec2c80faa2a09ad25b726f06e045ac0`, coincidente con el certificado documentado para v12. La compilación figura como `BUILD SUCCESSFUL` en `D:/DatosPC/Temp/opencode/v13-build-final.log`.

En el OPPO se creó el registro sintético `PruebaEVRY`, se marcó y desmarcó la toma y se configuró un recordatorio semanal para el jueves a las 23:09. Con la app en segundo plano, Android mostró a las 23:09 un registro de notificación del canal `supplements`, con título neutro y una acción `Tomado`, según `dumpsys notification`. No se consiguió accionar el botón desde el panel, por lo que **la persistencia mediante esa acción no está verificada físicamente**. Después se eliminó únicamente el suplemento sintético y la pantalla volvió a mostrar que no hay suplementos configurados. El teléfono tenía el modo silencioso activo: no se comprobó sonido ni vibración.

En una sesión libre sintética se añadió «A horcajadas maltés», se completó una serie de 5 kg × 10 y se observó la barra de descanso de 02:00. Con la app en segundo plano, `dumpsys notification` mostró una notificación `Descanso terminado` del canal `rest`. Al terminar la sesión se vio el resumen con 1 serie y 50 kg de volumen, sin récord declarado. La sesión de prueba quedó guardada localmente y pendiente de sincronización; no se eliminó ni se afirmó su sincronización. Capturas: `D:/DatosPC/Temp/opencode/evry-v13-rest-start.png` y `D:/DatosPC/Temp/opencode/evry-v13-finish.png`.

| Área | Evidencia en código local | Pendiente o límite |
|---|---|---|
| Suplementos | Pantalla `apps/mobile/app/supplements.tsx`, repositorio SQLite, estado y registro de tomas en `apps/mobile/src/supplements/`; accesos desde Inicio y Perfil. | Se comprobó creación, marcado, desmarcado y eliminación del registro sintético en el OPPO. No se afirma sincronización con backend ni aceptación completa de migración. |
| Recordatorios | `apps/mobile/src/notifications/` implementa permisos, canales, programación semanal de suplementos y aviso de descanso. | Verificar permisos concedidos y denegados, entrega, cancelación y comportamiento en segundo plano en Android real; la programación en código no garantiza entrega del sistema. |
| Catálogo | `ExercisePreview.tsx` muestra detalle, equipo, músculo, imagen y GIF bajo demanda; está conectado al selector y al editor de rutinas. | Comprobar medios, búsqueda y navegación en la APK, incluso con conexión ausente. |
| Entrenamiento | `SessionSummarySheet.tsx` y su integración en `app/(tabs)/train.tsx` presentan un resumen de sesión; existen pruebas específicas. | Validar el flujo completo de finalización y la conservación de datos en dispositivo. |
| Progreso | `ProgressChart.tsx` se usa en `ExerciseProgressDetails.tsx` y tiene pruebas de componente. | Comprobar datos reales, estados vacíos y presentación física. |
| Tema y contraste | `apps/mobile/src/ui/theme.ts` y la nueva `theme.test.ts` contienen cambios locales y comprobaciones de contraste. | Ejecutar la suite con la prueba nueva y revisar contraste real, textos pequeños y accesibilidad visual; no extrapolar la auditoría de v12 al tema actual. |

## Evidencia y límites de las pruebas

- La ejecución integrada posterior `D:/DatosPC/Temp/opencode/fase2-jest-final2.log` informa **64 suites y 536 pruebas aprobadas**, con `type-check` y lint correctos en el mismo comando. Incluye las correcciones de transacciones, concurrencia y contraste incorporadas hasta ese corte. No equivale a pruebas físicas.
- Las comprobaciones Node `native-theme`, `maestro-safety` y `metro-cache` pasaron: **8 pruebas**. La comprobación de seguridad de Maestro no equivale a ejecutar Maestro en el teléfono.
- El registro local `D:/DatosPC/Temp/opencode/fase2-jest-integrado.log` informa **63 suites y 519 pruebas aprobadas**. Esa ejecución fue **anterior a la incorporación de `apps/mobile/src/ui/theme.test.ts`**; no demuestra que la suite actual completa pase con ese archivo. Repetirla sobre el árbol final.
- Se conserva también `D:/DatosPC/Temp/opencode/fase2-jest-corregido.log`, con **2 suites y 10 pruebas fallidas** de 63 suites y 519 pruebas. La ejecución integrada posterior no borra ese resultado anterior.
- Las pruebas automatizadas, incluida la cobertura de SQLite o componentes, no sustituyen una APK release integrada, la migración en Android ni la prueba de notificaciones del sistema. Este documento no aporta una nueva ejecución de tipos, lint, build o pruebas físicas.
- El informe [v12](rediseno-visual-v12-2026-11-12.md) registra **53 suites y 456 pruebas móviles**, compilación e instalación in-place y recorridos físicos de esa versión. Sus limitaciones incluyen contraste de `textDim`, guardado del editor de rutinas no realizado en esa pasada y validación visual parcial. Es evidencia histórica de v12, no de Fase 2.
- El informe [v11](prueba-tipos-serie-v11-2026-11-12.md) documenta tipos de serie, calendario y pruebas físicas anteriores; no implica que cada funcionalidad nueva esté validada en teléfono.

## Pendientes recopilados

1. **Cerrar puertas locales del árbol final:** repetir Jest incluyendo `theme.test.ts`, tipos y lint; conservar resultados completos y atender cualquier fallo sin asumir que el registro anterior cubre cambios posteriores.
2. **Completar verificación de la APK instalada:** paquete, firma y versión ya contrastados y actualización in-place realizada; aún quedan pruebas funcionales y de permisos en versiones de Android adicionales.
3. **Validar en el dispositivo autorizado:** instalación sobre la misma app cuando corresponda, migración y reapertura de SQLite, suplementos y tomas, recordatorios y permisos, descanso, resumen, catálogo y gráfica; probar estados sin conexión y reconexión cuando apliquen. Registrar también errores y límites observados.
4. **Accesibilidad y calidad:** revisar contraste del tema actual, tamaños y etiquetas, navegación y lector de pantalla; completar la matriz física y Maestro pendiente. Las pruebas automatizadas no son aceptación integral.
5. **Operación y seguridad:** volver a medir memoria y arranque y revisar auditoría de dependencias sobre el árbol final; los resultados antiguos son fotografías, no garantías actuales. Revisar respaldo y recuperación antes de operaciones que puedan afectar datos.
6. **CI y publicación:** los informes v11/v12 documentan un bloqueo histórico de GitHub Actions por facturación, ticket `#4986721`. **No se consultó su estado vivo para este documento**; comprobarlo y ejecutar las puertas remotas sobre los commits pertinentes antes de cualquier promoción. No declarar CI verde por pruebas locales.
7. **Pendientes generales:** rendimiento web autenticado, aceptación web y decisiones de infraestructura y despliegue requieren revisión separada. iOS y su aceptación física aparecen como diferidos en [viabilidad iOS](ios-viabilidad-2026-11-08.md). No se acredita un despliegue nuevo por este registro.

## Contexto y planes anteriores

- [Estado integral del 7 de noviembre](estado-integral-evry-2026-11-07.md): inventario, riesgos y prioridades de esa fecha. Algunas afirmaciones fueron superadas: [SDK 58 del 8 de noviembre](actualizacion-sdk58-2026-11-08.md) registra su promoción y una APK posterior; v11 y v12 documentan avances aún más recientes.
- [Durabilidad móvil](mobile-durability.md), [integración móvil/backend](mobile-backend-integration.md) y [seguridad de Maestro](maestro-safety.md): evidencia y procedimientos para preservar datos y validar recorridos; sus resultados tienen el alcance y fecha propios de cada documento.
- [Índice histórico de planes](../superpowers/plans/2026-08-19-evry-release-plan-index.md) y [diseño de candidata de publicación](../superpowers/specs/2026-08-19-evry-release-candidate-design.md): propuestas y planes de referencia, no prueba de ejecución, nuevas fases aprobadas ni despliegue. Su vigencia debe contrastarse con las decisiones y evidencias posteriores.
