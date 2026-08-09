# Integración del catálogo completo de ejercicios

## Objetivo

Incorporar el catálogo completo de 1.324 ejercicios del repositorio `hasaneyldrm/exercises-dataset` a EVRY, incluyendo nombres, clasificación, instrucciones y medios locales, sin romper las rutinas, el registro de entrenamientos, las recomendaciones adaptativas ni la experiencia para hombres y mujeres.

## Decisiones de arquitectura

### Fuente y almacenamiento

- El backend será la fuente de verdad del catálogo que consume la aplicación.
- El JSON del dataset se versionará en `EVRY-Backend/prisma/seed-data/exercises.json`.
- Las miniaturas y animaciones se versionarán en `EVRY-Backend/assets/exercises/images` y `EVRY-Backend/assets/exercises/videos`.
- NestJS servirá ambos directorios como contenido estático bajo `/media/exercises/images` y `/media/exercises/videos`.
- El frontend solo recibirá URLs del backend; no tendrá una segunda copia de los medios.
- La URL pública del backend se configurará mediante `PUBLIC_API_URL`, permitiendo cambiar host sin modificar datos importados.

El dataset descargado pesa aproximadamente 171 MB: 8,9 MB de miniaturas y 128,7 MB de GIFs, con 1.324 archivos de cada tipo. Los archivos son pequeños individualmente y se mantienen a su resolución original de 180×180.

### Modelo de datos

Se conservarán los campos existentes que ya usan las rutinas y los entrenamientos (`name`, `muscleGroup`, `equipment`, `tags`, `isCompound`). El modelo `Exercise` se ampliará con:

- `sourceId`: identificador estable de cuatro dígitos del dataset, único para ejercicios importados.
- `category` y `bodyPart`: clasificación original.
- `target` y `secondaryMuscles`: músculos primario y secundarios.
- `equipmentLabel`: nombre original del equipo, sin perder valores que no caben en el enum actual.
- `instructions` e `instructionSteps`: JSON multilingüe, con prioridad de presentación en español y fallback en inglés.
- `mediaId`, `imagePath`, `gifPath` y `attribution`: referencias locales y aviso de derechos.

La clasificación interna mapeará las diez categorías del dataset a los grupos musculares de EVRY. Los valores de equipo no representables en el enum actual se conservarán en `equipmentLabel` y usarán `OTHER` para filtros heredados. Los tags de accesibilidad y seguridad seguirán siendo extensibles.

### Importación

Se creará un importador idempotente que:

1. Valide la forma mínima de cada registro.
2. Verifique que existan la miniatura y el GIF indicados.
3. Haga upsert por `sourceId`.
4. No modifique ejercicios personalizados de usuarios.
5. Genere un resumen con registros insertados, actualizados y rechazados.

El seed seguirá siendo reproducible desde una instalación limpia y la importación podrá ejecutarse de nuevo sin duplicar ejercicios.

### API

- `GET /api/exercises` conservará filtros por grupo, búsqueda y tag.
- Se añadirán filtros opcionales por equipo y categoría original.
- La respuesta incluirá `thumbnailUrl`, `gifUrl`, instrucciones y metadatos originales.
- `GET /api/exercises/:id` devolverá el detalle completo para la pantalla de ejercicio.
- Los ejercicios personalizados continuarán funcionando con medios nulos.

### Frontend

- `ExercisePicker` mostrará miniatura, nombre, grupo y equipo, con búsqueda y filtros existentes.
- El detalle del ejercicio mostrará la animación local, instrucciones en español y una alternativa en inglés si falta el texto.
- El registro de entrenamiento reutilizará el catálogo enriquecido sin cambiar el contrato de series.
- Se añadirá estado de carga, error de imagen/GIF y fallback accesible (`alt`, texto y placeholder).
- El catálogo será neutral para todos los usuarios; la lógica de ciclo seguirá activándose solo con `trackCycle`.

### Derechos y atribución

El JSON, nombres, estructura e instrucciones del dataset se conservarán con la licencia MIT y su aviso de copyright. Las imágenes y GIFs son material de Gym visual, no quedan cubiertos por MIT y deben conservar `© Gym visual — https://gymvisual.com/`, la resolución 180×180 y los términos de Gym visual. Se incluirán `LICENSE` y `NOTICE.md` del dataset en el backend y se mostrará la atribución en la documentación de EVRY. Guardar los medios localmente elimina la dependencia técnica de un CDN, pero no convierte esos medios en propiedad de EVRY.

## Validación y pruebas

- Pruebas unitarias del mapeo de categorías/equipos y del importador idempotente.
- Prueba de integración de listado, filtros, detalle y URLs estáticas.
- Type-check y build de frontend y backend.
- Verificación automatizada de que hay 1.324 registros y 1.324 miniaturas/GIFs enlazados.
- Prueba manual de selector, detalle y registro en viewport móvil y escritorio.

## Evolución posterior

Después de esta integración se podrán añadir filtros inclusivos derivados de metadatos, sustituciones por nivel/equipo y cache HTTP. No se incorporan ahora para mantener el cambio enfocado.
