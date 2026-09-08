import { Q, type Database, type Model } from '@nozbe/watermelondb';
import type { DirtyRaw } from '@nozbe/watermelondb/RawRecord';
import type { SyncChanges } from '@/features/sync/services/watermelonProtocol';
import {
  SYNC_TABLES,
  wireSchemas,
  uuid,
  SyncValidationError,
} from '@/features/sync/services/watermelonProtocol';
import { generateUuid } from '@/features/shared/utils/id';
import type { AnimalModel } from './models/AnimalModel';
import type { SpeciesModel } from './models/SpeciesModel';

const IMPORT_MARKER = 'legacy-v4-imported';
const columns: Record<string, string> = {
  crotal: 'crotal',
  sex: 'sex',
  species: 'species_id',
  speciesCode: 'species_id',
  speciesId: 'species_id',
  birthDate: 'birth_date',
  isFounder: 'is_founder',
  fatherId: 'father_id',
  motherId: 'mother_id',
  maleId: 'male_id',
  femaleId: 'female_id',
  projectedCOI: 'projected_coi',
  riskLevel: 'risk_level',
  offspringId: 'offspring_id',
  breedingDate: 'breeding_date',
  notes: 'notes',
  animalId: 'animal_id',
  type: 'type',
  date: 'date',
  nextDueDate: 'next_due_date',
  completed: 'completed',
  value: 'value',
  unit: 'unit',
  qualityScore: 'quality_score',
};

export function importRaw(raw: DirtyRaw, operations: DirtyRaw[]): DirtyRaw {
  uuid.parse(raw.id);
  const isDeleted =
    raw.sync_status === 'DELETED' ||
    raw.deleted_at ||
    operations.some(op => op.action === 'DELETE');
  const isCreated = operations.some(op => op.action === 'CREATE');
  const pending =
    operations.length > 0 ||
    raw.sync_status === 'PENDING' ||
    raw.sync_status === 'CONFLICT';
  const changed = new Set<string>();
  operations.forEach(op => {
    const payload = op.payload ? JSON.parse(op.payload) : {};
    Object.keys(payload ?? {}).forEach(key => {
      if (columns[key]) changed.add(columns[key]);
    });
  });
  // The old REST cache used Watermelon create(), even for already synced rows.
  // Never trust its _status. Only the durable queue/custom status indicates pending work.
  if (pending && !changed.size)
    Object.values(columns).forEach(key => changed.add(key));
  return {
    ...raw,
    _status: isDeleted
      ? 'deleted'
      : isCreated
        ? 'created'
        : pending
          ? 'updated'
          : 'synced',
    _changed: pending ? [...changed].join(',') : '',
  };
}

export async function importLegacy(
  legacy: Database,
  target: Database,
  userId: string,
): Promise<void> {
  if (
    await target
      .get('app_meta')
      .query(Q.where('meta_key', IMPORT_MARKER))
      .fetchCount()
  )
    return;
  // A read action gives a consistent archive snapshot. It is never cleared or rewritten.
  const snapshot = await legacy.read(async () => {
    const queues = await legacy.get('sync_queue').query().fetch();
    // The legacy queue has no owner column. An orphan must never be guessed to
    // belong to the account that happens to log in during the upgrade.
    const knownIds = new Set(
      (
        await Promise.all(
          SYNC_TABLES.filter(t => t !== 'species').map(async table =>
            (await legacy.get(table).query().fetchIds()).map(
              id => `${table}:${id}`,
            ),
          ),
        )
      ).flat(),
    );
    if (
      queues.some(q => {
        const raw = q._raw as DirtyRaw;
        return !knownIds.has(`${raw.table_name}:${raw.record_id}`);
      })
    )
      throw new SyncValidationError(
        'Hay pendientes antiguos sin un registro que identifique su cuenta. Se conserva el archivo completo y se requiere recuperación asistida.',
      );
    const tables = await Promise.all(
      SYNC_TABLES.filter(t => t !== 'species').map(async table => ({
        table,
        rows: (
          await legacy.get(table).query(Q.where('user_id', userId)).fetch()
        ).map(row => ({ ...row._raw }) as DirtyRaw),
      })),
    );
    return { queues: queues.map(q => ({ ...q._raw }) as DirtyRaw), tables };
  });
  const queueByRecord = new Map<string, DirtyRaw[]>();
  for (const q of snapshot.queues) {
    const key = `${q.table_name}:${q.record_id}`;
    queueByRecord.set(key, [...(queueByRecord.get(key) ?? []), q]);
  }
  // Validate/transform all rows before preparing any Watermelon models.
  const rowsToImport = snapshot.tables.flatMap(({ table, rows }) =>
    rows.map(raw => ({
      table,
      raw: importRaw(raw, queueByRecord.get(`${table}:${raw.id}`) ?? []),
    })),
  );
  if (rowsToImport.length > 20000)
    throw new SyncValidationError(
      'El archivo local supera el límite del dataset; requiere una migración asistida.',
    );
  await target.write(async () => {
    if (
      await target
        .get('app_meta')
        .query(Q.where('meta_key', IMPORT_MARKER))
        .fetchCount()
    )
      return;
    const prepared: Model[] = [];
    for (const { table, raw } of rowsToImport) {
      prepared.push(target.get(table).prepareCreateFromDirtyRaw(raw));
    }
    prepared.push(
      target.get('app_meta').prepareCreateFromDirtyRaw({
        id: generateUuid(),
        meta_key: IMPORT_MARKER,
        meta_value: '1',
        updated_at: Date.now(),
        _status: 'synced',
        _changed: '',
      }),
    );
    // Marker and imported records commit together, making restart/retry idempotent.
    await target.batch(prepared);
  });
}

/** Before the first native pull: bind old species codes using the authoritative catalog.
 * Also discard only old synced cache rows absent from that complete owner snapshot.
 * Pending creations/edits are retained; legacy updates missing remotely require review.
 */
export async function reconcileLegacyFirstPull(
  db: Database,
  changes: SyncChanges,
  userId: string,
): Promise<void> {
  await db.write(async () => {
    const remoteSpecies = [
      ...changes.species.created,
      ...changes.species.updated,
    ];
    const localSpecies = await db.get<SpeciesModel>('species').query().fetch();
    const catalog = new Map([
      ...remoteSpecies.map(s => [s.code as string, s.id as string] as const),
      ...localSpecies.map(s => [s.code, s.id] as const),
    ]);
    const remoteAnimals = new Map(
      [...changes.animals.created, ...changes.animals.updated].map(a => [
        a.id,
        a,
      ]),
    );
    const animals = await db.get<AnimalModel>('animals').query().fetch();
    // Validate before preparing any operations (a failed prepare must not poison models).
    for (const table of SYNC_TABLES) {
      const ids = new Set(
        [...changes[table].created, ...changes[table].updated].map(r => r.id),
      );
      const rows = await db.get(table).query().fetch();
      for (const row of rows) {
        if (!ids.has(row.id) && row.syncStatus === 'updated') {
          throw new SyncValidationError(
            'Un cambio antiguo no existe en el servidor. Se conserva en la base local y en el archivo antiguo; requiere revisar su origen antes de sincronizar.',
          );
        }
        if (!ids.has(row.id) && row.syncStatus === 'synced')
          changes[table].deleted.push(row.id);
      }
    }
    const speciesToCreate: DirtyRaw[] = [];
    const bindings: { animal: AnimalModel; speciesId: string }[] = [];
    for (const animal of animals) {
      if (animal.speciesId) continue;
      let speciesId = remoteAnimals.get(animal.id)?.species_id as
        | string
        | undefined;
      if (animal._raw._changed.split(',').includes('species_id'))
        speciesId = undefined;
      speciesId ??= catalog.get(animal.species);
      if (!speciesId && animal.syncStatus !== 'synced') {
        const species = wireSchemas.species.parse({
          id: generateUuid(),
          code: animal.species,
          name: animal.species,
          description: null,
        });
        speciesId = species.id;
        catalog.set(species.code, species.id);
        speciesToCreate.push({
          ...species,
          user_id: userId,
          created_at: Date.now(),
          updated_at: Date.now(),
          _status: 'created',
          _changed: '',
        });
      }
      if (speciesId) bindings.push({ animal, speciesId });
    }
    // All fallible catalog validation is complete before preparing mutations.
    const prepared: Model[] = speciesToCreate.map(raw =>
      db.get('species').prepareCreateFromDirtyRaw(raw),
    );
    for (const { animal, speciesId } of bindings) {
      const status = animal._raw._status;
      const changed = animal._raw._changed;
      const updatedAt = (animal._raw as DirtyRaw).updated_at;
      prepared.push(
        animal.prepareUpdate(row => {
          row.speciesId = speciesId;
          row._raw._status = status;
          row._raw._changed = changed;
          (row._raw as DirtyRaw).updated_at = updatedAt;
        }),
      );
    }
    await db.batch(prepared);
  });
}
