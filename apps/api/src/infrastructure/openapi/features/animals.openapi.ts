import { z } from "zod";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  animalCreateSchema,
  animalUpdateSchema,
  animalQuerySchema,
  animalResponseSchema,
} from "../../../modules/animal/application/schemas/animal.schema";

export function registerAnimalsRoutes(
  registry: OpenAPIRegistry,
  bearerAuth: { name: string },
) {
  registry.registerPath({
    method: "post",
    path: "/api/animals",
    tags: ["Animals"],
    summary: "Crear nuevo animal",
    description: "Crea un nuevo registro de animal",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: animalCreateSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Animal creado exitosamente",
        content: {
          "application/json": {
            schema: animalResponseSchema,
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
    path: "/api/animals",
    tags: ["Animals"],
    summary: "Listar animales",
    description:
      "Retorna una lista paginada de animales con filtros opcionales",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: animalQuerySchema,
    },
    responses: {
      200: {
        description: "Lista de animales",
        content: {
          "application/json": {
            schema: z.object({
              animals: z.array(animalResponseSchema),
              total: z.number(),
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
    path: "/api/animals/founders",
    tags: ["Animals"],
    summary: "Obtener fundadores",
    description: "Retorna todos los animales fundadores (sin padres conocidos)",
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: {
        description: "Lista de fundadores",
        content: {
          "application/json": {
            schema: z.array(animalResponseSchema),
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
    path: "/api/animals/males",
    tags: ["Animals"],
    summary: "Obtener machos",
    description: "Retorna todos los animales machos",
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: {
        description: "Lista de machos",
        content: {
          "application/json": {
            schema: z.array(animalResponseSchema),
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
    path: "/api/animals/females",
    tags: ["Animals"],
    summary: "Obtener hembras",
    description: "Retorna todos los animales hembras",
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: {
        description: "Lista de hembras",
        content: {
          "application/json": {
            schema: z.array(animalResponseSchema),
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
    path: "/api/animals/{id}",
    tags: ["Animals"],
    summary: "Obtener animal por ID",
    description: "Retorna los detalles de un animal específico",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().uuid().describe("Animal ID"),
      }),
    },
    responses: {
      200: {
        description: "Animal encontrado",
        content: {
          "application/json": {
            schema: animalResponseSchema,
          },
        },
      },
      401: {
        description: "No autorizado",
      },
      404: {
        description: "Animal no encontrado",
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/animals/{id}/pedigree",
    tags: ["Animals"],
    summary: "Obtener pedigrí",
    description: "Retorna el pedigrí completo de un animal (padres y abuelos)",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().uuid().describe("Animal ID"),
      }),
    },
    responses: {
      200: {
        description: "Pedigrí del animal",
        content: {
          "application/json": {
            schema: animalResponseSchema,
          },
        },
      },
      401: {
        description: "No autorizado",
      },
      404: {
        description: "Animal no encontrado",
      },
    },
  });

  registry.registerPath({
    method: "put",
    path: "/api/animals/{id}",
    tags: ["Animals"],
    summary: "Actualizar animal",
    description: "Actualiza la información de un animal existente",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().uuid().describe("Animal ID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: animalUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Animal actualizado",
        content: {
          "application/json": {
            schema: animalResponseSchema,
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
        description: "Animal no encontrado",
      },
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/animals/{id}",
    tags: ["Animals"],
    summary: "Eliminar animal",
    description: "Elimina un animal (soft delete)",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().uuid().describe("Animal ID"),
      }),
    },
    responses: {
      204: {
        description: "Animal eliminado",
      },
      401: {
        description: "No autorizado",
      },
      404: {
        description: "Animal no encontrado",
      },
    },
  });
}
