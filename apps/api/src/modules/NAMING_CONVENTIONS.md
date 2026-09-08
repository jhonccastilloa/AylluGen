# Convenciones actuales

Revisado: 2026-09-05. Refleja los nombres existentes; no exige renombrar masivamente módulos.

| Elemento                | Convención / ejemplo                   |
| ----------------------- | -------------------------------------- |
| Directorio de módulo    | minúsculas; animal, species, sync      |
| Entidad                 | Animal.ts                              |
| Contrato de repositorio | IAnimalRepository.ts                   |
| Implementación          | AnimalRepository.ts                    |
| Servicio                | AnimalService.ts                       |
| Controller              | AnimalController.ts                    |
| Rutas                   | animal.routes.ts                       |
| Esquemas                | animal.schema.ts; watermelon.schema.ts |
| Tests                   | AnimalService.test.ts                  |
| Clases/tipos            | PascalCase                             |
| Métodos/variables       | camelCase                              |
| Constantes              | SCREAMING_SNAKE_CASE                   |

No todos los archivos usan kebab-case: clases/servicios/repositorios usan PascalCase. No usar ejemplos de `user.service.ts` como regla del repositorio.

## IDs y nombres wire

Prisma/REST utilizan campos como `userId` y `speciesId`; el contrato Watermelon utiliza `species_id`, `birth_date` y demás columnas permitidas en snake_case. El adaptador hace la conversión explícita. La tabla wire de salud es `health_records`, mientras que el prefijo REST es `/sanity`.

Los IDs son strings; nuevas altas móviles usan UUID. No introducir localId/serverId ni usar el ID como autorización.

## DI

Los módulos existentes usan identificadores `TYPES.X` definidos y registrados en shared/di. Watermelon utiliza `TYPE_IWatermelonRepository` y bindings por clase. La declaración e inyección deben coincidir con el mismo token.

## Tipos y payloads

Usar Zod con tipos inferidos para requests/responses. Las entidades de dominio pueden tener interfaces; no duplicar un mismo contrato manualmente en varias capas. Separar datos de entrada de auditoría/ownership que controla el servidor.

Métodos con intención: findById, create, update, delete, calculateCOI. `user`, `data`, `password`, `type` no están prohibidos por una lista de palabras artificial: son propiedades usadas en el proyecto. Preferir nombres específicos cuando desambigüen.

## Formato y revisión

TypeScript estricto, dos espacios y formato del proyecto con Prettier. Seguir el estilo del archivo existente. Controllers con asyncHandler, errores de aplicación y proyecciones explícitas.

Comprobar lint, build, tests, ownership y compatibilidad según [guía de módulos](../../NEW_MODULE_GUIDE.md). No cambiar nombres de tablas/rutas públicas solo para uniformar estilo.
