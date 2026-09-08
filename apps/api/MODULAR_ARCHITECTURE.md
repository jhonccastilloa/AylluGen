# Arquitectura modular actual

Revisado: 2026-09-05.

## Organización

```text
src/index.ts                      carga configuración y arranca App
src/server.ts                     Express, parsers, CORS, Helmet, Swagger, errores
src/modules/
  auth/, user/, species/, animal/, breeding/, health/, production/, sync/
    domain/                       entidades, reglas y contratos
    application/                  servicios y esquemas Zod
    infrastructure/               repositorios Prisma/SQL
    presentation/                 controladores y rutas
src/presentation/                 middleware y agregador de rutas
src/infrastructure/               DB, OpenAPI y health checks
src/shared/                       DI, configuración, errores, mappers y logging
prisma/migrations/                historial SQL persistente
tests/                            unit e integración
scripts/audit-sync.cjs             preflight de solo lectura
```

## Caminos de ejecución

REST: `ruta → middleware/controller → servicio → repositorio → PostgreSQL`.

Sync v2: `WatermelonController → WatermelonService → IWatermelonRepository → sesión transaccional → PostgreSQL`. El contrato y las listas permitidas están separados del transporte. El controlador deriva usuario del JWT y valida el body; no hace SQL.

El módulo sync conserva dos implementaciones: `SyncService/SyncRepository` para clientes del protocolo antiguo y `WatermelonService/WatermelonRepository` para v2. No confundir compatibilidad con código muerto.

## Inyección y reglas

El contenedor de Inversify usa scope singleton. Los módulos existentes emplean símbolos de `shared/di/types.ts`; Watermelon usa `TYPE_IWatermelonRepository` y bindings por clase para servicio/controlador. Copiar el identificador realmente registrado, no inventar un segundo símbolo.

Las reglas de padres se comparten mediante `AnimalRules`; `GeneticEngine` implementa cálculo COI. Existen dependencias cruzadas entre módulos y algunos servicios legacy acceden a Prisma: la separación describe la organización, no una garantía de pureza absoluta.

## Transacciones

Sync v2 crea sesiones locales por operación; no guarda cliente transaccional mutable en el singleton. Pull usa snapshot REPEATABLE READ. Push bloquea contador por propietario bajo READ COMMITTED y aplica el batch completo.

Auth conserva setters transaccionales mutables en repositorios singleton. Es deuda existente: no tomarla como patrón para nuevas transacciones concurrentes.

## Persistencia y seguridad

Cinco tablas sincronizables, owner JWT, UUID conservados y relaciones validadas. Triggers capturan escrituras REST/directas y generan versiones/tombstones. Un push conflictivo devuelve 409 sin confirmar cambios parciales.

No retirar cascadas/triggers o campos históricos por limpieza superficial. No todas las relaciones son cascade: padres/cría se desvinculan y la propiedad se protege con constraints diferidos.

CORS y Helmet están montados. El limiter general está comentado; register/login/logout sí montan authLimiter. No afirmar que todas las rutas tienen rate limiting.

Ver [detalle de sync](docs/LOCAL_FIRST.md), [reglas técnicas](src/modules/ARCHITECTURE.md) y [alta de módulos](NEW_MODULE_GUIDE.md).
