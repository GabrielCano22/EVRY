# EVRY — Evaluación de viabilidad iOS

**Fecha:** 8 de noviembre de 2026, zona America/Bogota.
**Alcance:** evaluar si el código móvil actual puede producir y distribuir una app iOS, y qué falta para ello.
**Estado:** viable a nivel de código; **no compilable ni instalable desde este equipo Windows**. Requiere macOS/Xcode o EAS Build y una cuenta de Apple.

## 1. Lo que sí se verificó

| Comprobación | Resultado |
|---|---|
| Configuración Expo resuelta (`expo config --type public`) | Correcta. `platforms: ["ios","android","web"]`, `ios.bundleIdentifier: com.gabrielcano.evry`, versión `1.0.2`, scheme `evry`. |
| `expo-doctor` sobre SDK 58 | 20/20 comprobaciones aprobadas. |
| Plugins usados | `expo-router`, `expo-build-properties`, `expo-secure-store`, `expo-sqlite`, `expo-splash-screen`, `expo-image`, `expo-web-browser`. Todos con soporte iOS. |
| Código específico de plataforma | Solo 3 ramas `Platform.OS`: teclado en login/registro y separación inferior de pestañas en Android. No hay APIs Android-only en la lógica de negocio. |
| Almacenamiento y red | SQLite, SecureStore, TanStack Query y cliente OpenAPI son multiplataforma. La URL de API exige HTTPS en release, sin restricción a localhost. |
| Generación del proyecto nativo en este equipo | **Bloqueada**: Expo responde «Skipping generating the iOS native project files. Run npx expo prebuild again from macOS or Linux». No existe `apps/mobile/ios/` y no se creó. |

## 2. Bloqueos reales

1. **Compilación:** Xcode solo existe en macOS. En Windows no se puede generar el proyecto iOS, compilar, firmar ni ejecutar el simulador. EAS Build ejecuta la compilación en macOS en la nube, pero exige una cuenta Expo y credenciales de firma.
2. **Distribución:** instalar en un iPhone físico, TestFlight o App Store requiere una cuenta de Apple Developer (99 USD/año) y, para App Store, App Store Connect y revisión de Apple.
3. **Backend:** la APK local apunta a `https://localhost:4447/api/v1`, alcanzable en Android mediante `adb reverse`. Un iPhone no tiene ese equivalente: necesita una API desplegada con HTTPS válido y accesible por red, o un túnel de desarrollo.
4. **Credenciales:** este equipo no tiene sesión de Expo/EAS ni credenciales de Apple; no se intentó crear ninguna cuenta ni aceptar términos en nombre del propietario.

## 3. Camino recomendado

**Opción A — EAS Build (sin Mac):**
1. Desplegar backend y base de datos en un host con HTTPS público.
2. Definir `EXPO_PUBLIC_API_BASE_URL=https://<host>/api/v1`.
3. `npx eas-cli login` con la cuenta del propietario.
4. `npx eas-cli build --platform ios --profile preview` (distribución interna) o `production`.
5. Registrar dispositivos para perfiles ad hoc o usar TestFlight; la App Store exige cuenta Apple Developer y revisión.

**Opción B — Mac local o CI macOS:**
1. `npx expo prebuild --platform ios`.
2. `npx expo run:ios` para simulador/dispositivo.
3. Firma con Xcode y cuenta Apple; archivo y subida con Transporter/Xcode Cloud.

## 4. Riesgos y trabajo pendiente específico de iOS

- Verificación visual real de `expo-symbols` (SF Symbols) y de la navegación con safe areas.
- Pruebas de teclado, gestos y ciclo de vida en iOS; hoy no existe ninguna ejecución física iOS.
- Política de privacidad y declaración de datos: la app trata datos de ciclo, readiness y entrenamiento; App Store exige transparencia y borrado de cuenta.
- Si se integra HealthKit en el futuro, se necesitan entitlements y justificación adicional.
- La cuenta QA y los datos actuales son locales; no se debe reutilizar una base de pruebas como producción iOS.

## 5. Conclusión

El código está preparado para iOS y la configuración es válida, pero **la viabilidad de entrega depende de infraestructura y cuentas externas**, no de cambios pendientes en el repositorio. Sin macOS/EAS y sin Apple Developer no es posible producir una build iOS verificable. No se declara iOS como completado.
