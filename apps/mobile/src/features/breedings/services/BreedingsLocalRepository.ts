import {
  inputRaw,
  validateLocalRecord,
} from '@/infrastructure/database/localRules';
import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import { DB_TABLES } from '@/infrastructure/database/constants';
import type { BreedingModel } from '@/infrastructure/database/models/BreedingModel';
import type {
  Breeding,
  BreedingCreateInput,
  BreedingUpdateInput,
  RiskLevel,
} from '@/features/breedings/interfaces/breedings.types';
import {
  isoToTimestamp,
  nowTimestamp,
  timestampToIso,
} from '@/features/shared/utils/date';
import { generateUuid } from '@ayllugen/shared/ids/uuid';

const toDomain = (model: BreedingModel): Breeding => ({
  id: model.id,
  maleId: model.maleId,
  femaleId: model.femaleId,
  projectedCOI: model.projectedCoi,
  riskLevel: model.riskLevel as RiskLevel,
  offspringId: model.offspringId ?? null,
  breedingDate: timestampToIso(model.breedingDate),
  notes: model.notes ?? null,
  userId: model.userId,
  createdAt: model.createdAt.toISOString(),
  updatedAt: model.updatedAt.toISOString(),
});

export class BreedingsLocalRepository {
  constructor(
    private readonly database: Database,
    private readonly ownerId: string,
  ) {}

  private get collection() {
    return this.database.get<BreedingModel>(DB_TABLES.breedings);
  }

  async getAnimalSyncStatus(id: string) {
    const row = (
      await this.database.get('animals').query(Q.where('id', id)).fetch()
    )[0];
    return row?.syncStatus;
  }

  async hasPendingGenealogy(): Promise<boolean> {
    const counts = await Promise.all(
      ['animals', 'species'].map(async table => {
        const [dirty, deleted] = await Promise.all([
          this.database
            .get(table)
            .query(Q.where('_status', Q.oneOf(['created', 'updated'])))
            .fetchCount(),
          this.database.adapter.getDeletedRecords(table),
        ]);
        return dirty + deleted.length;
      }),
    );
    return counts.some(count => count > 0);
  }

  async listByUserId(userId: string): Promise<Breeding[]> {
    if (userId !== this.ownerId) throw new Error('Cuenta local inválida.');
    const records = await this.collection
      .query(Q.where('user_id', userId))
      .fetch();
    return records
      .map(toDomain)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getById(id: string): Promise<Breeding | null> {
    try {
      const model = await this.collection.find(id);
      if (model.syncStatus === 'deleted') return null;
      const record = toDomain(model);
      return record;
    } catch {
      return null;
    }
  }

  async createLocal(
    userId: string,
    input: BreedingCreateInput,
  ): Promise<Breeding> {
    if (userId !== this.ownerId) throw new Error('Cuenta local inválida.');
    const id = generateUuid();
    const timestamp = nowTimestamp();

    await this.database.write(async () => {
      await validateLocalRecord(
        this.database,
        'breedings',
        inputRaw(id, input),
      );
      await this.collection.create(record => {
        (record._raw as { id: string }).id = id;
        record.maleId = input.maleId;
        record.femaleId = input.femaleId;
        record.projectedCoi = input.projectedCOI;
        record.riskLevel = input.riskLevel;
        record.offspringId = null;
        record.breedingDate = isoToTimestamp(input.breedingDate) ?? timestamp;
        record.notes = input.notes ?? null;
        record.userId = userId;
      });
    });

    const localBreeding = await this.getById(id);
    if (!localBreeding) throw new Error('No se pudo crear el cruce localmente');
    return localBreeding;
  }

  async updateLocal(
    id: string,
    input: BreedingUpdateInput,
  ): Promise<Breeding | null> {
    await this.database.write(async () => {
      const model = await this.collection.find(id);
      if (model.syncStatus === 'deleted')
        throw new Error('El registro fue eliminado.');
      await validateLocalRecord(
        this.database,
        'breedings',
        inputRaw(id, input, model._raw),
      );
      await model.update(record => {
        if (input.breedingDate !== undefined) {
          record.breedingDate = isoToTimestamp(input.breedingDate);
        }
        if (input.notes !== undefined) record.notes = input.notes;
        if (input.offspringId !== undefined)
          record.offspringId = input.offspringId;
      });
    });

    return this.getById(id);
  }

  async deleteLocal(id: string): Promise<number | null> {
    return this.database.write(async () => {
      const records = await this.collection.query(Q.where('id', id)).fetch();
      if (!records.length) return null;
      await records[0].markAsDeleted();
      return 1;
    });
  }

  async listByAnimalId(userId: string, animalId: string): Promise<Breeding[]> {
    const records = await this.collection
      .query(Q.where('user_id', userId))
      .fetch();

    return records
      .map(toDomain)
      .filter(
        record => record.maleId === animalId || record.femaleId === animalId,
      )
      .sort((left, right) =>
        (right.breedingDate ?? right.updatedAt).localeCompare(
          left.breedingDate ?? left.updatedAt,
        ),
      );
  }
}
