import { Q } from '@nozbe/watermelondb';
import {
  testDatabase,
  seed,
  OWNER,
  OTHER,
} from '@/features/sync/services/syncTestDatabase';
import {
  importLegacy,
  importRaw,
  reconcileLegacyFirstPull,
} from './importLegacy';
import {
  SYNC_TABLES,
  type SyncChanges,
} from '@/features/sync/services/watermelonProtocol';
import { AnimalsLocalRepository } from '@/features/animals/services/AnimalsLocalRepository';
import { SpeciesLocalRepository } from '@/features/species/services/SpeciesLocalRepository';
import { HealthLocalRepository } from '@/features/health/services/HealthLocalRepository';
import { ProductionLocalRepository } from '@/features/production/services/ProductionLocalRepository';
import { BreedingsLocalRepository } from '@/features/breedings/services/BreedingsLocalRepository';
import { generateUuid } from '@/features/shared/utils/id';
import type { AnimalModel } from './models/AnimalModel';
import type { BreedingModel } from './models/BreedingModel';

const empty = (): SyncChanges =>
  Object.fromEntries(
    SYNC_TABLES.map(t => [t, { created: [], updated: [], deleted: [] }]),
  );
const animalRaw = (id = generateUuid()) => ({
  id,
  crotal: 'A-1',
  sex: 'MALE',
  species: 'ALPACA',
  species_id: null,
  birth_date: null,
  is_founder: true,
  father_id: null,
  mother_id: null,
  deleted_at: null,
});
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

it('imports only the owner dataset atomically, preserving timestamps and archive data', async () => {
  const legacy = testDatabase();
  const target = testDatabase();
  const row = animalRaw();
  await seed(legacy, 'animals', {
    ...row,
    created_at: 1234,
    updated_at: 5678,
    _status: 'created',
  });
  await seed(legacy, 'animals', { ...animalRaw(), user_id: OTHER });
  await importLegacy(legacy, target, OWNER);
  await importLegacy(legacy, target, OWNER);
  const imported = await target.get<AnimalModel>('animals').find(row.id);
  expect(imported.syncStatus).toBe('synced');
  expect(imported.createdAt.getTime()).toBe(1234);
  expect(imported.updatedAt.getTime()).toBe(5678);
  expect(await target.get('animals').query().fetchCount()).toBe(1);
  expect(await legacy.get('animals').query().fetchCount()).toBe(2);
  expect((await legacy.get('animals').find(row.id)).syncStatus).toBe('created');
});
it('reconstructs native changed columns from legacy updates, not the REST cache status', () => {
  const result = importRaw(
    { ...animalRaw(), sync_status: 'SYNCED', _status: 'created' },
    [
      {
        action: 'UPDATE',
        payload: JSON.stringify({ crotal: 'B', clientUpdatedAt: 'yesterday' }),
      },
    ],
  );
  expect(result).toMatchObject({ _status: 'updated', _changed: 'crotal' });
});
it('reconstructs legacy creates and deletions and preserves unqueued pending work', () => {
  expect(importRaw(animalRaw(), [{ action: 'CREATE' }])._status).toBe(
    'created',
  );
  expect(importRaw(animalRaw(), [{ action: 'DELETE' }])._status).toBe(
    'deleted',
  );
  expect(
    importRaw({ ...animalRaw(), sync_status: 'PENDING' }, [])._status,
  ).toBe('updated');
});
it('does not commit half an import or its marker when a row has an invalid ID', async () => {
  const legacy = testDatabase();
  const target = testDatabase();
  await seed(legacy, 'animals', animalRaw());
  await seed(legacy, 'animals', animalRaw('invalid'));
  await expect(importLegacy(legacy, target, OWNER)).rejects.toThrow();
  expect(await target.get('animals').query().fetchCount()).toBe(0);
  expect(await target.get('app_meta').query().fetchCount()).toBe(0);
});

it('refuses to guess ownership for an orphan legacy queue entry', async () => {
  const legacy = testDatabase();
  const target = testDatabase();
  await seed(legacy, 'sync_queue', {
    table_name: 'animals',
    record_id: generateUuid(),
    action: 'DELETE',
    payload: null,
    client_version: 1,
  });
  await expect(importLegacy(legacy, target, OWNER)).rejects.toThrow(/cuenta/);
  expect(await target.get('app_meta').query().fetchCount()).toBe(0);
  expect(await legacy.get('sync_queue').query().fetchCount()).toBe(1);
});

it('allows offline edits to archived animals before their species IDs are resolved', async () => {
  const db = testDatabase();
  const row = animalRaw();
  await seed(db, 'animals', row);
  const animals = new AnimalsLocalRepository(db, OWNER);
  expect(
    (await animals.updateLocal(row.id, { crotal: 'OFFLINE' }))?.crotal,
  ).toBe('OFFLINE');
  expect((await db.get('animals').find(row.id)).syncStatus).toBe('updated');
});
it('binds a legacy species code to the authoritative server ID, preserving pending columns', async () => {
  const db = testDatabase();
  const row = animalRaw();
  const speciesId = generateUuid();
  const changes = empty();
  await seed(db, 'animals', { ...row, _status: 'created', _changed: 'crotal' });
  changes.species.created.push({
    id: speciesId,
    code: 'ALPACA',
    name: 'Alpaca',
    description: null,
  });
  await reconcileLegacyFirstPull(db, changes, OWNER);
  const model = await db.get<AnimalModel>('animals').find(row.id);
  expect(model.speciesId).toBe(speciesId);
  expect(model.syncStatus).toBe('created');
  expect(model._raw._changed).toBe('crotal');
});
it('removes stale synced cache but refuses to silently recreate a missing legacy update', async () => {
  const db = testDatabase();
  const row = animalRaw();
  await seed(db, 'animals', row);
  const changes = empty();
  await reconcileLegacyFirstPull(db, changes, OWNER);
  expect(changes.animals.deleted).toEqual([row.id]);
  const other = testDatabase();
  await seed(other, 'animals', {
    ...row,
    _status: 'updated',
    _changed: 'crotal',
  });
  await expect(reconcileLegacyFirstPull(other, empty(), OWNER)).rejects.toThrow(
    /antiguo/,
  );
  expect((await other.get('animals').find(row.id)).syncStatus).toBe('updated');
});

async function herd() {
  const db = testDatabase();
  const species = new SpeciesLocalRepository(db, OWNER);
  const kind = await species.create({ code: 'ALPACA', name: 'Alpaca' });
  const animals = new AnimalsLocalRepository(db, OWNER);
  const male = await animals.createLocal(OWNER, {
    crotal: 'M',
    sex: 'MALE',
    species: 'ALPACA',
    speciesId: kind.id,
    isFounder: true,
  });
  const female = await animals.createLocal(OWNER, {
    crotal: 'F',
    sex: 'FEMALE',
    species: 'ALPACA',
    speciesId: kind.id,
    isFounder: true,
  });
  return {
    db,
    species,
    kind,
    animals,
    male,
    female,
    health: new HealthLocalRepository(db, OWNER),
    production: new ProductionLocalRepository(db, OWNER),
    breedings: new BreedingsLocalRepository(db, OWNER),
  };
}
it('creates the five synchronized entities offline with UUIDs and native pending tracking', async () => {
  const h = await herd();
  const health = await h.health.createLocal(OWNER, {
    animalId: h.male.id,
    type: 'CHECKUP',
    date: '2026-09-05T00:00:00Z',
  });
  const production = await h.production.createLocal(OWNER, {
    animalId: h.male.id,
    type: 'WEIGHT',
    value: 50,
    unit: 'kg',
    date: '2026-09-05T00:00:00Z',
  });
  const breeding = await h.breedings.createLocal(OWNER, {
    maleId: h.male.id,
    femaleId: h.female.id,
    projectedCOI: 0,
    riskLevel: 'GREEN',
  });
  expect(
    [h.kind.id, h.male.id, health.id, production.id, breeding.id].every(id =>
      /^[0-9a-f-]{36}$/.test(id),
    ),
  ).toBe(true);
  for (const table of SYNC_TABLES)
    expect(
      await h.db.get(table).query(Q.where('_status', 'created')).fetchCount(),
    ).toBeGreaterThan(0);
  expect(await h.db.get('sync_queue').query().fetchCount()).toBe(0);
  expect(h.male.speciesId).toBe(h.kind.id);
});
it('updates health, production and breeding records without a second queue', async () => {
  const h = await herd();
  const health = await h.health.createLocal(OWNER, {
    animalId: h.male.id,
    type: 'CHECKUP',
    date: '2026-09-05',
  });
  const production = await h.production.createLocal(OWNER, {
    animalId: h.male.id,
    type: 'WEIGHT',
    value: 50,
    unit: 'kg',
    date: '2026-09-05',
  });
  const breeding = await h.breedings.createLocal(OWNER, {
    maleId: h.male.id,
    femaleId: h.female.id,
    projectedCOI: 0,
    riskLevel: 'GREEN',
  });
  expect(
    (await h.health.updateLocal(health.id, { notes: 'local' }))?.notes,
  ).toBe('local');
  expect(
    (await h.production.updateLocal(production.id, { value: 51 }))?.value,
  ).toBe(51);
  expect(
    (await h.breedings.updateLocal(breeding.id, { notes: 'local' }))?.notes,
  ).toBe('local');
  await h.health.deleteLocal(health.id);
  await h.production.deleteLocal(production.id);
  await h.breedings.deleteLocal(breeding.id);
  expect(await h.health.getById(health.id)).toBeNull();
  expect(await h.production.listByUserId(OWNER)).toEqual([]);
  expect(await h.breedings.listByUserId(OWNER)).toEqual([]);
});
it('atomically cascades animal deletes and clears parent/offspring references', async () => {
  const h = await herd();
  const child = await h.animals.createLocal(OWNER, {
    crotal: 'C',
    sex: 'MALE',
    species: 'ALPACA',
    speciesId: h.kind.id,
    fatherId: h.male.id,
    motherId: h.female.id,
  });
  await h.health.createLocal(OWNER, {
    animalId: h.male.id,
    type: 'CHECKUP',
    date: '2026-09-05',
  });
  await h.production.createLocal(OWNER, {
    animalId: h.male.id,
    type: 'WEIGHT',
    value: 50,
    unit: 'kg',
    date: '2026-09-05',
  });
  const pair = await h.breedings.createLocal(OWNER, {
    maleId: h.male.id,
    femaleId: h.female.id,
    projectedCOI: 0,
    riskLevel: 'GREEN',
  });
  await h.breedings.updateLocal(pair.id, { offspringId: child.id });
  await h.animals.softDeleteLocal(child.id);
  expect(
    (await h.db.get<BreedingModel>('breedings').find(pair.id)).offspringId,
  ).toBeNull();
  const nextChild = await h.animals.createLocal(OWNER, {
    crotal: 'D',
    sex: 'MALE',
    species: 'ALPACA',
    speciesId: h.kind.id,
    fatherId: h.male.id,
  });
  const batch = jest.spyOn(h.db, 'batch');
  await h.animals.softDeleteLocal(h.male.id);
  expect(batch).toHaveBeenCalledTimes(1);
  expect((await h.animals.getById(nextChild.id))?.fatherId).toBeNull();
  expect(await h.health.listByUserId(OWNER)).toEqual([]);
  expect(await h.production.listByUserId(OWNER)).toEqual([]);
  expect(await h.breedings.listByUserId(OWNER)).toEqual([]);
  expect(await h.animals.softDeleteLocal(h.male.id)).toBeNull();
});
it('rejects invalid values, relations, duplicate codes/crotales, cycles and cross-account writes', async () => {
  const h = await herd();
  await expect(
    h.species.create({ code: 'ALPACA', name: 'Other' }),
  ).rejects.toThrow();
  await expect(h.species.delete(h.kind.id)).rejects.toThrow();
  await expect(
    h.animals.createLocal(OTHER, {
      crotal: 'X',
      sex: 'MALE',
      species: 'ALPACA',
    }),
  ).rejects.toThrow(/Cuenta/);
  await expect(h.animals.listByUserId(OTHER)).rejects.toThrow(/Cuenta/);
  await expect(
    h.animals.updateLocal(h.male.id, { crotal: 'F' }),
  ).rejects.toThrow();
  await expect(
    h.animals.updateLocal(h.male.id, { fatherId: h.male.id }),
  ).rejects.toThrow(/ciclos/);
  await expect(
    h.health.createLocal(OWNER, {
      animalId: generateUuid(),
      type: 'CHECKUP',
      date: '2026-09-05',
    }),
  ).rejects.toThrow();
  await expect(
    h.production.createLocal(OWNER, {
      animalId: h.male.id,
      type: 'WEIGHT',
      value: -1,
      unit: 'kg',
      date: '2026-09-05',
    }),
  ).rejects.toThrow();
  expect(await h.db.get('health_records').query().fetchCount()).toBe(0);
  expect(await h.db.get('production_records').query().fetchCount()).toBe(0);
});
it('keeps different accounts in distinct databases even when record IDs coincide', async () => {
  const a = testDatabase();
  const b = testDatabase();
  const id = generateUuid();
  await seed(a, 'animals', animalRaw(id));
  await seed(b, 'animals', { ...animalRaw(id), crotal: 'B', user_id: OTHER });
  expect((await new AnimalsLocalRepository(a, OWNER).getById(id))?.crotal).toBe(
    'A-1',
  );
  expect((await new AnimalsLocalRepository(b, OTHER).getById(id))?.crotal).toBe(
    'B',
  );
});
