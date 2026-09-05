import { AnimalsUseCases } from './AnimalsUseCases';
import type { AnimalsApi } from '../services/AnimalsApi';
import type { AnimalsLocalRepository } from '../services/AnimalsLocalRepository';
import type { SyncOrchestrator } from '@/features/sync/hooks/SyncOrchestrator';

jest.mock('../services/AnimalsApi', () => ({ AnimalsApi: class {} }));
jest.mock('@/core/utils/apiErrorHandler', () => ({ extractApiErrorMessage: jest.fn() }));
jest.mock('../services/AnimalsLocalRepository', () => ({ AnimalsLocalRepository: class {} }));

it('queues local creation and edit dates without issuing direct API writes', async () => {
  const createdAt = '2026-09-04T10:00:00.000Z';
  const updatedAt = '2026-09-04T11:00:00.000Z';
  const api = { create: jest.fn(), update: jest.fn() };
  const local = {
    createLocal: jest.fn().mockResolvedValue({ id: 'animal', createdAt, updatedAt: createdAt, syncVersion: 1 }),
    updateLocal: jest.fn().mockResolvedValue({ id: 'animal', createdAt, updatedAt, syncVersion: 2 }),
  };
  const sync = { enqueueChange: jest.fn() };
  const useCases = new AnimalsUseCases(
    api as unknown as AnimalsApi,
    local as unknown as AnimalsLocalRepository,
    sync as unknown as SyncOrchestrator,
  );
  await useCases.registerAnimal('owner', { crotal: 'A-1', sex: 'FEMALE', species: 'SHEEP' });
  expect(sync.enqueueChange).toHaveBeenNthCalledWith(1, 'animals', 'CREATE', 'animal',
    expect.objectContaining({ clientCreatedAt: createdAt, clientUpdatedAt: createdAt }), 1);
  await useCases.updateAnimal('animal', { crotal: 'A-2' });
  expect(sync.enqueueChange).toHaveBeenNthCalledWith(2, 'animals', 'UPDATE', 'animal',
    { crotal: 'A-2', clientUpdatedAt: updatedAt }, 2);
  expect(api.create).not.toHaveBeenCalled();
  expect(api.update).not.toHaveBeenCalled();
});
