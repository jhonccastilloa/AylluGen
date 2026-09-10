import { AnimalsUseCases } from './AnimalsUseCases';
import type { AnimalsLocalRepository } from '../services/AnimalsLocalRepository';

it('reads and writes only the local repository, without a REST or queue dependency', async () => {
  const local = {
    createLocal: jest.fn().mockResolvedValue({ id: 'animal' }),
    updateLocal: jest.fn().mockResolvedValue({ id: 'animal' }),
    getById: jest.fn().mockResolvedValue(null),
    listByUserId: jest.fn().mockResolvedValue([]),
    softDeleteLocal: jest.fn().mockResolvedValue(1),
  };
  const useCases = new AnimalsUseCases(
    local as unknown as AnimalsLocalRepository,
  );
  await useCases.registerAnimal('owner', {
    crotal: 'A-1',
    sex: 'FEMALE',
    species: 'SHEEP',
    speciesId: 'species-id',
  });
  await useCases.updateAnimal('animal', { crotal: 'A-2' });
  expect(await useCases.getById('missing')).toBeNull();
  expect(await useCases.listInventory('owner')).toEqual([]);
  expect(await useCases.deleteAnimal('animal')).toBe(true);
  expect(local.createLocal).toHaveBeenCalledTimes(1);
  expect(local.updateLocal).toHaveBeenCalledWith('animal', { crotal: 'A-2' });
});
