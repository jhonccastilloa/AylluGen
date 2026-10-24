import type { Database } from '@nozbe/watermelondb';
import { CreateSpecies } from '@ayllugen/core/species/create';
import { UpdateSpecies } from '@ayllugen/core/species/update';
import { DeleteSpecies } from '@ayllugen/core/species/delete';
import { ListSpecies } from '@ayllugen/core/species/list';
import { GetSpecies } from '@ayllugen/core/species/get';
import type { SpeciesData } from '@ayllugen/core/species/types';
import { generateUuid } from '@/features/shared/utils/id';
import { WatermelonSpeciesRepository } from './infrastructure/WatermelonSpeciesRepository';
import type {
  Species,
  SpeciesCreateInput,
  SpeciesUpdateInput,
} from './interfaces/species.types';

const toView = (species: SpeciesData): Species => ({
  id: species.id,
  userId: species.userId,
  code: species.code,
  name: species.name,
  description: species.description,
  createdAt: species.clientCreatedAt.toISOString(),
  updatedAt: species.clientUpdatedAt.toISOString(),
});

/** Composition root per account; screen projection is not a business rule. */
export function createSpeciesModule(database: Database, ownerId: string) {
  const repository = new WatermelonSpeciesRepository(database, ownerId);
  const createSpecies = new CreateSpecies(repository, generateUuid);
  const updateSpecies = new UpdateSpecies(repository);
  const deleteSpecies = new DeleteSpecies(repository);
  const listSpecies = new ListSpecies(repository);
  const getSpecies = new GetSpecies(repository);
  return {
    list: async () => (await listSpecies.execute()).map(toView),
    getById: async (id: string) => toView(await getSpecies.execute(id)),
    create: async (input: SpeciesCreateInput) =>
      toView(await createSpecies.execute(input)),
    update: async (id: string, input: SpeciesUpdateInput) =>
      toView(await updateSpecies.execute(id, input)),
    delete: (id: string) => deleteSpecies.execute(id),
  };
}
