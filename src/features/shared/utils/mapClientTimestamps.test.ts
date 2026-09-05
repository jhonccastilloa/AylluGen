import { mapClientTimestamps } from './mapClientTimestamps';
import { consolidateSyncQueueEntries } from '@/features/sync/services/syncQueueCompactor';

const created = '2026-09-04T10:00:00.000Z';
const updated = '2026-09-04T11:00:00.000Z';
const received = '2026-09-05T12:00:00.000Z';

it('shows device dates for list and nested API records without mutating the response', () => {
  const remote = { createdAt: received, updatedAt: received, clientCreatedAt: created, clientUpdatedAt: updated };
  const result = mapClientTimestamps({ animals: [{ ...remote, father: remote }] });
  expect(result.animals[0].createdAt).toBe(created);
  expect(result.animals[0].updatedAt).toBe(updated);
  expect(result.animals[0].father.createdAt).toBe(created);
  expect(remote.createdAt).toBe(received);
  expect(mapClientTimestamps({ createdAt: received }).createdAt).toBe(received);
});

it('keeps original creation and latest edit when offline changes are compacted', () => {
  const changes = consolidateSyncQueueEntries([
    { id: 'a', tableName: 'animals', recordId: 'animal', action: 'CREATE', clientVersion: 1, createdAt: 1,
      payload: { clientCreatedAt: created, clientUpdatedAt: created } },
    { id: 'b', tableName: 'animals', recordId: 'animal', action: 'UPDATE', clientVersion: 2, createdAt: 2,
      payload: { clientUpdatedAt: updated } },
  ]);
  expect(changes[0].action).toBe('CREATE');
  expect(changes[0].payload).toEqual({ clientCreatedAt: created, clientUpdatedAt: updated });
});
