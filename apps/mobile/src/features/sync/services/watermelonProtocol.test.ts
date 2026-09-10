import {
  parsePull,
  projectPush,
  SYNC_TABLES,
  type SyncChanges,
} from './watermelonProtocol';

const id = '11111111-1111-4111-8111-111111111111';
const empty = (): SyncChanges =>
  Object.fromEntries(
    SYNC_TABLES.map(t => [t, { created: [], updated: [], deleted: [] }]),
  );
const species = {
  id,
  code: 'ALPACA',
  name: 'Alpaca',
  description: null,
  created_at: 3,
  updated_at: 4,
};

it('whitelists tables and columns without mutating Watermelon snapshots', () => {
  const changes = {
    ...empty(),
    species: {
      created: [
        {
          ...species,
          user_id: 'other',
          created_at: 3,
          updated_at: 4,
          _status: 'created',
          _changed: '',
          sync_status: 'PENDING',
        },
      ],
      updated: [],
      deleted: [],
    },
    app_meta: {
      created: [{ id: 'secret', value: 'private' }],
      updated: [],
      deleted: [],
    },
  };
  const before = JSON.stringify(changes);
  expect(projectPush(changes).species.created).toEqual([species]);
  expect(projectPush(changes).app_meta).toBeUndefined();
  expect(JSON.stringify(changes)).toBe(before);
});
it('supports empty sync', () => {
  expect(projectPush({})).toEqual(empty());
});
it('sends native animal dates only and restores exactly those dates on pull', () => {
  const changes = empty();
  const animal = {
    id,
    crotal: 'A',
    sex: 'MALE',
    species_id: id,
    birth_date: null,
    is_founder: true,
    father_id: null,
    mother_id: null,
    created_at: 1700000000123,
    updated_at: 1700000060456,
  };
  changes.animals.created.push({
    ...animal,
    client_created_at: 1,
    client_updated_at: 2,
    user_id: 'untrusted',
    _status: 'created',
    _changed: '',
  });
  const projected = projectPush(changes);
  expect(projected.animals.created).toEqual([animal]);
  const pulled = parsePull({ changes: projected, timestamp: 9 }, 'owner', null);
  expect(pulled.changes.animals.created[0]).toEqual({
    ...animal,
    user_id: 'owner',
    deleted_at: null,
  });
});
it('rejects non-UUID IDs', () => {
  const c = empty();
  c.species.created.push({ ...species, id: 'watermelon16chars' });
  expect(() => projectPush(c)).toThrow();
});
it('rejects repeated IDs across created/updated/deleted', () => {
  const c = empty();
  c.species.created.push(species);
  c.species.deleted.push(id);
  expect(() => projectPush(c)).toThrow(/IDs/);
});
it('never splits a batch over the operation limit', () => {
  const c = empty();
  c.species.created = Array.from({ length: 501 }, (_, n) => ({
    ...species,
    id: `11111111-1111-4111-8111-${n.toString().padStart(12, '0')}`,
  }));
  expect(() => projectPush(c)).toThrow(/500/);
});
it('injects ownership from the captured authenticated account on pull', () => {
  const c = empty();
  c.species.created.push({
    ...species,
    created_at: 1,
    updated_at: 2,
    user_id: 'untrusted',
  });
  expect(
    parsePull({ changes: c, timestamp: 7 }, 'owner', null).changes.species
      .created[0].user_id,
  ).toBe('owner');
});
it.each([NaN, -1, 0, Number.MAX_SAFE_INTEGER + 1])(
  'rejects invalid checkpoints %s',
  timestamp => {
    expect(() =>
      parsePull({ changes: empty(), timestamp }, 'owner', null),
    ).toThrow();
  },
);
it('rejects backwards checkpoints', () => {
  expect(() =>
    parsePull({ changes: empty(), timestamp: 3 }, 'owner', 4),
  ).toThrow();
});
it('rejects unknown or missing pull tables before applying anything', () => {
  expect(() =>
    parsePull(
      { changes: { ...empty(), users: {} }, timestamp: 1 },
      'owner',
      null,
    ),
  ).toThrow();
  expect(() =>
    parsePull({ changes: {}, timestamp: 1 }, 'owner', null),
  ).toThrow();
});
it('rejects wrong types, missing relations, and malformed dates', () => {
  const c = empty();
  c.animals.created.push({
    id,
    crotal: 'A',
    sex: 'MALE',
    species_id: null,
    birth_date: 'today',
    is_founder: 'true',
  });
  expect(() => projectPush(c)).toThrow();
});
it('retains server checkpoints as opaque numbers, not epoch dates', () => {
  expect(
    parsePull({ changes: empty(), timestamp: 2 }, 'owner', 1).timestamp,
  ).toBe(2);
});
