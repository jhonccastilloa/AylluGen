import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { userResponseSchema } from "../../../modules/user/presentation/http/userSchema";

export function registerUsersRoutes(
  registry: OpenAPIRegistry,
  bearerAuth: { name: string },
) {
  registry.registerPath({
    method: "get",
    path: "/api/users/me",
    tags: ["Users"],
    summary: "Consultar mi cuenta",
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: {
        description: "Cuenta autenticada",
        content: { "application/json": { schema: userResponseSchema } },
      },
      401: { description: "No autorizado" },
      404: { description: "Cuenta no encontrada" },
    },
  });
}
