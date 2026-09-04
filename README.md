# EVRY — Web y móvil

Monorepo npm de EVRY. `apps/web` contiene Next.js; `apps/mobile` contiene Expo; `packages/api-client`, `packages/domain` y `packages/design-tokens` comparten contrato, reglas puras y tokens sin forzar componentes DOM dentro de React Native.

La hoja de ruta sigue en ejecución: consulte [estado, verificaciones y pendientes](docs/operations/implementation-status.md) antes de desplegar o dar por aceptada la aplicación.

## Requisitos e instalación

Se requieren Node 24.14.x y npm 11.x. En Windows use `npm.cmd`:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
npm.cmd install
npm.cmd run dev
```

El servidor web queda en `http://localhost:3000`; la API canónica usa el puerto 4000 y el prefijo `/api/v1`. El alias `/api` solo existe durante la migración.

## Configuración

La variable pública canónica que lee el cliente es `NEXT_PUBLIC_API_BASE_URL`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

Para pruebas existe `apps/web/.env.test.example`, con `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000/api/v1`. No incluya archivos `.env` reales en Git.

## Comandos verificables

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run type-check
npm.cmd run build
npm.cmd run api:check
npm.cmd run expo:doctor
npm.cmd run export:mobile
```

`test` ejecuta las suites de todos los workspaces, incluida accesibilidad web. `api:check` verifica sin modificar archivos que el snapshot y los tipos coincidan con su revisión fijada del backend. `api:test` prueba el importador con repositorios Git temporales.

## Actualizar el contrato API

La única fuente es `openapi/evry-v1.json` generado por Nest en EVRY-Backend. No edite el snapshot JSON, `backend.lock.json` ni `src/schema.ts` a mano.

1. En el backend, cambie los DTO/controladores y sus pruebas, ejecute `npm.cmd run openapi:generate` y confirme la implementación junto con `openapi/evry-v1.json` y `openapi/client.generated.ts`.
2. Con el checkout del backend limpio, importe desde el frontend:

   ```powershell
   npm.cmd run api:sync -- --backend C:\ruta\EVRY-Backend
   npm.cmd run api:verify-backend -- --backend C:\ruta\EVRY-Backend
   npm.cmd run api:check
   npm.cmd run type-check
   npm.cmd run test
   ```

3. Confirme el snapshot, el lock y los tipos junto con las adaptaciones web/móvil. Cuando se autorice publicar, suba primero el commit del backend y después el frontend: CI obtiene exactamente la revisión del lock, no la rama predeterminada.

`api:generate` restaura únicamente los tipos a partir del snapshot fijado. `api:check` no consulta la red y rechaza referencias externas; la importación lee los artefactos del commit, no archivos ignorados ni reemplazos locales. Los finales de línea LF/CRLF son equivalentes. `api:verify-backend` requiere el checkout mediante `--backend` o `EVRY_BACKEND_ROOT`.

Los dos generadores usan `defaultNonNullable: false` para conservar campos de entrada opcionales aunque tengan un valor por defecto en el servidor; la [guía de migración de openapi-typescript](https://openapi-ts.dev/migration-guide) explica el cambio de comportamiento de esa opción. Los campos obligatorios de respuesta siguen definidos por `required` en los DTO.

Si el backend es privado, configure `EVRY_REPOSITORY_TOKEN` en GitHub Actions con acceso de lectura a ese repositorio. El token del repositorio frontend no concede acceso automático a otro repositorio privado. No guarde credenciales en archivos del proyecto.

Ejecute `type-check` y `build` en ese orden y de forma secuencial. Desarrollo usa `.next-dev` y producción usa `.next`; no se deben mezclar ni versionar esos directorios, igual que `coverage` y los artefactos de Playwright.

## Fechas civiles

Las fechas de calendario se representan como `AAAA-MM-DD` en `packages/domain` y se validan por componentes usando `America/Bogota`. Web y móvil consumen la misma implementación.

## Frontera HTTP y sesión

`packages/api-client` se genera desde OpenAPI. La frontera web conserva `ApiResult<T>` durante la migración y no convierte una falla en una lista vacía, `null` ni cero.

La autenticación modela `checking`, `authenticated`, `anonymous` y `error`. El access token web vive solo en memoria y se renueva mediante cookie HttpOnly; recordar usuario persiste únicamente el correo.

## Catálogo de ejercicios

El selector consulta el catálogo del backend. Las miniaturas, GIF e instrucciones proceden de la API; el frontend no conserva otra copia de los medios. La atribución se muestra en el detalle del ejercicio. Consulte `NOTICE-MEDIA.md` del backend antes de redistribuir medios de Gym visual.

## Móvil offline

Expo almacena catálogo, rutinas, sesión activa, series, cola y mapeo de IDs en SQLite. Sincroniza al abrir, recuperar red, volver al primer plano y finalizar. Los conflictos de revisión o de sesión activa requieren elegir entre la versión del servidor y un borrador local recuperado; nunca se mezclan automáticamente. El access token queda en memoria y el refresh rotativo en SecureStore.

## Automatización y política de despliegue

`.github/workflows/ci.yml` valida contrato generado, tipos, lint, pruebas web/móvil, build Next.js, Expo Doctor, exports Android/iOS y Playwright con PostgreSQL aislado. EVRY no se despliega sin autorización explícita. Render y Cloudflare quedan excluidos; cualquier despliegue futuro se gestionará completamente desde Vercel. La política vigente y la distribución móvil privada están en `docs/operations/staging.md`.
