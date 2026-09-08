import { SyncService } from '../../../../src/modules/sync/application/services/SyncService';
import { prisma } from '../../../../src/infrastructure/database/prisma/client';
import type { ISyncRepository } from '../../../../src/modules/sync/domain/repositories/ISyncRepository';
import type { SpeciesService } from '../../../../src/modules/species/application/services/SpeciesService';
import { SyncAction } from '../../../../src/modules/sync/domain/entities/Sync';

jest.mock('../../../../src/modules/species/application/services/SpeciesService', () => ({ SpeciesService: class {} }));

const created = '2026-09-04T10:00:00.000Z';
const updated = '2026-09-04T11:00:00.000Z';
const table = { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() };
const service = new SyncService(
  { saveLatestSync: jest.fn() } as unknown as ISyncRepository,
  {} as SpeciesService,
);
const push = (action: SyncAction, data: Record<string, unknown>) =>
  service.pushChanges({ userId: 'owner', deviceId: 'phone', changes: [
    { action, tableName: 'health_records', recordId: 'record', clientVersion: 1, data },
  ] });

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(prisma, { healthRecord: table });
  table.findUnique.mockResolvedValue(null);
  table.create.mockResolvedValue({});
  table.update.mockResolvedValue({});
});

it('preserves device dates and prevents a client from replacing server timestamps', async () => {
  const result = await push(SyncAction.CREATE, {
    clientCreatedAt: created, clientUpdatedAt: updated,
    createdAt: created, updatedAt: updated, notes: '2026',
  });
  expect(result.success).toBe(true);
  const data = table.create.mock.calls[0][0].data;
  expect(data.clientCreatedAt).toEqual(new Date(created));
  expect(data.clientUpdatedAt).toEqual(new Date(updated));
  expect(data).not.toHaveProperty('createdAt');
  expect(data).not.toHaveProperty('updatedAt');
  expect(data.notes).toBe('2026');
});

it('updates the action date without changing original creation', async () => {
  table.findUnique.mockResolvedValue({ userId: 'owner', syncVersion: 1 });
  await push(SyncAction.UPDATE, { clientCreatedAt: updated, clientUpdatedAt: updated, updatedAt: updated });
  const data = table.update.mock.calls[0][0].data;
  expect(data.clientUpdatedAt).toEqual(new Date(updated));
  expect(data).not.toHaveProperty('clientCreatedAt');
  expect(data).not.toHaveProperty('updatedAt');
});

it('rejects invalid device dates', async () => {
  const result = await push(SyncAction.CREATE, { clientCreatedAt: 'yesterday' });
  expect(result.success).toBe(false);
  expect(table.create).not.toHaveBeenCalled();
});

it('uses server updatedAt for incremental pulls even for old offline actions', async () => {
  table.findMany.mockResolvedValue([{ clientCreatedAt: new Date(created), clientUpdatedAt: new Date(updated) }]);
  const since = '2026-09-05T09:00:00.000Z';
  const result = await service.pullChanges({ userId: 'owner', deviceId: 'phone', lastSyncAt: since, tables: ['health_records'] });
  expect(table.findMany).toHaveBeenCalledWith({
    where: { userId: 'owner', updatedAt: { gte: new Date(since) } },
    orderBy: { updatedAt: 'asc' },
  });
  expect(result.healthRecords[0].clientCreatedAt).toEqual(new Date(created));
});
