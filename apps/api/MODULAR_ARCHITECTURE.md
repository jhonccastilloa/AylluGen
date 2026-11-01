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
  composition/infrastructure.ts    construye adaptadores de persistencia
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
- La composición construye dependencias por constructor al arrancar. El generador de UUID se mantiene interno al ensamblaje.

DTOs, esquemas y mappers cumplen responsabilidades distintas; no aplica la antigua prohibición general de DTOs. Tampoco se exige un árbol de cuatro capas dentro de cada módulo de la API.

## Errores

`DomainError` expone `code`, `kind` y un mensaje apto para el consumidor. `SpecieError` lo especializa con códigos `SPECIE_*`; no existen aliases plurales en el contrato nuevo.

El mapper HTTP común traduce `validation` a 400, `not_found` a 404 y `conflict` a 409, conservando el código específico. También maneja Zod, autenticación/JWT y errores conocidos del parser. Los fallos desconocidos devuelven un 500 genérico.

La autenticación utiliza `UnauthenticatedError`; acepta un único token Bearer con esquema insensible a mayúsculas y verifica el JWT. El middleware de errores añade `WWW-Authenticate: Bearer` a las respuestas 401.

Los mensajes técnicos de Prisma no deben convertirse en mensajes públicos de dominio. `AppError`, el manejo HTTP anterior, el middleware de validación antiguo y el contenedor `shared/di` fueron retirados. Sus consumidores pendientes conservan imports rotos hasta su migración; es una decisión explícita de esta etapa.

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

Consultar `packages/core/package.json` para los exports. No reutilizar los antiguos paths `/species/create`, `/entity` o `/deletion-policy`. El ensamblaje actual importa los casos desde `/species/application/use-cases/index`; no hay una prohibición general de archivos índice.

Seguir nombres concretos como `SpecieEntity`, `CreateSpecieUseCase`, `SpeciePrismaRepository`, `SpecieController` y `SpecieRouter`. Mantener el estilo existente y no renombrar contratos públicos solo para uniformarlos.

## Coexistencia durante la migración

- Los módulos anteriores conservan servicios, Inversify y otras convenciones. Mantenerlos según el alcance acordado; no copiar automáticamente esas decisiones al flujo nuevo.
- Solo Species está montado en el agregador actual. La reactivación de rutas forma parte de decisiones de migración posteriores.
- Conservar las migraciones SQL y sus constraints/triggers. Una reorganización de código no justifica cambiar garantías de persistencia.
- Los documentos especializados de sync y OpenAPI describen sus propios subsistemas y necesitan revisión cuando se trabaje en ellos.

## Pendientes explícitos de Species

- Traducir errores Prisma reconocidos a errores de negocio, con pruebas del adaptador.
- Alinear la búsqueda de nombres sin distinción de mayúsculas con la unicidad de la base.
- Definir la política ante actualizaciones concurrentes y la garantía del borrado frente a asociaciones de animales.
- Ampliar información de diagnóstico cuando se defina una política para detalles técnicos. La composición inyecta la instancia compartida de `infrastructure/logging/logger.ts`, construida mediante `createLogger.ts`, con contrato `shared/logging/Logger.ts` y contexto HTTP antes de los parsers. La instancia compartida es transitoria hasta migrar los consumidores antiguos a inyección.
- Adaptar pruebas e imports antiguos y completar OpenAPI.

El mapeo correcto de errores HTTP no garantiza atomicidad ni detección de actualizaciones perdidas. Consultar [README](README.md) para comandos y limitaciones de las verificaciones.
