# Estado de guardado local móvil

## Requisitos del incremento

El estado de sincronización remota no prueba que los cambios visibles estén
guardados en SQLite. Inicio y Entrenar deben distinguir escritura pendiente,
fallo de guardado y copia durable antes de mostrar «Guardado localmente» o
«Sincronizado».

1. Reproducir cambios concurrentes: confirmar una escritura antigua no debe
   declarar guardado el cambio más nuevo, todavía pendiente.
2. Separar estado local y cola remota sin modificar el esquema persistido o
   el contrato HTTP. Inicio, recuperación de borrador, series, cancelación y
   finalización deben seguir la misma regla; las respuestas obsoletas no
   deben cambiar otra cuenta.
3. Verificar las pantallas reales, recuperación de errores y reinicialización;
   ejecutar la suite raíz, tipos, lint y exportaciones locales pertinentes.

No se reemplaza el plan integral por este incremento. Siguen pendientes
aceptación nativa y publicación condicionada a auditoría verde. No se autorizan
instalaciones en dispositivos, servicios remotos, despliegues ni cambios en
datos reales.

## Evidencia local — 5 de octubre de 2026

- Las pantallas reales reprodujeron confirmaciones prematuras al editar y en
  Inicio. El estado local ahora distingue escritura pendiente, fallo y copia
  guardada, separado de la cola de sincronización remota.
- La cola conserva orden por cuenta/origen sin bloquear otras cuentas. La
  reinicialización espera las escrituras de su propietario y descarta respuestas
  antiguas. Una finalización/cancelación tardía no invalida su versión; los
  fallos de esas operaciones siguen visibles sin bloquear indefinidamente la
  cuenta ni emitir confirmaciones de éxito.
- Pasaron 33 pruebas focales, incluidas 18 de pantallas reales y seis de
  aislamiento/persistencia con el puente SQLite de Node. La suite móvil completa
  pasó sus 247 pruebas en la ejecución raíz posterior a la corrección.
- Pasaron tipos/lint de todos los workspaces y otra vez los móviles tras la
  corrección final. Ambas exportaciones locales Android/iOS terminaron con API
  HTTPS `.invalid`; no son builds nativos ni aceptación en dispositivos.
- La revisión independiente encontró una carrera importante de reinicialización;
  cuatro regresiones de éxito/fallo de finalizar/cancelar la reprodujeron y
  pasaron después de corregirla. No quedaron sugerencias menores de esa revisión.

La ejecución raíz final, separada de los ensayos anteriores, pasó sus 505
pruebas: 247 móviles, 237 web, tres de accesibilidad y 18 compartidas, con
exit 0. Un ensayo anterior, concurrente con otras comprobaciones, falló al
arrancar dos workers web; otro no encontró a tiempo el botón del récord en
Inicio. El archivo afectado pasó después sus seis pruebas sin cambios y luego
pasó la raíz completa. Esto no demuestra que todas las condiciones de carga
sean estables: evitar suites raíz duplicadas simultáneas en el entorno local.
No se ampliaron timeouts ni se omitieron pruebas.

La auditoría fresca sigue fallando: 67 avisos, 56 altos y 11 moderados. Las
versiones publicadas consultadas de `braces` (3.0.3) y `node-forge` (1.4.0)
siguen afectadas. Se conserva el trabajo local sin publicación; backend limpio,
sin modificaciones de datos reales ni servicios externos.
