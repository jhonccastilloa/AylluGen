import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  watermelonPullSchema,
  watermelonPushSchema,
} from "../../../modules/sync/application/schemas/watermelon.schema";
import {
  syncPushSchema,
  syncPullSchema,
  syncResultSchema,
  syncDataSchema,
  conflictResolutionSchema,
} from "../../../modules/sync/application/schemas/sync.schema";

export function registerSyncRoutes(
  registry: OpenAPIRegistry,
  bearerAuth: { name: string },
) {
  registry.registerPath({
    method: "post",
    path: "/api/sync/v2/pull",
    tags: ["Sync"],
    summary: "Pull incremental de WatermelonDB (schema móvil 4)",
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
      "Máximo 500 operaciones y 2 MiB. Registros completos con columnas snake_case; ownership y fechas de servidor no son editables. Ante 409, volver a synchronize().",
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
  registry.registerPath({
    method: "post",
    path: "/api/sync/push",
    deprecated: true,
    tags: ["Sync"],
    summary: "Enviar cambios al servidor",
    description:
      "Envía cambios desde el cliente al servidor para sincronización",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: syncPushSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Sincronización exitosa",
        content: {
          "application/json": {
            schema: syncResultSchema,
          },
        },
      },
      400: {
        description: "Datos inválidos",
      },
      401: {
        description: "No autorizado",
      },
      409: {
        description: "Conflictos de sincronización",
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/sync/pull",
    deprecated: true,
    tags: ["Sync"],
    summary: "Obtener cambios del servidor",
    description: "Obtiene cambios del servidor para sincronizar el cliente",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: syncPullSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Datos de sincronización",
        content: {
          "application/json": {
            schema: syncDataSchema,
          },
        },
      },
      400: {
        description: "Datos inválidos",
      },
      401: {
        description: "No autorizado",
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/sync/resolve-conflict",
    deprecated: true,
    tags: ["Sync"],
    summary: "Resolver conflicto de sincronización",
    description: "Resuelve un conflicto de sincronización específico",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: conflictResolutionSchema,
          },
        },
      },
    },
    responses: {
      204: {
        description: "Conflicto resuelto",
      },
      400: {
        description: "Datos inválidos",
      },
      401: {
        description: "No autorizado",
      },
      404: {
        description: "Conflicto no encontrado",
      },
    },
  });
}
