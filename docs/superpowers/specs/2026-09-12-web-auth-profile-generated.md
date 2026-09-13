# Contrato generado de autenticación y perfil web

## Objetivo

Cerrar la migración web de autenticación y perfil al contrato OpenAPI importado, sin cambiar el modelo de sesión aprobado: access token únicamente en memoria y refresh token en cookie HttpOnly administrada por el backend.

## Requisitos

- Todas las operaciones web de registro, login, logout, lectura y edición del perfil usan rutas y DTO derivados de `@evry/api-client`.
- Zustand conserva únicamente el estado de sesión y las carreras entre inicialización, login, registro y logout; TanStack Query gestiona la mutación remota del formulario de perfil.
- Nunca se persisten access ni refresh tokens en `localStorage`, `sessionStorage`, IndexedDB o cookies accesibles desde JavaScript. La opción “Recordar usuario” solo guarda el correo.
- Un logout local invalida la generación de sesión antes de esperar la red. Una respuesta tardía no puede restaurar otra cuenta ni su token.
- Login y registro normalizan correo; registro normaliza nombre. Los errores uniformes de API conservan `code`, `message`, `fieldErrors`, `retryable` y `requestId`.
- Login, registro y perfil muestran errores por campo cuando el backend los entrega, un error general seguro cuando corresponde y nunca navegan tras un fallo.
- El perfil permite editar todos los campos soportados por `UserUpdateInput`: nombre, sexo registrado, fecha de nacimiento, metas, consentimiento de ciclo y longitudes de ciclo/periodo.
- El éxito del perfil actualiza de inmediato el usuario canónico de la sesión, conserva `createdAt`, muestra confirmación visible y evita envíos duplicados.
- Desactivar ciclo desmonta inmediatamente sus controles privados mediante el usuario canónico actualizado. El seguimiento continúa siendo voluntario e independiente del sexo registrado.
- No se despliega nada. Render y Cloudflare continúan fuera de alcance.

## Aceptación

- Pruebas del límite generado verifican tipos, rutas, métodos, cuerpos y errores estructurados.
- Pruebas del store verifican carreras y uso del límite generado.
- Pruebas de formularios verifican errores por campo, bloqueo de doble envío, navegación solo tras éxito y actualización canónica del perfil.
- Lint, tipos, suite web, build y contrato importado terminan correctamente.
