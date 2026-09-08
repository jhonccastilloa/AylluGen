# API Handoff: Watermelon Sync v2

Revisado: 2026-09-05, tras implementar el móvil y retirar código muerto. Contrato HTTP v2 sin cambios en esta revisión; implementación local no implica despliegue.

## Business Context

La aplicación ganadera guarda primero animales, especies, cruzamientos, eventos sanitarios y mediciones en WatermelonDB. La UI observa esos datos locales; la conectividad solo afecta cuándo llegan al servidor. El dataset es personal, sin grupos ni colaboración entre cuentas. El móvil ya implementa schema 4, bases por cuenta e importación de datos/pendientes históricos; faltan despliegue y verificación E2E en dispositivos.

## Endpoints

### POST /api/sync/v2/pull

Auth: JWT Bearer. Request:

```json
{ "lastPulledAt": null, "schemaVersion": 4, "migration": null }
```

`lastPulledAt`: entero seguro no negativo o null. Null/0 significa primer sync. `schemaVersion`: exactamente 4. `migration`: null o `{from:1|2|3,tables:[],columns:[{table:"animals",columns:["species_id"]}]}` con tablas/columnas permitidas. En la transición desde la cola anterior usar primer sync nativo, nunca el timestamp legacy como checkpoint.

HTTP 200, sin envelope adicional:

```json
{
  "changes": {
    "species": {
      "created": [
        {
          "id": "11223344-5566-4788-99aa-bbccddeeff00",
          "code": "ALPACA",
          "name": "Alpaca",
          "description": null,
          "created_at": 1788566400000,
          "updated_at": 1788566400000
        }
      ],
      "updated": [],
      "deleted": []
    },
    "animals": { "created": [], "updated": [], "deleted": [] },
    "breedings": { "created": [], "updated": [], "deleted": [] },
    "health_records": { "created": [], "updated": [], "deleted": [] },
    "production_records": { "created": [], "updated": [], "deleted": [] }
  },
  "timestamp": 2
}
```

`timestamp` es un checkpoint opaco, no una fecha. Entregarlo sin conversión a Watermelon. El backend devuelve todos los cambios del scope desde el checkpoint, sin paginación parcial. Máximo 20.000 registros / 16 MiB; exceder devuelve 413 sin avanzar estado.

### POST /api/sync/v2/push

Auth: JWT Bearer. Request de ejemplo:

```json
{
  "lastPulledAt": 2,
  "changes": {
    "animals": {
      "created": [
        {
          "id": "22334455-6677-4899-aabb-ccddeeff0011",
          "crotal": "AL-001",
          "sex": "FEMALE",
          "species_id": "11223344-5566-4788-99aa-bbccddeeff00",
          "birth_date": 1735689600000,
          "is_founder": true,
          "father_id": null,
          "mother_id": null
        }
      ],
      "updated": [],
      "deleted": []
    }
  }
}
```

HTTP 204 sin cuerpo. Máximo 500 operaciones entre todas las tablas y 2 MiB. Las colecciones sin cambios pueden omitirse. En cada colección presente se requieren las tres arrays. `created`/`updated` requieren registros completos con null explícito en columnas opcionales. `_status`/`_changed` se ignoran; no se almacenan. `created_at`/`updated_at` pueden volver desde Watermelon pero no son editables en servidor.

Errores: `{error:string,code:string}`. 400 request/tipos/relaciones inválidas; 401 sesión inválida o cuenta eliminada; 403 ID de otra cuenta; 409 conflicto o integridad concurrente; 413 `SYNC_SCOPE_TOO_LARGE` o payload excesivo; 500 fallo interno. Ningún error de push confirma parte del batch. Ante 409 volver a `synchronize()`; no llamar a `/sync/resolve-conflict`.

## Data Models / DTOs

Cada tabla debe tener su `id` nativo de Watermelon (string UUID) y estas columnas exactas. Los registros pull añaden `created_at:number` y `updated_at:number` de servidor a todas las tablas.

```typescript
type ID = string; // UUID v4 para nuevas altas; conservar IDs heredados
type Milliseconds = number; // Epoch ms; NO ISO strings
type Changes<T> = { created: T[]; updated: T[]; deleted: ID[] };
interface Species {
  id: ID;
  code: string;
  name: string;
  description: string | null;
}
interface Animal {
  id: ID;
  crotal: string;
  sex: "MALE" | "FEMALE";
  species_id: ID;
  birth_date: Milliseconds | null;
  is_founder: boolean;
  father_id: ID | null;
  mother_id: ID | null;
}
interface Breeding {
  id: ID;
  male_id: ID;
  female_id: ID;
  projected_coi: number;
  risk_level: "GREEN" | "YELLOW" | "RED";
  offspring_id: ID | null;
  breeding_date: Milliseconds | null;
  notes: string | null;
}
interface HealthRecord {
  id: ID;
  animal_id: ID;
  type: "VACCINATION" | "DEWORMING" | "SHEARING" | "CHECKUP" | "TREATMENT";
  date: Milliseconds;
  notes: string | null;
  next_due_date: Milliseconds | null;
  completed: boolean;
}
interface ProductionRecord {
  id: ID;
  animal_id: ID;
  type: "WEIGHT" | "WOOL" | "FIBER" | "MEAT" | "MILK";
  date: Milliseconds;
  value: number;
  unit: string;
  quality_score: number | null;
  notes: string | null;
}
```

No enviar `user_id`, `sync_status`, `sync_version`, `deleted_at`, `species`, objetos anidados `animal/father/mother`, ni columnas arbitrarias. Si siguen existiendo en el schema móvil por compatibilidad, el adaptador debe proyectar exclusivamente estas columnas antes del push. `sync_queue` y `app_meta` son exclusivamente locales: nunca incluirlos en `changes`.

## Enums & Constants

Sex: MALE/FEMALE. HealthType: VACCINATION/DEWORMING/SHEARING/CHECKUP/TREATMENT. ProductionType: WEIGHT/WOOL/FIBER/MEAT/MILK. RiskLevel: GREEN/YELLOW/RED. Los labels traducidos son responsabilidad de la UI.

No confundir versión del contrato HTTP `v2`, schema móvil `4`, versiones legacy por fila y checkpoint opaco. Solo `timestamp` del pull nativo alimenta `lastPulledAt`.

## Validation Rules

- IDs con forma UUID; configurar un generador UUID v4 para Watermelon antes de crear registros. Se preserva el mismo ID en servidor. No usar `localId/serverId`.
- Species: code 2–30, `[A-Z0-9_]+`; name 2–80; description null o hasta 200 caracteres. No se crean especies predeterminadas durante pull: el usuario/cliente puede crearlas offline o recibir las existentes.
- Animal: crotal 1–50, especie propia existente o creada en el mismo batch. Padres propios, activos, de especie compatible, sexo correcto y sin ciclos.
- Breeding: padres propios/activos, macho+hembra de la misma especie; cría propia de especie compatible. `projected_coi` entre 0 y 1 y risk enum. Son una estimación registrada; el cálculo remoto se obtiene mediante `/api/breedings/calculate-coi`.
- Production: value > 0, unit 1–50, quality_score null o entero 1–10. Notas sanitarias/productivas/cruzamientos null o hasta 10.000 caracteres.
- Fechas como enteros epoch ms (años 0001–9999). El orden de sync nunca usa el reloj del dispositivo.
- No repetir el mismo ID en varias operaciones de la misma tabla. Un código/nombre de especie o crotal ya reservado con otro ID es un conflicto semántico: se necesita corregir/unificar registros locales y sus referencias, no reintentar infinitamente.

## Business Logic & Edge Cases

- Los batches pueden crear especie, padres, crías y eventos conjuntamente; el orden de los arrays no impone el orden de dependencia.
- Un retry exacto de un push confirmado es seguro. Update de un ID desconocido crea el registro; tombstones nunca resucitan. Delete repetido/desconocido es seguro.
- Borrar un animal puede borrar salud/producción/cruzamientos asociados y desvincular parentesco. Reflejar esas consecuencias en la escritura local cuando sea posible; el siguiente pull confirma todos los cambios derivados.
- Borrar una especie con animales vivos se rechaza. Si especie y sus animales se borran juntos, es válido. Códigos y crotales de filas soft-deleted siguen reservados.
- Las eliminaciones conservan evidencia indefinidamente. No se pierde el acceso al delta por pasar meses offline.
- No fraccionar un push de más de 500 operaciones en varios requests y declarar exitoso `pushChanges()` tras una parte. El contrato no implementa sesiones de batch multipart. Mostrar el límite y conservar pendientes; ampliar el backend o acordar una estrategia de staging si ese volumen es necesario.
- Si el dataset excede límites, conservar DB/checkpoint y mostrar que requiere un scope admitido. No truncar el pull ni reiniciar la DB automáticamente.
- No reutilizar la misma base/checkpoint entre usuarios. Al cambiar cuenta, preservar los pendientes de la cuenta anterior y abrir su almacenamiento aislado correspondiente.

## Integration Notes

El móvil ya tiene un SyncManager central que permite una sola ejecución de `synchronize()` por base/cuenta. Disparadores: startup, foreground, conexión recuperada, cambios locales con debounce de 800 ms y pull-to-refresh. TTL de 60 s evaluado por eventos y hasta cinco reintentos transitorios con backoff/jitter; no hay polling.

En `pullChanges`, el adaptador envía los parámetros de Watermelon y valida `{changes,timestamp}`. Inyecta owner local desde la cuenta capturada y normaliza created+updated a updated, con `sendCreatedAsUpdated`, para no resucitar tombstones locales ante first sync/reintentos. En `pushChanges`, proyecta una copia de las columnas permitidas y envía `{changes,lastPulledAt}`, sin mutar el snapshot nativo. Ante 204 no parsea JSON; errores se propagan. Watermelon gestiona checkpoint/tracking durante sync normal; solo la importación histórica reconstruye tracking como parte de su batch de migración.

Un 409 permite un nuevo ciclo pull/reconciliación/push, con reintento acotado; después de un push exitoso se hace una pasada adicional para auditoría/efectos derivados. Un borrado remoto prevalece sobre una edición local pendiente según el motor; no se recrea automáticamente. [Protocolo de backend](https://watermelondb.dev/docs/Sync/Backend).

La UI siempre crea/edita/borra primero en la base local y observa sus queries. Auth, cuenta, cálculo de COI y consultas remotas ajenas al dataset pueden seguir REST. No hace falta WebSocket ni polling. No se han añadido headers de caché: un proxy no debe cachear respuestas de sync autenticadas.

La migración 3→4 ya agrega species y `animals.species_id` nullable para leer registros históricos. Nuevas altas requieren especie válida. La importación conserva el archivo anterior, filtra por cuenta, reconstruye pendientes y confirma un marcador atómico. El primer pull enlaza códigos antiguos con IDs; cola huérfana, IDs inválidos o ediciones pendientes ausentes del servidor requieren recuperación asistida, sin reset ni ownership supuesto.

Los adaptadores CRUD móviles y la cola de ejecución antigua se retiraron. La tabla histórica sigue existiendo para migrar; el logout preserva bases y pendientes. La recuperación asistida y la unificación de duplicados semánticos no tienen una UI automática completa.

## Test Scenarios

1. Crear especie/animal/evento sin conexión; observarlos inmediatamente; reconectar y comprobar que mantienen IDs.
2. Dos dispositivos editan el mismo registro: 409, nuevo pull, reconciliación y retry sin pérdida silenciosa.
3. Perder la respuesta del push y reenviar el mismo batch: no duplicar ni revertir una edición posterior.
4. Borrar un animal en un dispositivo; el otro vuelve meses después y recibe todas las bajas/desvinculaciones.
5. Cambiar cuenta: no compartir registros, pendientes ni checkpoint.
6. Migrar instalación vieja con pendientes: no perder operaciones, no enviar cola/app_meta ni timestamps legacy.
7. Mostrar errores permanentes 400/403 o duplicados de negocio sin loop infinito ni descartar cambios.
8. 401 renueva sesión por REST; 413 conserva base/checkpoint; un push fallido nunca se considera sincronizado parcialmente.

## Open Questions / TODOs

La integración móvil está implementada. Pendientes: desplegar v2/migraciones, probar actualizaciones in-place desde schema 2/3 y sincronización entre dispositivos con SQLite real, firma release y compilación iOS. Última verificación móvil: 59 tests pasan; no equivale a E2E. El backend solo admite el scope personal y límites publicados; no hay selección de animales descargados, scopes por explotación, bootstrap paginado ni purga/expiración de checkpoints.
