# Local-First con WatermelonDB

Revisado: 2026-09-05. Este documento reemplaza la estrategia anterior de cola manual.

## Flujo único

`UI → WatermelonDB → synchronize() → Sync API v2 → PostgreSQL`.

Crear/editar/borrar siempre empieza localmente para especies, animales, cruces, salud y producción. Offline significa cambios pendientes, no un camino de implementación diferente. La UI reacciona a la base.

## Motor actual

- `POST /api/sync/v2/pull`: dataset propio inicial o delta incremental.
- `POST /api/sync/v2/push`: batch completo; 204 sin cuerpo.
- Checkpoint opaco por cuenta: no convertir a fecha ni derivar de `Date.now()`.
- Seguimiento nativo `_status/_changed`, tombstones y reconciliación por columna.
- 409: repetir pull/reconciliación y reintentar; no llamar al endpoint legacy de resolver conflictos.
- Startup, foreground, reconexión, cambios con debounce y refresh manual. TTL por eventos, no intervalo.
- Reintentos acotados, aislamiento por cuenta y conservación de pendientes.

La app normaliza altas remotas como updates y usa `sendCreatedAsUpdated` para preservar tombstones locales y tolerar reintentos. La proyección de push copia el snapshot, no lo muta.

## Persistencia histórica

El esquema es 4. `sync_queue` sigue existiendo **solo como datos de migración**; su repositorio de ejecución y compactador fueron eliminados. `app_meta` conserva el marcador de importación. No se reutiliza `last_sync_at` antiguo.

Se importa por propietario desde la base histórica a una base por cuenta. Nunca borrar el archivo para solucionar un fallo ni instalar una versión con esquema inferior.

## REST y límites

Auth, perfil y cálculo COI siguen siendo remotos. No se eliminaron endpoints REST del servidor: los clientes antiguos pueden necesitarlos.

No hay paginación parcial de sync, descarga masiva global ni purga automática de tombstones. Los límites y escenarios offline se documentan en [la guía completa](docs/LOCAL_FIRST_MOBILE.md).

Ver también [arquitectura](ARCHITECTURE.md), [migraciones](src/infrastructure/database/migrations/README.md) y [contrato backend](../AylluGen-bk/.claude/docs/ai/watermelon-sync/api-handoff.md).
