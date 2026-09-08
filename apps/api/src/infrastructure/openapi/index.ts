import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { registerAuthRoutes } from "./features/auth.openapi";
import { registerUsersRoutes } from "./features/users.openapi";
import { registerAnimalsRoutes } from "./features/animals.openapi";
import { registerBreedingsRoutes } from "./features/breedings.openapi";
import { registerHealthRoutes } from "./features/health.openapi";
import { registerProductionRoutes } from "./features/production.openapi";
import { registerSyncRoutes } from "./features/sync.openapi";
import { config } from "@shared/constants/config";

export function generateOpenApiSpec() {
  const registry = new OpenAPIRegistry();

  const bearerAuth = registry.registerComponent(
    "securitySchemes",
    "bearerAuth",
    {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  );

  registerAuthRoutes(registry);
  registerUsersRoutes(registry, bearerAuth);
  registerAnimalsRoutes(registry, bearerAuth);
  registerBreedingsRoutes(registry, bearerAuth);
  registerHealthRoutes(registry, bearerAuth);
  registerProductionRoutes(registry, bearerAuth);
  registerSyncRoutes(registry, bearerAuth);

  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Ayllu Gen API",
      version: "1.0.0",
      description:
        "Backend API with Clean Architecture, TypeScript, Express, Prisma, Swagger, Zod",
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: "Development server",
      },
    ],
  });
}

export const openApiSpec = generateOpenApiSpec();
