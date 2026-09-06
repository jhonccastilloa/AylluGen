# Estructura actual del móvil

Revisado: 2026-09-05. Árbol resumido, no un inventario de archivos generados.

```text
index.js                         entrada nativa; importa unistyles antes de App
src/
  App.tsx                        composición de providers y navegación
  application/services/          AuthService y sus tipos
  core/
    config/env.ts                configuración de API
    storage/StorageAdapter.ts    MMKV
    i18n/                        recursos y lenguas habilitadas
    theme/themePreferences.ts    preferencias de tema
    constants/, types/, utils/
  features/
    animals/, breedings/, health/, production/, species/
      pages/                     pantallas de negocio
      hooks/                     casos de uso (clases UseCases)
      interfaces/                contratos de datos
      services/                  repositorios locales
    users/                       casos de uso y API REST de cuenta
    sync/
      hooks/SyncOrchestrator.ts  motor central de sincronización
      services/SyncApi.ts        transporte v2
      services/watermelonProtocol.ts  validación/proyección
    shared/                      utilidades y useLocalRefresh
    container.ts                 repositorios/DB/sync por cuenta
  infrastructure/
    api/                         Axios e interceptores
    auth/AuthSession.ts          sesión capturada y suscripciones
    database/                    SQLite, esquema 4, modelos, migraciones
      importLegacy.ts            preservación y conciliación de pendientes
      localRules.ts              reglas de escritura local
      PreservingSQLiteAdapter.ts protección de migraciones antiguas desconocidas
    logger/, theme/
  presentation/
    navigation/                  stacks y tabs
    screens/                     auth, ajustes y showcase registrado
    components/                  formularios, iconos, loader, banner sync
    providers/                   tema, i18n, red, LocalDatabaseGate, OfflineSyncProvider
  store/                         auth, loader, network, sync
  shared/                        tipos y utilidades UI
__tests__/                       test de App; otros tests junto al código
android/, ios/                   proyectos nativos
deploy/                          automatización Fastlane heredada
docs/                            integración Local-First
```

`BreedingsApi` existe solo para `calculateCoi`. Las otras entidades sincronizadas no tienen adaptadores CRUD REST activos. Los ejemplos desconectados, el HomeScreen antiguo y los wrappers de cola eliminados no forman parte de esta estructura.

No existe un `useThemeStore` activo: las preferencias están en `core/theme/themePreferences.ts`. La lógica de negocio móvil se organiza por features, no por un árbol global `domain/repositories`.

Tablas sincronizadas: `species`, `animals`, `breedings`, `health_records`, `production_records`. `sync_queue` y `app_meta` se conservan localmente para migración/metadatos; no se envían al backend.

Ver [arquitectura](ARCHITECTURE.md) y [contrato/migración](docs/LOCAL_FIRST_MOBILE.md).
