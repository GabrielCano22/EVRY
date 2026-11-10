# EVRY — Actualización de estado: SDK 58 promovido

**Fecha:** 8 de noviembre de 2026, zona America/Bogota.
**Base:** `docs/operations/estado-integral-evry-2026-11-07.md`.
**Alcance:** promoción selectiva de Expo SDK 58 al checkout principal, puertas de calidad, APK instalada, web de producción y viabilidad iOS.

## 1. Promoción de SDK 58

Se promovió la candidata validada del worktree `sdk58-audit-20261106` al checkout principal `D:\DatosPC\EVRY\frontend` sin copiar el árbol completo y sin tocar los cambios locales existentes.

Archivos sustituidos:

| Archivo | Cambio |
|---|---|
| `package.json` | React 19.3.0, Reanimated 4.7.1, Worklets 0.13.0, `playwright-core` 1.62.1 |
| `package-lock.json` | Lock SDK 58 verificado |
| `apps/mobile/package.json` | Expo 58.0.23, RN 0.88.1, Jest 30.5.2, `expo run:*` |
| `apps/mobile/jest.config.cjs` | Exclusiones de las suites `node --test` para Jest 30 |

`apps/mobile/app.json` y `scripts/native-theme.test.cjs` ya estaban alineados a `1.0.2` / `versionCode 3` antes de la promoción.

- SHA-256 del lock adoptado: `2E5C2D8F2E40AEC691F320EE834F75869489DF86582E32E46AEFA8A5694D8A85`.
- `npm ci` limpio: 1506 paquetes; Expo 58.0.23, React Native 0.88.1, Jest 30.5.2.
- `expo-doctor`: 20/20 comprobaciones aprobadas.
- Los cuatro archivos previos a la promoción quedaron respaldados en `D:\DatosPC\Temp\opencode\evry-sdk57-before-promotion-20261108`.

## 2. Puertas de calidad en el checkout principal

| Puerta | Resultado |
|---|---|
| Móvil (Jest) | 470/470 pruebas, 44 suites |
| Web unitaria | 373/373 pruebas, 59 archivos |
| Web accesibilidad | 10/10 pruebas, 5 archivos |
| Paquetes (`api-client`, `design-tokens`, `domain`) | 4 + 2 + 53 pruebas |
| Controles nativos `posttest` | `native-theme` 4/4, `maestro-safety`, `metro-cache` sin fallos |
| `type-check` | Correcto en los cinco workspaces |
| `lint` | Correcto, sin advertencias |
| `api:check` | Contrato verificado |
| `validate:release-api` | Correcto con `EXPO_PUBLIC_API_BASE_URL=https://localhost:4447/api/v1` |
| Build web de producción | Correcto, 13 rutas |
| Servidor de producción | `/`, `/login` y `/register` responden 200; bundle apunta al API configurado y no contiene claves privadas |
| `npm audit` | 33 vulnerabilidades: 1 baja y 32 moderadas, **0 altas y 0 críticas**; todas en herramientas de desarrollo |

El E2E web se repitió sobre el árbol final. Resultado: **12/12 recorridos aprobados** en 5 archivos aislados (escritorio y móvil), 0 fallos.

> Nota operativa: el arnés E2E reutiliza el build existente de `apps/web` y **no** lo recompila. Antes de ejecutarlo hay que compilar con `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000/api/v1`; de lo contrario el navegador intenta la API local del teléfono y los recorridos fallan por conexión, no por producto.

## 3. Android: APK instalada y verificada

| Dato | Valor |
|---|---|
| Paquete | `com.gabrielcano.evry.local` |
| Versión | `1.0.2-local` (`versionCode 3`) |
| SHA-256 | `62852694acbb6fab80138778a9374b970d8b561ab27e1af688e4272b2eb66eb4` |
| Tamaño | 33.062.044 bytes |
| Instalación | Actualización in-place con `adb install -r`, misma firma |
| `userId` | 10137 |
| Primera instalación | 2026-10-19 01:53:25 |
| Última actualización | 2026-11-07 23:25:22 |
| SDK Android | min 24, target 36 |

La APK es reproducible desde `D:\e58src` con `D:\DatosPC\Temp\opencode\evry-sdk58-local.init.gradle`: el init fuerza `versionCode 3`, `versionName 1.0.2-local`, la firma local y `buildDir = D:/e58out/app`, y exige `EXPO_PUBLIC_API_BASE_URL=https://localhost:4447/api/v1`. El proyecto Android de la copia se regeneró y declara `3 / 1.0.2`, consistente con la APK instalada.

### Pruebas físicas acumuladas

- Sesión y serie `10 kg × 8` sin conexión; cierre forzado y reapertura conservaron los datos; al reconectar se sincronizó sin duplicados.
- Conflicto de sincronización resuelto en sus tres variantes («Conservar local como borrador», «Recuperar como nueva sesión», «Continuar versión del servidor») sin violar la restricción única.
- Progreso conectado: 4 sesiones y 410 kg coherentes (320 kg previos + 90 kg de la prueba de conflicto).
- Readiness del 2026-11-08 verificada en PostgreSQL: `score 70`, sueño 7, estrés 3, dolor 2, motivación 3.
- Ciclo activado desde Perfil; registro del 2026-11-08 verificado en PostgreSQL: flujo `LIGHT`, energía 4, ánimo 4, inicio de periodo `true`. La pestaña **Ciclo** aparece tras guardar y el registro persistió tras cerrar y reabrir la app.
- Sin errores `ReactNativeJS` ni `AndroidRuntime` en el búfer de logcat durante las pruebas.
- Al cierre de la jornada el teléfono quedó bloqueado con clave; no se intentó eludir el bloqueo. Las comprobaciones visuales se completaron antes.

## 4. Web

- Build de producción correcto y servido localmente en el puerto 3800 (el mismo origen permitido por CORS): `/`, `/login` y `/register` responden 200.
- El bundle de producción contiene la URL de API configurada y no contiene marcadores de claves privadas.
- Login real en Chromium contra `https://localhost:4447/api/v1`: llegó a `/dashboard` con las 4 sesiones, 410 kg, readiness 70 y ciclo activo; 0 errores de consola.
- El certificado TLS local no está instalado en el almacén de Windows, por lo que la prueba de navegador usó `ignoreHTTPSErrors`. Un navegador normal pedirá confiar en el certificado; en un despliegue real se usará HTTPS válido.
- El despliegue externo sigue **sin autorización**: `docs/operations/staging.md` exige autorización explícita posterior para Vercel, dominios y bases remotas. No se creó ningún recurso externo.

## 5. iOS

La configuración es válida (`com.gabrielcano.evry`, plataforma iOS declarada, `expo-doctor` 20/20), pero la generación nativa y la compilación están bloqueadas en Windows: Expo responde «Run npx expo prebuild again from macOS or Linux».

La entrega requiere macOS/Xcode o EAS Build y una cuenta Apple Developer; además, el backend debe estar publicado con HTTPS accesible, porque `localhost:4447` solo funciona en Android mediante `adb reverse`. Detalle completo en `docs/operations/ios-viabilidad-2026-11-08.md`.

## 6. Límites y pendientes reales

1. **Despliegue:** web y API siguen siendo locales; publicarlas exige autorización y cuentas externas.
2. **iPhone:** sin macOS/EAS y sin cuenta Apple no hay binario verificable.
3. **Git:** el checkout principal conserva cambios locales sin commit ni push; esta actualización no los publica.
4. **Auditoría:** quedan 33 avisos moderados/bajos de dependencias de desarrollo; no hay altos ni críticos.
5. **Conexión Android:** la APK usa `https://localhost:4447/api/v1` y depende del enlace USB mientras no exista un backend publicado.

## 7. Evidencia

- `D:\DatosPC\Temp\opencode\evry-main-sdk58-npm-test.log`
- `D:\DatosPC\Temp\opencode\evry-main-sdk58-typecheck.log`
- `D:\DatosPC\Temp\opencode\evry-main-sdk58-lint.log`
- `D:\DatosPC\Temp\opencode\evry-main-sdk58-apicheck.log`
- `D:\DatosPC\Temp\opencode\evry-main-sdk58-audit.json`
- `D:\DatosPC\Temp\opencode\evry-main-sdk58-release-api-ok.log`
- `D:\DatosPC\Temp\opencode\evry-main-sdk58-doctor.log`
- `D:\DatosPC\Temp\opencode\evry-main-sdk58-web-build.log`
- `D:\DatosPC\Temp\opencode\evry-main-sdk58-web-e2e-rerun.log`
- `D:\DatosPC\Temp\opencode\evry-readiness-check.mjs`
- `D:\DatosPC\Temp\opencode\evry-cycle-check.mjs`
- `D:\DatosPC\Temp\opencode\evry-web-local-smoke.mjs`
- `D:\DatosPC\Temp\opencode\evry-sdk58-apk-verify.log` (verificación criptográfica con JDK 17: firma v2, certificado, confianza solo localhost, sin cleartext)
- Capturas: `evry-sdk58-cycle-saved.png`, `evry-sdk58-cycle-persisted.png`, `evry-sdk58-progress-final.png`, `evry-sdk58-reopen-final.png`.
