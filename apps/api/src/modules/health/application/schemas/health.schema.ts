import { z } from "zod";
import { HealthType } from "../../domain/entities/HealthRecord";
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

export const healthRecordCreateSchema = z
  .object({
    animalId: z.uuid().describe("Animal ID"),
    type: z
      .enum(HealthType)
      .describe(
        "Health record type: VACCINATION, DEWORMING, SHEARING, CHECKUP, or TREATMENT",
      ),
    date: z.iso.datetime().describe("Date of the health event"),
    notes: z.string().optional().describe("Additional notes"),
    nextDueDate: z.iso
      .datetime()
      .optional()
      .describe("Next due date for this type of health event"),
    completed: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether the health event is completed"),
  })
  .openapi({
    title: "HealthRecordCreateInput",
    description: "Schema for creating a health record",
    example: {
      animalId: "123e4567-e89b-12d3-a456-426614174000",
      type: HealthType.VACCINATION,
      date: "2024-01-20T00:00:00Z",
      notes: "Annual vaccination",
      nextDueDate: "2025-01-20T00:00:00Z",
      completed: true,
    },
  });

export const healthRecordQuerySchema = z.object({
  animalId: z.uuid().optional().describe("Filter by animal ID"),
  type: z
    .enum(HealthType)
    .optional()
    .describe(
      "Filter by health record type: VACCINATION, DEWORMING, SHEARING, CHECKUP, or TREATMENT",
    ),
  completed: z.coerce
    .boolean()
    .optional()
    .describe("Filter by completion status of the health record"),
});

export const healthRecordUpcomingQuerySchema = z.object({
  daysAhead: z.coerce
    .number("El número de días debe ser un número válido")
    .int("El número de días debe ser un entero")
    .positive("El número de días debe ser positivo")
    .optional()
    .describe("Number of days ahead to look for upcoming health tasks"),
});

export const healthRecordUpdateSchema = z
  .object({
    type: z.enum(HealthType).optional().describe("Health record type"),
    date: z.iso.datetime().optional().describe("Date of the health event"),
    notes: z.string().optional().describe("Additional notes"),
    nextDueDate: z.iso.datetime().optional().describe("Next due date"),
    completed: z.boolean().optional().describe("Whether completed"),
  })
  .openapi({
    title: "HealthRecordUpdateInput",
    description: "Schema for updating a health record",
    example: {
      completed: true,
      notes: "Vaccination completed successfully",
    },
  });

export const healthRecordIdSchema = z.object({
  healthRecordId: z
    .uuid("El id del registro de salud debe ser un UUID válido")
    .describe("Identificador único del registro de salud"),
});

export const healthRecordResponseSchema = z
  .object({
    id: z.uuid(),
    animalId: z.uuid(),
    animal: animalRelationSchema.nullable(),
    type: z.enum(HealthType),
    date: z.iso.datetime(),
    notes: z.string().nullable(),
    nextDueDate: z.iso.datetime().nullable(),
    completed: z.boolean(),
    userId: z.uuid(),
    syncStatus: z.enum(["SYNCED", "PENDING", "CONFLICT", "DELETED"]),
    syncVersion: z.number(),
    clientCreatedAt: z.iso.datetime().optional().describe("Fecha de creación en el dispositivo"),
    clientUpdatedAt: z.iso.datetime().optional().describe("Fecha de modificación en el dispositivo"),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .openapi({
    title: "HealthRecordResponse",
    description: "Health record response schema",
  });

export const upcomingTaskResponseSchema = z
  .object({
    id: z.uuid(),
    animalId: z.uuid(),
    animalCrotal: z.string(),
    type: z.enum(HealthType),
    dueDate: z.iso.datetime(),
    daysUntilDue: z.number(),
    notes: z.string().nullable(),
  })
  .openapi({
    title: "UpcomingTaskResponse",
    description: "Upcoming health task response schema",
  });

export type HealthRecordCreateInput = z.infer<typeof healthRecordCreateSchema>;
export type HealthRecordUpdateInput = z.infer<typeof healthRecordUpdateSchema>;
export type HealthRecordResponse = z.infer<typeof healthRecordResponseSchema>;
export type UpcomingTaskResponse = z.infer<typeof upcomingTaskResponseSchema>;
