# Entidades sincronizadas: fechas del dispositivo y auditoría

Revisado: 2026-09-09. Contrato único para instalación limpia de desarrollo, compartido por Species, Animal, Breeding, HealthRecord y ProductionRecord.

| Watermelon y sync v2              | Prisma            | Significado                         |
| --------------------------------- | ----------------- | ----------------------------------- |
| `created_at` / modelo `createdAt` | `clientCreatedAt` | Creación original en el dispositivo |
| `updated_at` / modelo `updatedAt` | `clientUpdatedAt` | Última edición en el dispositivo    |
| No se almacena en el móvil        | `createdAt`       | Creación en el servidor             |
| No se almacena en el móvil        | `updatedAt`       | Actualización en el servidor        |

Watermelon genera automáticamente sus fechas nativas al crear y editar. El push las exige como números epoch en milisegundos; el backend las guarda directamente en los campos del cliente. El pull devuelve esas mismas fechas, sin reemplazarlas por la hora de recepción. La creación es inmutable para cualquier registro existente.

No hay columnas locales duplicadas, alias `client_created_at`/`client_updated_at` en la API ni fallback a fechas del servidor. La UI muestra y ordena por las fechas nativas del dispositivo. Una reconciliación conserva la fecha de una edición local pendiente; sincronizar, confirmar o reintentar no es una edición.

Las fechas dependen del reloj del teléfono. Los checkpoints son contadores independientes, no timestamps. El backend interpreta snapshots PostgreSQL en UTC.

## Esquema y sincronización

El móvil usa schema 7 con cinco tablas y especies obligatorias para Animales. No hay esquema alternativo, importación histórica, cola antigua ni migraciones locales previas. Pull acepta únicamente schema 7 y migration null. El backend publica solo `/api/sync/v2/pull` y `/api/sync/v2/push` para sincronizar.

Ninguna de las cinco entidades contiene `syncStatus`/`syncVersion` de negocio. Se mantienen los campos internos de Watermelon y `SyncClock`, `SyncRecord`, `SyncReceipt` en el servidor. Los campos específicos del negocio (nacimiento, fecha de cruce, control o producción) mantienen su significado y los CRUD REST siguen disponibles. Si la operación se origina por REST, las fechas de origen se generan en el servidor; el push móvil nunca las sustituye por la hora de recepción.

## Puesta en marcha

Desplegar primero backend con las migraciones SQL y Prisma actualizado. La migración `20260909000000_remove_legacy_sync` retira `sync_logs` y `SyncAction`; conserva la infraestructura nativa de sync. La migración `20260910000000_unify_device_timestamps` añade fechas de cliente a Species, retira el tracking de negocio restante y actualiza los snapshots sin reiniciar contadores ni recibos. Para especies ya existentes, no se pueden recuperar fechas móviles que nunca se guardaron: los nuevos campos se inicializan al aplicar la migración. No representa una reconstrucción de fechas históricas.

Antes de ejecutar el nuevo móvil, borrar una vez el almacenamiento local de la app de desarrollo o reinstalar sin restaurar datos, incluidas instalaciones anteriores con schema 6. Esto pierde sesiones, preferencias y pendientes locales. No se implementa ningún borrado automático ni hace falta vaciar PostgreSQL.

Las pruebas cubren fechas nativas de ida/vuelta en las cinco entidades, auditoría independiente, siete días offline simulados, respuestas perdidas, ediciones durante push, conflictos, reloj atrasado, rechazo de contratos antiguos y migración de snapshots con PostgreSQL aislado. No equivalen a prueba en dispositivo físico ni a despliegue.

Verificación de esta unificación (2026-09-09): 218 tests del backend con PostgreSQL temporal y 57 del móvil aprobados; TypeScript en ambos, validación Prisma y lint del backend correctos. El lint móvil no inicia por la configuración de ESLint: entorno `jest/globals` desconocido. No se modificó esa configuración ni se desplegó el backend.
