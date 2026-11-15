import { z } from "zod";
import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  createAnimalSchema,
  updateAnimalSchema,
  animalQuerySchema,
  animalPaginationSchema,
  animalResponseSchema,
  animalDetailResponseSchema,
  animalPageResponseSchema,
} from "../../../modules/animal/presentation/http/animalSchema";

export function registerAnimalsRoutes(
  registry: OpenAPIRegistry,
  bearerAuth: { name: string },
): void {
  const security = [{ [bearerAuth.name]: [] }];
  const params = z.object({ id: z.uuid() });
  const errors = {
    400: { description: "Entrada o reglas de negocio inválidas" },
    401: { description: "No autenticado" },
    404: {
      description:
        "Animal, especie o progenitor no encontrado dentro de la cuenta",
    },
    409: { description: "Identificador en uso o animal con referencias" },
  };
  registry.registerPath({
    method: "post",
    path: "/api/animals",
    tags: ["Animals"],
    security,
    summary: "Registrar animal",
    description:
      "Código manual obligatorio; crotal opcional. Fundador se calcula a partir de los padres. Fechas YYYY-MM-DD.",
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: createAnimalSchema } },
      },
    },
    responses: {
      ...errors,
      201: {
        description: "Animal registrado",
        content: { "application/json": { schema: animalResponseSchema } },
      },
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/animals",
    tags: ["Animals"],
    security,
    summary: "Listar animales",
    description:
      "Activos por defecto; status=ALL incluye bajas. Búsqueda literal por código/crotal. Orden por código e ID. Límite 50 por defecto, máximo 100.",
    request: { query: animalQuerySchema },
    responses: {
      ...errors,
      200: {
        description: "Página de animales y total filtrado",
        content: { "application/json": { schema: animalPageResponseSchema } },
      },
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/animals/{id}",
    tags: ["Animals"],
    security,
    summary: "Consultar animal y padres directos",
    request: { params },
    responses: {
      ...errors,
      200: {
        description:
          "Animal con padres directos, incluso vendidos o fallecidos",
        content: { "application/json": { schema: animalDetailResponseSchema } },
      },
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/animals/{id}/children",
    tags: ["Animals"],
    security,
    summary: "Listar hijos directos",
    description:
      "Incluye todos los estados; listado paginado, no árbol recursivo.",
    request: { params, query: animalPaginationSchema },
    responses: {
      ...errors,
      200: {
        description: "Página de hijos",
        content: { "application/json": { schema: animalPageResponseSchema } },
      },
    },
  });
  registry.registerPath({
    method: "put",
    path: "/api/animals/{id}",
    tags: ["Animals"],
    security,
    summary: "Actualizar parcialmente un animal",
    description:
      "Omitido conserva; null limpia campos opcionales. Especie/sexo solo cambian sin hijos ni historial. Volver a ACTIVE limpia la fecha de baja omitida. No admite isFounder, propietario ni timestamps de cliente.",
    request: {
      params,
      body: {
        required: true,
        content: { "application/json": { schema: updateAnimalSchema } },
      },
    },
    responses: {
      ...errors,
      200: {
        description: "Animal actualizado",
        content: { "application/json": { schema: animalResponseSchema } },
      },
    },
  });
  registry.registerPath({
    method: "delete",
    path: "/api/animals/{id}",
    tags: ["Animals"],
    security,
    summary: "Eliminar físicamente un animal sin referencias",
    description:
      "Bloqueado si tiene hijos, Salud, Producción o Reproducción. Para venta/fallecimiento se actualiza el estado y se conserva el historial.",
    request: { params },
    responses: { ...errors, 204: { description: "Animal eliminado" } },
  });
}
