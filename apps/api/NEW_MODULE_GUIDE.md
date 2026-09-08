# Crear o ampliar un módulo

Guía alineada al código al 2026-09-05. No hay generador automático: reutilizar patrones del módulo real más próximo.

## 1. Clasificar la función

Decidir si es una acción remota o datos que el móvil debe persistir. No añadir automáticamente cada entidad a sync. Definir propietario, permisos, relaciones, volumen y ciclo de borrado antes del CRUD.

## 2. Estructura

En `src/modules/<nombre>`:

- `domain/entities`: tipos de dominio.
- `domain/repositories`: contrato de acceso.
- `domain/services`, si corresponde: reglas reutilizables.
- `application/schemas`: Zod, tipos inferidos y metadatos OpenAPI.
- `application/services`: reglas/orquestación.
- `infrastructure/repositories`: Prisma/SQL.
- `presentation/controllers` y `presentation/routes`: HTTP.

No copiar un ejemplo genérico de `findMany()` sin owner para entidades privadas.

## 3. Implementación y seguridad

Seguir [nomenclatura](src/modules/NAMING_CONVENTIONS.md). Usar `@injectable()` e inyectar el identificador registrado en `shared/di/container.ts`; los módulos existentes normalmente usan `TYPES`, Watermelon un token de repositorio y clases.

Importar el contenedor del proyecto, no un supuesto `container` exportado por Inversify. Validar con Zod y obtener propietario desde autenticación, nunca de `body.userId`. Validar relaciones propias y activas.

Controladores con `asyncHandler`; servicios devuelven proyecciones explícitas sin contraseñas/tokens. No copiar clientes transaccionales mutables de auth a nuevos singletons: crear una sesión por transacción.

## 4. Base de datos

Cambiar schema y añadir una migración real:

```sh
npx prisma migrate dev --name nombre_del_cambio
npm run prisma:generate
```

El comando de desarrollo se usa solo contra una base de desarrollo autorizada. Para aplicar migraciones existentes al desplegar: `npx prisma migrate deploy`, tras respaldo/preflight.

No usar `db push` como sustituto: sync depende de SQL adicional. Definir relaciones/cascadas según negocio; no imponer cascade a todas las FK. Conservar UUID/IDs existentes.

## 5. Si participa en Watermelon Sync

Coordinar backend y móvil:

- Whitelist de tabla/columnas, validadores y proyección wire.
- Migración SQL con seguimiento de todas las mutaciones, tombstones e índices por owner/version.
- Reglas de estado final y batches atómicos, conflictos contra checkpoint e idempotencia.
- Schema/modelo/migración local; nuevos números de schema deben ser admitidos por el servidor (actualmente solo 4).
- Dependencias y scope estable: no entregar una descarga parcial como pull completo.
- Tests de first/delta pull, conflictos, retries, rollback, aislamiento, deletes y migraciones.

Ver [LOCAL_FIRST.md](docs/LOCAL_FIRST.md). No abrir un CRUD remoto alternativo para la UI sincronizada.

## 6. Registro y documentación

Registrar bindings, montar router en `src/presentation/routes/index.ts` y añadir OpenAPI. Una ruta Express no aparece automáticamente en Swagger. Reutilizar [referencias reales](README_PLANTILLAS.md).

## 7. Verificación

```sh
npm test -- --runInBand
npx tsc --noEmit
npm run build
npm run lint
```

Añadir integración con DB aislada cuando cambien SQL/transacciones. Confirmar que los casos PostgreSQL se ejecutaron, no solo que Jest terminó sin errores. No aplicar migraciones a producción durante tests.
