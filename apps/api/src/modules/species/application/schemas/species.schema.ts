import { z } from "zod";
import {
  createSpeciesInputSchema,
  updateSpeciesInputSchema,
} from "@ayllugen/contracts/species";

export const speciesCreateSchema = createSpeciesInputSchema.openapi({
  title: "SpeciesCreateInput",
  description: "Crear especie; el nombre se valida antes de guardar.",
  example: {
    name: "Alpaca",
    description: "Camélido andino domesticado",
  },
});

export const speciesUpdateSchema = updateSpeciesInputSchema.openapi({
  title: "SpeciesUpdateInput",
  description:
    "Actualizar especie; descripción omitida conserva el valor, null o texto vacío lo limpia.",
  example: {
    name: "Alpaca Huacaya",
    description: "Variedad de alpaca de fibra esponjosa",
  },
});

export const speciesResponseSchema = z
  .object({
    id: z.string().describe("Identificador de especie"),
    name: z.string().describe("Nombre visible de la especie"),
    description: z.string().nullable().describe("Descripción de la especie"),
    userId: z.string().describe("Identificador del usuario propietario"),
    clientCreatedAt: z.iso
      .datetime()
      .describe("Fecha de creación en el origen"),
    clientUpdatedAt: z.iso.datetime().describe("Fecha de edición en el origen"),
    createdAt: z.string().datetime().describe("Fecha de creación"),
    updatedAt: z.string().datetime().describe("Fecha de actualización"),
  })
  .openapi({
    title: "SpeciesResponse",
    description: "Schema de respuesta de especie",
    example: {
      id: "7f4f9d90-d1de-4ec2-9e1d-0161a4f0e9b1",
      name: "Alpaca",
      description: "Camélido andino domesticado",
      userId: "123e4567-e89b-12d3-a456-426614174001",
      clientCreatedAt: "2026-02-10T12:00:00.000Z",
      clientUpdatedAt: "2026-02-10T12:00:00.000Z",
      createdAt: "2026-02-10T12:00:00.000Z",
      updatedAt: "2026-02-10T12:00:00.000Z",
    },
  });

export const speciesIdParamSchema = z.object({
  speciesId: z
    .string()
    .min(1, "El id de especie es requerido")
    .describe("Identificador único de especie"),
});

export type SpeciesCreateInput = z.infer<typeof speciesCreateSchema>;
export type SpeciesUpdateInput = z.infer<typeof speciesUpdateSchema>;
export type SpeciesResponse = z.infer<typeof speciesResponseSchema>;
