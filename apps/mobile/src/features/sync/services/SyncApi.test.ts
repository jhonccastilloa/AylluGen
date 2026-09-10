jest.mock('@/infrastructure/api/ApiService', () => ({
  ApiService: { post: jest.fn() },
}));
import { ApiService } from '@/infrastructure/api/ApiService';
import { SyncApi } from './SyncApi';
import { SYNC_TABLES } from './watermelonProtocol';
import type { SyncPullArgs, SyncPushArgs } from '@nozbe/watermelondb/sync';

const owner = '11111111-1111-4111-8111-111111111111';
beforeEach(() => jest.clearAllMocks());
it('uses authenticated v2 pull, schema 7 and an independent first checkpoint', async () => {
  const changes = Object.fromEntries(
    SYNC_TABLES.map(t => [t, { created: [], updated: [], deleted: [] }]),
  );
  jest.mocked(ApiService.post).mockResolvedValue({ changes, timestamp: 1 });
  await expect(
    new SyncApi(owner).pull({
      schemaVersion: 7,
      migration: null,
    } as unknown as SyncPullArgs),
  ).resolves.toMatchObject({ timestamp: 1 });
  expect(ApiService.post).toHaveBeenCalledWith(
    '/sync/v2/pull',
    { lastPulledAt: null, schemaVersion: 7, migration: null },
    expect.objectContaining({ headers: { 'x-local-account': owner } }),
  );
});
it('sends a complete whitelisted push and accepts a 204 empty response', async () => {
  jest.mocked(ApiService.post).mockResolvedValue(undefined);
  await new SyncApi(owner).push({
    lastPulledAt: 7,
    changes: {
      species: {
        created: [
          {
            id: owner,
            code: 'ALPACA',
            name: 'Alpaca',
            description: null,
            user_id: 'forged',
            created_at: 123,
            updated_at: 999,
          },
        ],
        updated: [],
        deleted: [],
      },
    },
  } as unknown as SyncPushArgs);
  expect(ApiService.post).toHaveBeenCalledWith(
    '/sync/v2/push',
    expect.objectContaining({
      lastPulledAt: 7,
      changes: expect.objectContaining({
        species: {
          created: [
            {
              id: owner,
              code: 'ALPACA',
              name: 'Alpaca',
              description: null,
              created_at: 123,
              updated_at: 999,
            },
          ],
          updated: [],
          deleted: [],
        },
      }),
    }),
    expect.objectContaining({ headers: { 'x-local-account': owner } }),
  );
});
it('propagates HTTP and malformed response errors instead of acknowledging changes', async () => {
  const api = new SyncApi(owner);
  jest
    .mocked(ApiService.post)
    .mockRejectedValueOnce({ response: { status: 409 } });
  await expect(
    api.push({ lastPulledAt: 1, changes: {} }),
  ).rejects.toMatchObject({ response: { status: 409 } });
  jest.mocked(ApiService.post).mockResolvedValue({ changes: {}, timestamp: 1 });
  await expect(
    api.pull({ schemaVersion: 7 } as SyncPullArgs),
  ).rejects.toThrow();
});
