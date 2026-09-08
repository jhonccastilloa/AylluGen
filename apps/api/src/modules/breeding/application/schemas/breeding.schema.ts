import { z } from "zod";
import { RiskLevel } from "../../domain/entities/Breeding";
import { Sex } from "../../../animal/domain/entities/Animal";

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

export const breedingCreateSchema = z
  .object({
    maleId: z.uuid().describe("Male animal ID"),
    femaleId: z.uuid().describe("Female animal ID"),
    projectedCOI: z
      .number()
      .min(0)
      .max(1)
      .describe("Projected Coefficient of Inbreeding (0-1)"),
    riskLevel: z
      .enum(RiskLevel)
      .describe(
        "Risk level: GREEN (<6.25%), YELLOW (6.25%-12.5%), RED (>12.5%)",
      ),
    breedingDate: z.iso
      .datetime()
      .optional()
      .describe("Date when breeding occurred"),
    notes: z.string().optional().describe("Additional notes"),
  })
  .openapi({
    title: "BreedingCreateInput",
    description: "Schema for creating a breeding record",
    example: {
      maleId: "123e4567-e89b-12d3-a456-426614174000",
      femaleId: "123e4567-e89b-12d3-a456-426614174001",
      projectedCOI: 0.03125,
      riskLevel: RiskLevel.GREEN,
      breedingDate: "2024-01-20T00:00:00Z",
      notes: "Good genetic match",
    },
  });

export const breedingUpdateSchema = z
  .object({
    breedingDate: z
      .string()
      .datetime()
      .optional()
      .describe("Date when breeding occurred"),
    notes: z.string().optional().describe("Additional notes"),
    offspringId: z.string().uuid().optional().describe("Offspring animal ID"),
  })
  .openapi({
    title: "BreedingUpdateInput",
    description: "Schema for updating a breeding record",
    example: {
      breedingDate: "2024-01-20T00:00:00Z",
      notes: "Successful breeding",
      offspringId: "123e4567-e89b-12d3-a456-426614174002",
    },
  });

export const breedingMatchSchema = z
  .object({
    maleId: z.string().uuid().describe("Male animal ID"),
    femaleId: z.string().uuid().describe("Female animal ID"),
  })
  .openapi({
    title: "BreedingMatchInput",
    description: "Schema for calculating breeding match compatibility",
    example: {
      maleId: "123e4567-e89b-12d3-a456-426614174000",
      femaleId: "123e4567-e89b-12d3-a456-426614174001",
    },
  });

export const breedingResponseSchema = z
  .object({
    id: z.string().uuid(),
    maleId: z.string().uuid(),
    femaleId: z.string().uuid(),
    projectedCOI: z.number(),
    riskLevel: z.nativeEnum(RiskLevel),
    offspringId: z.string().uuid().nullable(),
    offspring: animalRelationSchema.nullable(),
    breedingDate: z.string().datetime().nullable(),
    notes: z.string().nullable(),
    userId: z.string().uuid(),
    syncStatus: z.enum(["SYNCED", "PENDING", "CONFLICT", "DELETED"]),
    syncVersion: z.number(),
    clientCreatedAt: z.iso.datetime().optional().describe("Fecha de creación en el dispositivo"),
    clientUpdatedAt: z.iso.datetime().optional().describe("Fecha de modificación en el dispositivo"),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({
    title: "BreedingResponse",
    description: "Breeding response schema",
    example: {
      id: "123e4567-e89b-12d3-a456-426614174010",
      maleId: "123e4567-e89b-12d3-a456-426614174000",
      femaleId: "123e4567-e89b-12d3-a456-426614174001",
      projectedCOI: 0.03125,
      riskLevel: RiskLevel.GREEN,
      offspringId: null,
      offspring: null,
      breedingDate: "2024-01-20T00:00:00Z",
      notes: "Good genetic match",
      userId: "123e4567-e89b-12d3-a456-426614174001",
      syncStatus: "SYNCED",
      syncVersion: 1,
      createdAt: "2024-01-20T00:00:00Z",
      updatedAt: "2024-01-20T00:00:00Z",
    },
  });

export const coiCalculationResponseSchema = z
  .object({
    coi: z.number().describe("Coefficient of Inbreeding (0-1)"),
    riskLevel: z.nativeEnum(RiskLevel).describe("Risk level"),
    relationship: z.string().describe("Description of relationship"),
    recommendation: z.string().describe("Breeding recommendation"),
  })
  .openapi({
    title: "COICalculationResponse",
    description: "COI calculation response schema",
    example: {
      coi: 0.03125,
      riskLevel: RiskLevel.GREEN,
      relationship: "Half-siblings",
      recommendation: "Safe to breed",
    },
  });

export const breedingIdParamSchema = z.object({
  breedingId: z
    .uuid("El id del cruce debe ser un UUID válido")
    .describe("Identificador único del cruce"),
});
export type BreedingCreateInput = z.infer<typeof breedingCreateSchema>;
export type BreedingUpdateInput = z.infer<typeof breedingUpdateSchema>;
export type BreedingMatchInput = z.infer<typeof breedingMatchSchema>;
export type BreedingResponse = z.infer<typeof breedingResponseSchema>;
export type COICalculationResponse = z.infer<
  typeof coiCalculationResponseSchema
>;
