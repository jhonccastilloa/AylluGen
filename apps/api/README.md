# AylluGen — backend

API Node.js/TypeScript con Express, Prisma/PostgreSQL, Zod y JWT dentro de un monorepo pnpm.

## Estado del refactor

Migración incremental hacia arquitectura hexagonal. **Species es el primer flujo integrado**: dominio y casos de uso en `packages/core`, adaptadores en `src/modules/specie` y ensamblaje explícito en `src/composition`.

Los módulos anteriores permanecen como código pendiente de migración. Su presencia en el repositorio no implica que sus rutas estén montadas ni que sean el patrón para desarrollos nuevos.

## Preparación y ejecución

Desde la raíz del monorepo:

```sh
pnpm install --frozen-lockfile
pnpm build:shared
cd apps/api
pnpm prisma:generate
pnpm dev
```

Configurar en el entorno o en `.env` privado:

- `DATABASE_URL`: conexión PostgreSQL.
- `JWT_SECRET`: al menos 32 caracteres.
- `PORT`: opcional, por defecto `3000`.
- `NODE_ENV`: `development`, `production` o `test`.
- `REFRESH_TOKEN_SECRET`: opcional; usa `JWT_SECRET` si falta.
- `JWT_EXPIRES_IN` y `REFRESH_TOKEN_EXPIRES_IN`: por defecto `15m` y `7d`.

La fecha de vencimiento persistida del refresh token se obtiene de su claim `exp` tras emitirlo. Cambiar `REFRESH_TOKEN_EXPIRES_IN` (por ejemplo, a `9d`) ajusta tanto el JWT como su vencimiento guardado; no hay un plazo fijo adicional de siete días.

Los JWT incluyen `tokenUse: "access"` o `tokenUse: "refresh"`. Cada verificador exige el propósito correspondiente después de verificar la firma, incluso si ambos secretos coinciden. Los tokens anteriores sin este claim dejan de aceptarse y requieren un nuevo inicio de sesión.

Para compilar y ejecutar el resultado: `pnpm build` y `pnpm start`. El build general todavía tiene errores asociados a código anterior; consultar el apartado de verificación.

La base requiere las migraciones SQL existentes, incluidos sus triggers y constraints. Para aplicar ese historial al destino configurado se utiliza `pnpm exec prisma migrate deploy`; `prisma db push` no es un sustituto. Para crear cambios de schema en desarrollo: `pnpm prisma:migrate`.

Docker utiliza el contexto del monorepo: `docker build -f apps/api/Dockerfile .` desde la raíz.

## Rutas montadas actualmente

| Método             | Ruta               | Uso                                           |
| ------------------ | ------------------ | --------------------------------------------- |
| GET                | `/`                | Mensaje del servidor                          |
| GET                | `/api-docs`        | Swagger UI                                    |
| GET / POST         | `/api/species`     | Listar / crear especies                       |
| GET / PUT / DELETE | `/api/species/:id` | Consultar / actualizar / eliminar una especie |

Todas las rutas de Species requieren `Authorization: Bearer <token>` y operan sobre el usuario autenticado. Los endpoints de login/refresh, los demás módulos de negocio, sync y health checks están desactivados en el agregador durante esta etapa.

La fuente ejecutable de rutas es [createRoutes](src/presentation/routes/index.ts). Swagger conserva registros anteriores y no representa necesariamente lo que está montado; Species todavía no tiene registro OpenAPI dedicado.

## Verificación

Desde la raíz, ejecutar `pnpm build:shared`. Después, desde `apps/api`:

```sh
pnpm exec jest tests/unit/presentation/specie-errors.test.ts --runInBand
pnpm exec tsc --noEmit
pnpm test -- --runInBand
pnpm build
pnpm lint
```

La suite focalizada cubre errores de dominio, respuestas HTTP y Bearer con repositorio simulado. No verifica restricciones reales de PostgreSQL ni concurrencia.

El typecheck general conserva fallos en código anterior, incluidos imports de `modules/species` y `AnimalService`. También hay pruebas antiguas pendientes de adaptar a los contratos del core. Los resultados históricos no representan el estado actual de toda la migración.

## Limitación de solicitudes

La limitación de solicitudes se activa únicamente con `NODE_ENV=production`: límite general de 100 solicitudes por IP cada 15 minutos y límite de autenticación de 5 en los endpoints que lo utilicen. En desarrollo y pruebas se omite. Los contadores son locales a cada proceso; el límite de autenticación tendrá efecto cuando se reactiven sus rutas.

## Logging

Durante la migración, `infrastructure/logging/logger.ts` crea una única instancia Winston al importar el módulo. La composición la inyecta mediante el contrato `ILogger` en los middlewares. El contexto de solicitud se establece antes de los parsers y devuelve `X-Request-ID`; se admite un identificador de 1–128 caracteres alfanuméricos, punto, guion o guion bajo, o se genera un UUID.

`LOG_LEVEL` permite `error`, `warn`, `info`, `http`, `verbose`, `debug` o `silly` (por defecto: debug en desarrollo, error en pruebas e info en producción). Consola legible en desarrollo y JSON en otros entornos.

Archivos activos por defecto en producción; `LOG_FILE_ENABLED=true/false` lo sobrescribe. `LOG_FILE_PATH` vale `./logs`, `LOG_FILE_MAX_SIZE` vale `20m` y `LOG_FILE_MAX_FILES` vale `14d` (días; un número sin sufijo indica cantidad de archivos). Aplicación y errores usan esa misma retención. Los metadatos se redactan por clave antes de llegar a los destinos; esto no detecta secretos en texto libre. Las excepciones anidadas omiten mensaje técnico y stack.

`LOG_FILE_MAX_SIZE` requiere unidad `k`, `m` o `g`; no acepta números sin unidad.

Las opciones anteriores `LOG_FORMAT`, `LOG_SANITIZE`, `REQUEST_ID_HEADER` y sampling ya no forman parte de la configuración. Los consumidores antiguos importan directamente la misma instancia de `infrastructure/logging/logger.ts`, sin setters ni inicialización adicional. Cuando esos consumidores migren a inyección, se podrá mover la creación a composición.

## Referencias

- [Arquitectura y guía del refactor](MODULAR_ARCHITECTURE.md): referencia única para el flujo nuevo.
- [Instrucciones para agentes](AGENTS.md): reglas de trabajo y alcance.
- [OpenAPI](OPENAPI_ARCHITECTURE.md): mecanismo de registro y límites.
- [Sync](docs/LOCAL_FIRST.md), [fechas de dispositivo](docs/ANIMAL_DEVICE_DATES.md) y [contrato de integración](.claude/docs/ai/watermelon-sync/api-handoff.md): documentación especializada conservada. Su contenido requiere revisión específica antes de cambiar esos subsistemas; no define la arquitectura del refactor ni acredita rutas activas.
