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
} from '../services/watermelonProtocol';
import { testDatabase, seed, OWNER, OTHER } from '../services/syncTestDatabase';
import authSession from '@/infrastructure/auth/AuthSession';
import { useNetworkStore } from '@/store/useNetworkStore';
import { useSyncStore } from '@/store/useSyncStore';
import type { SpeciesModel } from '@/infrastructure/database/models/SpeciesModel';
import { generateUuid } from '@/features/shared/utils/id';

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
        ...prior?.raw,
        ...data,
        updated_at: version * 1000,
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
  expect(f.pull.mock.calls[0][0].schemaVersion).toBe(4);
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
it('pushes creates, edits and tombstones, then receives canonical server timestamps', async () => {
  const f = fixture();
  const r = species();
  await seed(f.db, 'species', { ...r, _status: 'created' });
  await f.manager.syncNow(OWNER);
  const row = await f.db.get<SpeciesModel>('species').find(r.id);
  expect(row.syncStatus).toBe('synced');
  expect(row.updatedAt.getTime()).toBe(2000);
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
