import { z } from "zod";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  breedingCreateSchema,
  breedingUpdateSchema,
  breedingMatchSchema,
  breedingResponseSchema,
  coiCalculationResponseSchema,
} from "../../../modules/breeding/application/schemas/breeding.schema";

export function registerBreedingsRoutes(
  registry: OpenAPIRegistry,
  bearerAuth: { name: string },
) {
  registry.registerPath({
    method: "post",
    path: "/api/breedings/calculate-coi",
    tags: ["Breedings"],
    summary: "Calcular COI",
    description: "Calcula el Coeficiente de Endogamia entre dos animales",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: breedingMatchSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Cálculo de COI exitoso",
        content: {
          "application/json": {
            schema: coiCalculationResponseSchema,
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
    method: "post",
    path: "/api/breedings",
    tags: ["Breedings"],
    summary: "Crear cría",
    description: "Crea un nuevo registro de cría",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: breedingCreateSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Cría creada exitosamente",
        content: {
          "application/json": {
            schema: breedingResponseSchema,
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
    path: "/api/breedings",
    tags: ["Breedings"],
    summary: "Listar crías",
    description: "Retorna todas las crías del usuario",
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: {
        description: "Lista de crías",
        content: {
          "application/json": {
            schema: z.object({
              breedings: z.array(breedingResponseSchema),
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
    path: "/api/breedings/{id}",
    tags: ["Breedings"],
    summary: "Obtener cría por ID",
    description: "Retorna los detalles de una cría específica",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().uuid().describe("Breeding ID"),
      }),
    },
    responses: {
      200: {
        description: "Cría encontrada",
        content: {
          "application/json": {
            schema: breedingResponseSchema,
          },
        },
      },
      401: {
        description: "No autorizado",
      },
      404: {
        description: "Cría no encontrada",
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/breedings/history/{animalId}",
    tags: ["Breedings"],
    summary: "Historial de crías",
    description: "Retorna el historial de crías de un animal específico",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        animalId: z.string().uuid().describe("Animal ID"),
      }),
    },
    responses: {
      200: {
        description: "Historial de crías",
        content: {
          "application/json": {
            schema: z.object({
              breedings: z.array(breedingResponseSchema),
            }),
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
    path: "/api/breedings/{id}",
    tags: ["Breedings"],
    summary: "Actualizar cría",
    description: "Actualiza la información de una cría existente",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().uuid().describe("Breeding ID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: breedingUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Cría actualizada",
        content: {
          "application/json": {
            schema: breedingResponseSchema,
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
        description: "Cría no encontrada",
      },
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/breedings/{id}",
    tags: ["Breedings"],
    summary: "Eliminar cría",
    description: "Elimina un registro de cría",
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().uuid().describe("Breeding ID"),
      }),
    },
    responses: {
      204: {
        description: "Cría eliminada",
      },
      401: {
        description: "No autorizado",
      },
      404: {
        description: "Cría no encontrada",
      },
    },
  });
}
