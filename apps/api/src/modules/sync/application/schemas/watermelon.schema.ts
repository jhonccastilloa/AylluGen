import { z } from "zod";
import "../../../auth/application/schemas/auth.schema";
import { animalCreateSchema } from "../../../animal/application/schemas/animal.schema";
import { breedingCreateSchema } from "../../../breeding/application/schemas/breeding.schema";
import { healthRecordCreateSchema } from "../../../health/application/schemas/health.schema";
import { productionRecordCreateSchema } from "../../../production/application/schemas/production.schema";
import { speciesCreateSchema } from "../../../species/application/schemas/species.schema";
import {
  SYNC_LIMITS,
  SYNC_TABLES,
  SyncTable,
  RawRecord,
  RecordData,
} from "../../domain/entities/Watermelon";

// UUID-shaped strings also preserve the deterministic IDs in the old species migration.
// Configure WatermelonDB's ID generator to UUID v4 before creating local records.
export const syncId = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  );
// ISO years 0001..9999 are representable by both JS and PostgreSQL.
const date = z.number().int().min(-62135596800000).max(253402300799999);
const notes = z.string().max(10000).nullable();
const metadata = {
  id: syncId,
  created_at: date.optional(),
  updated_at: date.optional(),
  // Watermelon sends these on push; they never reach persistence.
  _status: z.unknown().optional(),
  _changed: z.unknown().optional(),
};
export const recordSchemas = {
  species: z.object({
    ...metadata,
    code: speciesCreateSchema.shape.code,
    name: speciesCreateSchema.shape.name,
    description: speciesCreateSchema.shape.description.unwrap().nullable(),
  }),
  animals: z.object({
    ...metadata,
    crotal: animalCreateSchema.shape.crotal,
    sex: animalCreateSchema.shape.sex,
    species_id: syncId,
    birth_date: date.nullable(),
    is_founder: z.boolean(),
    father_id: syncId.nullable(),
    mother_id: syncId.nullable(),
  }),
  breedings: z.object({
    ...metadata,
    male_id: syncId,
    female_id: syncId,
    projected_coi: breedingCreateSchema.shape.projectedCOI,
    risk_level: breedingCreateSchema.shape.riskLevel,
    offspring_id: syncId.nullable(),
    breeding_date: date.nullable(),
    notes,
  }),
  health_records: z.object({
    ...metadata,
    animal_id: syncId,
    type: healthRecordCreateSchema.shape.type,
    date,
    notes,
    next_due_date: date.nullable(),
    completed: z.boolean(),
  }),
  production_records: z.object({
    ...metadata,
    animal_id: syncId,
    type: productionRecordCreateSchema.shape.type,
    date,
    value: productionRecordCreateSchema.shape.value,
    unit: z.string().min(1).max(50),
    quality_score: z.number().int().min(1).max(10).nullable(),
    notes,
  }),
};
export const fields: Record<SyncTable, Record<string, string>> = {
  species: { code: "code", name: "name", description: "description" },
  animals: {
    crotal: "crotal",
    sex: "sex",
    species_id: "speciesId",
    birth_date: "birthDate",
    is_founder: "isFounder",
    father_id: "fatherId",
    mother_id: "motherId",
  },
  breedings: {
    male_id: "maleId",
    female_id: "femaleId",
    projected_coi: "projectedCOI",
    risk_level: "riskLevel",
    offspring_id: "offspringId",
    breeding_date: "breedingDate",
    notes: "notes",
  },
  health_records: {
    animal_id: "animalId",
    type: "type",
    date: "date",
    notes: "notes",
    next_due_date: "nextDueDate",
    completed: "completed",
  },
  production_records: {
    animal_id: "animalId",
    type: "type",
    date: "date",
    value: "value",
    unit: "unit",
    quality_score: "qualityScore",
    notes: "notes",
  },
};
const dateFields = new Set([
  "birthDate",
  "breedingDate",
  "date",
  "nextDueDate",
]);
export function toDatabase(
  table: SyncTable,
  raw: RawRecord,
): RecordData & { id: string } {
  const result: RecordData & { id: string } = { id: raw.id };
  for (const [wire, db] of Object.entries(fields[table])) {
    const value = raw[wire];
    result[db] =
      dateFields.has(db) && value !== null
        ? new Date(value as number).toISOString()
        : value;
  }
  return result;
}
export function toRaw(table: SyncTable, data: RecordData): RawRecord {
  const result: RawRecord = { id: syncId.parse(data.id) };
  for (const [wire, db] of Object.entries(fields[table])) {
    const value = data[db] ?? null;
    result[wire] =
      dateFields.has(db) && value !== null
        ? new Date(value as string).getTime()
        : (value as RawRecord[string]);
  }
  result.created_at = new Date(data.createdAt as string).getTime();
  result.updated_at = new Date(data.updatedAt as string).getTime();
  return result;
}
const tableChanges = (schema: z.ZodObject) =>
  z
    .object({
      created: z.array(schema.strict()).max(SYNC_LIMITS.pushRecords),
      updated: z.array(schema.strict()).max(SYNC_LIMITS.pushRecords),
      deleted: z.array(syncId).max(SYNC_LIMITS.pushRecords),
    })
    .strict();
const changesSchema = z
  .object({
    species: tableChanges(recordSchemas.species).optional(),
    animals: tableChanges(recordSchemas.animals).optional(),
    breedings: tableChanges(recordSchemas.breedings).optional(),
    health_records: tableChanges(recordSchemas.health_records).optional(),
    production_records: tableChanges(
      recordSchemas.production_records,
    ).optional(),
  })
  .strict()
  .superRefine((changes, ctx) => {
    let count = 0;
    for (const table of SYNC_TABLES) {
      const change = changes[table];
      if (!change) continue;
      const ids = [
        ...change.created.map((r) => r.id),
        ...change.updated.map((r) => r.id),
        ...change.deleted,
      ];
      count += ids.length;
      if (ids.length !== new Set(ids).size)
        ctx.addIssue({ code: "custom", message: `IDs duplicados en ${table}` });
    }
    if (count > SYNC_LIMITS.pushRecords)
      ctx.addIssue({ code: "custom", message: "El push supera 500 registros" });
  });
const checkpoint = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const migration = z
  .object({
    from: z.number().int().min(1),
    tables: z.array(z.enum(SYNC_TABLES)).max(SYNC_TABLES.length),
    columns: z
      .array(
        z
          .object({
            table: z.enum(SYNC_TABLES),
            columns: z.array(z.string()).max(30),
          })
          .strict(),
      )
      .max(5),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (const item of value.columns) {
      if (
        item.columns.some(
          (column) =>
            !Object.hasOwn(fields[item.table], column) &&
            !["created_at", "updated_at"].includes(column),
        )
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Columna de migración no permitida",
        });
      }
    }
  });
// Schema 4 is the first native sync contract; 1/2/3 belong to the legacy mobile queue.
export const watermelonPullSchema = z
  .object({
    lastPulledAt: checkpoint.nullable(),
    schemaVersion: z.literal(4),
    migration: migration.nullable().default(null),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.migration && value.migration.from >= value.schemaVersion)
      ctx.addIssue({
        code: "custom",
        message: "Versión de migración inválida",
      });
  });
export const watermelonPushSchema = z
  .object({ lastPulledAt: checkpoint, changes: changesSchema })
  .strict();
export type WatermelonPull = z.infer<typeof watermelonPullSchema>;
export type WatermelonPush = z.infer<typeof watermelonPushSchema>;
