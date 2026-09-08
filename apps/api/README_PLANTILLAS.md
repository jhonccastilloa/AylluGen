# Referencias para implementar módulos

Revisado: 2026-09-05. No hay un scaffold ejecutable. Esta guía apunta a implementaciones existentes para evitar copiar plantillas antiguas con rutas, imports o permisos incorrectos.

| Necesidad                          | Referencia                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| Entidad privada y catálogo         | [SpeciesService](src/modules/species/application/services/SpeciesService.ts) y su módulo     |
| Reglas de genealogía compartidas   | [AnimalRules](src/modules/animal/domain/services/AnimalRules.ts)                             |
| Motor de cálculo remoto            | [GeneticEngine](src/modules/breeding/domain/services/GeneticEngine.ts)                       |
| Transporte sync validado           | [WatermelonController](src/modules/sync/presentation/controllers/WatermelonController.ts)    |
| Batch/sesión transaccional         | [WatermelonRepository](src/modules/sync/infrastructure/repositories/WatermelonRepository.ts) |
| Registro DI                        | [container.ts](src/shared/di/container.ts)                                                   |
| Proyección de usuario sin secretos | [UserMapper](src/shared/mappers/UserMapper.ts)                                               |
| Validación/proyección wire         | [watermelon.schema.ts](src/modules/sync/application/schemas/watermelon.schema.ts)            |

Son referencias, no módulos libres de deuda. En particular, no copiar el estado transaccional mutable de repositorios auth singleton; el sync nuevo usa sesiones locales.

Los antiguos ejemplos de productos no representan funcionalidades presentes. El mapper genérico sin consumidores fue retirado: construir proyecciones explícitas según el contrato.

Seguir [NEW_MODULE_GUIDE.md](NEW_MODULE_GUIDE.md), [convenciones](src/modules/NAMING_CONVENTIONS.md) y [OpenAPI](OPENAPI_ARCHITECTURE.md). Migraciones reales, owner derivado de JWT y tests son parte del trabajo, no pasos opcionales.
