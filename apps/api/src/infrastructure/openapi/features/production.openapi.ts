import { z } from "zod";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  productionRecordCreateSchema,
  productionRecordUpdateSchema,
  productionRecordResponseSchema,
  productionSummaryResponseSchema,
  productionGetAllQuerySchema,
  productionRecordIdParamSchema,
  productionRecordSummaryParamSchema,
  productionReacordRecentQuerySchema,
} from "../../../modules/production/application/schemas/production.schema";

export function registerProductionRoutes(
  registry: OpenAPIRegistry,
  bearerAuth: { name: string },
) {
  registry.registerPath({
    method: "post",
    path: "/api/production",
    tags: ["Production"],
    summary: "Crear registro de producción",
    description: "Crea un nuevo registro de producción para un animal",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: productionRecordCreateSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Registro de producción creado",
        content: {
          "application/json": {
            schema: productionRecordResponseSchema,
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
    method: "get",
    path: "/api/production",
    tags: ["Production"],
    summary: "Listar registros de producción",
    description: "Retorna todos los registros de producción del usuario",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: productionGetAllQuerySchema,
    },
    responses: {
      200: {
        description: "Lista de registros de producción",
        content: {
          "application/json": {
            schema: z.object({
              records: z.array(productionRecordResponseSchema),
            }),
          },
        },
      },
      401: {
        description: "No autorizado",
      },
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/production/{id}",
    tags: ["Production"],
    summary: "Obtener registro de producción",
    description: "Retorna un registro de producción específico",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: productionRecordIdParamSchema,
    },
    responses: {
      200: {
        description: "Registro encontrado",
        content: {
          "application/json": {
            schema: productionRecordResponseSchema,
          },
        },
      },
      401: {
        description: "No autorizado",
      },
      404: {
        description: "Registro no encontrado",
      },
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/production/animal/{animalId}/summary/{type}",
    tags: ["Production"],
    summary: "Resumen de producción",
    description: "Retorna un resumen de producción por animal y tipo",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: productionRecordSummaryParamSchema,
    },
    responses: {
      200: {
        description: "Resumen de producción",
        content: {
          "application/json": {
            schema: z.array(productionSummaryResponseSchema),
          },
        },
      },
      401: {
        description: "No autorizado",
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/production/recent",
    tags: ["Production"],
    summary: "Registros recientes",
    description: "Retorna los registros de producción más recientes",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: productionReacordRecentQuerySchema,
    },
    responses: {
      200: {
        description: "Registros recientes",
        content: {
          "application/json": {
            schema: z.array(productionRecordResponseSchema),
          },
        },
      },
      401: {
        description: "No autorizado",
      },
    },
  });

  registry.registerPath({
    method: "put",
    path: "/api/production/{id}",
    tags: ["Production"],
    summary: "Actualizar registro de producción",
    description: "Actualiza un registro de producción existente",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: productionRecordIdParamSchema,
      body: {
        content: {
          "application/json": {
            schema: productionRecordUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Registro actualizado",
        content: {
          "application/json": {
            schema: productionRecordResponseSchema,
          },
        },
      },
      400: {
        description: "Datos inválidos",
      },
      401: {
        description: "No autorizado",
      },
      404: {
        description: "Registro no encontrado",
      },
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/production/{id}",
    tags: ["Production"],
    summary: "Eliminar registro de producción",
    description: "Elimina un registro de producción",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: productionRecordIdParamSchema,
    },
    responses: {
      204: {
        description: "Registro eliminado",
      },
      401: {
        description: "No autorizado",
      },
      404: {
        description: "Registro no encontrado",
      },
    },
  });
}
