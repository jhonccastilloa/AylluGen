jest.mock('@/infrastructure/auth/AuthSession', () => ({
  __esModule: true,
  default: { getUser: jest.fn() },
}));

import { Q } from '@nozbe/watermelondb';
import type { SyncPullArgs, SyncPushArgs } from '@nozbe/watermelondb/sync';
import { SyncOrchestrator } from './SyncOrchestrator';
import { SyncApi } from '../services/SyncApi';
import {
  SYNC_TABLES,
  parsePull,
  projectPush,
  type SyncChanges,
  type SyncTable,
} from '../services/watermelonProtocol';
import { testDatabase, seed, OWNER, OTHER } from '../services/syncTestDatabase';
import authSession from '@/infrastructure/auth/AuthSession';
import { useNetworkStore } from '@/store/useNetworkStore';
import { useSyncStore } from '@/store/useSyncStore';
import type { SpeciesModel } from '@/infrastructure/database/models/SpeciesModel';
import { generateUuid } from '@ayllugen/shared/ids/uuid';
import { AnimalsLocalRepository } from '@/features/animals/services/AnimalsLocalRepository';
import { createSpeciesModule } from '@/features/species/bootstrap';
import { BreedingsLocalRepository } from '@/features/breedings/services/BreedingsLocalRepository';
import { HealthLocalRepository } from '@/features/health/services/HealthLocalRepository';
import { ProductionLocalRepository } from '@/features/production/services/ProductionLocalRepository';

// Real Watermelon synchronize()/change tracking; only the HTTP boundary is substituted.
function fixture() {
  const db = testDatabase();
  let version = 1;
  const remote = new Map<
    string,
    {
      table: string;
      raw: Record<string, unknown>;
      version: number;
      created: number;
      deleted?: boolean;
    }
  >();
  const change = (
    id: string,
    data: object,
    table = 'species',
    deleted = false,
  ) => {
    version += 1;
    const prior = remote.get(id);
    remote.set(id, {
      table,
      raw: {
        id,
        created_at: 1000,
        updated_at: 1000,
        ...prior?.raw,
        ...data,
      },
      version,
      created: prior?.created ?? version,
      deleted,
    });
  };
  const pull = jest.fn(async (args: SyncPullArgs) => {
    const changes: SyncChanges = Object.fromEntries(
      SYNC_TABLES.map(t => [t, { created: [], updated: [], deleted: [] }]),
    );
    for (const [id, item] of remote) {
      if (item.version <= (args.lastPulledAt ?? 0)) continue;
      if (item.deleted) {
        if (args.lastPulledAt) changes[item.table].deleted.push(id);
      } else
        changes[item.table][
          item.created > (args.lastPulledAt ?? 0) ? 'created' : 'updated'
        ].push(item.raw);
    }
    return parsePull(
      { changes, timestamp: version },
      OWNER,
      args.lastPulledAt ?? null,
    );
  });
  const commit = async (args: SyncPushArgs) => {
    const changes = projectPush(args.changes);
    for (const table of SYNC_TABLES) {
      for (const raw of [...changes[table].created, ...changes[table].updated])
        change(raw.id, raw, table);
      changes[table].deleted.forEach(id => change(id, {}, table, true));
    }
  };
  const push = jest.fn(commit);
  const api = { pull, push } as unknown as SyncApi;
  const manager = new SyncOrchestrator(db, OWNER, api, Promise.resolve());
  return { db, manager, remote, change, pull, push, commit };
}
const species = (id = generateUuid()) => ({
  id,
  code: 'ALPACA',
  name: 'Alpaca',
  description: null,
});

it.each(SYNC_TABLES)(
  '%s preserves device dates through offline work, retries, conflicts and in-flight edits',
  async table => {
    const f = fixture();
    const createdAt = Date.parse('2026-09-01T10:00:00.123Z');
    const clock = jest.spyOn(Date, 'now').mockReturnValue(createdAt);
    useNetworkStore.getState().markOffline();
    const kinds = createSpeciesModule(f.db, OWNER);
    const animals = new AnimalsLocalRepository(f.db, OWNER);
    const breedings = new BreedingsLocalRepository(f.db, OWNER);
    const health = new HealthLocalRepository(f.db, OWNER);
    const production = new ProductionLocalRepository(f.db, OWNER);
    const kind = await kinds.create({ code: 'ALPACA', name: 'Alpaca' });
    const male = await animals.createLocal(OWNER, {
      crotal: 'MALE',
      sex: 'MALE',
      species: 'ALPACA',
      speciesId: kind.id,
    });
    const female = await animals.createLocal(OWNER, {
      crotal: 'FEMALE',
      sex: 'FEMALE',
      species: 'ALPACA',
      speciesId: kind.id,
    });
    const eventDate = '2026-08-31T09:00:00.000Z';
    const pair = await breedings.createLocal(OWNER, {
      maleId: male.id,
      femaleId: female.id,
      projectedCOI: 0,
      riskLevel: 'GREEN',
      breedingDate: eventDate,
    });
    const checkup = await health.createLocal(OWNER, {
      animalId: male.id,
      type: 'CHECKUP',
      date: eventDate,
    });
    const weight = await production.createLocal(OWNER, {
      animalId: male.id,
      type: 'WEIGHT',
      value: 50,
      unit: 'kg',
      date: eventDate,
    });
    const records = {
      species: kind,
      animals: male,
      breedings: pair,
      health_records: checkup,
      production_records: weight,
    };
    const id = records[table].id;
    const edit: Record<SyncTable, (text: string) => Promise<unknown>> = {
      species: text => kinds.update(id, { name: text }),
      animals: text => animals.updateLocal(id, { crotal: text }),
      breedings: text => breedings.updateLocal(id, { notes: text }),
      health_records: text => health.updateLocal(id, { notes: text }),
      production_records: text => production.updateLocal(id, { notes: text }),
    };
    for (const record of Object.values(records)) {
      expect(record.createdAt).toBe(new Date(createdAt).toISOString());
      expect(record).not.toHaveProperty('syncStatus');
      expect(record).not.toHaveProperty('syncVersion');
    }
    const editedAt = createdAt + 2 * 86400000;
    clock.mockReturnValue(editedAt);
    await edit[table]('Offline edit');
    await f.manager.syncNow(OWNER);
    expect(f.pull).not.toHaveBeenCalled();
    expect(f.push).not.toHaveBeenCalled();
    clock.mockReturnValue(createdAt + 7 * 86400000);
    useNetworkStore.getState().markOnline();
    f.push.mockImplementationOnce(async args => {
      await f.commit(args);
      throw new Error('lost response');
    });
    await expect(f.manager.syncNow(OWNER)).rejects.toThrow('lost response');
    await f.manager.syncNow(OWNER);
    const row = await f.db.get(table).find(id);
    expect(row._raw).toMatchObject({
      created_at: createdAt,
      updated_at: editedAt,
      _status: 'synced',
    });
    expect(f.remote.get(checkup.id)?.raw.date).toBe(Date.parse(eventDate));
    expect(f.remote.get(weight.id)?.raw.date).toBe(Date.parse(eventDate));
    expect(f.remote.get(pair.id)?.raw.breeding_date).toBe(
      Date.parse(eventDate),
    );

    const remotePatch = {
      species: { description: 'Remote' },
      animals: { is_founder: true },
      breedings: { projected_coi: 0.05 },
      health_records: { completed: false },
      production_records: { quality_score: 4 },
    };
    const conflictAt = createdAt + 8 * 86400000;
    clock.mockReturnValue(conflictAt);
    await edit[table]('Local conflict edit');
    f.push.mockImplementationOnce(async () => {
      f.change(
        id,
        { ...remotePatch[table], updated_at: conflictAt + 1000 },
        table,
      );
      throw { response: { status: 409 } };
    });
    await f.manager.syncNow(OWNER);
    expect(f.remote.get(id)?.raw).toMatchObject({
      ...remotePatch[table],
      created_at: createdAt,
      updated_at: conflictAt,
    });

    clock.mockReturnValue(conflictAt + 2000);
    await edit[table]('Before push');
    const duringAt = conflictAt + 3000;
    f.push.mockImplementationOnce(async args => {
      clock.mockReturnValue(duringAt);
      await edit[table]('During push');
      await f.commit(args);
    });
    await f.manager.syncNow(OWNER);
    expect(row._raw).toMatchObject({
      created_at: createdAt,
      updated_at: duringAt,
      _status: 'synced',
    });
    const column =
      table === 'species' ? 'name' : table === 'animals' ? 'crotal' : 'notes';
    expect(f.remote.get(id)?.raw).toMatchObject({
      [column]: 'During push',
      created_at: createdAt,
      updated_at: duringAt,
    });
    expect(await f.manager.hydrateSyncState()).toBe(0);
  },
);

beforeEach(() => {
  jest
    .mocked(authSession.getUser)
    .mockReturnValue({ id: OWNER } as ReturnType<typeof authSession.getUser>);
  useNetworkStore.getState().reset();
  useSyncStore.getState().reset();
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('debounces local writes and does not poll unchanged data', async () => {
  jest.useFakeTimers();
  const f = fixture();
  f.manager.start();
  await jest.advanceTimersByTimeAsync(1);
  expect(f.pull).toHaveBeenCalledTimes(1);
  await seed(f.db, 'species', { ...species(), _status: 'created' });
  await jest.advanceTimersByTimeAsync(400);
  await seed(f.db, 'species', {
    ...species(),
    code: 'SHEEP',
    _status: 'created',
  });
  await jest.advanceTimersByTimeAsync(400);
  expect(f.push).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(801);
  expect(f.push).toHaveBeenCalledTimes(1);
  const calls = f.pull.mock.calls.length;
  await jest.advanceTimersByTimeAsync(180000);
  expect(f.pull).toHaveBeenCalledTimes(calls);
  f.manager.stop();
});

it('uses a bounded backoff for transient failures and cancels it on stop', async () => {
  jest.useFakeTimers();
  const f = fixture();
  f.pull.mockRejectedValueOnce({ response: { status: 503 } });
  f.manager.start();
  await jest.advanceTimersByTimeAsync(1);
  expect(f.pull).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(4000);
  expect(f.pull).toHaveBeenCalledTimes(1);
  f.manager.stop();
  await jest.advanceTimersByTimeAsync(300000);
  expect(f.pull).toHaveBeenCalledTimes(1);
});

it('honors foreground freshness and counts pending changes offline', async () => {
  jest.useFakeTimers();
  const f = fixture();
  f.manager.start();
  await jest.advanceTimersByTimeAsync(1);
  f.manager.stop();
  f.manager.start();
  await jest.advanceTimersByTimeAsync(1);
  expect(f.pull).toHaveBeenCalledTimes(1);
  f.manager.stop();
  useNetworkStore.getState().markOffline();
  f.manager.start();
  await seed(f.db, 'species', { ...species(), _status: 'created' });
  await jest.advanceTimersByTimeAsync(1000);
  expect(useSyncStore.getState().pendingChanges).toBe(1);
  expect(f.push).not.toHaveBeenCalled();
  useNetworkStore.getState().markOnline();
  f.manager.requestFreshness();
  await jest.advanceTimersByTimeAsync(1);
  expect(f.push).toHaveBeenCalledTimes(1);
  f.manager.stop();
});

it('first pull, unchanged pull, created, updated and deleted records', async () => {
  const f = fixture();
  const r = species();
  f.change(r.id, r);
  await f.manager.syncNow(OWNER);
  expect(f.pull.mock.calls[0][0].lastPulledAt).toBeNull();
  expect(f.pull.mock.calls[0][0].schemaVersion).toBe(7);
  expect(f.pull.mock.calls[0][0].migration).toBeNull();
  expect(await f.db.get('species').query().fetchCount()).toBe(1);
  await f.manager.syncNow(OWNER);
  expect(f.pull.mock.calls[1][0].lastPulledAt).toBe(2);
  expect(f.push).not.toHaveBeenCalled();
  f.change(r.id, { name: 'Remote change' });
  await f.manager.syncNow(OWNER);
  expect((await f.db.get<SpeciesModel>('species').find(r.id)).name).toBe(
    'Remote change',
  );
  f.change(r.id, {}, 'species', true);
  await f.manager.syncNow(OWNER);
  expect(await f.db.get('species').query().fetchCount()).toBe(0);
});
it('pushes creates, edits and tombstones, then preserves device timestamps', async () => {
  const f = fixture();
  const r = species();
  await seed(f.db, 'species', { ...r, _status: 'created' });
  await f.manager.syncNow(OWNER);
  const row = await f.db.get<SpeciesModel>('species').find(r.id);
  expect(row.syncStatus).toBe('synced');
  expect(row.createdAt.getTime()).toBe(1000);
  expect(row.updatedAt.getTime()).toBe(1000);
  await f.db.write(() =>
    row.update(s => {
      s.name = 'Edited';
    }),
  );
  await f.manager.syncNow(OWNER);
  expect(f.remote.get(r.id)?.raw.name).toBe('Edited');
  await f.db.write(() => row.markAsDeleted());
  expect(await f.manager.hydrateSyncState()).toBe(1);
  await f.manager.syncNow(OWNER);
  expect(f.remote.get(r.id)?.deleted).toBe(true);
  expect(await f.db.adapter.getDeletedRecords('species')).toEqual([]);
});
it('does not resurrect a pending local delete during the first pull', async () => {
  const f = fixture();
  const r = species();
  f.change(r.id, r);
  await seed(f.db, 'species', { ...r, _status: 'deleted' });
  await f.manager.syncNow(OWNER);
  expect(await f.db.get('species').query().fetchCount()).toBe(0);
  expect(f.remote.get(r.id)?.deleted).toBe(true);
});

it('honors a remote tombstone even when the record has a pending local edit', async () => {
  const f = fixture();
  const r = species();
  f.change(r.id, r);
  await f.manager.syncNow(OWNER);
  const row = await f.db.get<SpeciesModel>('species').find(r.id);
  await f.db.write(() =>
    row.update(s => {
      s.name = 'Offline edit';
    }),
  );
  f.change(r.id, {}, 'species', true);
  await f.manager.syncNow(OWNER);
  expect(await f.db.get('species').query().fetchCount()).toBe(0);
  expect(f.push).not.toHaveBeenCalled();
});
it('preserves every pending record if an atomic batch is rejected', async () => {
  const f = fixture();
  await seed(f.db, 'species', { ...species(), _status: 'created' });
  await seed(f.db, 'species', {
    ...species(),
    code: 'SHEEP',
    _status: 'created',
  });
  f.push.mockRejectedValueOnce({ response: { status: 400 } });
  await expect(f.manager.syncNow(OWNER)).rejects.toBeDefined();
  expect(await f.manager.hydrateSyncState()).toBe(2);
  expect(f.remote.size).toBe(0);
});
it('repulls and reconciles per-column after a concurrent server conflict', async () => {
  const f = fixture();
  const r = species();
  f.change(r.id, r);
  await f.manager.syncNow(OWNER);
  const row = await f.db.get<SpeciesModel>('species').find(r.id);
  await f.db.write(() =>
    row.update(s => {
      s.name = 'Local';
    }),
  );
  f.push.mockImplementationOnce(async () => {
    f.change(r.id, { description: 'Remote' });
    throw { response: { status: 409 } };
  });
  await f.manager.syncNow(OWNER);
  expect(f.remote.get(r.id)?.raw).toMatchObject({
    name: 'Local',
    description: 'Remote',
  });
  expect(row.syncStatus).toBe('synced');
});
it('does not loop indefinitely on persistent conflicts', async () => {
  const f = fixture();
  await seed(f.db, 'species', { ...species(), _status: 'created' });
  f.push.mockRejectedValue({ response: { status: 409 } });
  await expect(f.manager.syncNow(OWNER)).rejects.toBeDefined();
  expect(f.push).toHaveBeenCalledTimes(2);
  expect(await f.manager.hydrateSyncState()).toBe(1);
});
it('retries after a lost push response without duplicating IDs', async () => {
  const f = fixture();
  const r = species();
  await seed(f.db, 'species', { ...r, _status: 'created' });
  f.push.mockImplementationOnce(async args => {
    await f.commit(args);
    throw new Error('timeout');
  });
  await expect(f.manager.syncNow(OWNER)).rejects.toThrow('timeout');
  expect(await f.manager.hydrateSyncState()).toBe(1);
  await f.manager.syncNow(OWNER);
  expect(f.remote.size).toBe(1);
  expect(await f.manager.hydrateSyncState()).toBe(0);
});
it('retains an edit made while a push is in flight and sends its new value', async () => {
  const f = fixture();
  const r = species();
  await seed(f.db, 'species', { ...r, _status: 'created' });
  const row = await f.db.get<SpeciesModel>('species').find(r.id);
  f.push.mockImplementationOnce(async args => {
    await f.db.write(() =>
      row.update(s => {
        s.name = 'Changed during push';
      }),
    );
    await f.commit(args);
  });
  await f.manager.syncNow(OWNER);
  expect(f.remote.get(r.id)?.raw.name).toBe('Changed during push');
});
it('coalesces simultaneous synchronize requests', async () => {
  const f = fixture();
  const first = f.manager.syncNow(OWNER);
  const second = f.manager.syncNow(OWNER);
  expect(first).toBe(second);
  await Promise.all([first, second]);
  expect(f.pull).toHaveBeenCalledTimes(1);
});
it('rejects another account and never applies a response after logout/switch', async () => {
  const f = fixture();
  f.change(generateUuid(), species());
  await expect(f.manager.syncNow(OTHER)).rejects.toThrow();
  const original = f.pull.getMockImplementation()!;
  f.pull.mockImplementationOnce(async args => {
    const result = await original(args);
    jest
      .mocked(authSession.getUser)
      .mockReturnValue({ id: OTHER } as ReturnType<typeof authSession.getUser>);
    return result;
  });
  await expect(f.manager.syncNow(OWNER)).rejects.toThrow(/cuenta/);
  expect(await f.db.get('species').query().fetchCount()).toBe(0);
  expect(f.push).not.toHaveBeenCalled();
});
it('works after a long offline period and does not contact the API while disconnected', async () => {
  const f = fixture();
  const r = species();
  f.change(r.id, r);
  await f.manager.syncNow(OWNER);
  useNetworkStore.getState().markOffline();
  await f.manager.syncNow(OWNER);
  expect(f.pull).toHaveBeenCalledTimes(1);
  f.change(r.id, {}, 'species', true);
  useNetworkStore.getState().markOnline();
  jest
    .spyOn(Date, 'now')
    .mockReturnValue(Date.now() + 180 * 24 * 60 * 60 * 1000);
  await f.manager.syncNow(OWNER);
  expect(f.pull.mock.calls[1][0].lastPulledAt).toBe(2);
  expect(
    await f.db.get('species').query(Q.where('id', r.id)).fetchCount(),
  ).toBe(0);
});

it('preserves animal device dates across seven days offline, retries and later edits', async () => {
  const f = fixture();
  const kind = species();
  f.change(kind.id, kind);
  await f.manager.syncNow(OWNER);
  const animals = new AnimalsLocalRepository(f.db, OWNER);
  const createdAt = Date.parse('2026-09-01T10:00:00Z');
  const editedAt = createdAt + 2 * 86400000;
  const clock = jest.spyOn(Date, 'now').mockReturnValue(createdAt);
  useNetworkStore.getState().markOffline();
  const animal = await animals.createLocal(OWNER, {
    crotal: 'OFFLINE',
    sex: 'MALE',
    species: 'ALPACA',
    speciesId: kind.id,
  });
  expect(animal.createdAt).toBe(new Date(createdAt).toISOString());
  expect(animal.updatedAt).toBe(animal.createdAt);
  const raw = (await f.db.get('animals').find(animal.id))._raw;
  expect(raw).toMatchObject({ created_at: createdAt, updated_at: createdAt });
  expect(raw).not.toHaveProperty('client_created_at');
  expect(raw).not.toHaveProperty('client_updated_at');
  clock.mockReturnValue(editedAt);
  await animals.updateLocal(animal.id, { crotal: 'EDITED OFFLINE' });
  await f.manager.syncNow(OWNER);
  expect(f.push).not.toHaveBeenCalled();
  clock.mockReturnValue(createdAt + 7 * 86400000);
  useNetworkStore.getState().markOnline();
  f.push.mockImplementationOnce(async args => {
    await f.commit(args);
    throw new Error('lost response');
  });
  await expect(f.manager.syncNow(OWNER)).rejects.toThrow('lost response');
  await f.manager.syncNow(OWNER);
  const afterSync = await animals.getById(animal.id);
  expect(afterSync).toMatchObject({
    createdAt: new Date(createdAt).toISOString(),
    updatedAt: new Date(editedAt).toISOString(),
  });
  expect(afterSync).not.toHaveProperty('syncStatus');
  expect(afterSync).not.toHaveProperty('syncVersion');
  clock.mockReturnValue(createdAt + 8 * 86400000);
  const edited = await animals.updateLocal(animal.id, { crotal: 'NEXT EDIT' });
  expect(edited?.createdAt).toBe(animal.createdAt);
  expect(edited?.updatedAt).toBe(new Date(Date.now()).toISOString());
  await f.manager.syncNow(OWNER);
  expect((await animals.getById(animal.id))?.updatedAt).toBe(edited?.updatedAt);
});

it('retains an animal edit and its device date made while a push is in flight', async () => {
  const f = fixture();
  const kind = species();
  f.change(kind.id, kind);
  await f.manager.syncNow(OWNER);
  const animals = new AnimalsLocalRepository(f.db, OWNER);
  const clock = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
  const animal = await animals.createLocal(OWNER, {
    crotal: 'FIRST',
    sex: 'MALE',
    species: 'ALPACA',
    speciesId: kind.id,
  });
  f.push.mockImplementationOnce(async args => {
    clock.mockReturnValue(1700000060000);
    await animals.updateLocal(animal.id, { crotal: 'DURING PUSH' });
    await f.commit(args);
  });
  await f.manager.syncNow(OWNER);
  expect(f.remote.get(animal.id)?.raw).toMatchObject({
    crotal: 'DURING PUSH',
    created_at: 1700000000000,
    updated_at: 1700000060000,
  });
  expect(await f.manager.hydrateSyncState()).toBe(0);
});

it('keeps a pending native edit date through a 409 reconciliation with remote animal changes', async () => {
  const f = fixture();
  const kind = species();
  f.change(kind.id, kind);
  await f.manager.syncNow(OWNER);
  const animals = new AnimalsLocalRepository(f.db, OWNER);
  const clock = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
  const animal = await animals.createLocal(OWNER, {
    crotal: 'FIRST',
    sex: 'MALE',
    species: 'ALPACA',
    speciesId: kind.id,
  });
  await f.manager.syncNow(OWNER);
  clock.mockReturnValue(1700000060000);
  await animals.updateLocal(animal.id, { crotal: 'LOCAL' });
  f.push.mockImplementationOnce(async () => {
    f.change(
      animal.id,
      { is_founder: true, updated_at: 1700000090000 },
      'animals',
    );
    throw { response: { status: 409 } };
  });
  await f.manager.syncNow(OWNER);
  expect(f.remote.get(animal.id)?.raw).toMatchObject({
    crotal: 'LOCAL',
    is_founder: true,
    created_at: 1700000000000,
    updated_at: 1700000060000,
  });
  expect(await f.manager.hydrateSyncState()).toBe(0);
});
