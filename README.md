# EVRY — Frontend

Interfaz web de EVRY construida con Next.js 15, React 19 y TypeScript. El cliente consume la API REST de EVRY y conserva una única frontera HTTP tipada.

## Requisitos e instalación

Se requiere Node.js y npm. En Windows use `npm.cmd`:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

El servidor de desarrollo queda en `http://localhost:3000`; la API local usa el puerto 4000 y el prefijo `/api`.

## Configuración

La variable pública canónica que lee el cliente es `NEXT_PUBLIC_API_BASE_URL`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

Para los procesos de prueba existe `.env.test.example`, con `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000/api`. Los espacios y la barra final se normalizan; si falta la variable, el cliente usa el origen local por defecto. No incluya archivos `.env` reales en Git.

## Comandos verificables

```powershell
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run test:a11y
npm.cmd run test
npm.cmd run type-check
npm.cmd run build
```

`test` ejecuta unidad y accesibilidad. La infraestructura de Playwright está preparada, pero todavía no hay especificaciones E2E ni una ejecución Chromium verificada.

Ejecute `type-check` y `build` en ese orden y de forma secuencial. Desarrollo usa `.next-dev` y producción usa `.next`; no se deben mezclar ni versionar esos directorios, igual que `coverage` y los artefactos de Playwright.

## Fechas civiles

Las fechas de calendario se representan como `AAAA-MM-DD` y se validan por componentes. La utilidad `lib/civil-date.ts` usa `America/Bogota` para obtener el día actual y convertir timestamps; una fecha civil no se convierte mediante UTC. Los rangos que se muestran al usuario son inclusivos; la API los transforma a un límite exclusivo solo al consultar la base de datos.

## Frontera HTTP y sesión

`lib/api.ts` devuelve `ApiResult<T>`: éxito con `data` o fallo normalizado con estado HTTP, código, mensaje seguro y marca de reintento. No convierte una falla en una lista vacía, `null` ni cero. `RemoteData<T>` distingue `idle`, `loading`, `success`, `empty` y `error`; puede preservar datos previos al fallar una recarga.

La autenticación modela `checking`, `authenticated`, `anonymous` y `error`. El token de acceso se renueva mediante cookie; solo un 401 o 403 invalida las credenciales. Si falla temporalmente la lectura de sesión, el cliente conserva la sesión conocida o muestra recuperación. La opción de recordar sesión persiste únicamente el correo y su indicador.

## Catálogo de ejercicios

El selector consulta el catálogo del backend. Las miniaturas, GIF e instrucciones proceden de la API; el frontend no conserva otra copia de los medios. La atribución se muestra en el detalle del ejercicio. Consulte `NOTICE-MEDIA.md` del backend antes de redistribuir medios de Gym visual.
