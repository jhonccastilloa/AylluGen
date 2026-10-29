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

Para compilar y ejecutar el resultado: `pnpm build` y `pnpm start`. El build general todavía tiene errores asociados a código anterior; consultar el apartado de verificación.

La base requiere las migraciones SQL existentes, incluidos sus triggers y constraints. Para aplicar ese historial al destino configurado se utiliza `pnpm exec prisma migrate deploy`; `prisma db push` no es un sustituto. Para crear cambios de schema en desarrollo: `pnpm prisma:migrate`.

Docker utiliza el contexto del monorepo: `docker build -f apps/api/Dockerfile .` desde la raíz.

## Rutas montadas actualmente

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/` | Mensaje del servidor |
| GET | `/api-docs` | Swagger UI |
| GET / POST | `/api/species` | Listar / crear especies |
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

## Documentación

- [Arquitectura y guía del refactor](MODULAR_ARCHITECTURE.md): referencia única para el flujo nuevo.
- [Instrucciones para agentes](AGENTS.md): reglas de trabajo y alcance.
- [OpenAPI](OPENAPI_ARCHITECTURE.md): mecanismo de registro y límites.
- [Sync](docs/LOCAL_FIRST.md), [fechas de dispositivo](docs/ANIMAL_DEVICE_DATES.md) y [contrato de integración](.claude/docs/ai/watermelon-sync/api-handoff.md): documentación especializada conservada. Su contenido requiere revisión específica antes de cambiar esos subsistemas; no define la arquitectura del refactor ni acredita rutas activas.
