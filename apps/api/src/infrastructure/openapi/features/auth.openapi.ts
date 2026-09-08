import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  authResponseSchema,
} from "../../../modules/auth/application/schemas/auth.schema";

export function registerAuthRoutes(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: "post",
    path: "/api/auth/register",
    tags: ["Auth"],
    summary: "Registrar nuevo usuario",
    description: "Crea un nuevo usuario en el sistema",
    request: {
      body: {
        content: {
          "application/json": {
            schema: registerSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Usuario registrado exitosamente",
        content: {
          "application/json": {
            schema: authResponseSchema,
          },
        },
      },
      400: {
        description: "Datos inválidos",
      },
      409: {
        description: "El usuario ya existe",
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/auth/login",
    tags: ["Auth"],
    summary: "Iniciar sesión",
    description: "Autentica un usuario y retorna tokens de acceso",
    request: {
      body: {
        content: {
          "application/json": {
            schema: loginSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Login exitoso",
        content: {
          "application/json": {
            schema: authResponseSchema,
          },
        },
      },
      401: {
        description: "Credenciales inválidas",
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/auth/refresh",
    tags: ["Auth"],
    summary: "Refrescar token de acceso",
    description: "Genera un nuevo token de acceso usando el refresh token",
    request: {
      body: {
        content: {
          "application/json": {
            schema: refreshTokenSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Token refrescado exitosamente",
        content: {
          "application/json": {
            schema: authResponseSchema.pick({ accessToken: true }),
          },
        },
      },
      401: {
        description: "Refresh token inválido o expirado",
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/auth/logout",
    tags: ["Auth"],
    summary: "Cerrar sesión",
    description: "Cierra la sesión del usuario eliminando el refresh token",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: refreshTokenSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Sesión cerrada exitosamente",
      },
      400: {
        description: "Error al cerrar sesión",
      },
    },
  });
}
