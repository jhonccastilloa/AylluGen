# OpenAPI: implementación y cobertura actual

Documento especializado del registro OpenAPI. Durante el refactor, los registros
Swagger pueden describir rutas desactivadas: consultar [README](README.md) y
`src/presentation/routes/index.ts` para la superficie HTTP montada.

## Generación

[El registro central](src/infrastructure/openapi/index.ts) utiliza OpenAPIRegistry y OpenApiGeneratorV3 de `@asteasolutions/zod-to-openapi`. Las definiciones de negocio son Zod; los paths se registran explícitamente.

Archivos en `src/infrastructure/openapi/features`: `auth.openapi.ts`, `users.openapi.ts`, `animals.openapi.ts`, `breedings.openapi.ts`, `health.openapi.ts`, `production.openapi.ts` y `sync.openapi.ts`.

El servidor importa directamente la especificación de `src/infrastructure/openapi/index.ts` y monta Swagger UI en **/api-docs**; no monta las rutas alternativas de JSON/swagger descritas en las guías anteriores.

## Cobertura y límites

El registro actual incluye auth, users, animals, breedings, health, production y sync legacy/v2. **Species tiene rutas operativas pero todavía no un registro OpenAPI dedicado**. No afirmar cobertura completa por tener Swagger instalado.

Las rutas Express y esquemas/controladores son la referencia ejecutable. Registrar un path en Swagger no crea un endpoint ni aplica autorización. Zod y OpenAPI no garantizan por sí solos que todas las respuestas/errores legacy estén alineadas.

Sync v2 documenta pull 200 sin envelope extra, push 204 sin JSON y errores `{error,code}`. Las reglas de relación, concurrencia y límites requieren también [el contrato de integración](.claude/docs/ai/watermelon-sync/api-handoff.md).

## Añadir o modificar una API

1. Definir/reutilizar esquema Zod del módulo; distinguir entradas de respuestas y fechas ISO REST frente a epoch ms de sync.
2. Confirmar método, prefijo montado, ownership JWT y códigos HTTP del controller.
3. Registrar path y esquemas de respuesta en el archivo OpenAPI del feature, incluyendo seguridad Bearer cuando corresponda.
4. Invocar el registro desde el índice central.
5. Comprobar ejemplos contra validadores, respuesta real y tests; ejecutar build y lint.
6. Actualizar Markdown de integración cuando cambie el contrato.

No copiar ejemplos de productos hipotéticos como si fueran módulos existentes ni derivar tablas SQL desde los nombres enviados por clientes.

[Arquitectura y guía del refactor](MODULAR_ARCHITECTURE.md).
