# Arquitectura y guía del refactor

## Dirección y estado actual

La migración es incremental: las reglas de negocio y casos de uso se extraen a `packages/core`, y cada aplicación implementa sus adaptadores. **Species es la referencia del flujo nuevo de la API.** La existencia de módulos antiguos no convierte sus patrones en reglas para módulos nuevos.

Esta guía describe lo implementado y distingue las garantías pendientes. No implica que todos los módulos o clientes ya utilicen esta estructura.

## Distribución de responsabilidades

Rutas relativas a la raíz del monorepo:

```text
packages/core/src/
  shared/errors/DomainError.ts       contrato de errores de negocio
  species/domain/                   entidad, errores y puertos
  species/application/use-cases/    casos de uso
apps/api/src/
  composition/infrastructure.ts    construye repositorios, UUID, bcrypt y JWT
  composition/container.ts         ensambla casos de uso y controladores
  modules/specie/
    presentation/http/             controlador, DTOs, mapper, Zod y router
    infrastructure/persistence/    repositorio Prisma
  presentation/http/HttpResult.ts   resultado del controlador HTTP
  presentation/errors/             traducción común de errores
  presentation/middlewares/        autenticación y manejo HTTP
  presentation/routes/index.ts     registro de rutas activas
  index.ts                         arranque y composición
  server.ts                        configuración de Express
```

`modules/specie` (singular) es el adaptador nuevo. `modules/species` (plural) pertenece a la implementación anterior.

## Flujo de una solicitud

```text
Express → autenticación → SpecieRouter → SpecieController
        → caso de uso del core → puerto de repositorio → SpeciePrismaRepository
```

- El router extrae el usuario autenticado y adapta `HttpResult` a Express mediante handlers `async`. Express 5 propaga automáticamente los rechazos de sus promesas al middleware de errores; las operaciones deben esperarse con `await` o devolverse con `return`.
- El controlador recibe entradas `unknown`, valida con Zod, ejecuta el caso de uso y proyecta un DTO. No recibe `Request` ni `Response`.
- El core contiene reglas y orquestación de negocio; depende de puertos, no de Express, Prisma, Inversify o apps.
- El repositorio recibe `userId` por operación y aplica el alcance por propietario. No mantiene un usuario configurado permanentemente.
- `buildInfrastructure` construye los adaptadores y expone repositorios, generador de IDs, hasher y servicio de tokens mediante sus puertos. `buildContainer` recibe esas dependencias y ensambla los casos de uso y controladores al arrancar.
- Los repositorios reciben obligatoriamente el cliente de persistencia por constructor; `buildInfrastructure` inyecta la instancia Prisma. Species y User reciben `PrismaTransaction`; Auth recibe `PrismaClient` porque inicia transacciones. No se utilizan clientes globales como valores por defecto en los repositorios migrados.
- Los adaptadores de persistencia seleccionan explícitamente las propiedades de dominio al reconstruir entidades, evitando propagar filas completas mediante spread. Sus métodos públicos declaran los retornos definidos por el puerto, incluido `Promise<Entidad | null>` para búsquedas que pueden no encontrar resultados.
- Cada controlador recibe un objeto `I<Modulo>UseCases` con propiedades explícitas terminadas en `UseCase`. Todos los controladores se construyen en variables locales antes del retorno del contenedor.

### JWT y autenticación HTTP

- `JwtTokenService`, en `modules/auth/infrastructure/security`, encapsula firma, verificación y validación Zod del payload. Recibe secretos y duraciones por constructor. `tokenService.ts`, en el mismo directorio, construye y exporta una única instancia configurada, compartida por `buildInfrastructure` y el middleware HTTP.
- `ITokenService` mantiene `issue()` y `verifyRefresh()` como operaciones del core. `buildInfrastructure` expone la instancia compartida mediante ese puerto y los casos de uso la reciben por constructor. `verifyAccess()` pertenece al adaptador y lo utiliza directamente `authMiddleware`.
- Los routers importan `authMiddleware` directamente. El middleware extrae Bearer y llama a `tokenService.verifyAccess(token)` conservando el contexto de la instancia. `App` y el agregador de rutas reciben los controladores; la autenticación se conecta dentro de los routers. En pruebas, la clase JWT admite configuraciones independientes y el middleware compartido utiliza la configuración de la aplicación o un mock de su módulo.
- El adaptador distingue access y refresh mediante `tokenUse`, genera un `jti` único por refresh y obtiene su vencimiento del `exp` del token recién emitido. La lectura de `exp` es privada y no sustituye la verificación de tokens recibidos. Las duraciones conservan formatos como `15m` y `7d`.
- `verifyRefresh()` traduce errores JWT a `AuthError` con `INVALID_REFRESH_TOKEN`. Los errores JWT de access llegan al mapper HTTP, conservando `INVALID_TOKEN` y `TOKEN_EXPIRED`.
- Se retiró `shared/utils/jwt.ts`. Las pruebas del adaptador están en `tests/unit/infrastructure/jwt-token-service.test.ts`.

DTOs, esquemas y mappers cumplen responsabilidades distintas; no aplica la antigua prohibición general de DTOs. Tampoco se exige un árbol de cuatro capas dentro de cada módulo de la API.

### Contratos y mapeo de respuestas HTTP

En los módulos migrados, los contratos de respuesta y su conversión siguen este patrón dentro de `presentation/http`:

- `<modulo>Dto.ts` define interfaces `I<Modulo>ResponseDto`, como `IUserResponseDto` e `IAuthResponseDto`.
- `<Modulo>DtoMapper.ts` expone una clase con el método estático `toResponse(...)`, con retorno explícito del DTO correspondiente.
- El mapper selecciona explícitamente los campos públicos, convierte fechas a ISO cuando corresponde y reutiliza otros mappers para respuestas anidadas. Evitar propagar entidades o resultados completos mediante spread a la respuesta HTTP.
- Los métodos del controlador declaran `Promise<HttpResult<DTO>>`, `Promise<HttpResult<DTO[]>>` para listas o `Promise<HttpResult<null>>` para respuestas sin contenido. Construyen el resultado con `ok`, `created` o `noContent`.
- Los DTOs HTTP pertenecen a presentación; el core devuelve entidades o resultados de aplicación. Los esquemas Zod y OpenAPI deben mantenerse alineados con los contratos HTTP.

Por ejemplo, registro, login y refresh usan `AuthDtoMapper.toResponse(...)` para devolver `IAuthResponseDto`; este mapper delega la conversión del usuario a `UserDtoMapper.toResponse(...)`. Logout y cambio de contraseña devuelven `HttpResult<null>` con estado 204.

### Contratos de los casos de uso

- Las entradas compuestas se definen como interfaces `I<Operacion>Input` junto al caso de uso que las recibe, como `ICreateSpecieInput`, `IRegisterInput`, `ILoginInput` e `IChangePasswordInput`.
- Las operaciones que reciben únicamente un identificador o token mantienen ese parámetro directo. El usuario autenticado puede pasarse como argumento separado, como en el cambio de contraseña.
- Todos los métodos `execute()` declaran su retorno explícitamente: una entidad, una colección, un resultado de aplicación o `Promise<void>`, según la operación.
- Si una salida compuesta pertenece a un único caso de uso, su interfaz `I<Operacion>Result` se define junto a él. Cuando basta con devolver una entidad o colección, se utiliza ese tipo directamente.
- Los resultados compartidos se ubican en `application/results`. Registro, login y refresh devuelven `IAuthResult`, definido en `auth/application/results/AuthResult.ts`, con tokens y `UserEntity`.
- El sufijo `Result` describe los datos de una operación exitosa; los errores se propagan mediante excepciones de dominio. La carpeta `results` es una convención del proyecto para contratos compartidos.
- El mapper HTTP transforma el resultado de aplicación en el DTO de respuesta. `AuthDtoMapper.toResponse(result: IAuthResult)` devuelve `IAuthResponseDto`, cuyo usuario es `IUserResponseDto`. El core permanece independiente de los contratos HTTP.

### Construcción y reconstrucción de entidades

- Las entidades tienen constructor privado y `create()` valida las invariantes de creación. Species valida identidad, nombre y descripción, y normaliza sus textos. User exige ID y hash no vacíos, DNI de ocho dígitos y fechas `Date` válidas; conserva los valores originales. RefreshToken exige usuario y token no vacíos y una fecha válida, que puede estar en el pasado.
- Las entidades seleccionan y copian las propiedades recibidas para que modificar el objeto de entrada no altere su estado. Los valores mutables, como `Date`, se copian tanto al construir como al devolverlos mediante getters.
- `restore()` se reserva para entidades reconstruidas por adaptadores de persistencia. En User y Species confía en los datos persistidos: omite las validaciones de `create()` (incluidas las fechas de User) y la normalización, conservando los valores almacenados. Mantiene las mismas copias defensivas que la creación y espera los tipos declarados, incluidas instancias `Date`; no es una entrada para datos HTTP.
- RefreshToken utiliza únicamente `create()`, ya que actualmente no necesita reconstrucción desde persistencia. Se añade `restore()` cuando existe ese uso concreto.

## Errores

`DomainError` expone `code`, `kind` y un mensaje apto para el consumidor. `SpecieError` lo especializa con códigos `SPECIE_*`; no existen aliases plurales en el contrato nuevo.

El mapper HTTP común traduce `validation` a 400, `not_found` a 404, `conflict` a 409 y `unauthenticated` a 401, conservando el código específico. También maneja Zod, autenticación/JWT y errores conocidos del parser. Los fallos desconocidos devuelven un 500 genérico.

La autenticación utiliza `UnauthenticatedError`; acepta un único token Bearer con esquema insensible a mayúsculas y verifica el JWT. El middleware de errores añade `WWW-Authenticate: Bearer` a las respuestas 401.

Los mensajes técnicos de Prisma no deben convertirse en mensajes públicos de dominio. `AppError`, el manejo HTTP anterior, el middleware de validación antiguo y el contenedor `shared/di` fueron retirados. Sus consumidores pendientes conservan imports rotos hasta su migración; es una decisión explícita de esta etapa.

Los casos de uso conservan sus errores de negocio específicos. Como respaldo global, `presentation/errors/mapHttpError.ts` traduce errores conocidos de Prisma: `P2002` a 409 `RESOURCE_CONFLICT`, `P2003` a 409 `RELATION_CONFLICT` y `P2025` a 404 `RESOURCE_NOT_FOUND`. Este último puede indicar un registro relacionado requerido, no necesariamente el recurso de la URL. Las respuestas usan mensajes públicos fijos y no exponen mensajes ni metadatos de Prisma. Los demás errores, incluidos fallos de conexión o validación de consultas Prisma, conservan el 500 genérico. Los repositorios no necesitan capturar estas excepciones y el core no depende de Prisma.

## Borrado de Species

El borrado es físico y solo se permite si ningún animal del usuario referencia la especie, incluidos animales eliminados lógicamente. La clave foránea `Animal.speciesId` conserva `onDelete: Restrict` como garantía de base de datos. El nombre queda disponible al eliminar la fila; una creación posterior recibe un ID nuevo. No existe restauración de especies. El trigger existente mantiene el registro técnico del borrado en `sync_records`.

La migración `20261101010000_species_physical_deletion` termina los borrados lógicos anteriores y retira `Species.deletedAt`. Si una especie previamente eliminada todavía tiene animales asociados, la clave foránea impide aplicar esa limpieza; no se eliminan animales en cascada.

## Añadir el siguiente módulo

1. Acordar reglas, ownership y alcance funcional de la migración.
2. Definir entidad, errores, puertos y casos de uso en el core siguiendo Species, sin añadir abstracciones para necesidades hipotéticas.
3. Implementar adaptador de persistencia y presentación en la API: esquemas, DTOs, mapper, controlador y router según lo necesario.
4. Construir dependencias en `src/composition` e inyectar el controlador al registro de rutas.
5. Añadir pruebas de comportamiento según el cambio. Usar integración real cuando sea necesario verificar restricciones o transacciones.
6. Registrar OpenAPI explícitamente si corresponde; montar un router no genera documentación Swagger.

Usar entradas públicas existentes como:

```ts
import { DomainError } from "@ayllugen/core/errors/domain";
import type { ISpecieRepository } from "@ayllugen/core/species/domain/ports/SpecieRepository";
```

Consultar `packages/core/package.json` para los exports. No reutilizar los antiguos paths `/species/create`, `/entity` o `/deletion-policy`. Cada módulo migrado exporta sus casos de uso explícitamente desde `application/use-cases/index.ts`; composición y controladores utilizan esa entrada.

Seguir nombres concretos como `SpecieEntity`, `CreateSpecieUseCase`, `SpeciePrismaRepository`, `SpecieController` y `SpecieRouter`. Mantener el estilo existente y no renombrar contratos públicos solo para uniformarlos.

### Interfaces, imports y errores

- Las interfaces propias de los módulos migrados llevan el prefijo `I`: `IUserProps`, `IRefreshTokenProps`, `ITokenIdentity`, `IIssuedTokens`, puertos, entradas, resultados y DTOs. Los aliases de tipos, como `AuthErrorCode`, conservan nombres sin ese prefijo.
- Usar `import type` para símbolos utilizados únicamente en anotaciones de tipos. Mantener imports de valor cuando se construyen instancias, se invocan métodos estáticos o se utiliza `instanceof`.
- Preferir nombres descriptivos para dependencias, como `idGenerator`. En los controladores, guardar la entrada validada en una variable local (`input` o un nombre específico para identificadores) antes de llamar al caso de uso, separando validación, ejecución y mapeo de respuesta.
- Cada error de dominio declara `public readonly code` con la unión de códigos de su módulo. El mapa `kindByCode` utiliza `satisfies Record<ErrorCode, DomainErrorKind>` para comprobar que cubre todos los códigos con categorías válidas.
- Esta convención de tipos conserva los códigos y mensajes públicos existentes.

## Coexistencia durante la migración

Los casos de uso de Auth construyen `RefreshTokenEntity.create(...)` con usuario y token no vacíos y una fecha válida. Sus getters son de solo lectura y la fecha se copia para evitar mutaciones externas. Una fecha pasada es válida como dato; la vigencia se comprueba al renovar. El adaptador Prisma mapea explícitamente sus propiedades a los datos persistidos.

En Auth, registro y cambio de contraseña construyen `PlainPassword.create(...)`, un objeto de valor que valida la política antes del hashing. `IPasswordHasher.hash` recibe `PlainPassword`; `verify` recibe un `string` para no aplicar nuevas reglas a credenciales existentes. `UserEntity` conserva únicamente el hash. La representación de texto/JSON de `PlainPassword` está redactada; el adaptador de hashing accede explícitamente a `value`.

- Los módulos anteriores pendientes conservan servicios, Inversify y otras convenciones. User/Auth ya migraron: sus entidades, puertos y casos de uso están en `packages/core/src/user` y `auth`; los adaptadores de la API usan `presentation/http` e `infrastructure`. `AuthRepository` define operaciones atómicas de cuenta/sesiones sin exponer Prisma al core. El antiguo archivo `auth/application/schemas/auth.schema.ts` conserva únicamente la inicialización OpenAPI que todavía importa sync.
- Species, Auth y `/users/me` están montados. La reactivación de los demás módulos forma parte de migraciones posteriores.
- Conservar las migraciones SQL y sus constraints/triggers. Una reorganización de código no justifica cambiar garantías de persistencia.
- Los documentos especializados de sync y OpenAPI describen sus propios subsistemas y necesitan revisión cuando se trabaje en ellos.

## Pendientes explícitos de Species

- Verificar el manejo global de errores de persistencia con PostgreSQL real; las pruebas HTTP actuales simulan errores Prisma.
- Alinear la búsqueda de nombres sin distinción de mayúsculas con la unicidad de la base.
- Definir la política ante actualizaciones concurrentes y la garantía del borrado frente a asociaciones de animales.
- Ampliar información de diagnóstico cuando se defina una política para detalles técnicos. La composición inyecta la instancia compartida de `infrastructure/logging/logger.ts`, construida mediante `createLogger.ts`, con contrato `shared/logging/Logger.ts` y contexto HTTP antes de los parsers. La instancia compartida es transitoria hasta migrar los consumidores antiguos a inyección.
- Adaptar pruebas e imports antiguos y completar OpenAPI.

El mapeo correcto de errores HTTP no garantiza atomicidad ni detección de actualizaciones perdidas. Consultar [README](README.md) para comandos y limitaciones de las verificaciones.
