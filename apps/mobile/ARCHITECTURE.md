# Arquitectura móvil actual

Revisado: 2026-09-05. Describe implementación existente, no una propuesta de reescritura.

## Capas y estado

`pages → UseCases → LocalRepository → WatermelonDB`. Las pantallas observan cambios mediante `useLocalRefresh`; no sustituyen datos locales con respuestas CRUD.

WatermelonDB es la fuente de las cinco entidades sincronizadas. Zustand conserva sesión/estado UI de red, loader y sync; MMKV conserva sesión/preferencias. No se duplica el dataset en un store remoto ni en React Query.

El contenedor construye repositorios y un orquestador por UUID de usuario. Cada uno captura una Database inmutable para evitar operaciones sobre otra cuenta durante requests en vuelo.

## Inicio y aislamiento

`App` compone providers de tema/i18n/red, `LocalDatabaseGate`, `OfflineSyncProvider` y navegación. El gate espera apertura e importación antes de mostrar contenido autenticado y separa visualmente cuentas.

Se conserva `ayllugen_offline`; cada cuenta abre `ayllugen_sync_<userUUID>`. Logout detiene timers y no elimina bases ni pendientes. Un fallo de apertura/importación muestra error preservando datos.

## Escrituras y lectura

Las creaciones usan UUID compartido con servidor. Las escrituras ejecutan reglas locales y batches; las bajas usan tombstones nativos. El borrado de animal procesa relaciones y dependientes localmente. Las reglas del servidor son la validación definitiva.

Salud, producción, historial de cruces y vistas de inventario se consultan localmente. El código de especie histórico solo se conserva para importar; nuevas altas necesitan una especie local válida.

## Sync y acciones remotas

`SyncOrchestrator` usa `synchronize()`: pull incremental, reconciliación, push atómico del servidor y una pasada adicional tras push para auditoría/efectos derivados. Hay una ejecución por cuenta, debounce 800 ms, TTL 60 s evaluado por eventos y hasta cinco reintentos transitorios con backoff/jitter. No hay polling ni WebSockets.

409 permite una nueva ejecución de pull/reconciliación/push; conflictos persistentes y errores permanentes conservan pendientes y muestran error. Watermelon administra su checkpoint y tracking; no se mantiene una segunda cola.

Auth, cuenta y cálculo COI siguen usando Axios. El cálculo se bloquea ante genealogía pendiente. Los interceptores protegen requests/refresh frente a cambios de cuenta; sync no abre loader/toast global por cada petición.

## UI, estilos e idiomas

React Navigation organiza inventario, salud, producción, ajustes y formularios; el showcase de inputs sigue registrado. Unistyles gestiona estilos/temas; notificaciones con `react-native-toast-message`.

En `i18n.ts` están habilitados español, aymara y quechua. Otros JSON se conservan, pero no están registrados como lenguas activas. Persisten controles comentados e imports sin uso en ajustes/login, reflejados en los 14 errores de lint conocidos.

## Límites y deuda real

El contrato admite dataset personal acotado: 500 operaciones/2 MiB por push y 20.000 registros/16 MiB por pull. No se implementó descarga selectiva ni bootstrap paginado. No fraccionar batches silenciosamente.

Pendientes: despliegue v2, pruebas E2E SQLite/PostgreSQL y actualización con datos offline; firma release, build iOS, revisión de Fastlane y protecciones de almacenamiento/backups. No se añadió cifrado SQLite.

Los detalles de conflictos, migración, protocolo y resultados viven en [LOCAL_FIRST_MOBILE.md](docs/LOCAL_FIRST_MOBILE.md); el mapa de archivos en [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).
