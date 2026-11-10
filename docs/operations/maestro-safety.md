# Maestro Android: aislamiento y conservación de datos

El smoke de `apps/mobile/.maestro/smoke.yaml` usa exclusivamente
`com.gabrielcano.evry.contractqa` (**EVRY Pruebas**). No debe ejecutarse contra
la app personal ni contra EVRY Validación, cuyo borrador se conserva.

Se retiró el `clearState: true` original. El flujo no reinicia el proceso al
abrirlo, no limpia almacenamiento ni keychain y no modifica permisos
explícitamente. Los permisos implícitos del ejecutor Maestro aún necesitan
verificación antes de usarlo en el dispositivo; el control estático no los
certifica.

El caso sigue exigiendo la pantalla de login, credenciales sintéticas
`MAESTRO_EMAIL`/`MAESTRO_PASSWORD` y las cuatro pestañas principales. Si la
copia de pruebas ya está autenticada, debe fallar: no cierra la cuenta, no
omite el login y no borra datos para obtener un resultado verde. Se necesita
una copia sintética preparada y desconectada de la cuenta antes de ese caso.

El comando local seguro, sin conexión al teléfono, es:

```text
npm run test:maestro:safety --workspace @evry/mobile
```

Analiza el YAML real y comprueba el paquete aislado, la ausencia de operaciones
destructivas declaradas —incluidos hooks y comandos escalares— y de delegación
a scripts/flujos no inspeccionados. Forma parte del `posttest` móvil y, por
tanto, de `npm test` y CI; no reemplaza la ejecución de Maestro.

El paquete Windows de Maestro CLI 2.11.0 se descargó y extrajo en D: el
17 de octubre, después de contrastar tamaño y SHA-256 con la publicación del
proveedor. No se ha ejecutado este smoke en el OPPO. El primer `--version`
terminó con error al inicializar `DebugLogStore`: AppDirs llama a la API nativa
de carpetas conocidas de Windows, que no queda redirigida por `user.home`,
`LOCALAPPDATA` ni `XDG_STATE_HOME`. En esta máquina la consulta de carpeta local
resuelve C:, aunque el entorno del proceso use D:. El bytecode inspeccionado
inicializa esa ruta antes de crear/prunar logs y no ofrece una opción de ruta.

Por tanto, tener el ZIP extraído no acredita una instalación utilizable dentro
de la restricción D-only. No se repetirá el arranque restaurando rutas en C:,
modificando carpetas conocidas del sistema o desactivando protecciones. No se
creó otro servidor ADB durante la comprobación de versión ni se conectó al
teléfono. Antes de ejecutar un flujo siguen pendientes una ruta de logs
compatible con D: y el enrutamiento comprobado al servidor ADB propio, sin
generar claves en C:. El recorrido físico ya realizado mediante UI/ADB está documentado por separado en
[durabilidad móvil](mobile-durability.md).
