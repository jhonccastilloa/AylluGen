import type { Database } from '@nozbe/watermelondb';
import { CreateSpecie } from '@ayllugen/core/species/create';
import { UpdateSpecie } from '@ayllugen/core/species/update';
import { DeleteSpecie } from '@ayllugen/core/species/delete';
import { ListSpecie } from '@ayllugen/core/species/list';
import { GetSpecie } from '@ayllugen/core/species/get';
import type { ISpeciesData } from '@ayllugen/core/species/types';
import { generateUuid } from '@/features/shared/utils/id';
import { WatermelonSpeciesRepository } from './infrastructure/WatermelonSpeciesRepository';
import type {
  ISpecies,
  SpeciesCreateInput,
  SpeciesUpdateInput,
} from './interfaces/species.types';

const toView = (species: ISpeciesData): ISpecies => ({
  id: species.id,
  userId: species.userId,
  name: species.name,
  description: species.description,
  createdAt: species.clientCreatedAt.toISOString(),
  updatedAt: species.clientUpdatedAt.toISOString(),
});

/** Composition root per account; screen projection is not a business rule. */
export function createSpeciesModule(database: Database, ownerId: string) {
  const repository = new WatermelonSpeciesRepository(database, ownerId);
  const createSpecie = new CreateSpecie(repository, generateUuid);
  const updateSpecie = new UpdateSpecie(repository);
  const deleteSpecie = new DeleteSpecie(repository);
  const listSpecie = new ListSpecie(repository);
  const getSpecie = new GetSpecie(repository);
  return {
    list: async () => (await listSpecie.execute()).map(toView),
    getById: async (id: string) => toView(await getSpecie.execute(id)),
    create: async (input: SpeciesCreateInput) =>
      toView(await createSpecie.execute(input)),
    update: async (id: string, input: SpeciesUpdateInput) =>
      toView(await updateSpecie.execute(id, input)),
    delete: (id: string) => deleteSpecie.execute(id),
  };
}
