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
    speciesCode: z
      .string()
      .min(2)
      .max(30)
      .optional()
      .describe("Species code when speciesId is not available"),
    species: z
      .string()
      .min(2)
      .max(30)
      .optional()
      .describe("Legacy species code for backward compatibility"),
    birthDate: z.iso.datetime().optional().describe("Birth date of the animal"),
    isFounder: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether the animal is a founder (parents unknown)"),
    fatherId: z.uuid().optional().describe("Father animal ID"),
    motherId: z.uuid().optional().describe("Mother animal ID"),
  })
  .refine(
    (input) =>
      Boolean(input.speciesId || input.speciesCode || input.species),
    {
      message:
        "Debe enviar speciesId o speciesCode para enlazar la especie del animal",
    },
  )
  .openapi({
    title: "AnimalCreateInput",
    description: "Schema for creating a new animal",
    example: {
      crotal: "CR12345",
      sex: Sex.FEMALE,
      speciesCode: "SHEEP",
      birthDate: "2024-01-15T00:00:00Z",
      isFounder: false,
      fatherId: "550e8400-e29b-41d4-a716-446655440000",
      motherId: "660e8400-e29b-41d4-a716-446655440001",
    },
  });

export const animalUpdateSchema = z
  .object({
    crotal: z
      .string()
      .min(1)
      .max(50)
      .optional()
      .describe("Unique identifier for the animal"),
    speciesId: z
      .string()
      .min(1)
      .optional()
      .describe("Species ID linked from species catalog"),
    speciesCode: z
      .string()
      .min(2)
      .max(30)
      .optional()
      .describe("Species code when updating by code"),
    birthDate: z.iso.datetime().optional().describe("Birth date of the animal"),
    isFounder: z
      .boolean()
      .optional()
      .describe("Whether the animal is a founder (parents unknown)"),
    fatherId: z.uuid().optional().describe("Father animal ID"),
    motherId: z.uuid().optional().describe("Mother animal ID"),
  })
  .openapi({
    title: "AnimalUpdateInput",
    description: "Schema for updating an animal",
    example: {
      isFounder: true,
      speciesCode: "ALPACA",
      fatherId: undefined,
      motherId: undefined,
    },
  });

export const animalQuerySchema = z
  .object({
    species: z.string().optional().describe("Filter by species code"),
    sex: z.enum(Sex).optional().describe("Filter by sex"),
    isFounder: z.boolean().optional().describe("Filter by founder status"),
    search: z.string().optional().describe("Search by crotal"),
    limit: z.coerce.number().int().min(1).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .openapi({
    title: "AnimalQueryInput",
    description: "Schema for querying animals",
    example: {
      species: "SHEEP",
      sex: Sex.FEMALE,
      limit: 20,
      offset: 0,
    },
  });

const animalRelationSchema = z.object({
  id: z.string().uuid(),
  crotal: z.string(),
  sex: z.enum(Sex),
  speciesId: z.string(),
  species: z.string(),
  speciesName: z.string().nullable().optional(),
  birthDate: z.string().datetime().nullable(),
  isFounder: z.boolean(),
});

export const animalResponseSchema = z
  .object({
    id: z.string().uuid(),
    crotal: z.string(),
    sex: z.enum(Sex),
    speciesId: z.string(),
    species: z.string(),
    speciesName: z.string().nullable().optional(),
    birthDate: z.string().datetime().nullable(),
    isFounder: z.boolean(),
    fatherId: z.string().uuid().nullable(),
    motherId: z.string().uuid().nullable(),
    father: animalRelationSchema.nullable().optional(),
    mother: animalRelationSchema.nullable().optional(),
    children: z.array(animalRelationSchema).optional(),
    userId: z.string().uuid(),
    syncStatus: z.enum(["SYNCED", "PENDING", "CONFLICT", "DELETED"]),
    syncVersion: z.number(),
    clientCreatedAt: z.iso.datetime().optional().describe("Fecha de creación en el dispositivo"),
    clientUpdatedAt: z.iso.datetime().optional().describe("Fecha de modificación en el dispositivo"),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    deletedAt: z.string().datetime().nullable(),
  })
  .openapi({
    title: "AnimalResponse",
    description: "Animal response schema",
    example: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      crotal: "CR12345",
      sex: Sex.FEMALE,
      speciesId: "sp-12345",
      species: "SHEEP",
      speciesName: "Sheep",
      birthDate: "2024-01-15T00:00:00Z",
      isFounder: false,
      fatherId: "550e8400-e29b-41d4-a716-446655440000",
      motherId: "660e8400-e29b-41d4-a716-446655440001",
      father: null,
      mother: null,
      children: [],
      userId: "123e4567-e89b-12d3-a456-426614174001",
      syncStatus: "SYNCED",
      syncVersion: 1,
      createdAt: "2024-01-15T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
      deletedAt: null,
    },
  });

export const animalIdParamSchema = z.object({
  animalId: z
    .uuid("EL ID del animal debe ser un UUID valido")
    .describe("Unique identifier for the animal"),
});

export type AnimalCreateInput = z.infer<typeof animalCreateSchema>;
export type AnimalUpdateInput = z.infer<typeof animalUpdateSchema>;
export type AnimalQueryInput = z.infer<typeof animalQuerySchema>;
export type AnimalResponse = z.infer<typeof animalResponseSchema>;
