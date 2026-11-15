// Legacy contract retained only for inactive sync and unmigrated consumers.
// Active Animal HTTP uses presentation/http/animalSchema.ts.
import { z } from "zod";
import { Sex } from "../../../animal/domain/entities/Animal";

export const animalCreateSchema = z
  .object({
    crotal: z
      .string()
      .min(1)
      .max(50)
      .describe("Unique identifier for the animal"),
    sex: z.enum(Sex).describe("Animal sex: MALE or FEMALE"),
    speciesId: z
      .string()
      .min(1)
      .optional()
      .describe("Species ID linked from species catalog"),
    birthDate: z.iso.datetime().optional().describe("Birth date of the animal"),
    isFounder: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether the animal is a founder (parents unknown)"),
    fatherId: z.uuid().optional().describe("Father animal ID"),
    motherId: z.uuid().optional().describe("Mother animal ID"),
  })
  .refine((input) => Boolean(input.speciesId), {
    message: "Debe enviar speciesId para enlazar la especie del animal",
  })
  .openapi({
    title: "AnimalCreateInput",
    description: "Schema for creating a new animal",
    example: {
      crotal: "CR12345",
      sex: Sex.FEMALE,
      speciesId: "550e8400-e29b-41d4-a716-446655440000",
      birthDate: "2024-01-15T00:00:00Z",
      isFounder: false,
      fatherId: "550e8400-e29b-41d4-a716-446655440000",
      motherId: "660e8400-e29b-41d4-a716-446655440001",
    },
  });

export const animalIdParamSchema = z.object({
  animalId: z
    .uuid("EL ID del animal debe ser un UUID valido")
    .describe("Unique identifier for the animal"),
});
