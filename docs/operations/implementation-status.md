# Estado de implementación de la hoja de ruta integral

Actualizado: 4 de septiembre de 2026. Este registro separa implementación, evidencia observada y aceptación final; no declara preparación para producción.

## Implementado

- Monorepo npm con web, Expo móvil, contrato API, dominio y tokens; Next.js 16, NestJS 12, Prisma 7 y Node 24.14 fijado.
- API v1 con rutas compatibles, errores normalizados, salud, configuración requerida y límites de frecuencia.
- Sincronización transaccional por `clientId` y revisión; autenticación móvil y refresh web sin token en `localStorage`.
- El móvil persiste sesión y cola SQLite por cuenta/origen, conserva reintentos y resultados inciertos, serializa edición concurrente y muestra conflictos. El catálogo usa `q/page`, caché transaccional, búsqueda acotada y medios diferidos.
- La fuente OpenAPI es única. El frontend importa el JSON y cliente generados desde el backend fijado; el importador verifica origen, hashes, normalización LF/CRLF, tipos y ausencia de referencias externas.
- Historial por cursor `(endedAt, id)`, frecuencia semanal de todo el periodo y progreso web con tipos compartidos, periodos, comparación real, consulta cancelable y carga incremental.
- Configuraciones de CI y política Vercel/EAS presentes. Render fue retirado. No hay despliegues autorizados.

## Evidencia observada

### Backend, 4 de septiembre

- Contrato y sincronización publicados en `4ee7342cdd85fc6c46fca8033104804ab6ada1fe`. La corrección posterior `e211dce` aísla la configuración de origen en las pruebas sin cambiar producción ni el contrato.
- `lint`, `test:type-check`, `test:unit` (53 suites / 308 pruebas), `build` y `openapi:check` terminaron correctamente.
- Integración PostgreSQL sintética: 7 suites / 60 pruebas correctas en 60,48 s. Solo quedó la advertencia conocida de Jest sobre VM Modules experimental.
- El foco de sincronización pasó 10/10. Usa solicitudes HTTP contra `AppModule` real y PostgreSQL aislado; para las carreras, el test identifica el advisory lock concedido por OID de base, `classid`, `objid`, `objsubid` y PID, y exige exactamente los waiters de esa identidad. Una revisión independiente aprobó esa identidad completa.
- La integración incluye autenticación HTTP real (registro/login/refresh/logout de web y móvil, rotación, revocación, cookies y límites) y sincronización offline (idempotencia, carreras, conflictos, rollback, sesiones terminales y estadísticas). No equivale a una prueba de carga ni a un ensayo con datos poblados.

### Contrato y CI, 4 de septiembre

- El lock del frontend quedó fijado a `4ee7342cdd85fc6c46fca8033104804ab6ada1fe`. `api:sync`, `api:verify-backend` y `api:check` terminaron correctamente contra esa revisión; el diff importado documenta únicamente respuestas `401` de logout web/móvil.
- Las CI frontend `33878020665` y `33878849934` fallaron únicamente en Expo Doctor (20/21), después de pasar contrato, E2E y los pasos anteriores de calidad. Se alinearon `expo ~57.0.20` y `expo-router ~57.0.19`, junto con cuatro dependencias transitivas de Expo. La verificación local posterior pasó lint, tipos, 16 suites / 83 pruebas móviles, Expo Doctor 21/21, exportaciones Android/iOS y auditoría de nivel alto. La CI remota de este nuevo cambio debe confirmarse después del push; no se presenta una exportación estática como prueba en dispositivo.
- Verificación local fresca: móvil 16 suites / 83 pruebas; web 14 archivos / 52 pruebas unitarias; accesibilidad 1 prueba; cliente API 3; tokens 2; dominio 12 y las 33 pruebas del importador, todas correctas. El importador tardó 161,65 s.

### Verificación local de frontend, 4 de septiembre

- Lint de todos los workspaces y type-check de todos los workspaces correctos.
- El build de producción web terminó correctamente (compilación 25,1 s; tipos 11,8 s).
- Las suites locales de móvil pasaron 16/83, las unitarias web 14/52, accesibilidad 1, cliente API 3, tokens 2, dominio 12 y el importador 33/33 (161,65 s).
- La ejecución completa de pruebas de todos los workspaces terminó correctamente.
- El origen de los dos fallos E2E de contraste quedó confirmado: la misma página de login tenía una animación real pausada a 100 ms con opacidad `0.717649`, que Axe interpreta con contraste insuficiente; al finalizar la animación, opacidad `1`, ya no hay violación. El cambio es solo de prueba: espera `animation.finished` y opacidad `1`, sin cambio de CSS, color ni producción. E2E normal/reduced × desktop/mobile pasó 4/4 en 17,8 s, recibió revisión independiente aprobada y pasó también en CI `33878020665`.
- La CI backend `33876893755` falló 59/60 porque una prueba rechazaba `127.0.0.1` aunque CI lo permitía explícitamente. Se reprodujo y corrigió en `e211dce` mediante dos aplicaciones reales con orígenes aislados y limpieza de configuración. La revisión independiente fue aprobada y una verificación local nueva con el origen de CI pasó 7 suites / 60 pruebas en 46,80 s. Las CI posteriores `33878691475` y `33878837563` terminaron correctamente, esta última sobre `2268a78`.
- El E2E de Playwright existente solo abre `/login`, comprueba navegación por teclado, 200 % de zoom y Axe sin violaciones graves/críticas. No envía autenticación ni cubre entrenamientos, por lo que no se debe afirmar cobertura E2E de login real ni de workouts.

## Pendiente de cerrar antes de aceptar el plan

### Contratos e integración

- Confirmar la CI remota del frontend tras alinear los parches de Expo ya verificados localmente. No añadir exclusiones ni desactivar comprobaciones.
- Mantener la CI cruzada en GitHub tras cualquier cambio posterior del lock.
- Revisar todos los consumidores web restantes; que TypeScript compile no demuestra que todas las pantallas y el calendario usen el cliente generado.
- Comprobar de extremo a extremo el contrato móvil completo contra PostgreSQL. Ampliar la matriz de autenticación/sync a dispositivos y condiciones de red reales.
- Ensayar migración sobre una base poblada y backup/restauración, con conteos y estadísticas contrastados. No se ha ejecutado ni se reclama una restauración.

### Móvil

- Completar paridad: registro, crear/editar rutinas, detalle de progreso, edición de ciclo y todos los campos de perfil.
- Validar aislamiento y reapertura offline en Android/iOS reales, incluida la vida real de SecureStore/SQLite y sincronización contra PostgreSQL.
- Si existe un `evry.db` heredado sin propietario, conservarlo intacto: la recuperación exige identificar al propietario e importación explícita; no se asignan automáticamente esos datos a la siguiente cuenta.
- La migración conserva datos ante caché malformada, pero falta una recuperación de caché dañada orientada a la persona usuaria.
- Completar feedback visible ante fallo de guardado local, reconexión y arranque frío del servidor gratuito.
- Definir presupuesto y expulsión LRU de miniaturas; hoy se evita descargar GIF en listas, pero no existe ese límite explícito.
- Ejecutar cierre/reapertura reales, Android release, iPhone/Expo Go y APK privado.

### Web, rendimiento y operación

- Completar la migración de todas las pantallas a cliente generado y TanStack Query.
- Acotar el calendario a actividad agregada por mes y eliminar condicionamiento de ciclo por sexo en consumidores restantes.
- Agregar puntos de progreso agregados/acotados en SQL; el historial está paginado, pero la serie temporal aún puede crecer con todo el historial.
- Ampliar accesibilidad a navegador, teclado, zoom, lector de pantalla y movimiento reducido, y añadir flujos E2E de autenticación y entrenamientos.
- Medir LCP/INP/CLS, latencias p95 calientes y memoria/arranque Android release; aún no se han demostrado esos presupuestos.
- No se autorizan despliegues. Render y Cloudflare quedan fuera de alcance. Si se autoriza expresamente un despliegue futuro, solo se evaluará Vercel después de diseñar/aprobar configuración, credenciales, orígenes y recuperación.

## Preservación de datos y límites

No se reinició, migró ni restauró una base real, ni se desplegaron recursos externos. La integración usa solo PostgreSQL sintético con una URL de prueba explícita, diferente de la URL runtime bloqueada. Este estado no acepta el plan completo ni modifica `main`.

El clúster PostgreSQL temporal se detuvo limpiamente al finalizar las pruebas del 4 de septiembre; se conservaron sus datos y binarios. La guía reproducible está en `EVRY-Backend/docs/operations/integration-tests.md`.

## Auditoría de dependencias

La auditoría local del 4 de septiembre, posterior a los parches de Expo, terminó correctamente con umbral alto y reportó 15 avisos: 1 bajo y 14 moderados. No equivale a ausencia de vulnerabilidades ni demuestra que todos los avisos sean preexistentes. Las propuestas automáticas incluyen cambios incompatibles fuera de este ajuste; requieren revisar compatibilidad y alcance. No se ejecutó `npm audit fix --force`.
