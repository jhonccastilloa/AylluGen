# Animal — contrato del módulo migrado

## Alcance y propiedad

Cada cuenta administra exclusivamente sus animales y especies. El propietario procede de la autenticación; no se acepta en el body. Las búsquedas de identificadores ajenos devuelven 404, igual que las inexistentes. Los progenitores deben estar registrados en la misma cuenta; no hay catálogo de antecesores externos ni fincas compartidas.

Core: `packages/core/src/animal`. Adaptadores: `apps/api/src/modules/animal/infrastructure/persistence` y `presentation/http`. Composición explícita, sin Inversify. Los contratos legacy retenidos para módulos pendientes no forman parte de las rutas activas.

## Retirada del legacy

La retirada de dependencias antiguas es parte obligatoria de cada migración. Las rutas de Salud, Producción, Reproducción y Sync están desactivadas, pero sus fuentes y pruebas todavía importan los siguientes archivos relativos a `apps/api/src/modules/animal/`:

| Archivo retenido                           | Consumidores pendientes                                                                         | Condición de retirada                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `domain/entities/Animal.ts`                | Salud, Producción, Reproducción, sus pruebas y el esquema legacy de Animal                      | Eliminar al retirar el último consumidor de `Animal`, `Sex` y los DTO antiguos.                 |
| `domain/repositories/IAnimalRepository.ts` | Servicios y pruebas de Salud, Producción y Reproducción                                         | Eliminar cuando los tres módulos utilicen sus contratos migrados.                               |
| `domain/services/AnimalRules.ts`           | `sync/application/services/WatermelonService.ts`                                                | Eliminar al adaptar las validaciones de Sync al modelo nuevo.                                   |
| `application/schemas/animal.schema.ts`     | Sync (`animalCreateSchema`), controladores de Producción y Reproducción (`animalIdParamSchema`) | Retirar cada export al desaparecer su último consumidor y borrar el archivo cuando quede vacío. |

Seguimiento de retirada:

- [x] Eliminar los esquemas legacy de actualización, consulta y respuesta, su esquema interno de relaciones y los alias de tipos sin consumidores.
- [ ] Migrar Salud: retirar imports de la entidad y el repositorio antiguos en fuentes y pruebas.
- [ ] Migrar Producción: retirar imports de la entidad, el repositorio y el esquema de parámetros antiguos en fuentes y pruebas.
- [ ] Migrar Reproducción: retirar imports de la entidad, el repositorio y el esquema de parámetros antiguos, incluido el motor genético y sus pruebas.
- [ ] Migrar Sync: retirar imports del esquema de creación y las reglas parentales antiguas.
- [ ] Completar la retirada: eliminar los archivos restantes y los directorios legacy vacíos de Animal.

Al cerrar cada migración, buscar referencias en todo el repositorio, eliminar en ese mismo cambio las declaraciones o archivos que pierdan su último consumidor y actualizar esta lista. No añadir consumidores nuevos de estos contratos. El flujo activo usa exclusivamente el core y los adaptadores nuevos.

## Campos

| Campo                    | Regla                                                           |
| ------------------------ | --------------------------------------------------------------- |
| `id`                     | UUID técnico generado por el servidor, permanente               |
| `code`                   | Código visible manual obligatorio; editable                     |
| `crotal`                 | Identificador físico opcional; editable, `null` si se desconoce |
| `speciesId`              | Especie existente de la cuenta                                  |
| `sex`                    | `MALE` o `FEMALE`                                               |
| `birthDate`              | Fecha opcional `YYYY-MM-DD`                                     |
| `fatherId`, `motherId`   | Progenitores opcionales, admiten genealogía parcial             |
| `status`                 | `ACTIVE` por defecto, `SOLD` o `DECEASED`                       |
| `exitDate`               | Fecha opcional `YYYY-MM-DD` de venta o fallecimiento            |
| `isFounder`              | Solo respuesta: ambos progenitores sin registrar                |
| `createdAt`, `updatedAt` | Timestamps ISO del servidor, solo respuesta                     |

Código y crotal se normalizan quitando espacios exteriores y pasando a mayúsculas. Cada uno debe tener de 1 a 50 caracteres tras normalizarse y ser único por usuario de manera independiente. Crotal vacío no es un dato válido: se envía `null`. Los identificadores de vendidos/fallecidos permanecen reservados; el borrado físico libera ambos, pero un nuevo animal recibe otro UUID.

Las fechas de calendario se representan como strings en el core y como columnas PostgreSQL `DATE`. Se admiten años desde 0001; deben existir en el calendario y no ser futuras, usando el día UTC como referencia. No se almacena una edad calculada.

No se añaden nombre, raza, notas ni procedencia. Peso, Salud y Producción pertenecen a sus módulos históricos. `userId`, `clientCreatedAt` y `clientUpdatedAt` no son campos HTTP públicos de Animal; estos últimos se conservan en persistencia por las dependencias técnicas existentes.

## Genealogía y correcciones

- Padre macho, madre hembra, misma especie y propietario que la cría.
- Padres distintos entre sí y del animal; prohibidos ciclos de cualquier longitud.
- Si se conocen las fechas, todo progenitor nace estrictamente antes que su cría.
- Cambiar nacimiento también valida los hijos existentes, de cualquier estado.
- Se permite añadir, corregir y quitar padres. Una relación omitida conserva su valor; `null` la quita.
- Fundador significa que no hay padres registrados; no prueba ausencia real de parentesco ni implica coeficiente genético cero.
- Vendidos y fallecidos siguen siendo consultables y pueden ser padres de crías históricas.
- Especie y sexo solo pueden cambiar sin hijos ni referencias de Salud, Producción o Reproducción; además se revalidan los padres propios.

El servicio de aplicación `application/services/AnimalValidator.ts` expone los métodos estáticos `validateCreation(store, animal)` y `validateUpdate(store, previousAnimal, nextAnimal)`. Ambos reutilizan un método privado estático para especie, unicidad y compatibilidad parental; las reglas puras entre entidades permanecen en `domain/services/AnimalRules.ts`. Cada caso de uso pasa el store de su transacción a `AnimalValidator`, sin crear instancias ni guardar el store en propiedades estáticas. La creación usa un UUID nuevo generado por el servidor, por lo que no consulta hijos existentes ni ascendencia hacia ese ID. La actualización comprueba ciclos cuando cambia un progenitor, fechas de hijos cuando cambia el nacimiento a una fecha conocida y referencias cuando cambia especie o sexo. Los casos de uso mantienen la transacción, la construcción de la entidad y la persistencia.

## Estado y eliminación

Venta y fallecimiento cambian `status`, conservando el registro y su historial. `exitDate` puede desconocerse; si se informa no será futura ni anterior al nacimiento conocido.

Un animal activo siempre tiene `exitDate: null`. Al corregir su estado a `ACTIVE`, omitir `exitDate` limpia la fecha anterior; enviar expresamente una fecha no nula es inválido. En los demás cambios, un campo omitido conserva su valor: al corregir entre `SOLD` y `DECEASED` hay que enviar también la nueva fecha o `null` si la anterior no corresponde. Solo se conserva la situación actual, no un historial de transiciones.

La eliminación es física, permitida únicamente sin hijos ni referencias desde Salud, Producción o Reproducción (macho, hembra y cría). Tener padres no impide eliminar una cría sin referencias entrantes. Se devuelve 204; repetir el borrado devuelve 404. No existe restauración ni `deletedAt` en Animal.

Las claves foráneas usan `RESTRICT`. El antiguo trigger que borraba historial y desvinculaba genealogía se retira; el trigger de seguimiento técnico sigue registrando tombstones para borrados físicos.

## HTTP

Todas las operaciones requieren Bearer y están bajo `/api/animals`:

| Método/ruta         | Resultado                                                   |
| ------------------- | ----------------------------------------------------------- |
| `POST /`            | 201, ficha del animal                                       |
| `GET /`             | 200, `{ animals, total }`                                   |
| `GET /:id`          | 200, ficha más `father` y `mother`, cada uno ficha o `null` |
| `PUT /:id`          | 200, ficha actualizada; actualización parcial               |
| `GET /:id/children` | 200, `{ animals, total }` de hijos directos                 |
| `DELETE /:id`       | 204 sin cuerpo, o 409 si hay referencias                    |

El listado admite `speciesId`, `sex`, `status`, `search`, `limit` y `offset`. Estado por defecto `ACTIVE`; `status=ALL` incluye todos. Búsqueda literal por fragmento de código/crotal sin distinguir mayúsculas. Orden estable por código y UUID. Límite 50 por defecto, máximo 100; offset no negativo. El total refleja todos los resultados del filtro antes de paginar.

Hijos admite únicamente `limit` y `offset`, incluye todos los estados y no devuelve generaciones recursivas. No hay rutas separadas de machos, hembras, fundadores o pedigrí multinivel.

Los cuerpos rechazan campos desconocidos. Un `PUT` vacío es inválido. Campos omitidos conservan su valor; `null` solo limpia opcionales. Ejemplo de creación:

```json
{
  "code": "A-001",
  "speciesId": "550e8400-e29b-41d4-a716-446655440000",
  "sex": "FEMALE",
  "birthDate": "2024-02-29"
}
```

Ejemplo de baja: `{ "status": "SOLD", "exitDate": "2026-01-15" }`.

Errores de dominio: `ANIMAL_INVALID`, `ANIMAL_INVALID_DATES`, `ANIMAL_INVALID_PARENT`, `ANIMAL_LINEAGE_CYCLE` → 400; `ANIMAL_NOT_FOUND`, `ANIMAL_SPECIES_NOT_FOUND`, `ANIMAL_PARENT_NOT_FOUND` → 404; `ANIMAL_DUPLICATE_CODE`, `ANIMAL_DUPLICATE_CROTAL`, `ANIMAL_IN_USE` → 409. Los errores conocidos de Prisma conservan el mapper HTTP global.

## Atomicidad y migración

Crear, actualizar y eliminar ejecutan lecturas, validación y escritura en `withOwnerTransaction`. El adaptador usa Read Committed y bloquea la fila del propietario en `sync_clocks` antes de leer. El store transaccional es local a esa operación; no muta clientes compartidos. Esto permite comprobar ciclos, fechas y unicidad sobre el estado que se guarda y evita perder cambios en campos omitidos entre escrituras simultáneas del módulo.

La migración `20261110000000_animal_lifecycle`:

1. Reemplaza acciones destructivas por claves foráneas restrictivas, incluidas macho/hembra de Reproducción.
2. Termina borrados lógicos antiguos únicamente si no tienen referencias.
3. Añade código y estado, hace crotal opcional, convierte nacimiento a `DATE` y añade baja.
4. Inicializa código desde el crotal anterior normalizado y estado como `ACTIVE`; elimina `isFounder` y `deletedAt`.
5. Actualiza comprobaciones de ownership, parentesco, cronología y ciclos; mantiene seguimiento técnico y refresca snapshots.

Datos antiguos incompatibles (duplicados al normalizar, identificadores inválidos, referencias rotas, ciclos, fechas incompatibles o borrados aún referenciados) hacen fallar la migración completa. No se inventan códigos ni se borra historial para resolverlos. El historial SQL anterior se conserva.

La API nueva requiere aplicar las migraciones y regenerar Prisma. Sync y mobile siguen pendientes de adaptación a estos cambios de contrato; sus rutas no están activadas.

## Verificación

Tras `pnpm build:shared`, desde `apps/api`:

```sh
pnpm prisma:generate
pnpm exec prisma validate
pnpm exec jest tests/unit/validation/animal-entity.test.ts tests/unit/presentation/animal.test.ts tests/unit/infrastructure/animal-persistence.test.ts --runInBand
pnpm exec jest tests/integration/animal-persistence.test.ts --runInBand
pnpm lint
```

La integración requiere `ANIMAL_TEST_DATABASE_URL` apuntando a una base aislada. Crea un schema temporal único, aplica todo el historial de migraciones y lo elimina al finalizar; nunca usa `DATABASE_URL` como fallback. Comprueba backfill, restricciones de cada relación, rollback de filas/snapshots, concurrencia de identificadores y ciclos, paginación y fechas. Se omite sin esa variable; los dobles de persistencia no acreditan estas garantías en PostgreSQL.
