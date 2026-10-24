import { Q, type Database } from '@nozbe/watermelondb';
import type { SpeciesData, SpeciesFields } from '@ayllugen/core/species/types';
import type { SpeciesRepository } from '@ayllugen/core/species/repository';
import { SpeciesError } from '@ayllugen/core/species/errors';
import { assertSpeciesUnused } from '@ayllugen/core/species/deletion-policy';
import type { SpeciesModel } from '@/infrastructure/database/models/SpeciesModel';

const toSpecies = (row: SpeciesModel): SpeciesData => ({
  id: row.id,
  userId: row.userId,
  code: row.code,
  name: row.name,
  description: row.description,
  clientCreatedAt: row.createdAt,
  clientUpdatedAt: row.updatedAt,
});

/** Scoped to one account; mutations recheck conditions inside a Watermelon writer. */
export class WatermelonSpeciesRepository implements SpeciesRepository {
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
  private assign(row: SpeciesModel, fields: SpeciesFields) {
    row.code = fields.code;
    row.name = fields.name;
    row.description = fields.description;
  }
  async list(): Promise<SpeciesData[]> {
    return (
      await this.collection.query(this.owned, Q.sortBy('name', Q.asc)).fetch()
    ).map(toSpecies);
  }
  async findById(id: string): Promise<SpeciesData | null> {
    const row = await this.find(id);
    return row ? toSpecies(row) : null;
  }
  async findByCode(code: string): Promise<SpeciesData | null> {
    const row = (
      await this.collection.query(this.owned, Q.where('code', code)).fetch()
    )[0];
    return row ? toSpecies(row) : null;
  }
  async findConflict(
    fields: SpeciesFields,
    exceptId?: string,
  ): Promise<'code' | 'name' | null> {
    const rows = await this.collection
      .query(
        this.owned,
        Q.or(Q.where('code', fields.code), Q.where('name', fields.name)),
      )
      .fetch();
    const matches = rows.filter(row => row.id !== exceptId);
    if (matches.some(row => row.code === fields.code)) return 'code';
    return matches.length ? 'name' : null;
  }
  async insert(id: string, fields: SpeciesFields): Promise<SpeciesData> {
    return this.database.write(async () => {
      const conflict = await this.findConflict(fields);
      if (conflict)
        throw new SpeciesError(
          'SPECIES_DUPLICATE',
          'Ya existe una especie con ese código o nombre.',
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
  async findOrInsertByCode(
    id: string,
    fields: SpeciesFields,
  ): Promise<SpeciesData> {
    return this.database.write(async () => {
      const existing = await this.findByCode(fields.code);
      if (existing) return existing;
      const conflict = await this.findConflict(fields);
      if (conflict)
        throw new SpeciesError(
          'SPECIES_DUPLICATE',
          'Ya existe una especie con ese código o nombre.',
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
    fields: SpeciesFields,
    previous: SpeciesFields,
  ): Promise<SpeciesData> {
    return this.database.write(async () => {
      const row = await this.find(id);
      if (!row)
        throw new SpeciesError('SPECIES_NOT_FOUND', 'Especie no encontrada.');
      if (
        row.code !== previous.code ||
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
          'Ya existe una especie con ese código o nombre.',
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
      assertSpeciesUnused(await this.hasAnimals(id));
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
