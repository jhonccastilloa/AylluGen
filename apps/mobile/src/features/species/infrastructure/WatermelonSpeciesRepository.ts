import { Q, type Database } from '@nozbe/watermelondb';
import type { SpeciesData, SpeciesFields } from '@ayllugen/core/species/types';
import type { SpeciesRepository } from '@ayllugen/core/species/repository';
import type { SpeciesUsage } from '@ayllugen/core/species/usage';
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

/** Transaction/writer-scoped adapter; business decisions belong to the shared core. */
export class WatermelonSpeciesRepository
  implements SpeciesRepository, SpeciesUsage
{
  constructor(
    private readonly database: Database,
    private readonly ownerId: string,
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
    return toSpecies(
      await this.collection.create(row => {
        row._raw.id = id;
        row.userId = this.ownerId;
        this.assign(row, fields);
      }),
    );
  }
  async update(id: string, fields: SpeciesFields): Promise<SpeciesData> {
    const row = await this.find(id);
    if (!row) throw new Error('El registro desapareció durante la escritura.');
    await row.update(record => this.assign(record, fields));
    return toSpecies(row);
  }
  async delete(id: string): Promise<void> {
    const row = await this.find(id);
    if (row) await row.markAsDeleted();
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
