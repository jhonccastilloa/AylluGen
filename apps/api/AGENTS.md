# Backend — instrucciones para agentes

## Estado y alcance

El monorepo pnpm está en una migración incremental hacia arquitectura hexagonal.
Species es la referencia implementada del flujo nuevo. Consultar
[la arquitectura](MODULAR_ARCHITECTURE.md) y [ejecución y estado](README.md).

- Core de Species: `packages/core/src/species` desde la raíz del monorepo.
- Adaptadores de la API: `apps/api/src/modules/specie` (singular).
- HTTP del módulo en `presentation/http`; repositorio Prisma en `infrastructure/persistence`. El contrato común `HttpResult` está en `src/presentation/http`.
- Composición explícita: `src/composition/infrastructure.ts` y `container.ts`.
- `src/modules/species` (plural) y los demás módulos antiguos son código pendiente de migración, no plantillas para módulos nuevos.
- El agregador de rutas monta únicamente Species; la desactivación de las demás rutas es intencional durante la migración.
- Respetar el alcance acordado. No migrar otros módulos, reactivar rutas ni modificar mobile/sync como efecto secundario.

## Reglas del flujo nuevo

- Dominio, casos de uso y puertos pertenecen al core. El core no importa apps, Express, Prisma ni Inversify.
- Inyectar dependencias por constructor y construirlas en la composición. No añadir decoradores ni bindings Inversify al flujo nuevo.
- El router adapta Express; el controlador valida entradas `unknown` con Zod, llama casos de uso y devuelve `HttpResult` con DTOs explícitos.
- Obtener `userId` de la autenticación y pasarlo por operación; no tomarlo del body ni guardar un propietario mutable en el repositorio.
- Importar entradas públicas que existan en los exports de los paquetes; usar `import type` para tipos. No importar `dist` directamente ni reutilizar antiguos imports cortos como `/species/create` o `/species/deletion-policy`.
- Los errores de negocio extienden `DomainError` (`@ayllugen/core/errors/domain`), con `code`, `kind` y mensaje público. No contienen estados HTTP.
- Species usa exclusivamente `SpecieError` y códigos `SPECIE_*`. El mapper HTTP común traduce categorías a estados; los errores inesperados producen un 500 genérico.
- La autenticación HTTP usa `UnauthenticatedError` y validación Bearer/JWT. `AppError` pertenece al código anterior.
- Logging: inyectar `ILogger` desde composición; Winston se construye en `infrastructure/logging/createLogger.ts`. El contexto HTTP se inicializa antes de los parsers. Los consumidores antiguos importan temporalmente la instancia compartida de `infrastructure/logging/logger.ts`.
- Mantener nombres y formato del código circundante. No renombrar rutas o tablas para uniformar estilo.

## Verificación

Desde la raíz:

```sh
pnpm install --frozen-lockfile
pnpm build:shared
```

Desde `apps/api`:

```sh
pnpm dev
pnpm build
pnpm exec tsc --noEmit
pnpm exec jest tests/unit/presentation/specie-errors.test.ts --runInBand
pnpm test -- --runInBand
pnpm lint
```

Elegir verificaciones según el cambio. Los comandos directos `pnpm exec` requieren compilar antes los paquetes compartidos. El build/typecheck general y las suites antiguas tienen deuda de migración: distinguir fallos existentes de regresiones y no afirmar que todo pasa por aprobar una suite focalizada.

## Persistencia

- Usar el cliente Prisma de `src/infrastructure/database/prisma/client` e implementar los puertos del core.
- Preservar ownership, migraciones SQL, constraints y triggers existentes. `prisma db push` no sustituye el historial SQL.
- No copiar clientes transaccionales mutables de repositorios singleton antiguos.
- Las pruebas de integración requieren una base aislada; las de sync usan `SYNC_TEST_DATABASE_URL`. Una suite con pruebas omitidas no acredita integración.
- La traducción de errores Prisma y las garantías de concurrencia de Species siguen pendientes; no atribuirlas al mapper HTTP.
