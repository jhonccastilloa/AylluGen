import { Q, type Database } from '@nozbe/watermelondb';
import type { ISpeciesData } from '@ayllugen/core/species/types';
import type { ISpeciesFields } from '@ayllugen/core/species/entity';
import type { ISpeciesRepository } from '@ayllugen/core/species/repository';
import { SpeciesError } from '@ayllugen/core/species/errors';
import { assertSpecieUnused } from '@ayllugen/core/species/deletion-policy';
import type { SpeciesModel } from '@/infrastructure/database/models/SpeciesModel';

const toSpecies = (row: SpeciesModel): ISpeciesData => ({
  id: row.id,
  userId: row.userId,
  name: row.name,
  description: row.description,
  clientCreatedAt: row.createdAt,
  clientUpdatedAt: row.updatedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/** Scoped to one account; mutations recheck conditions inside a Watermelon writer. */
export class WatermelonSpeciesRepository implements ISpeciesRepository {
  constructor(
    private readonly database: Database,
    public readonly ownerId: string,
  ) {}
  private get collection() {
    return this.database.get<SpeciesModel>('species');
  }
  private get owned() {
    return Q.where('user_id', this.ownerId);
  }

  private async find(id: string) {
    return (
      await this.collection.query(this.owned, Q.where('id', id)).fetch()
    )[0];
  }
  private assign(row: SpeciesModel, fields: ISpeciesFields) {
    row.name = fields.name;
    row.description = fields.description;
  }
  async list(): Promise<ISpeciesData[]> {
    return (
      await this.collection.query(this.owned, Q.sortBy('name', Q.asc)).fetch()
    ).map(toSpecies);
  }
  async findById(id: string): Promise<ISpeciesData | null> {
    const row = await this.find(id);
    return row ? toSpecies(row) : null;
  }
  async findByName(name: string): Promise<ISpeciesData | null> {
    const row = (
      await this.collection.query(this.owned).fetch()
    ).find(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    return row ? toSpecies(row) : null;
  }
  async findConflict(
    fields: ISpeciesFields,
    exceptId?: string,
  ): Promise<'name' | null> {
    const rows = await this.collection
      .query(this.owned)
      .fetch();
    const matches = rows.filter(row => row.id !== exceptId && row.name.toLocaleLowerCase() === fields.name.toLocaleLowerCase());
    return matches.length ? 'name' : null;
  }
  async insert(id: string, fields: ISpeciesFields): Promise<ISpeciesData> {
    return this.database.write(async () => {
      const conflict = await this.findConflict(fields);
      if (conflict)
        throw new SpeciesError(
          'SPECIES_DUPLICATE',
          'Ya existe una especie con ese nombre.',
          conflict,
        );
      return toSpecies(
        await this.collection.create(row => {
          row._raw.id = id;
          row.userId = this.ownerId;
          this.assign(row, fields);
        }),
      );
    });
  }
  async findOrInsertByName(
    id: string,
    fields: ISpeciesFields,
  ): Promise<ISpeciesData> {
    return this.database.write(async () => {
      const existing = await this.findByName(fields.name);
      if (existing) return existing;
      const conflict = await this.findConflict(fields);
      if (conflict)
        throw new SpeciesError(
          'SPECIES_DUPLICATE',
          'Ya existe una especie con ese nombre.',
          conflict,
        );
      return toSpecies(
        await this.collection.create(row => {
          row._raw.id = id;
          row.userId = this.ownerId;
          this.assign(row, fields);
        }),
      );
    });
  }
  async update(
    id: string,
    fields: ISpeciesFields,
    previous: ISpeciesFields,
  ): Promise<ISpeciesData> {
    return this.database.write(async () => {
      const row = await this.find(id);
      if (!row)
        throw new SpeciesError('SPECIES_NOT_FOUND', 'Especie no encontrada.');
      if (
        row.name !== previous.name ||
        row.description !== previous.description
      )
        throw new SpeciesError(
          'SPECIES_CONFLICT',
          'La especie cambió durante la edición. Reintenta la operación.',
        );
      const conflict = await this.findConflict(fields, id);
      if (conflict)
        throw new SpeciesError(
          'SPECIES_DUPLICATE',
          'Ya existe una especie con ese nombre.',
          conflict,
        );
      await row.update(record => this.assign(record, fields));
      return toSpecies(row);
    });
  }
  async delete(id: string): Promise<void> {
    await this.database.write(async () => {
      const row = await this.find(id);
      if (!row)
        throw new SpeciesError('SPECIES_NOT_FOUND', 'Especie no encontrada.');
      assertSpecieUnused(await this.hasAnimals(id));
      await row.markAsDeleted();
    });
  }
  async hasAnimals(id: string): Promise<boolean> {
    return (
      (await this.database
        .get('animals')
        .query(this.owned, Q.where('species_id', id))
        .fetchCount()) > 0
    );
  }
}
