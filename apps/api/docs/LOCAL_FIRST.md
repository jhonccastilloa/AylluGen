# Local-First: diagnóstico y arquitectura implementada

Revisado: 2026-09-09. Un único contrato: sync v2 con schema móvil 7. Se retiró el protocolo de cola antiguo y la importación histórica del móvil. Los datos locales de desarrollo se descartan mediante una limpieza explícita antes de usar esta entrega. Ver [guía móvil](../../mobile/docs/LOCAL_FIRST_MOBILE.md) y [fechas de las entidades sincronizadas](ANIMAL_DEVICE_DATES.md).

## 2. Entidades y relaciones encontradas

| Entidad / tabla                       | Decisión        | Motivo                                                   |
| ------------------------------------- | --------------- | -------------------------------------------------------- |
| Animal / animals                      | Sync            | Rebaño propio, edición offline y genealogía              |
| Species / species                     | Sync            | Catálogo personal necesario para crear animales offline  |
| Breeding / breedings                  | Sync            | Registro persistido de cruzamientos                      |
| HealthRecord / health_records         | Sync            | Eventos y tareas sanitarias propias                      |
| ProductionRecord / production_records | Sync            | Mediciones propias                                       |
| User / users                          | REST            | Identidad, credenciales y gestión de cuenta              |
| RefreshToken / refresh_tokens         | REST interno    | Sesiones; nunca en Watermelon                            |
| SyncLog / sync_logs                   | Legacy interno  | Cola/log anterior; nunca en Watermelon                   |
| SyncClock, SyncRecord, SyncReceipt    | Infraestructura | Checkpoints, últimas versiones/tombstones e idempotencia |

Todas las entidades de negocio pertenecen a un usuario. Animal referencia una especie y padres; salud/producción referencian un animal. Breeding tenía `maleId`/`femaleId` como strings sin FK, además de una FK opcional a la cría. Las comprobaciones diferidas nuevas protegen también esas relaciones y su propietario. No hay roles, ACL de grupos ni colaboración entre usuarios: cambiar owner no está soportado.

## 3. Viabilidad

Viable sin cambiar ORM, framework ni IDs existentes. Las PK ya son `TEXT` con UUID por defecto; no son autoincrementales. Se conservan igualmente los IDs determinísticos de especies creados por la migración antigua. Watermelon debe generar UUID v4: su generador predeterminado de 16 caracteres no se acepta en este contrato para mantener compatibilidad con los validadores REST existentes.

La auditoría de solo lectura del PostgreSQL conectado, el 2026-09-05, encontró las cinco tablas de negocio vacías, sin IDs incompatibles ni relaciones inválidas. Se verificaron las cinco migraciones previas aplicadas. Esto no reemplaza repetir el preflight antes de desplegar sobre cualquier otra base.

No conviene desplegar este contrato sobre una cuenta con millones de eventos o cambiar silenciosamente a una ventana móvil por fecha. Ese escenario requiere definir suscripciones/archivos locales y eventos de entrada/salida del scope. En esta entrega el scope estable es el rebaño y los registros del usuario, sujeto a límites explícitos.

## 4. Arquitectura nueva

`UI → WatermelonDB → synchronize() → /api/sync/v2 → controller → WatermelonService → IWatermelonRepository → PostgreSQL`.

REST y sync v2 escriben sobre las mismas tablas. Triggers registran las mutaciones desde cualquiera de esos caminos, incluso borrados SQL y cascadas. Los repositorios singleton nuevos no guardan un cliente transaccional mutable: cada operación recibe una sesión propia. Las validaciones de padres se extrajeron a `AnimalRules` y se comparten con `AnimalService`; los esquemas reutilizan restricciones y enums del negocio.

No se añadieron dependencias, polling ni conexiones persistentes. La frecuencia de sincronización no forma parte de la garantía de consistencia.

## 5. Contrato y versionado

Ver los esquemas ejecutables en `src/modules/sync/application/schemas/watermelon.schema.ts` y Swagger. Los endpoints requieren `Authorization: Bearer <access-token>`.

```http
POST /api/sync/v2/pull
Content-Type: application/json

{"lastPulledAt":null,"schemaVersion":7,"migration":null}
```

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

`timestamp` es un contador opaco por usuario; **no es una fecha**. `null`/`0` devuelve todos los registros vivos del scope propio. El pull normal consulta solo entradas con `version > lastPulledAt`. Devuelve la última imagen por registro, sin duplicar IDs. Solo se acepta schema móvil 7 y `migration: null`. No hay backfill de migraciones ni respuestas diferentes por versión; futuras ampliaciones requieren coordinación y pruebas.

```http
POST /api/sync/v2/push
Content-Type: application/json

{"lastPulledAt":1,"changes":{"species":{"created":[{"id":"11223344-5566-4788-99aa-bbccddeeff00","code":"ALPACA","name":"Alpaca","description":null,"created_at":1788256800123,"updated_at":1788429600123}],"updated":[],"deleted":[]}}}
```

Éxito: HTTP 204 sin cuerpo. Cada registro enviado es completo, no un PATCH. Se pueden omitir colecciones sin cambios. Fechas de eventos en milisegundos; columnas snake_case. No enviar `user_id`, `sync_status`, `sync_version` ni `deleted_at`. En las cinco entidades, `created_at`/`updated_at` son obligatorios y se guardan en `clientCreatedAt`/`clientUpdatedAt`; el pull devuelve esas mismas fechas. Los alias `client_created_at`/`client_updated_at` se rechazan. `createdAt`/`updatedAt` de Prisma son exclusivamente auditoría del servidor. La fecha de creación del cliente es inmutable al actualizar. `_status`/`_changed` nunca se persisten en PostgreSQL.

## 6. Checkpoint, concurrencia e idempotencia

`sync_clocks` contiene una fila por usuario. Cada trigger incrementa esa fila dentro de la transacción de la escritura. El bloqueo de la fila se conserva hasta commit/rollback: no puede confirmarse una versión mayor de ese usuario antes de la menor pendiente. No se usa `nextval()` ni el reloj para el checkpoint. PostgreSQL documenta que las secuencias ordinarias no se revierten junto con las transacciones; `REPEATABLE READ` mantiene el mismo snapshot entre consultas. [Aislamiento PostgreSQL 16](https://www.postgresql.org/docs/16/transaction-iso.html).

Pull lee contador e imágenes bajo un único snapshot `REPEATABLE READ`. Una escritura concurrente que no estaba confirmada no aparece ni en el contador ni en los datos; aparecerá en el siguiente pull. El cliente debe tratar el checkpoint como opaco y aislarlo por cuenta/base local.

Push toma el bloqueo del contador bajo `READ COMMITTED` antes de leer los registros. Si cualquier registro o descendiente afectado por una cascada cambió después del checkpoint, todo el push se rechaza con 409. El cliente vuelve a `synchronize()` para hacer pull, reconciliar mediante Watermelon y reintentar. No hay last-write-wins ciego.

Creación con ID existente propio aplica un upsert si no hay conflicto. Update desconocido crea el registro; update/create de un tombstone fuerza pull. Delete inexistente/repetido se ignora. `sync_receipts` guarda un hash SHA-256 del batch normalizado y el checkpoint, en la misma transacción: un retry exacto tras perder la respuesta devuelve éxito sin escribir, incluso si otro dispositivo editó después. No se almacena el payload en el recibo. Cambios en el batch o checkpoint se evalúan como una operación nueva.

El mutex es por usuario, no global. REST puede adquirir bloqueos de filas en otro orden: PostgreSQL puede detectar un deadlock y abortar un participante. Sync traduce errores conocidos de concurrencia/integridad a 409; no se confirma parcialmente. REST conserva su semántica anterior de errores y puede necesitar retry ante ese caso.

## 7. Base de datos y deletes

Migraciones SQL conservadas (incluyen triggers indispensables):

- `20260905010000_watermelon_sync`: crea `sync_clocks`, `sync_records`, `sync_receipts`; backfill de registros existentes a versión 1; triggers de altas/cambios/bajas y usuarios; FK de padres diferibles; índices.
- `20260905020000_sync_ownership`: preflight de relaciones y constraint triggers diferidos que validan el estado final del batch para cada usuario. Aborta ante datos heredados inválidos sin transferir ownership ni borrar historia.

La migración `20260909000000_remove_legacy_sync` elimina únicamente `sync_logs` y el enum `SyncAction` del protocolo retirado. No elimina clocks, records, receipts ni triggers. Debe aplicarse con el nuevo backend; no requiere vaciar las tablas de negocio.

`sync_records` guarda una imagen JSON del último estado vivo, versión de creación, versión actual y fecha de cambio de DB. Al borrar, conserva ID, owner y versiones, y limpia el payload. Es una tabla de seguimiento/tombstones, **no un historial de auditoría de todas las revisiones**.

Animal y Species conservan sus filas mediante soft delete. Salud, producción y cruzamientos pueden borrarse físicamente porque sus tombstones quedan registrados por triggers. Borrar un animal elimina sus registros sanitarios/productivos y cruzamientos donde es progenitor; desvincula padre/madre en otros animales y referencias de cría. Los cambios derivados se sincronizan. Se rechaza eliminar una especie con animales vivos asociados. La eliminación de una cuenta elimina también su estado de sync en servidor. Cerrar/cambiar sesión en el móvil no elimina bases: las aísla y conserva pendientes. Una futura limpieza local tras eliminar una cuenta requiere un flujo explícito que preserve/exporte pendientes y respete privacidad; no se debe usar logout como borrado automático.

No se purgan automáticamente tombstones ni recibos. Esto permite checkpoints antiguos sin depender de un TTL. Para purgar se necesita antes un protocolo de expiración: guardar un `minimumAcceptedVersion`, rechazar checkpoints anteriores con un error explícito de rebootstrap, preservar/exportar cambios locales pendientes y reconstruir el dataset antes de avanzar. Nunca purgar solo por fecha. El control de IDs reutilizados debe sobrevivir a esa purga. Los nombres/códigos/crotales únicos permanecen reservados incluso si la fila se soft-deletea; no se cambian las restricciones únicas históricas.

Las imágenes, triggers, índices parciales JSON, funciones y propiedades DEFERRABLE se mantienen en SQL. `prisma db push` no sustituye a las migraciones y no debe usarse para instalar esta capa. Los roles de aplicación no deben poder deshabilitar triggers, alterar funciones ni cambiar `session_replication_role`.

## 8. Seguridad y validaciones

Ownership siempre sale del JWT; el cuerpo v2 rechaza ownership/tablas/columnas no permitidas. Se validan IDs, tipos, enums, valores, referencias propias y activas, especie y sexo de padres, ciclos y estado final del batch. Los campos del servidor no son asignables. La colisión simultánea de un ID entre dos usuarios tampoco puede cambiar la imagen del ganador.

Los datos devueltos pasan por un mapa explícito de columnas: nunca se serializan directamente objetos Prisma ni snapshots completos. SQL usa parámetros para valores y solo identificadores de una whitelist estática. Los constraints de relaciones protegen también entradas REST. Se corrigió el acceso arbitrario a `/users/:userId`: ahora exige que sea la cuenta autenticada.

`projected_coi` y `risk_level` siguen representando el resultado/estimación registrado, tal como en el CRUD anterior; no son una certificación calculada durante push. `/breedings/calculate-coi` sigue disponible para obtener el cálculo del motor del servidor. No se utiliza ese valor para permisos.

Se corrigió también el cambio de contraseña: ahora se aplica bcrypt antes de persistir, como ya hacía el registro. No se inspeccionaron ni modificaron contraseñas históricas; si hubo cambios mediante el endpoint anterior, revisar su remediación en una tarea de cuentas.

La infraestructura de autenticación anterior utiliza `setTransactionClient()` mutable en singletons. Es un riesgo previo en login/registro concurrentes, no reproducido en la nueva capa; conviene una tarea separada para transacciones de autenticación aisladas por request.

## 9. Rendimiento y límites

- Índices `sync_records(userId, version)`, `(userId, tableName)`, `recordId` y parciales por referencia en imágenes JSON. Se añaden índices de padres y cría a las tablas de negocio.
- Pull: una consulta de contador y otra de cambios, sin N+1. Máximo 20.000 filas y 16 MiB de respuesta. Si se supera, 413 `SYNC_SCOPE_TOO_LARGE`, sin resultado parcial ni checkpoint nuevo.
- Push: hasta 500 operaciones totales y 2 MiB de request. Upsert en lote mediante `jsonb_populate_recordset` por tabla. Borrados en lote. Precarga de referencias y comprobación de cascadas en consultas conjuntas.
- Para validar genealogía completa se carga el grafo propio de animales+especies, máximo 10.000 nodos. Las comprobaciones diferidas revisan relaciones una vez por usuario por transacción; conservan su coste proporcional al historial propio.
- Transacciones de hasta 30 segundos; espera de conexión de hasta 10 segundos. Deben medirse tamaños/duración reales antes de ampliar límites. Las imágenes JSON duplican parcialmente el almacenamiento de registros vivos.

Para explotaciones mayores, diseñar un scope estable por unidad productiva/animales suscritos con clausura de relaciones, versionar las entradas/salidas y emitir tombstones de salida. Para historiales archivados se puede mantener consulta remota fuera del dataset local. No se implementó una ventana temporal silenciosa ni paginación parcial incompatible con `synchronize()`.

## 10. REST que permanece y obsolescencia

| Endpoints (prefijo /api)                                                                                                                      | Estado                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| POST /auth/register, /login, /refresh, /logout                                                                                                | Se mantienen: acciones del servidor                                             |
| GET /users/me, GET/PUT/DELETE /users/:userId                                                                                                  | Se mantienen: cuenta propia                                                     |
| POST /breedings/calculate-coi                                                                                                                 | Se mantiene: cálculo remoto                                                     |
| GET /production/animal/:animalId/summary/:type                                                                                                | Se mantiene: resumen remoto, útil también para datos no descargados             |
| GET /health, /ready, /live; /api-docs                                                                                                         | Se mantienen: operación/documentación                                           |
| CRUD /animals, /species, /breedings, /sanity, /production                                                                                     | Compatibilidad; redundantes para las nuevas escrituras sincronizadas            |
| /animals/founders, /males, /females, /:animalId/pedigree; /breedings/history/:animalId; /sanity/upcoming; /production/animal/:animalId/recent | Compatibilidad y consultas remotas; el nuevo móvil puede derivar vistas locales |

Se eliminaron `/sync/pull`, `/sync/push` y `/sync/resolve-conflict`, su código, bindings y documentación OpenAPI. Devuelven 404 para peticiones autenticadas. Los CRUD REST de negocio permanecen; sus escrituras aparecen en sync v2 gracias a los triggers.

## 11. Instalación de desarrollo

1. Aplicar las migraciones SQL existentes a un destino autorizado con `prisma migrate deploy`, regenerar Prisma y desplegar el backend. No sustituir SQL por `db push`.
2. Limpiar una vez los datos locales de la app de desarrollo o reinstalar sin restaurar datos. Esto descarta pendientes locales y sesiones; no es un comportamiento automático de la app.
3. Instalar el móvil actual con schema 7. No importar archivos ni checkpoints anteriores. Iniciar sesión y hacer el primer pull.
4. Probar modo avión, reinicio, conflictos, reintentos y aislamiento por cuenta antes de distribuir.

La limpieza de código no despliega el backend ni borra bases externas. No se necesita vaciar PostgreSQL para retirar compatibilidad. Conservar las migraciones SQL y sus pruebas; consolidar el historial completo de Prisma sería una tarea diferente.

## 12. Observabilidad, verificación y pendientes

Eventos `sync.started`, `sync.completed`, `sync.failed`: usuario, operación, checkpoint, counts por tabla, duración y código de resultado/error. No contienen payloads, contraseñas, DNI ni tokens. Se deshabilitó el logging Prisma de queries/errores porque puede incluir parámetros privados. Los errores HTTP de v2 no imprimen excepciones SQL ni cuerpos inválidos.

Se añadieron pruebas Jest contra PostgreSQL real y HTTP: first pull, incremental sin cambios/created/updated/deleted, pushes de todas las entidades, batches con padres posteriores, rollback, conflictos, retries/respuestas perdidas, usuarios aislados, colisión concurrente de ID, tombstones, offline prolongado, snapshots concurrentes, requests vacíos/invalidos, cuotas, backfill no destructivo y preflight de datos corruptos. La suite anterior requirió corregir imports, fixtures del catálogo y mocks de Inversify desactualizados; no se deshabilitaron aserciones para ocultar errores. Se añadió una configuración ESLint que faltaba.

Verificación histórica al implementar backend: 15 suites / 225 tests pasaron (51 casos nuevos, incluyendo PostgreSQL real, HTTP y migraciones), sin omitidos al definir la URL de integración. Typecheck, ESLint, build y aplicación limpia de siete migraciones pasaron. La auditoría de dependencias de esa instalación reportó 32 vulnerabilidades heredadas; ese número no es una auditoría vigente y no se actualizaron paquetes masivamente.

Comprobación histórica previa a retirar compatibilidad: 184 tests pasan y 41 casos PostgreSQL se omiten sin URL de integración; build y lint pasan. Se retiraron tres archivos sin importadores y dos métodos de repositorio sin consumidores, no rutas ni persistencia. No se repitió el despliegue ni la integración real en esa limpieza.

Para repetir integración: usar una base local aislada llamada `sync_test`, aplicar migraciones y definir `SYNC_TEST_DATABASE_URL` antes de `npm test -- --runInBand`. Sin esa variable se omiten explícitamente los casos que requieren PostgreSQL; las pruebas puras siguen ejecutándose. Los tests limpian exclusivamente usuarios y schemas creados por ellos.

Implementado en móvil: instalación limpia schema 7, catálogo local, UUID, flujo único local, aislamiento por cuenta y backoff/errores visibles. No hay resolución automática de duplicados semánticos ni recuperación asistida completa desde UI. Pendientes: pruebas E2E de actualización/offline/conflictos, firma release, iOS y despliegue de migraciones/backend. Evaluar scopes para cuentas grandes y definir expiración antes de cualquier purga.
