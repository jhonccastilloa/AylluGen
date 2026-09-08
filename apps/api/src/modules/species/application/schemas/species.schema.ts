import { z } from "zod";

const speciesCodeSchema = z
  .string()
  .min(2, "El código debe tener al menos 2 caracteres")
  .max(30, "El código no puede exceder 30 caracteres")
  .regex(
    /^[A-Z0-9_]+$/,
    "El código solo puede contener letras mayúsculas, números y guion bajo",
  );

export const speciesCreateSchema = z
  .object({
    code: speciesCodeSchema.describe("Código único de especie"),
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80, "El nombre no puede exceder 80 caracteres")
      .describe("Nombre visible de la especie"),
    description: z
      .string()
      .max(200, "La descripción no puede exceder 200 caracteres")
      .optional()
      .describe("Descripción opcional de la especie"),
  })
  .openapi({
    title: "SpeciesCreateInput",
    description: "Schema para crear una especie",
    example: {
      code: "ALPACA",
      name: "Alpaca",
      description: "Camélido andino domesticado",
    },
  });

export const speciesUpdateSchema = z
  .object({
    code: speciesCodeSchema.optional().describe("Código único de especie"),
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80, "El nombre no puede exceder 80 caracteres")
      .optional()
      .describe("Nombre visible de la especie"),
    description: z
      .string()
      .max(200, "La descripción no puede exceder 200 caracteres")
      .optional()
      .describe("Descripción opcional de la especie"),
  })
  .refine(
    (data) =>
      data.code !== undefined ||
      data.name !== undefined ||
      data.description !== undefined,
    { message: "Debe enviar al menos un campo para actualizar" },
  )
  .openapi({
    title: "SpeciesUpdateInput",
    description: "Schema para actualizar una especie",
    example: {
      name: "Alpaca Huacaya",
      description: "Variedad de alpaca de fibra esponjosa",
    },
  });

export const speciesResponseSchema = z
  .object({
    id: z.string().describe("Identificador de especie"),
    code: z.string().describe("Código único de especie"),
    name: z.string().describe("Nombre visible de la especie"),
    description: z.string().nullable().describe("Descripción de la especie"),
    userId: z.string().describe("Identificador del usuario propietario"),
    createdAt: z.string().datetime().describe("Fecha de creación"),
    updatedAt: z.string().datetime().describe("Fecha de actualización"),
  })
  .openapi({
    title: "SpeciesResponse",
    description: "Schema de respuesta de especie",
    example: {
      id: "7f4f9d90-d1de-4ec2-9e1d-0161a4f0e9b1",
      code: "ALPACA",
      name: "Alpaca",
      description: "Camélido andino domesticado",
      userId: "123e4567-e89b-12d3-a456-426614174001",
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

