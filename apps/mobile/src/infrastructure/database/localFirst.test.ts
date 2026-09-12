import { Q } from '@nozbe/watermelondb';
import {
  testDatabase,
  seed,
  OWNER,
  OTHER,
} from '@/features/sync/services/syncTestDatabase';
import { SYNC_TABLES } from '@/features/sync/services/watermelonProtocol';
import { AnimalsLocalRepository } from '@/features/animals/services/AnimalsLocalRepository';
import { createSpeciesModule } from '@/features/species/bootstrap';
import { HealthLocalRepository } from '@/features/health/services/HealthLocalRepository';
import { ProductionLocalRepository } from '@/features/production/services/ProductionLocalRepository';
import { BreedingsLocalRepository } from '@/features/breedings/services/BreedingsLocalRepository';
import { generateUuid } from '@/features/shared/utils/id';
import type { BreedingModel } from './models/BreedingModel';

const animalRaw = (id = generateUuid()) => ({
  id,
  crotal: 'A-1',
  sex: 'MALE',
  species: 'ALPACA',
  species_id: generateUuid(),
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

async function herd() {
  const db = testDatabase();
  const species = createSpeciesModule(db, OWNER);
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
  expect(Object.keys(h.db.schema.tables).sort()).toEqual(
    [...SYNC_TABLES].sort(),
  );
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
    h.animals.createLocal(OWNER, {
      crotal: 'NO SPECIES',
      sex: 'MALE',
      species: 'ALPACA',
      speciesId: '',
    }),
  ).rejects.toThrow(/especie/);
  await expect(
    h.species.create({ code: 'ALPACA', name: 'Other' }),
  ).rejects.toThrow();
  await expect(h.species.delete(h.kind.id)).rejects.toThrow();
  await expect(
    h.animals.createLocal(OTHER, {
      speciesId: h.kind.id,
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
