# Política de despliegue y distribución privada

## Autorización obligatoria

EVRY no se despliega ni crea recursos externos como parte de la implementación ordinaria. Un push a la rama de trabajo no autoriza previews, producción, dominios, bases remotas ni migraciones sobre datos conservados. Cualquier despliegue requiere una autorización explícita posterior del propietario.

Render y Cloudflare quedan excluidos. No se configurarán servicios de activación periódica, keep-alive ni infraestructura paralela para evitar suspensiones.

## Plataforma aprobada si se autoriza

Si el propietario autoriza un despliegue futuro, web, API, variables, dominios y servicios administrados se configurarán desde Vercel. Antes de crear recursos se debe presentar y aprobar el diseño concreto, incluido el alojamiento PostgreSQL accesible desde Vercel, límites gratuitos, estrategia de medios, migraciones y rollback.

El orden previsto, todavía no autorizado, es: backup restaurable, migración compatible ensayada, API dual, web, APK Android, QA y retiro posterior del alias `/api`. Nunca se ejecutará un reset ni una migración destructiva sobre datos conservados.

## Android privado e iPhone

La generación local y privada de aplicaciones móviles no constituye un despliegue web. Desde la raíz:

```bash
npm run expo:doctor
npm run export:mobile
cd apps/mobile
npx eas-cli build --platform android --profile preview
```

La creación de un build remoto de EAS o la configuración de variables remotas también requiere autorización explícita. El perfil `preview` produce un APK de distribución interna. En iPhone se mantiene Expo Go; TestFlight y el binario independiente quedan fuera de alcance hasta disponer de membresía Apple.
