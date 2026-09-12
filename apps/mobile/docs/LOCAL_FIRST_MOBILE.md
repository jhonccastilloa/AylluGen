# Integración Local-First móvil

Revisado: 2026-09-09. Baseline de desarrollo de instalación limpia: schema 7, cinco tablas, sin importación ni compatibilidad con versiones anteriores. Ver [fechas de las entidades sincronizadas](../../api/docs/ANIMAL_DEVICE_DATES.md).

## Resultado y alcance

La app utiliza React Native 0.83, WatermelonDB 0.28 y SQLite. Species usa el paquete compartido `@ayllugen/core` mediante entradas directas como `@ayllugen/core/species/create`, sin barrels: `pages → casos de uso compartidos → puertos → adaptador Watermelon`, ensamblado por cuenta en `features/species/bootstrap.ts`. Los demás módulos conservan `pages → UseCases → LocalRepository`. El CRUD de especies, animales, cruces, salud y producción siempre escribe localmente. Las pantallas observan cambios confirmados en WatermelonDB; no descargan entidades por REST para sustituir la base local.

Antes había una base compartida, lecturas REST con upserts manuales, una tabla `sync_queue`, push antes de pull y un intervalo de 45 segundos. Ahora `SyncOrchestrator` es el SyncManager central y utiliza `synchronize()` de WatermelonDB: pull incremental, reconciliación, push y confirmación nativa de cambios. No hay cola paralela ni elección de camino según la conexión.

Se eliminaron los adaptadores CRUD REST sin consumidores, `SyncQueueRepository`, su compactador y tipos, el restaurador de timestamps de los upserts antiguos y el cargador `getFeatureContainer`. `BreedingsApi` conserva únicamente el cálculo remoto de COI. También se retiraron `BackendHealthProvider` y `SystemApi`: no hay sondeos periódicos. Se limpiaron sus tests/mocks obsoletos y los ejemplos de UI desconectados de navegación. Se retiraron la importación histórica, sus tablas auxiliares y los endpoints del protocolo de cola del backend.

## Archivos principales

- `src/features/container.ts`: contenedor y base de datos independientes por cuenta; cada repositorio captura su base.
- `src/infrastructure/database/{index.ts,PreservingSQLiteAdapter.ts}`: apertura SQLite, UUID y protección frente a resets automáticos de bases incompatibles.
- `src/infrastructure/database/{schema,models}`: esquema 7 con cinco tablas y `animals.species_id` obligatorio e indexado.
- `src/features/sync/{hooks/SyncOrchestrator.ts,services/SyncApi.ts,services/watermelonProtocol.ts}`: ejecución, transporte y whitelist/validación.
- Repositorios locales y casos de uso de las cinco entidades: CRUD local, validaciones y tombstones; sin upserts REST.
- `src/features/shared/hooks/useLocalRefresh.ts`: relectura de proyecciones al cambiar la base, incluyendo cambios recibidos del servidor.
- `LocalDatabaseGate` y `OfflineSyncProvider`: espera de preparación, separación visual entre cuentas y disparadores por eventos.
- `src/infrastructure/api/{apiClient.ts,ApiService.ts}`: cuenta capturada en cada petición, refresh seguro frente a cambios de sesión y logs sin cuerpos.

## Contrato con el backend

URL base existente en `src/core/config/env.ts`; el sufijo `/api` ya forma parte de ella. Se requieren los endpoints v2 del backend y sus migraciones desplegadas antes de distribuir esta app. Esta tarea móvil no aplica migraciones ni despliega el servidor.

La configuración existente usa el mismo servidor remoto en debug y release. Un APK debug no implica un entorno de pruebas aislado: configurar una URL de staging antes de ejecutar pruebas E2E que escriban datos.

### Pull

`POST /api/sync/v2/pull`, Bearer token:

```json
{ "lastPulledAt": null, "schemaVersion": 7, "migration": null }
```

Respuesta:

```json
{
  "changes": {
    "species": { "created": [], "updated": [], "deleted": [] },
    "animals": { "created": [], "updated": [], "deleted": [] },
    "breedings": { "created": [], "updated": [], "deleted": [] },
    "health_records": { "created": [], "updated": [], "deleted": [] },
    "production_records": { "created": [], "updated": [], "deleted": [] }
  },
  "timestamp": 1
}
```

`timestamp` es un contador opaco por cuenta, NO una fecha. Watermelon administra su persistencia y envía el valor anterior. No se utiliza `last_sync_at` del sistema antiguo ni la fecha mostrada en la UI. El adaptador valida IDs, tablas, campos, tipos y monotonía antes de aplicar la respuesta. Inyecta `user_id` local desde la cuenta capturada, nunca desde datos remotos arbitrarios.

La respuesta de red mantiene `created/updated/deleted`. Antes de entregarla al motor se combinan `created` y `updated` en `updated` y se activa `sendCreatedAsUpdated`. Este modo permite upserts y evita que un `created` remoto resucite un tombstone local pendiente, especialmente en el primer pull y tras perder una respuesta. Se revisaron las [opciones oficiales de sync](https://watermelondb.dev/docs/Sync/Frontend) y el código instalado de WatermelonDB 0.28.

### Push

`POST /api/sync/v2/push`, Bearer token:

```json
{
  "lastPulledAt": 1,
  "changes": {
    "species": {
      "created": [
        {
          "id": "11111111-1111-4111-8111-111111111111",
          "code": "ALPACA",
          "name": "Alpaca",
          "description": null,
          "created_at": 1788256800123,
          "updated_at": 1788429600123
        }
      ],
      "updated": [],
      "deleted": []
    }
  }
}
```

Éxito: **204**, sin cuerpo. El cliente proyecta una copia con las columnas explícitamente permitidas; no modifica el snapshot que Watermelon usa para confirmar cambios. No envía `user_id`, `sync_status`, `sync_version`, `deleted_at`, `species` antiguo ni timestamps de auditoría. Los IDs UUID generados localmente se conservan. En las cinco entidades, `created_at` y `updated_at` son obligatorios y corresponden a `clientCreatedAt`/`clientUpdatedAt` en Prisma. El pull conserva esas fechas del dispositivo. Las fechas de negocio son números de milisegundos o `null` según el campo; la auditoría pertenece al servidor.

El código `watermelonProtocol.ts` es la referencia ejecutable de los campos. El contrato del servidor está en [LOCAL_FIRST.md](../../api/docs/LOCAL_FIRST.md).

## Disparadores, conflictos y errores

- Inicio de sesión/app, vuelta a foreground y recuperación de conectividad.
- Cambios locales: debounce de 800 ms. Pull-to-refresh: llamada explícita inmediata.
- TTL de 60 s evaluado al volver a foreground, no mediante un temporizador periódico. El arranque vuelve a comprobar el servidor aunque exista una fecha de sincronización previa.
- Una sola promesa de sincronización por cuenta; llamadas simultáneas comparten el trabajo.
- 409: un nuevo `synchronize()` hace pull y reconciliación por columna de Watermelon, seguido del reintento. No hay resolución `server wins` ni `last write wins` general.
- Tras un push exitoso se hace una pasada adicional para obtener el estado confirmado y los efectos del servidor. Los cambios hechos durante un push conservan su tracking nativo.
- Fallos transitorios: hasta cinco reintentos con backoff exponencial y jitter. Background/logout cancela los temporizadores, sin resetear la base ni borrar pendientes. Un ciclo ya iniciado puede terminar en su base capturada.
- 400/403/413 y conflictos persistentes: error visible, pendientes conservados, sin reintento automático infinito. Se reintenta tras correcciones/eventos o manualmente.
- La fecha `sync_display_last_success` es solo informativa y se guarda separadamente del checkpoint.

Un timeout del backend no altera la conectividad del dispositivo para sync: NetInfo es la autoridad. Un fallo transitorio al refrescar tokens tampoco cierra la sesión ni vuelve inaccesible el trabajo offline. Un refresh rechazado por autenticación sí exige iniciar sesión otra vez.

## Instalación limpia de desarrollo

Esta entrega no soporta bases de versiones anteriores, incluidas todas las de schema 6. Borrar una vez el almacenamiento de la app de desarrollo o reinstalar sin restaurar datos antes de ejecutarla. Se pierden sesiones, preferencias y pendientes locales; el usuario aceptó descartar estos datos de desarrollo. No se añadió ninguna rutina de borrado automático.

Cada cuenta utiliza `ayllugen_sync_<userUUID>`. Solo existen las cinco tablas de negocio: especies, animales, cruces, salud y producción. No se abre `ayllugen_offline`, no hay `sync_queue` ni `app_meta`, y no se reconstruye tracking antiguo. Watermelon mantiene sus metadatos internos y checkpoint.

El arranque espera la apertura de la base y habilita UI/sync. Los animales requieren una especie local válida; no se aceptan referencias históricas basadas únicamente en códigos. Logout conserva la base y los pendientes nuevos. Las bases contienen datos privados y no se añadió cifrado SQLite.

La versión 7 identifica el contrato unificado de las cinco entidades. No hay migración local desde versiones anteriores. Futuras versiones publicadas necesitarán diseñar sus migraciones de forma explícita. No hacer downgrades ni convertir un error de sync en un reset automático.

## Deletes y reglas locales

Se usa `markAsDeleted`/`prepareMarkAsDeleted`, no borrado físico de registros sincronizables desde los repositorios. Watermelon envía los IDs y limpia los tombstones solo después de un push confirmado. La retención de tombstones del servidor sigue siendo responsabilidad del backend; la app no exige sincronizar cada pocos segundos.

Una eliminación remota recibida por pull prevalece sobre una edición local pendiente del mismo registro, según el comportamiento del motor. No se recrea automáticamente un registro eliminado por otro dispositivo.

Borrar un animal se prepara en un solo batch SQLite: borra salud, producción y cruces como progenitor, y limpia referencias de padre/madre/cría. Borrar una especie con animales activos se rechaza. Se validan relaciones, sexos, especies, ciclos, unicidad local y tipos antes de guardar; el servidor mantiene la validación definitiva. La calidad de producción es un entero de 1 a 10, no un porcentaje.

## REST que permanece

Autenticación, refresh/logout y operaciones de cuenta/perfil/contraseña continúan como REST. El cálculo de consanguinidad (`/breedings/calculate-coi`) sigue siendo una acción del servidor y requiere sincronizar la genealogía pendiente primero. Guardar el cruce resultante es local, incluso si se pierde la conexión después del cálculo. Historial, próximos controles y resúmenes de producción se calculan desde la base local.

## Límites y rendimiento

Se sincroniza el dataset del propietario, no toda la base del servidor. Límite acordado: 500 operaciones y 2 MiB por push; 20.000 registros/16 MiB por pull; 10.000 registros en el grafo del backend. La comprobación móvil de tamaño usa una cota UTF-8 conservadora. No se divide un push en varios requests confirmando parcialmente el snapshot: rompería la garantía atómica. Si el uso offline necesita exceder estos límites, ampliar/scopar el contrato coordinadamente antes de distribuirlo.

Se reutilizan los índices existentes y se añade `species_id`. Las lecturas de catálogo para mostrar animales se agrupan; no hay un request por registro. Las pantallas reconsultan proyecciones locales y agrupan notificaciones concurrentes.

Android usa el bridge SQLite asíncrono ya autolinkeado: el proyecto no tenía integrada la biblioteca opcional `android-jsi`. No se introduce una integración nativa adicional para implementar el protocolo. iOS solicita JSI y el Podfile referencia `@nozbe/simdjson`, dependencia ya instalada de WatermelonDB, según la [instalación oficial](https://watermelondb.dev/docs/Installation). Ejecutar `bundle exec pod install` y compilar en macOS antes de distribuir iOS.

## Verificación y salida a producción

Los resultados de compilación fechados a continuación son históricos; no acreditan esta limpieza ni instalación en un dispositivo.

Los tests Jest ejercitan el motor real `synchronize()` con el adaptador Loki en memoria y transporte simulado; también hay tests de los interceptores Axios. Cubren first/incremental pull, CRUD y tombstones, rollback antes del batch, UUIDs, conflictos, respuestas perdidas, ediciones durante push, aislamiento de cuentas, refresh tardío, offline prolongado, debounce, backoff y límites. Esto **no sustituye** una prueba E2E con SQLite nativo y PostgreSQL.

Comandos:

```powershell
npm test -- --runInBand
npx tsc --noEmit
npm run lint
cd android
.\gradlew.bat :app:assembleDevelopmentDebug --console=plain
.\gradlew.bat :app:assembleDevelopmentRelease --console=plain
```

El lint general ya tenía 14 errores en `i18n.ts`, `SignInScreen.tsx` y `SettingsScreen.tsx` (imports/variables sin uso y dependencias de un hook); se contrastaron con `HEAD`. No se reactivaron ni borraron los bloques de UI que estaban comentados. Las capas nuevas/modificadas de sync pasan su lint.

Resultados de verificación (2026-09-05): **68 tests, 13 suites, todos correctos**; `npx tsc --noEmit` correcto. El build Android `assembleDevelopmentRelease` generó el bundle JavaScript, pero falló en `validateSigningDevelopmentRelease`: falta `android/app/my-ayllugen-key.keystore`. No se sustituyó la clave ni se modificó la configuración de firma. No había un dispositivo Android conectado para pruebas E2E.

`assembleDevelopmentDebug`: **BUILD SUCCESSFUL**, incluyendo las cuatro arquitecturas configuradas. APK generado en `android/app/build/outputs/apk/development/debug/app-development-debug.apk`. No se instaló ni ejecutó en un dispositivo; el build nativo no acredita por sí solo el funcionamiento E2E.

Antes de publicar: desplegar y auditar las migraciones/endpoints v2 del backend; probar instalación limpia y aislamiento de dos cuentas; probar modo avión/reinicio, dos dispositivos con ediciones concurrentes, expiración de tokens y borrados remotos. Revisar firma/versionCode y distribución con el responsable de la app. iOS necesita compilar y ejecutar en macOS. No se publica una app ni se modifica producción automáticamente.
