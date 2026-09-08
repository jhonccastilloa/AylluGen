# AylluGen — backend

Estado revisado: 2026-09-05. API ganadera en Node.js/TypeScript, Express 5, Prisma 7 con adaptador pg, PostgreSQL 16 (Compose), Zod 4, Inversify, JWT y Winston.

## Arquitectura e integración móvil

Ocho módulos: `auth`, `user`, `species`, `animal`, `breeding`, `health`, `production`, `sync`. Cada módulo separa rutas/controladores, servicios, contratos y repositorios.

El móvil guarda especies, animales, cruces, salud y producción en WatermelonDB y sincroniza por v2. REST se conserva para acciones de servidor y compatibilidad con instalaciones anteriores. No hay polling, sockets, pagos, OTP, uploads ni jobs implementados.

## Preparación

```sh
npm ci
npm run prisma:generate
```

Configurar variables del proceso o `.env` privado: `DATABASE_URL` PostgreSQL, `JWT_SECRET` de al menos 32 caracteres, `NODE_ENV` y `PORT`. `REFRESH_TOKEN_SECRET` es opcional; si falta usa JWT_SECRET. Expiraciones por defecto: acceso 15m, refresh 7d; la expiración persistida del refresh usa siete días en el helper actual.

La aplicación usa puerto 3000 si no hay PORT. Compose publica backend 4001 y PostgreSQL 5448 hacia 5432 del contenedor: ajustar PORT y host de DB según se ejecute dentro o fuera de Docker. No copiar credenciales reales en documentación.

En un destino autorizado, respaldar/auditar antes de aplicar las migraciones existentes:

```sh
node scripts/audit-sync.cjs
npx prisma migrate deploy
npm run build
npm start
```

`npm start` ejecuta `node dist` (entrada compilada de `src/index.ts`). `npm run dev` usa nodemon. No crear otra migración init para instalar el repositorio.

**No sustituir migraciones por `prisma db push`**: sync necesita triggers, índices y constraints SQL que el schema Prisma no expresa completamente. El Dockerfile actual ejecuta migrate deploy al arrancar; eso sí modifica la DB y exige revisión operativa.

## Rutas actuales

Todas bajo `/api`, salvo Swagger y la raíz del servidor:

| Grupo             | Rutas / uso                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Auth              | POST /auth/register, /auth/login, /auth/refresh, /auth/logout                                          |
| Cuenta propia     | GET /users/me; GET/PUT/DELETE /users/:userId                                                           |
| Sync nativo       | POST /sync/v2/pull y /sync/v2/push                                                                     |
| Legacy deprecated | POST /sync/pull, /sync/push, /sync/resolve-conflict                                                    |
| Especies          | CRUD /species                                                                                          |
| Animales          | CRUD /animals; GET /animals/founders, /animals/males, /animals/females, /animals/:animalId/pedigree    |
| Cruces            | CRUD /breedings; POST /breedings/calculate-coi; GET /breedings/history/:animalId                       |
| Salud ganadera    | CRUD /sanity; GET /sanity/upcoming                                                                     |
| Producción        | CRUD /production; GET /production/animal/:animalId/summary/:type y /production/animal/:animalId/recent |
| Operación         | GET /health, /ready, /live                                                                             |

CRUD significa GET/POST de colección y GET/PUT/DELETE por ID; comprobar parámetros en los archivos de rutas. `/api/health` es diagnóstico del servidor, no registros sanitarios. JWT requerido para datos/cuenta/sync; permisos por propietario.

Swagger UI: `/api-docs` en el puerto configurado. No hay endpoints separados `/api-docs/swagger` o de JSON anunciados por el servidor. La cobertura OpenAPI actual no incluye el registro de especies; ver [OPENAPI_ARCHITECTURE.md](OPENAPI_ARCHITECTURE.md).

## Calidad y estado

```sh
npm test -- --runInBand
npx tsc --noEmit
npm run build
npm run lint
```

Última ejecución tras limpiar código muerto: **184 tests pasan, 41 casos PostgreSQL omitidos**, 15 suites pasan; build y lint correctos. Para ejecutar casos reales configurar `SYNC_TEST_DATABASE_URL` con una base aislada llamada `sync_test`, nunca producción, con migraciones aplicadas. Los tests generan y limpian datos de prueba.

La implementación móvil ya está realizada, pero despliegue v2 y pruebas E2E en dispositivos siguen pendientes. La auditoría histórica de la DB conectada no acredita estado actual de producción.

## Documentación

- [Arquitectura modular](MODULAR_ARCHITECTURE.md).
- [Sync: diseño, migraciones y operación](docs/LOCAL_FIRST.md).
- [Contrato para móvil](.claude/docs/ai/watermelon-sync/api-handoff.md).
- [Estado y pendientes](IMPLEMENTATION_SUMMARY.md).
- [Crear módulos](NEW_MODULE_GUIDE.md), [referencias de plantillas](README_PLANTILLAS.md).
- [Convenciones](src/modules/NAMING_CONVENTIONS.md), [reglas técnicas](src/modules/ARCHITECTURE.md), [AGENTS](AGENTS.md).
- [Aplicación móvil](../AylluGen-App/README.md).

Licencia declarada en package.json: MIT.
