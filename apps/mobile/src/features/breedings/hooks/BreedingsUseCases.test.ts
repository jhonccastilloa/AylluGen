import { BreedingsUseCases } from './BreedingsUseCases';
import type { BreedingsApi } from '../services/BreedingsApi';
import type { BreedingsLocalRepository } from '../services/BreedingsLocalRepository';

jest.mock('../services/BreedingsApi', () => ({ BreedingsApi: class {} }));
jest.mock('../services/BreedingsLocalRepository', () => ({
  BreedingsLocalRepository: class {},
}));

it('keeps COI as a REST action but requires the local genealogy to be synchronized first', async () => {
  const api = {
    calculateCoi: jest.fn().mockResolvedValue({ coi: 0, riskLevel: 'GREEN' }),
  };
  const local = {
    getAnimalSyncStatus: jest.fn().mockResolvedValue('synced'),
    hasPendingGenealogy: jest.fn().mockResolvedValue(true),
  };
  const useCases = new BreedingsUseCases(
    api as unknown as BreedingsApi,
    local as unknown as BreedingsLocalRepository,
  );
  await expect(
    useCases.calculateMatch({ maleId: 'male', femaleId: 'female' }),
  ).rejects.toThrow(/Sincroniza/);
  expect(api.calculateCoi).not.toHaveBeenCalled();
  local.hasPendingGenealogy.mockResolvedValue(false);
  await expect(
    useCases.calculateMatch({ maleId: 'male', femaleId: 'female' }),
  ).resolves.toMatchObject({ coi: 0 });
  expect(api.calculateCoi).toHaveBeenCalledTimes(1);
});
