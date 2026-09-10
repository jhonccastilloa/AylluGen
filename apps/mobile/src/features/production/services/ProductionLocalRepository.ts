import {
  inputRaw,
  validateLocalRecord,
} from '@/infrastructure/database/localRules';
import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import { DB_TABLES } from '@/infrastructure/database/constants';
import type { ProductionRecordModel } from '@/infrastructure/database/models/ProductionRecordModel';
import type {
  ProductionRecord,
  ProductionRecordCreateInput,
  ProductionRecordUpdateInput,
  ProductionType,
} from '@/features/production/interfaces/production.types';
import {
  isoToTimestamp,
  nowTimestamp,
  timestampToIso,
} from '@/features/shared/utils/date';
import { generateUuid } from '@/features/shared/utils/id';

const toIsoOrEmpty = (value?: number | null): string =>
  timestampToIso(value) ?? new Date(0).toISOString();

const toDomain = (model: ProductionRecordModel): ProductionRecord => ({
  id: model.id,
  animalId: model.animalId,
  type: model.type as ProductionType,
  date: toIsoOrEmpty(model.date),
  value: model.value,
  unit: model.unit,
  qualityScore: model.qualityScore ?? null,
  notes: model.notes ?? null,
  userId: model.userId,
  createdAt: model.createdAt.toISOString(),
  updatedAt: model.updatedAt.toISOString(),
});

export class ProductionLocalRepository {
  constructor(
    private readonly database: Database,
    private readonly ownerId: string,
  ) {}

  private get collection() {
    return this.database.get<ProductionRecordModel>(
      DB_TABLES.productionRecords,
    );
  }

  async listByUserId(userId: string): Promise<ProductionRecord[]> {
    if (userId !== this.ownerId) throw new Error('Cuenta local inválida.');
    const records = await this.collection
      .query(Q.where('user_id', userId))
      .fetch();
    return records
      .map(toDomain)
      .sort((left, right) => right.date.localeCompare(left.date));
  }

  async getById(id: string): Promise<ProductionRecord | null> {
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
    input: ProductionRecordCreateInput,
  ): Promise<ProductionRecord> {
    if (userId !== this.ownerId) throw new Error('Cuenta local inválida.');
    const id = generateUuid();
    const timestamp = nowTimestamp();

    await this.database.write(async () => {
      await validateLocalRecord(
        this.database,
        'production_records',
        inputRaw(id, input),
      );
      await this.collection.create(record => {
        (record._raw as { id: string }).id = id;
        record.animalId = input.animalId;
        record.type = input.type;
        record.date = isoToTimestamp(input.date) ?? timestamp;
        record.value = input.value;
        record.unit = input.unit;
        record.qualityScore = input.qualityScore ?? null;
        record.notes = input.notes ?? null;
        record.userId = userId;
      });
    });

    const localRecord = await this.getById(id);
    if (!localRecord) {
      throw new Error('No se pudo crear el registro de producción localmente');
    }
    return localRecord;
  }

  async updateLocal(
    id: string,
    input: ProductionRecordUpdateInput,
  ): Promise<ProductionRecord | null> {
    await this.database.write(async () => {
      const model = await this.collection.find(id);
      if (model.syncStatus === 'deleted')
        throw new Error('El registro fue eliminado.');
      await validateLocalRecord(
        this.database,
        'production_records',
        inputRaw(id, input, model._raw),
      );
      await model.update(record => {
        if (input.type !== undefined) record.type = input.type;
        if (input.date !== undefined) {
          record.date = isoToTimestamp(input.date) ?? record.date;
        }
        if (input.value !== undefined) record.value = input.value;
        if (input.unit !== undefined) record.unit = input.unit;
        if (input.qualityScore !== undefined) {
          record.qualityScore = input.qualityScore;
        }
        if (input.notes !== undefined) record.notes = input.notes;
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

  async listByAnimalId(animalId: string): Promise<ProductionRecord[]> {
    const records = await this.collection
      .query(Q.where('animal_id', animalId))
      .fetch();

    return records
      .map(toDomain)
      .sort((left, right) => right.date.localeCompare(left.date));
  }

  async listByAnimalAndType(
    animalId: string,
    type: ProductionType,
  ): Promise<ProductionRecord[]> {
    const records = await this.collection
      .query(Q.where('animal_id', animalId), Q.where('type', type))
      .fetch();

    return records
      .map(toDomain)
      .sort((left, right) => right.date.localeCompare(left.date));
  }
}
