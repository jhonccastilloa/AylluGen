# Reglas técnicas de los módulos

Revisado: 2026-09-05. Complementa [la arquitectura general](../../MODULAR_ARCHITECTURE.md).

## Capas existentes

Los módulos agrupan domain, application, infrastructure y presentation. Zod valida entradas; servicios coordinan reglas; repositorios acceden a PostgreSQL; controllers adaptan HTTP mediante asyncHandler.

Los módulos son auth, user, species, animal, breeding, health, production y sync. No existe un catálogo global de todas las entidades para exponer automáticamente por CRUD.

## Reglas de mantenimiento

- Derivar owner de JWT y limitar consultas/relaciones a esa cuenta.
- No serializar contraseñas, refresh tokens ni objetos Prisma completos sin proyección.
- Mantener transacciones v2 locales a cada operación; no compartir cliente mutable entre requests.
- Reutilizar AnimalRules y validadores cuando corresponda, sin invocar cadenas REST individuales por registro de un batch.
- Usar errores de aplicación y logging sin payloads privados; no imprimir SQL con parámetros.
- Conservar compatibilidad REST/legacy hasta verificar uso de clientes externos.
- Añadir migraciones SQL, no solo cambiar schema Prisma.
- No purgar tombstones o recibos sin diseñar previamente expiración/rebootstrap seguro.
- No confundir registro OpenAPI con registro de rutas o middleware.

## Estado real de infraestructura

Helmet, CORS y request logging están montados. AuthLimiter se utiliza en register/login/logout; el limiter general no está activado. Los setters de transacción de auth en singletons siguen siendo deuda. No se afirma cobertura total de rate limiting ni aislamiento perfecto de todas las capas legacy.

Sync v2 tiene reglas propias de privacidad/errores y parser de 2 MiB. No atribuir su atomicidad al sync anterior ni a una secuencia de requests CRUD.

## Pruebas

Unit tests en tests/unit e integración en tests/integration. Para PostgreSQL usar una DB aislada `sync_test` y la variable indicada en [README](../../README.md). Verificar explícitamente tests omitidos. Ninguna comprobación debe modificar datos de usuarios reales.

[Alta de módulos](../../NEW_MODULE_GUIDE.md) · [nombres](NAMING_CONVENTIONS.md) · [sync](../../docs/LOCAL_FIRST.md).
