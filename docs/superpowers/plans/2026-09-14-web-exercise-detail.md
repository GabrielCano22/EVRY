# EVRY: ficha transversal de ejercicio en web

Este tramo ejecuta la hoja de ruta integral vigente. No reemplaza su alcance ni declara terminada la aplicación.

## Global Constraints

- Mantener el contrato generado OpenAPI como única fuente de DTO y rutas.
- Usar TanStack Query para estado remoto y aislar sus claves por cuenta.
- Una lista o miniatura nunca solicita un GIF; el GIF solo se solicita por una acción explícita dentro de la ficha.
- La UI es responsive: panel lateral en escritorio y pantalla completa en web móvil.
- El diálogo restaura foco, cierra con Escape, atrapa foco, bloquea scroll y respeta movimiento reducido.
- Progreso, historial y metadatos conservan estados separados de carga, error, vacío y éxito; un error no se convierte en datos vacíos.
- Recharts solo se importa al visitar la pestaña Progreso.
- Conservar atribución de medios e indicaciones existentes; no inventar contenido.
- No desplegar, crear recursos externos ni modificar datos reales.
- Aplicar TDD: observar RED antes de cada cambio de producción y conservar pruebas de regresión.

## Task 1: Implementar y conectar la ficha transversal web

Crear un proveedor global dentro del layout autenticado y un panel reutilizable con pestañas Resumen, Progreso, Historial e Indicaciones. La apertura recibe como mínimo el ID del ejercicio y carga `GET /exercises/:id` mediante el límite generado existente. La caché se identifica por cuenta e ID; cerrar o cambiar de ejercicio cancela lecturas obsoletas.

Resumen muestra JPG, metadatos, mapa muscular y control explícito para reproducir/detener el GIF. Indicaciones muestra pasos españoles disponibles, aviso de seguridad y atribución. Progreso permite `30d|90d|6m|1y|all`, muestra resumen/comparación y carga Recharts dinámicamente solo después de seleccionar esa pestaña. Historial pagina mediante el cursor canónico sin duplicar sesiones y conserva resultados anteriores si una página posterior falla.

El panel usa `role=dialog`, nombre accesible, foco inicial/atrapado/restaurado, Escape y bloqueo de scroll. En escritorio se ancla a la derecha; bajo el breakpoint móvil ocupa toda la pantalla. Las pestañas usan `tablist`, `tab`, `tabpanel`, flechas, Home y End.

Conectar acciones de consulta independientes de las acciones de negocio:

- En `ExercisePicker`, miniatura/nombre abre la ficha y `Agregar` permanece como botón hermano independiente.
- En rutinas, sesión, dashboard y progreso, el nombre abre la ficha sin iniciar, seleccionar, editar ni borrar.
- `Ver indicaciones` abre directamente esa pestaña cuando corresponda.
- Cerrar conserva búsqueda, filtros, scroll, sesión y selección previa.

Las pruebas deben cubrir como mínimo: carga/error/reintento, cancelación y respuesta tardía, custom sin medios/indicaciones, GIF estrictamente bajo demanda, cambio de periodo, comparación `all=null`, paginación sin duplicados, fallo de página posterior, semántica de tabs, teclado/Escape/foco y separación `Ver`/`Agregar`. Añadir cobertura axe del diálogo.

Verificación:

```powershell
npm run test:unit --workspace @evry/web
npm run test:a11y --workspace @evry/web
npm run type-check --workspace @evry/web
npm run lint --workspace @evry/web
npm run build --workspace @evry/web
```

Commit esperado: `Feat: Se agrega "ficha transversal accesible de ejercicios"`.
