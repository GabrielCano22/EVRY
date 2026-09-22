# Política de despliegue y distribución privada

## Autorización obligatoria

EVRY no se despliega ni crea recursos externos como parte de la implementación ordinaria. Un push a la rama de trabajo no autoriza previews, producción, dominios, bases remotas ni migraciones sobre datos conservados. Cualquier despliegue requiere una autorización explícita posterior del propietario.

Render y Cloudflare quedan excluidos. No se configurarán servicios de activación periódica, keep-alive ni infraestructura paralela para evitar suspensiones.

## Plataforma aprobada si se autoriza

Si el propietario autoriza un despliegue futuro, web, API, variables, dominios y servicios administrados se configurarán desde Vercel. Antes de crear recursos se debe presentar y aprobar el diseño concreto, incluido el alojamiento PostgreSQL accesible desde Vercel, límites gratuitos, estrategia de medios, migraciones y rollback.

El orden previsto, todavía no autorizado, es: backup restaurable, migración compatible ensayada, API dual, web, APK Android, QA y retiro posterior del alias `/api`. Nunca se ejecutará un reset ni una migración destructiva sobre datos conservados.

## Android privado e iPhone

La generación local y privada de aplicaciones móviles no constituye un despliegue web. Los exports locales y los perfiles EAS `preview` y `production` requieren `EXPO_PUBLIC_API_BASE_URL` con HTTPS y el prefijo exacto `/api/v1`. Para validar un export sin desplegar ni conectarlo a infraestructura se puede usar el dominio reservado `.invalid`.

PowerShell, desde la raíz:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = 'https://api.example.invalid/api/v1'
npm.cmd run expo:doctor
npm.cmd run export:mobile
Remove-Item Env:EXPO_PUBLIC_API_BASE_URL
```

Bash, desde la raíz:

```bash
export EXPO_PUBLIC_API_BASE_URL='https://api.example.invalid/api/v1'
npm run expo:doctor
npm run export:mobile
unset EXPO_PUBLIC_API_BASE_URL
```

El perfil EAS `development` puede omitir la variable para usar `http://10.0.2.2:4000/api/v1` en el emulador Android, o definir otro origen HTTP local. Esta excepción no se aplica a exports, `preview` ni `production`.

La creación de un build remoto de EAS o la configuración de variables remotas también requiere autorización explícita. Cuando exista esa autorización, `preview` y `production` deberán recibir la URL HTTPS real de la API alojada en Vercel; `.invalid` solo sirve para comprobar la generación local sin conexión. Estos comandos establecen la variable en ambos entornos EAS antes de solicitar el APK.

PowerShell, únicamente después de la autorización:

```powershell
$ApiBaseUrl = Read-Host 'URL HTTPS de la API Vercel, terminada en /api/v1'
Push-Location apps/mobile
foreach ($EasEnvironment in @('preview', 'production')) {
  npx.cmd eas-cli env:create --environment $EasEnvironment --name EXPO_PUBLIC_API_BASE_URL --value $ApiBaseUrl --visibility plaintext
}
npx.cmd eas-cli build --platform android --profile preview
Pop-Location
```

Bash, únicamente después de la autorización:

```bash
read -r -p 'URL HTTPS de la API Vercel, terminada en /api/v1: ' EVRY_API_BASE_URL
cd apps/mobile
for eas_environment in preview production; do
  npx eas-cli env:create --environment "$eas_environment" --name EXPO_PUBLIC_API_BASE_URL --value "$EVRY_API_BASE_URL" --visibility plaintext
done
npx eas-cli build --platform android --profile preview
```

El perfil `preview` produce un APK de distribución interna. En iPhone se mantiene Expo Go; TestFlight y el binario independiente quedan fuera de alcance hasta disponer de membresía Apple.
