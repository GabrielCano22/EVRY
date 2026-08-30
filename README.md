# EVRY — Web y móvil

Monorepo npm de EVRY. `apps/web` contiene Next.js; `apps/mobile` contiene Expo; `packages/api-client`, `packages/domain` y `packages/design-tokens` comparten contrato, reglas puras y tokens sin forzar componentes DOM dentro de React Native.

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

`test` ejecuta las suites de todos los workspaces, incluida accesibilidad web. `api:check` regenera los tipos OpenAPI y falla si el resultado no está confirmado.

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

## Automatización y staging

`.github/workflows/ci.yml` valida contrato generado, tipos, lint, pruebas web/móvil, build Next.js, Expo Doctor, exports Android/iOS y Playwright con PostgreSQL aislado. La configuración de Vercel, Render/Neon y EAS está en `docs/operations/staging.md`.
