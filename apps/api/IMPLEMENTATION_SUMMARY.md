# Estado de implementación

Revisado: 2026-09-05. Estado del código local, no certificación de despliegue.

## Implementado

- Backend modular con ocho módulos, JWT/refresh, cuenta propia, CRUD ganadero y cálculo COI.
- Sync v2 para especies, animales, cruces, salud y producción: pull incremental consistente, push atómico, conflictos, recibos idempotentes y tombstones.
- Migraciones SQL aditivas, validaciones de propietario/relaciones y captura de escrituras REST.
- Móvil con WatermelonDB schema 4, UUID, bases por cuenta, importación preservando pendientes y synchronize() centralizado.
- Eliminación de adaptadores/cola de ejecución antiguos del móvil y utilidades sin consumidores. El esquema histórico y los endpoints del backend permanecen.

## Verificación registrada

| Comprobación                           | Resultado                                                      |
| -------------------------------------- | -------------------------------------------------------------- |
| Mobile tras limpieza                   | 59 tests / 11 suites; TypeScript correcto                      |
| Lint móvil                             | 14 errores preexistentes; capas de limpieza sin errores nuevos |
| Backend tras limpieza                  | 184 tests pasan; 41 PostgreSQL omitidos sin URL de integración |
| Backend build/lint                     | Correctos                                                      |
| Backend integración histórica anterior | 225 tests pasaron con PostgreSQL aislado y migraciones         |
| Android debug antes de limpieza        | Compiló; no ejecutado en dispositivo                           |
| Android release                        | Falló por keystore ausente                                     |
| iOS / E2E dispositivos                 | Pendientes                                                     |

Los tests retirados del móvil cubrían exclusivamente código eliminado; la disminución de 68 a 59 no es omisión de pruebas del motor actual.

## Pendientes reales

- Aplicar migraciones y desplegar backend v2 en un destino autorizado.
- Probar actualización móvil in-place con datos offline, dos cuentas y conflictos entre dispositivos, SQLite nativo y PostgreSQL.
- Resolver firma release, compilar iOS y revisar Fastlane heredado.
- Completar registro OpenAPI de especies; revisar limitación general de requests y transacciones concurrentes de auth.
- Corregir lint móvil preexistente.
- Diseñar scopes más pequeños y expiración de checkpoints antes de ampliar volúmenes o purgar tombstones.
- Revisar dependencias/seguridad en una tarea específica; no se actualizaron paquetes en esta migración.

No hay pagos, OTP, uploads, jobs/colas de background o WebSockets implementados. No describir esas funciones como parte del producto actual.

Referencias: [backend](README.md), [arquitectura](MODULAR_ARCHITECTURE.md), [sync](docs/LOCAL_FIRST.md), [mobile](../AylluGen-App/docs/LOCAL_FIRST_MOBILE.md).
