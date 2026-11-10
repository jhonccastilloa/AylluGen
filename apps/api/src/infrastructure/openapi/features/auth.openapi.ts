import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  authResponseSchema,
  changePasswordSchema,
} from "../../../modules/auth/presentation/http/authSchema";

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
    description:
      "Consume el refresh token y devuelve nuevos tokens y la cuenta. El token anterior deja de ser válido.",
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
            schema: authResponseSchema,
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
      204: {
        description: "Sesión cerrada exitosamente",
      },
      400: {
        description: "Error al cerrar sesión",
      },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/auth/change-password",
    tags: ["Auth"],
    summary: "Cambiar contraseña y cerrar todas las sesiones de renovación",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: changePasswordSchema } },
      },
    },
    responses: {
      204: { description: "Contraseña actualizada" },
      400: { description: "Contraseña nueva inválida" },
      401: { description: "Credenciales inválidas" },
    },
  });
}
