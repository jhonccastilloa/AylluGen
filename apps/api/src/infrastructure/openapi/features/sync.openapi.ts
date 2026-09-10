import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  watermelonPullSchema,
  watermelonPushSchema,
} from "../../../modules/sync/application/schemas/watermelon.schema";

export function registerSyncRoutes(
  registry: OpenAPIRegistry,
  bearerAuth: { name: string },
) {
  registry.registerPath({
    method: "post",
    path: "/api/sync/v2/pull",
    tags: ["Sync"],
    summary: "Pull incremental de WatermelonDB (schema móvil 7)",
    description:
      "Snapshot consistente limitado al usuario autenticado. timestamp es un contador opaco, no una fecha. Sin paginación parcial.",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: { "application/json": { schema: watermelonPullSchema } },
      },
    },
    responses: {
      200: {
        description:
          "{ changes: { species, animals, breedings, health_records, production_records }, timestamp }. Cada colección contiene created, updated y deleted.",
      },
      400: { description: "Request/schema/checkpoint inválido" },
      401: { description: "Sin autenticación" },
      413: {
        description: "Dataset excede el scope soportado; no avanzar checkpoint",
      },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/sync/v2/push",
    tags: ["Sync"],
    summary: "Push atómico de WatermelonDB",
    description:
      "Máximo 500 operaciones y 2 MiB. Registros completos con columnas snake_case; ownership y fechas de servidor no son editables. Las cinco entidades requieren created_at/updated_at del dispositivo, conservados en push y pull. Ante 409, volver a synchronize().",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: { "application/json": { schema: watermelonPushSchema } },
      },
    },
    responses: {
      204: { description: "Batch confirmado (o retry ya confirmado)" },
      400: { description: "Request o relación inválida" },
      401: { description: "Sin autenticación" },
      403: { description: "Registro ajeno" },
      409: { description: "Conflicto; batch completamente revertido" },
      413: { description: "Payload/dataset demasiado grande" },
    },
  });
}
