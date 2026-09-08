import { mapClientTimestamps } from './mapClientTimestamps';

const created = '2026-09-04T10:00:00.000Z';
const updated = '2026-09-04T11:00:00.000Z';
const received = '2026-09-05T12:00:00.000Z';

it('shows device dates for list and nested API records without mutating the response', () => {
  const remote = {
    createdAt: received,
    updatedAt: received,
    clientCreatedAt: created,
    clientUpdatedAt: updated,
  };
  const result = mapClientTimestamps({
    animals: [{ ...remote, father: remote }],
  });
  expect(result.animals[0].createdAt).toBe(created);
  expect(result.animals[0].updatedAt).toBe(updated);
  expect(result.animals[0].father.createdAt).toBe(created);
  expect(remote.createdAt).toBe(received);
  expect(mapClientTimestamps({ createdAt: received }).createdAt).toBe(received);
});
