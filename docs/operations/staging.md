# Staging gratuito y distribución privada

## Web en Vercel

1. Importe el repositorio como monorepo y seleccione `apps/web` como **Root Directory**.
2. Mantenga activada la inclusión de archivos externos al Root Directory para usar los paquetes compartidos.
3. Defina `NEXT_PUBLIC_API_BASE_URL=https://<api-render>/api/v1` en Preview y Production.
4. Use Node 24.x. Vercel detecta npm workspaces y el lockfile de la raíz; no configure un segundo lockfile.
5. Compruebe landing, login, refresh por cookie, catálogo JPG, progreso dinámico y la recuperación del arranque frío.

## API en Render y PostgreSQL en Neon

El backend incluye `render.yaml`. Cree primero el proyecto PostgreSQL de Neon, ensaye su runbook de migración y configure en Render:

- `DATABASE_URL`: conexión PostgreSQL con TLS de Neon.
- `CORS_ORIGIN`: URL exacta de Vercel, sin rutas; varios orígenes se separan con coma.
- `MEDIA_BASE_URL`: origen público exacto de Render.
- Secretos JWT distintos: Render puede generarlos desde el Blueprint.

El health check es `/api/v1/health/ready`. El plan gratuito puede suspender la API; el cliente conserva el error como recuperable y reintenta, sin convertirlo en datos vacíos.

## Android privado e iPhone

Desde la raíz:

```bash
npm run expo:doctor
npm run export:mobile
cd apps/mobile
npx eas-cli build --platform android --profile preview
```

Configure `EXPO_PUBLIC_API_BASE_URL=https://<api-render>/api/v1` como variable de EAS antes del build. El perfil `preview` produce un APK de distribución interna. En iPhone use Expo Go con el mismo origen; TestFlight/binario independiente queda fuera de alcance hasta disponer de membresía Apple.

## Orden de entrega

Backup restaurable → migración compatible → backend dual → web → APK Android → QA → retiro posterior del alias `/api`. Nunca ejecute un reset ni una migración destructiva sobre Neon.

