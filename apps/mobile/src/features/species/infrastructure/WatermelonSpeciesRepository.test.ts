import { CreateSpecies } from '@ayllugen/core/species/create';
import { createSpeciesModule } from '../bootstrap';
import { WatermelonSpeciesUnitOfWork } from './WatermelonSpeciesUnitOfWork';
import {
  testDatabase,
  OWNER,
  OTHER,
  seed,
} from '@/features/sync/services/syncTestDatabase';
import { generateUuid } from '@/features/shared/utils/id';
import type { SpeciesModel } from '@/infrastructure/database/models/SpeciesModel';

const valid = { code: ' alpaca ', name: ' Alpaca ', description: ' Andina ' };

it('normalizes offline CRUD, preserves native creation date and clears description', async () => {
  const db = testDatabase();
  const catalog = createSpeciesModule(db, OWNER);
  expect(await catalog.list()).toEqual([]);
  const created = await catalog.create(valid);
  const model = await db.get<SpeciesModel>('species').find(created.id);
  expect(created.code).toBe('ALPACA');
  expect(created.createdAt).toBe(model.createdAt.toISOString());
  const updated = await catalog.update(created.id, { description: '' });
  expect(updated.description).toBeNull();
  expect(updated.createdAt).toBe(created.createdAt);
  expect(updated.updatedAt).toBe(model.updatedAt.toISOString());
  expect(model.syncStatus).toBe('created');
  expect(model._raw).not.toHaveProperty('client_created_at');
});

it('serializes duplicate checks and does not mutate after invalid edits', async () => {
  const db = testDatabase();
  const catalog = createSpeciesModule(db, OWNER);
  const results = await Promise.allSettled([
    catalog.create(valid),
    catalog.create(valid),
  ]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  const [first] = await catalog.list();
  await expect(catalog.update(first.id, { name: ' ' })).rejects.toMatchObject({
    code: 'SPECIES_INVALID',
  });
  await expect(
    catalog.create({ code: 'LLAMA', name: 'Alpaca' }),
  ).rejects.toMatchObject({ code: 'SPECIES_DUPLICATE' });
  expect((await catalog.getById(first.id)).name).toBe('Alpaca');
});

it('protects linked species and uses native deletion for an unused synced species', async () => {
  const db = testDatabase();
  const catalog = createSpeciesModule(db, OWNER);
  const id = generateUuid();
  await seed(db, 'species', {
    id,
    code: 'ALPACA',
    name: 'Alpaca',
    description: null,
  });
  await seed(db, 'animals', {
    id: generateUuid(),
    species_id: id,
    crotal: 'A1',
    sex: 'MALE',
  });
  await expect(catalog.delete(id)).rejects.toMatchObject({
    code: 'SPECIES_IN_USE',
  });
  const unused = generateUuid();
  await seed(db, 'species', {
    id: unused,
    code: 'LLAMA',
    name: 'Llama',
    description: null,
  });
  const model = await db.get<SpeciesModel>('species').find(unused);
  await catalog.delete(unused);
  expect(model.syncStatus).toBe('deleted');
  expect(await catalog.list()).toHaveLength(1);
});

it('isolates accounts and rejects a unit used with another owner', async () => {
  const db = testDatabase();
  const catalog = createSpeciesModule(db, OWNER);
  const otherId = generateUuid();
  await seed(db, 'species', {
    id: otherId,
    user_id: OTHER,
    code: 'ALPACA',
    name: 'Alpaca',
    description: null,
  });
  expect(await catalog.list()).toEqual([]);
  await expect(
    catalog.update(otherId, { name: 'Other' }),
  ).rejects.toMatchObject({ code: 'SPECIES_NOT_FOUND' });
  await catalog.create(valid);
  const wrongAccount = new CreateSpecies(
    new WatermelonSpeciesUnitOfWork(db, OWNER),
    OTHER,
    generateUuid,
  );
  await expect(wrongAccount.execute(valid)).rejects.toThrow(
    'Cuenta local inválida',
  );
});

it('reading pulled data preserves device dates and does not enqueue an update', async () => {
  const db = testDatabase();
  const id = generateUuid();
  await seed(db, 'species', {
    id,
    code: 'LLAMA',
    name: 'Llama',
    description: '',
    created_at: 1000,
    updated_at: 2000,
  });
  const view = await createSpeciesModule(db, OWNER).getById(id);
  expect(view.createdAt).toBe(new Date(1000).toISOString());
  expect(view.updatedAt).toBe(new Date(2000).toISOString());
  expect(view.description).toBe('');
  expect((await db.get('species').find(id)).syncStatus).toBe('synced');
});
