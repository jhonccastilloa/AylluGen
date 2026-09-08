import { z } from "zod";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  healthRecordCreateSchema,
  healthRecordUpdateSchema,
  healthRecordResponseSchema,
  upcomingTaskResponseSchema,
  healthRecordUpcomingQuerySchema,
} from "../../../modules/health/application/schemas/health.schema";

export function registerHealthRoutes(
  registry: OpenAPIRegistry,
  bearerAuth: { name: string },
) {
  registry.registerPath({
    method: "post",
    path: "/api/sanity",
    tags: ["Health"],
    summary: "Crear registro de salud",
    description: "Crea un nuevo registro de salud para un animal",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: healthRecordCreateSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Registro de salud creado",
        content: {
          "application/json": {
            schema: healthRecordResponseSchema,
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
    path: "/api/sanity",
    tags: ["Health"],
    summary: "Listar registros de salud",
    description: "Retorna todos los registros de salud del usuario",
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: {
        description: "Lista de registros de salud",
        content: {
          "application/json": {
            schema: z.object({
              records: z.array(healthRecordResponseSchema),
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
    path: "/api/sanity/upcoming",
    tags: ["Health"],
    summary: "Próximas tareas de salud",
    description: "Retorna las próximas tareas de salud vencidas o próximas",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: healthRecordUpcomingQuerySchema,
    },
    responses: {
      200: {
        description: "Lista de próximas tareas",
        content: {
          "application/json": {
            schema: z.array(upcomingTaskResponseSchema),
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
    path: "/api/sanity/{id}",
    tags: ["Health"],
    summary: "Obtener registro de salud",
    description: "Retorna un registro de salud específico",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().uuid().describe("Health Record ID"),
      }),
    },
    responses: {
      200: {
        description: "Registro de salud encontrado",
        content: {
          "application/json": {
            schema: healthRecordResponseSchema,
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
    method: "put",
    path: "/api/sanity/{id}",
    tags: ["Health"],
    summary: "Actualizar registro de salud",
    description: "Actualiza un registro de salud existente",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().uuid().describe("Health Record ID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: healthRecordUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Registro actualizado",
        content: {
          "application/json": {
            schema: healthRecordResponseSchema,
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
    path: "/api/sanity/{id}",
    tags: ["Health"],
    summary: "Eliminar registro de salud",
    description: "Elimina un registro de salud",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().uuid().describe("Health Record ID"),
      }),
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
