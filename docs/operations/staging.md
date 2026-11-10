# Política de despliegue y distribución privada

## Autorización vigente y prioridades

La prioridad actual es mantener una sola APK Android, EVRY Local. El trabajo
de interfaz web y la validación en iOS quedan diferidos por decisión del
propietario.
El historial registra una autorización para Vercel el 12 de octubre de 2026,
pero la instrucción posterior del checkpoint del 15 de octubre prohíbe
despliegues y cambios de recursos, dominios, bases remotas o entornos externos
sin una nueva autorización explícita posterior. Por tanto, el estado operativo
actual permite preparar y verificar la configuración **localmente**, no ejecutar
un despliegue ni crear su base remota. Los commits, pushes y la autorización
general de continuar el desarrollo no levantan esa restricción.

Render y Cloudflare quedan excluidos. No se configurarán servicios de activación periódica, keep-alive ni infraestructura paralela para evitar suspensiones.

## Plataforma aprobada

Si se autoriza posteriormente el despliegue, web y API usarán Vercel. Antes de
crear recursos se comprobarán el equipo Hobby, el alojamiento PostgreSQL
accesible desde Vercel, los límites gratuitos, la estrategia de medios y el
rollback. No se comprarán dominios ni suscripciones. El entorno de prueba usará
una base nueva y separada: no se importarán ni migrarán automáticamente los
datos reales.

El orden es: comprobaciones y seguridad web/API, base de prueba separada, API dual, web, QA HTTPS y APK Android. Las migraciones sobre datos conservados requieren backup restaurable y ensayo compatible; no forman parte de la creación de esta base nueva. Nunca se ejecutará un reset ni una migración destructiva sobre datos conservados.

## Android privado e iPhone

Para actualizar el OPPO se usa el paquete existente
`com.gabrielcano.evry.local`. La APK de actualización conserva la firma y
aumenta el código de versión. Con la depuración USB autorizada y EVRY Local en
Inicio, se verifica la firma, el paquete y el hash antes de aplicar
`adb install -r`. Después se comprueba que la app abre con la sesión guardada y
que la base conserva sus registros. La API privada de este perfil usa HTTPS en
`localhost:4447` mediante el enlace USB. Este flujo se verificó con la versión
`1.0.2-local` (código 3) en el OPPO A54 el 8 de noviembre de 2026.

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

El perfil `preview` produce un APK de distribución interna. La validación iPhone/Expo Go queda diferida por prioridad explícita del propietario; TestFlight y el binario independiente siguen fuera de alcance hasta disponer de membresía Apple. Esta priorización no declara terminada la versión iOS.
