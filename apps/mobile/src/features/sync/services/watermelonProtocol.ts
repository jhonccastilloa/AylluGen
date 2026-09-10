import { z } from 'zod';
import type { SyncTableChangeSet } from '@nozbe/watermelondb/sync';
export type SyncChanges = Record<string, SyncTableChangeSet>;

export const SYNC_TABLES = [
  'species',
  'animals',
  'breedings',
  'health_records',
  'production_records',
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];
export const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const date = z.number().int().min(-62135596800000).max(253402300799999);
const notes = z.string().max(10000).nullable();
const syncMetadata = { id: uuid };
export const businessSchemas = {
  species: z.object({
    ...syncMetadata,
    code: z
      .string()
      .min(2)
      .max(30)
      .regex(/^[A-Z0-9_]+$/),
    name: z.string().min(2).max(80),
    description: z.string().max(200).nullable(),
  }),
  animals: z.object({
    ...syncMetadata,
    crotal: z.string().min(1).max(50),
    sex: z.enum(['MALE', 'FEMALE']),
    species_id: uuid,
    birth_date: date.nullable(),
    is_founder: z.boolean(),
    father_id: uuid.nullable(),
    mother_id: uuid.nullable(),
  }),
  breedings: z.object({
    ...syncMetadata,
    male_id: uuid,
    female_id: uuid,
    projected_coi: z.number().min(0).max(1),
    risk_level: z.enum(['GREEN', 'YELLOW', 'RED']),
    offspring_id: uuid.nullable(),
    breeding_date: date.nullable(),
    notes,
  }),
  health_records: z.object({
    ...syncMetadata,
    animal_id: uuid,
    type: z.enum([
      'VACCINATION',
      'DEWORMING',
      'SHEARING',
      'CHECKUP',
      'TREATMENT',
    ]),
    date,
    notes,
    next_due_date: date.nullable(),
    completed: z.boolean(),
  }),
  production_records: z.object({
    ...syncMetadata,
    animal_id: uuid,
    type: z.enum(['WEIGHT', 'WOOL', 'FIBER', 'MEAT', 'MILK']),
    date,
    value: z.number().positive(),
    unit: z.string().min(1).max(50),
    quality_score: z.number().int().min(1).max(10).nullable(),
    notes,
  }),
};

const deviceDates = { created_at: date, updated_at: date };
export const wireSchemas = {
  species: businessSchemas.species.extend(deviceDates),
  animals: businessSchemas.animals.extend(deviceDates),
  breedings: businessSchemas.breedings.extend(deviceDates),
  health_records: businessSchemas.health_records.extend(deviceDates),
  production_records: businessSchemas.production_records.extend(deviceDates),
};

export class SyncValidationError extends Error {
  readonly status = 400;
}

export function projectPush(changes: SyncChanges): SyncChanges {
  const result: SyncChanges = {};
  let count = 0;
  for (const table of SYNC_TABLES) {
    const change = changes[table] ?? { created: [], updated: [], deleted: [] };
    const ids = [
      ...change.created.map(r => r.id),
      ...change.updated.map(r => r.id),
      ...change.deleted,
    ];
    if (new Set(ids).size !== ids.length)
      throw new SyncValidationError('IDs repetidos en el lote local.');
    count += ids.length;
    try {
      // Zod's stripping is an explicit whitelist, not a raw model upload.
      result[table] = {
        created: change.created.map(r => wireSchemas[table].parse(r)),
        updated: change.updated.map(r => wireSchemas[table].parse(r)),
        deleted: change.deleted.map(id => uuid.parse(id)),
      };
    } catch {
      throw new SyncValidationError(
        `Hay datos inválidos en ${table}. Corrígelos antes de sincronizar.`,
      );
    }
  }
  if (count > 500)
    throw new SyncValidationError(
      'El lote supera 500 cambios. Se conserva completo; requiere ampliar el límite coordinadamente con el servidor.',
    );
  // Conservative UTF-8 upper bound, no Buffer dependency in React Native.
  if (JSON.stringify(result).length * 3 > 2 * 1024 * 1024 - 1024) {
    throw new SyncValidationError(
      'El lote supera el tamaño permitido. Los cambios permanecen en el dispositivo.',
    );
  }
  return result;
}

export function parsePull(
  value: unknown,
  userId: string,
  lastPulledAt: number | null,
) {
  const envelope = z
    .object({
      timestamp: z.number().int().safe().positive(),
      changes: z.record(z.string(), z.unknown()),
    })
    .parse(value);
  if (lastPulledAt !== null && envelope.timestamp < lastPulledAt)
    throw new SyncValidationError(
      'El checkpoint retrocedió. No se modificó la base local.',
    );
  if (
    Object.keys(envelope.changes).some(
      key => !SYNC_TABLES.includes(key as SyncTable),
    )
  )
    throw new SyncValidationError('Tabla de sincronización desconocida.');
  const changes: SyncChanges = {};
  let count = 0;
  for (const table of SYNC_TABLES) {
    const schema = wireSchemas[table];
    const change = z
      .object({
        created: z.array(schema),
        updated: z.array(schema),
        deleted: z.array(uuid),
      })
      .parse(envelope.changes[table]);
    const ids = [
      ...change.created.map(r => r.id),
      ...change.updated.map(r => r.id),
      ...change.deleted,
    ];
    count += ids.length;
    if (new Set(ids).size !== ids.length)
      throw new SyncValidationError('Respuesta con IDs repetidos.');
    const local = (r: Record<string, unknown>) => ({
      ...r,
      user_id: userId,
      deleted_at: null,
    });
    changes[table] = {
      created: change.created.map(local),
      updated: change.updated.map(local),
      deleted: change.deleted,
    };
  }
  if (count > 20000)
    throw new SyncValidationError('El dataset excede el límite local.');
  return { changes, timestamp: envelope.timestamp };
}

export const changeCounts = (changes: SyncChanges) =>
  Object.fromEntries(
    SYNC_TABLES.map(table => [
      table,
      {
        created: changes[table]?.created.length ?? 0,
        updated: changes[table]?.updated.length ?? 0,
        deleted: changes[table]?.deleted.length ?? 0,
      },
    ]),
  );
