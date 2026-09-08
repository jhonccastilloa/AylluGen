import { Q, type Database } from '@nozbe/watermelondb';
import type { SpeciesModel } from '@/infrastructure/database/models/SpeciesModel';
import type {
  Species,
  SpeciesCreateInput,
  SpeciesUpdateInput,
} from '../interfaces/species.types';
import { generateUuid } from '@/features/shared/utils/id';
import { wireSchemas } from '@/features/sync/services/watermelonProtocol';

const toDomain = (row: SpeciesModel): Species => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  userId: row.userId,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export class SpeciesLocalRepository {
  constructor(
    private readonly database: Database,
    private readonly userId: string,
  ) {}
  private get collection() {
    return this.database.get<SpeciesModel>('species');
  }

  async list(): Promise<Species[]> {
    return (await this.collection.query(Q.sortBy('name', Q.asc)).fetch()).map(
      toDomain,
    );
  }

  async create(input: SpeciesCreateInput): Promise<Species> {
    const data = wireSchemas.species.parse({
      ...input,
      id: generateUuid(),
      description: input.description ?? null,
    });
    return this.database.write(async () => {
      await this.assertUnique(data.code, data.name);
      const row = await this.collection.create(r => {
        r._raw.id = data.id;
        r.code = data.code;
        r.name = data.name;
        r.description = data.description;
        r.userId = this.userId;
      });
      return toDomain(row);
    });
  }

  async update(id: string, input: SpeciesUpdateInput): Promise<Species> {
    return this.database.write(async () => {
      const row = (await this.collection.query(Q.where('id', id)).fetch())[0];
      if (!row) throw new Error('La especie no existe en esta cuenta.');
      const data = wireSchemas.species.parse({
        ...toDomain(row),
        ...Object.fromEntries(
          Object.entries(input).filter(([, value]) => value !== undefined),
        ),
      });
      await this.assertUnique(data.code, data.name, id);
      await row.update(r => {
        r.code = data.code;
        r.name = data.name;
        r.description = data.description;
      });
      return toDomain(row);
    });
  }

  async delete(id: string): Promise<void> {
    await this.database.write(async () => {
      if (
        await this.database
          .get('animals')
          .query(Q.where('species_id', id))
          .fetchCount()
      )
        throw new Error('No se puede eliminar una especie con animales.');
      const row = (await this.collection.query(Q.where('id', id)).fetch())[0];
      if (row) await row.markAsDeleted();
    });
  }

  private async assertUnique(code: string, name: string, except = '') {
    const matches = await this.collection
      .query(Q.or(Q.where('code', code), Q.where('name', name)))
      .fetch();
    if (matches.some(r => r.id !== except))
      throw new Error('Ya existe una especie con ese código o nombre.');
  }
}
