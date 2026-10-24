# Species: módulo hexagonal de @ayllugen/core

Primer módulo migrado. No cambia tablas, schema 7, IDs ni protocolo sync.

## Organización

```text
packages/core/src/species/
  domain/
    entities/Species.ts
    errors/SpeciesError.ts
    policies/SpeciesDeletionPolicy.ts
    ports/SpeciesRepository.ts
    types/Species.ts
    value-objects/SpeciesCode.ts
  application/
    use-cases/CreateSpecies.ts
    use-cases/UpdateSpecies.ts
    use-cases/DeleteSpecies.ts
    use-cases/ListSpecies.ts
    use-cases/GetSpecies.ts
    use-cases/ResolveSpeciesByCode.ts
    use-cases/InitializeSpeciesCatalog.ts
```

Los contratos Zod viven en `packages/contracts/src/species.ts`, publicados como
`@ayllugen/contracts/species`. Sus validadores wire no importan reglas del dominio.

Las apps consumen archivos concretos mediante subrutas públicas:
`@ayllugen/core/species/entity`, `/create`, `/update`, `/repository`, `/types`, etc.
El Value Object y las políticas se consumen desde subrutas directas, sin cargar
casos de uso. No hay barrels ni fachadas de reexports en core/contracts. Domain y
Application mantienen imports relativos entre archivos concretos. Los consumidores
usan `import type` para puertos, datos e inputs. Ver todas las
[entradas públicas](../../../README.md#entradas-públicas-sin-barrels).

Domain y Application no importan Prisma, Watermelon, React, Express, Inversify,
Zod ni archivos de las apps. Contracts define sus propias validaciones Zod para
HTTP/sync; no es una dependencia del núcleo.

`SpeciesCode` es un Value Object. Nombre y descripción son valores primitivos
validados dentro de la entidad al crear o editar. `restore()` conserva el texto
persistido sin normalizarlo ni validarlo de nuevo. `changeDetails()`
valida solo los campos enviados y conserva exactamente los valores omitidos.
`restore()` comprueba identidad y código, sin generar efectos;
nunca sustituye la validación de una entrada HTTP/push. La entidad contiene identidad
y campos de negocio. Las fechas del origen viajan en `SpeciesData`, una proyección de
persistencia; la auditoría del servidor es una extensión exclusiva del adaptador API.

## Adaptadores y ensamblado

- Mobile: `apps/mobile/src/features/species/infrastructure/WatermelonSpeciesRepository.ts`.
- Backend: `apps/api/src/modules/species/infrastructure/repositories/PrismaSpeciesRepository.ts`.
- Cada app tiene un `species/bootstrap.ts` que ensambla los mismos casos de uso.
- Los casos de uso reciben `SpeciesRepository` directamente. El repositorio está
  limitado a una cuenta y ofrece las consultas que necesitan las reglas del dominio.
- Los casos de uso validan duplicados y uso antes de escribir. Los adaptadores
  repiten esas comprobaciones dentro de cada escritura para cubrir carreras:
  Watermelon usa su writer y API una transacción Prisma con el lock de cuenta de sync.
  No se guarda un cliente de transacción mutable global.
- Un escritor Watermelon no equivale a rollback SQL: cada comando termina sus
  validaciones antes de efectuar su única mutación.
- La fábrica mobile captura la cuenta; no cambia a REST cuando aparece internet.
- `SpeciesUseCasesFactory` ensambla casos de uso por cuenta sin acoplar Application a bootstrap.

## Comportamiento

- Código: trim, mayúsculas, espacios a `_`, eliminación de caracteres ajenos a
  `A-Z0-9_`; luego longitud 2–30 y formato.
- Nombre: trim y longitud 2–80. La unicidad conserva la comparación exacta actual;
  no se introducen equivalencias por tildes o mayúsculas para el nombre.
- Descripción: máximo 200; omitida en update conserva el valor; `null`, `''` o
  espacios limpian el valor a `null`. REST y mobile aplican el mismo comportamiento.
- Duplicados: código/nombre dentro de la cuenta; update excluye el mismo ID.
- Eliminación: requiere especie existente de la cuenta y ausencia de animales activos.
  Los casos de uso devuelven `SPECIES_NOT_FOUND` para IDs ausentes, también en mobile.
- El backend conserva los índices únicos que reservan códigos/nombres eliminados.
  El adaptador los consulta para devolver un conflicto comprensible. Mobile solo
  conoce registros locales activos: la reutilización de claves eliminadas y los
  conflictos entre dispositivos siguen requiriendo una política separada.
- `ListSpecies` es de solo lectura. La fachada REST conserva la inicialización
  explícita del catálogo predeterminado y resolución automática usada por Animals;
  mobile y pull no crean especies predeterminadas. La inicialización es por especie,
  idempotente por código, no una transacción única del catálogo completo.

## Sync y fechas

El push reutiliza los validadores canónicos de campos y la regla de eliminación,
pero no reproduce `CreateSpecies` por fila. Sigue validando el estado final del
lote y aplicándolo atómicamente. Los validadores wire no normalizan datos ni fechas:
no se altera un snapshot mientras Watermelon está confirmando cambios.

`created_at`/`updated_at` de Watermelon corresponden a
`clientCreatedAt`/`clientUpdatedAt`. El adaptador REST origina sus fechas en el
servidor. `createdAt`/`updatedAt` Prisma siguen siendo auditoría independiente.
La reconstrucción/lectura/pull no genera cambios pendientes. Se mantienen
checkpoints, recibos, tombstones y aislamiento por cuenta.

## Desarrollo y pruebas

Desde la raíz del monorepo:

```sh
pnpm install --frozen-lockfile
pnpm build:shared
pnpm test:shared
pnpm --filter AylluGen test --runInBand
pnpm --filter ayllu-gen-backend test --runInBand
```

Core y contracts publican CommonJS y tipos en sus respectivos `dist`. Core no tiene
dependencias de ejecución externas. Species es un módulo interno, no un paquete:
no tiene package.json, tsconfig ni .gitignore propios. Después de editarlo ejecutar
`pnpm build:shared` o mantener `pnpm watch:shared` desde el root en otra terminal.
Metro observa el workspace; Jest y Metro resuelven helpers Babel desde mobile.
Las entradas normales de build/dev/test de las apps preparan el paquete.

Las pruebas del núcleo no necesitan base de datos. Mobile usa Watermelon real con
Loki. Las pruebas unitarias de Prisma simulan el cliente; las pruebas SQL requieren
`SYNC_TEST_DATABASE_URL` apuntando a una instancia local aislada `sync_test` con
las migraciones aplicadas. Un test omitido no verifica PostgreSQL ni un teléfono.

### Verificación histórica de la migración hexagonal inicial (2026-09-10)

Estos resultados corresponden a la migración original de Species. La verificación
de su reorganización dentro de core está en [Paquetes compartidos](../../../README.md).

- Núcleo: 14 pruebas; contratos: 3; mobile: 62; backend: 178 aprobadas.
- Backend: 51 pruebas SQL omitidas sin PostgreSQL aislado; Docker devolvió un error del motor.
- Typecheck de mobile y del backend sin emisión de declaraciones: correcto.
- ESLint del backend: correcto. ESLint mobile no inicia por la configuración existente `jest/globals` desconocida.
- El bootstrap de Species se empaqueta con Metro para Android. No es una ejecución en teléfono.
- El bundle de toda la app falla en codegen de `react-native-screens` (`SearchBarNativeComponent`, argumento `blur`).
- El build completo del backend mantiene errores TS2742 de declaraciones de rutas/OpenAPI.
- Docker/Compose adaptados al workspace, sin construir/desplegar una imagen ni ejecutar migraciones sobre datos reales.
