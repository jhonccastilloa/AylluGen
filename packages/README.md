# Paquetes compartidos

Se administran desde el root del monorepo. Las apps mantienen sus herramientas y
configuraciones específicas; no heredan la configuración TypeScript de packages.

## Estructura

```text
package.json                    # TypeScript y comandos comunes de packages
tsconfig.packages.base.json     # Opciones compartidas, sin tipos globales de apps
tsconfig.packages.json          # Orden de compilación por project references
.gitignore                     # Ignora dist, node_modules y tsbuildinfo de packages
packages/
  core/
    package.json                # @ayllugen/core, sin dependencias externas
    tsconfig.json               # Hereda base; define src/dist
    src/
      species/
        domain/{entities,errors,policies,ports,types,value-objects}/
        application/use-cases/
    tests/
  contracts/
    package.json                # @ayllugen/contracts: core + Zod
    tsconfig.json               # Hereda base; referencia core
    src/
      species.ts                # Entrada de contratos; no barrel global
    tests/
```

Species es un módulo dentro de core, no un paquete independiente. Los próximos
módulos podrán añadirse en `packages/core/src/animals`, etc., con el mismo patrón
hexagonal, sin package.json, tsconfig ni .gitignore por módulo. Esta reorganización
no incorpora Animals ni cambia las reglas de Species.

Core contiene entidades, reglas, casos de uso individuales y puertos. No depende
de contracts, apps, Zod, Prisma, Watermelon, React Native, Express ni Inversify.
Contracts valida el formato wire con Zod; los adaptadores de
persistencia, la inyección de dependencias y los bootstraps permanecen en las apps.

## Comandos desde el root

```sh
pnpm install --frozen-lockfile
pnpm build:shared
pnpm test:shared
pnpm watch:shared
```

`build:shared` usa el TypeScript del root y compila primero core y luego contracts.
`test:shared` compila antes de ejecutar las pruebas de ambos paquetes y de sus
límites arquitectónicos. Node ejecuta las pruebas sin un framework adicional.
`watch:shared` recompila ambos paquetes en orden al editar sus fuentes.

Ambos publican CommonJS y declaraciones en `dist`; las apps y contracts importan
las entradas públicas por módulo descritas abajo. No hay aliases de compatibilidad
ni copias del dominio en las apps. Los hooks de preparación existentes de las apps siguen
llamando `build:shared`. Metro observa el workspace y nodemon observa los dist.

El Dockerfile del backend incluye los manifiestos, configuración root y ambos
paquetes. Su instalación incluye el root para disponer del compilador común.
Esta reorganización no ejecuta Docker, migraciones ni despliegues.

## Entradas públicas sin barrels

```ts
import { CreateSpecies } from '@ayllugen/core/species/create';
import { Species } from '@ayllugen/core/species/entity';
import { SpeciesCode } from '@ayllugen/core/species/code';
import type { SpeciesRepository } from '@ayllugen/core/species/repository';
import type { SpeciesData } from '@ayllugen/core/species/types';
import { assertSpeciesUnused } from '@ayllugen/core/species/deletion-policy';
import { speciesFieldsSchema } from '@ayllugen/contracts/species';
```

- Core y contracts siguen siendo dos paquetes, no uno por módulo. No hay barrels
  ni archivos index en sus fuentes. Cada entrada pública apunta al archivo que
  define la entidad, caso de uso, regla o tipo, sin una fachada de reexports.
- No importar `@ayllugen/core`, `@ayllugen/core/species` ni `@ayllugen/contracts`:
  esas entradas no están expuestas. Los tipos se consumen mediante `import type`.
- El Value Object y la política de eliminación tienen subrutas que apuntan a
  sus archivos concretos. Contracts y el validador de eliminación de sync no
  cargan casos de uso. Contracts expone su archivo de schemas directamente.
- Dentro del módulo, usar imports relativos al archivo concreto. No añadir
  índices ni archivos con otro nombre que reexporten piezas de otros archivos.
- `exports` delimita las subrutas públicas. `typesVersions` declara las mismas
  rutas para el resolver `node` utilizado por API y por la compilación compartida;
  mobile usa `exports`. No se cambiaron los tsconfig de las apps ni se añadieron
  aliases a sus resolvers. Las pruebas verifican que ambos resuelvan los mismos tipos.
- No importar rutas internas como `@ayllugen/core/dist/...`. Los próximos módulos
  podrán exponer entradas directas sin añadir otro package.json.

Subrutas de core bajo `@ayllugen/core/species/`:

- Dominio: `entity`, `code`, `deletion-policy`, `errors`,
  `types`.
- Puerto: `repository`.
- Entradas de comandos: `inputs`.
- Casos de uso: `create`, `update`, `delete`, `list`, `get`, `resolve-by-code`,
  `initialize-catalog`.

Contracts conserva `@ayllugen/contracts/species`, que apunta directamente a su
archivo de schemas. `requireSpecies` es un helper privado y no se expone.

Cada import de valor carga su archivo y las dependencias que ese archivo utiliza.
Importar `create` no carga los otros casos de uso. Las reglas cargan solo dos
módulos de dominio en Node; esta observación no mide latencia ni bundle nativo.

## Alcance y verificación

Se conservan entidad, casos de uso, puertos, reglas de negocio, fechas del
dispositivo, schema 7 y contrato sync. No hay cambios en Prisma/Watermelon schemas
ni operaciones sobre datos. Véase [Species](core/src/species/README.md).

Las pruebas SQL requieren PostgreSQL aislado y pueden omitirse si no está
configurado. Las pruebas Prisma simuladas y el bundle aislado de Species no
equivalen a pruebas SQL reales, un build completo ni una ejecución en teléfono.

### Resultado de la reorganización (2026-09-10)

- Aprobadas: 21 pruebas compartidas (dominio, contratos y arquitectura), 62 de
  mobile y 178 del backend.
- Aprobados: compilación de core/contracts, typecheck de mobile y backend sin
  emisión de declaraciones, ESLint del backend y bundle Android aislado del
  bootstrap de Species. Instalación offline con lockfile congelado verificada.
- Se compararon los 17 archivos de negocio trasladados: contenido sin cambios.
  El staging previo se conservó; no se modificaron schemas ni datos.
- Omitidas: 51 pruebas SQL sin una conexión de prueba habilitada; build nativo,
  ejecución en teléfono y construcción de imagen Docker no ejecutados.
- Problemas preexistentes reproducidos: build completo del backend con 11 errores
  TS2742 al emitir declaraciones de rutas/OpenAPI; ESLint mobile no inicia por el
  entorno desconocido `jest/globals`; bundle completo de mobile falla en codegen
  de `react-native-screens` (`SearchBarNativeComponent`, argumento `blur` requiere
  `React.ElementRef<>`). Ninguno se presenta como una verificación aprobada.

### Resultado histórico del ajuste inicial de entradas públicas (2026-09-12)

- Aprobadas: 25 pruebas compartidas, 62 de mobile y 178 del backend.
- Aprobados: compilación compartida, typecheck de mobile y del backend sin emitir
  declaraciones, ESLint API y bundle Android aislado de Species con las subrutas.
- Verificado: los dos resolvers TypeScript encuentran los mismos tipos; las
  raíces y rutas internas no son entradas públicas; los exports de tipos no
  cargan módulos vacíos; contracts/reglas no cargan casos de uso. Una comprobación
  de Node carga dos módulos de core para los validadores, frente a los 18 de la
  entrada global anterior. No es una medición de latencia ni del tamaño del bundle.
- Se retiraron los dos índices globales fuente y sus cuatro salidas antiguas
  `.js`/`.d.ts`. Permanecen los mismos 16 archivos de negocio, sin cambios de
  contenido, y el staging previo. Sin cambios de schemas, fechas ni protocolo sync.
- Omitidas: 51 pruebas SQL; no se ejecutaron migraciones, Docker ni pruebas en
  teléfono. No se repitió el bundle completo de mobile, cuyo fallo previo está
  registrado arriba.
- Problemas preexistentes reproducidos: los 11 errores TS2742 del build completo
  API y la configuración `jest/globals` de ESLint mobile. `git diff --check`
  también señala espacios previos en el package.json root, no editado en este ajuste.

### Resultado actual: entradas directas sin barrels (2026-09-12)

- Aprobadas: 26 pruebas compartidas, 62 de mobile y 178 del backend.
- Aprobados: compilación compartida, typecheck de ambas apps sin emitir
  declaraciones, ESLint API y bundle Android aislado del bootstrap de Species.
- Cada subruta pública apunta a un archivo concreto. Las pruebas comprueban la
  resolución de tipos en ambas apps, la ausencia de barrels y que `create` no
  cargue otros casos de uso ni módulos usados solo como tipos.
- Se retiró el índice restante de Species y sus salidas `.js`/`.d.ts`; los 16
  archivos de negocio conservan los mismos hashes. Se preservó el staging previo,
  sin cambios de reglas, schemas, fechas del dispositivo ni sincronización.
- Omitidas: 51 pruebas SQL sin una conexión de prueba habilitada. No se ejecutaron
  migraciones, despliegues, Docker, build nativo ni pruebas en teléfono. No se
  repitió el bundle completo de mobile; su fallo histórico está documentado arriba.
- Problemas preexistentes reproducidos: 11 errores TS2742 al emitir declaraciones
  en el build completo API y entorno `jest/globals` desconocido en ESLint mobile.
