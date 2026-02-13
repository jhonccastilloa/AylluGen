# Offline-First Architecture (Pragmatic Clean)

## Objective
Build a modular frontend for livestock + consanguinity workflows with:
- Local-first reads/writes
- Deferred sync to backend
- Feature-based modules with clear responsibilities

## Structure

```
src/
  features/
    animals/
    breedings/
    health/
    production/
    users/
    sync/
    shared/
  infrastructure/
    database/      # WatermelonDB schema + models + instance
```

## Layering per Feature

- `data/remote`: API access to backend routes.
- `data/local`: WatermelonDB local repository.
- `application`: use-cases orchestrating local operations + sync queue.
- `domain`: shared entity/value types.

This keeps architecture clean enough for growth, without heavy DI frameworks.

## Sync Strategy

1. `CREATE/UPDATE/DELETE` writes are stored locally first.
2. Each write enqueues a sync change in `sync_queue`.
3. `SyncOrchestrator` pushes queue to `/sync/push`.
4. It then pulls server updates from `/sync/pull`.
5. Local repositories upsert server state.

Conflict handling uses server precedence for now (`/sync/resolve-conflict` with `server` resolution).

## Tables Used in WatermelonDB

- `animals`
- `breedings`
- `health_records`
- `production_records`
- `sync_queue`
- `app_meta` (device id + last sync timestamp)

## UI Coverage (based on provided design)

- Herd inventory dashboard
- Register new animal
- Breeding match setup
- Match risk report

All connected to local-first feature use-cases.

## Notes

- Authentication remains API-first (existing auth flow reused).
- Sync runs on app active and periodic interval.
- Current direction is ready for adding new livestock features with the same module template.
