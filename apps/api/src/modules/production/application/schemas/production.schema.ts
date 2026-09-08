import { z } from "zod";
import { ProductionType } from "../../domain/entities/ProductionRecord";
import { Sex } from "../../../animal/domain/entities/Animal";

const animalRelationSchema = z.object({
  id: z.uuid(),
  crotal: z.string(),
  sex: z.enum(Sex),
  speciesId: z.string(),
  species: z.string(),
  speciesName: z.string().nullable().optional(),
  birthDate: z.iso.datetime().nullable(),
  isFounder: z.boolean(),
});

export const productionRecordCreateSchema = z
  .object({
    animalId: z.uuid().describe("Animal ID"),
    type: z
      .enum(ProductionType)
      .describe("Production type: WEIGHT, WOOL, FIBER, MEAT, or MILK"),
    date: z.iso.datetime().describe("Date of production measurement"),
    value: z.number().positive().describe("Production value"),
    unit: z.string().describe("Unit of measurement (kg, g, liters, etc.)"),
    qualityScore: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Quality score (1-10)"),
    notes: z.string().optional().describe("Additional notes"),
  })
  .openapi({
    title: "ProductionRecordCreateInput",
    description: "Schema for creating a production record",
    example: {
      animalId: "123e4567-e89b-12d3-a456-426614174000",
      type: ProductionType.WOOL,
      date: "2024-01-20T00:00:00Z",
      value: 3.5,
      unit: "kg",
      qualityScore: 8,
      notes: "Good quality wool",
    },
  });

export const productionRecordUpdateSchema = z
  .object({
    type: z.enum(ProductionType).optional().describe("Production type"),
    date: z.iso.datetime().optional().describe("Date of measurement"),
    value: z.number().positive().optional().describe("Production value"),
    unit: z.string().optional().describe("Unit of measurement"),
    qualityScore: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Quality score (1-10)"),
    notes: z.string().optional().describe("Additional notes"),
  })
  .openapi({
    title: "ProductionRecordUpdateInput",
    description: "Schema for updating a production record",
  });

export const productionRecordResponseSchema = z
  .object({
    id: z.uuid(),
    animalId: z.uuid(),
    animal: animalRelationSchema.nullable(),
    type: z.enum(ProductionType),
    date: z.iso.datetime(),
    value: z.number(),
    unit: z.string(),
    qualityScore: z.number().nullable(),
    notes: z.string().nullable(),
    userId: z.uuid(),
    syncStatus: z.enum(["SYNCED", "PENDING", "CONFLICT", "DELETED"]),
    syncVersion: z.number(),
    clientCreatedAt: z.iso.datetime().optional().describe("Fecha de creación en el dispositivo"),
    clientUpdatedAt: z.iso.datetime().optional().describe("Fecha de modificación en el dispositivo"),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi({
    title: "ProductionRecordResponse",
    description: "Production record response schema",
  });

export const productionSummaryResponseSchema = z
  .object({
    animalId: z.uuid(),
    animalCrotal: z.string(),
    type: z.enum(ProductionType),
    totalRecords: z.number(),
    averageValue: z.number(),
    averageQualityScore: z.number().nullable(),
    lastRecord: z.iso.datetime(),
    trend: z.enum(["improving", "stable", "declining"]),
  })
  .openapi({
    title: "ProductionSummaryResponse",
    description: "Production summary response schema",
  });

export const productionRecordIdParamSchema = z.object({
  productionRecordId: z
    .uuid("El ID del registro de producción debe ser un UUID valido")
    .describe("ID único del registro de producción"),
});

export const productionRecordSummaryParamSchema = z.object({
  animalId: z
    .uuid("El ID del animal debe ser un UUID valido")
    .describe("Filter by Animal ID"),
  type: z.enum(ProductionType).describe("Filter by Production Type"),
});

export const productionReacordRecentQuerySchema = z.object({
  limit: z
    .coerce.number()
    .int()
    .positive()
    .default(10)
    .describe("Numero máximo de registros a retornar"),
});

export const productionGetAllQuerySchema = z
  .object({
    animalId: z
      .uuid("El ID del animal debe ser un UUID valido")
      .optional()
      .describe("Filter by Animal ID"),
    type: z
      .enum(ProductionType)
      .optional()
      .describe("Filter by Production Type"),
  })
  .openapi({
    title: "ProductionGetAllQuery",
    description: "Query parameters for getting all production records",
  });
export type ProductionRecordCreateInput = z.infer<
  typeof productionRecordCreateSchema
>;
export type ProductionRecordUpdateInput = z.infer<
  typeof productionRecordUpdateSchema
>;
export type ProductionRecordResponse = z.infer<
  typeof productionRecordResponseSchema
>;
export type ProductionSummaryResponse = z.infer<
  typeof productionSummaryResponseSchema
>;
