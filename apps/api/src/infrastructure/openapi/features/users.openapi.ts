import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { userResponseSchema } from "../../../modules/user/application/schemas/user.schema";

export function registerUsersRoutes(
  registry: OpenAPIRegistry,
  bearerAuth: { name: string },
) {
  registry.registerPath({
    method: "get",
    path: "/api/users/me",
    tags: ["Users"],
    summary: "Obtener perfil del usuario actual",
    description: "Retorna la información del usuario autenticado",
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: {
        description: "Perfil del usuario",
        content: {
          "application/json": {
            schema: userResponseSchema,
          },
        },
      },
      401: {
        description: "No autorizado",
      },
      404: {
        description: "Usuario no encontrado",
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/users/{userId}",
    tags: ["Users"],
    parameters: [
      {
        name: "userId",
        in: "path",
        required: true,
        description: "ID del usuario",
        schema: {
          type: "string",
          example: "aa2765e0-eb12-46d7-94cb-fd3bbf70d4e3",
        },
      },
    ],
    summary: "Obtener usuario por ID",
    description: "Retorna la información de un usuario específico",
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: {
        description: "Usuario encontrado",
        content: {
          "application/json": {
            schema: userResponseSchema,
          },
        },
      },
      401: {
        description: "No autorizado",
      },
      404: {
        description: "Usuario no encontrado",
      },
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/users/{userId}",
    parameters: [
      {
        name: "userId",
        in: "path",
        required: true,
        description: "ID del usuario",
        schema: {
          type: "string",
          example: "aa2765e0-eb12-46d7-94cb-fd3bbf70d4e3",
        },
      },
    ],
    tags: ["Users"],
    summary: "Eliminar usuario",
    description: "Elimina un usuario del sistema",
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: {
        description: "Usuario eliminado exitosamente",
      },
      401: {
        description: "No autorizado",
      },
      404: {
        description: "Usuario no encontrado",
      },
    },
  });
}
