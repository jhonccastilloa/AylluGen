import { Q } from '@nozbe/watermelondb';
import { database } from '@/infrastructure/database';
import { DB_TABLES } from '@/infrastructure/database/constants';
import type { ProductionRecordModel } from '@/infrastructure/database/models/ProductionRecordModel';
import type {
  ProductionRecord,
  ProductionRecordCreateInput,
  ProductionRecordUpdateInput,
  ProductionType,
} from '@/features/production/interfaces/production.types';
import type { SyncStatus } from '@/features/shared/interfaces/common.types';
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
  syncStatus: model.recordSyncStatus as SyncStatus,
  syncVersion: model.syncVersion,
  createdAt: toIsoOrEmpty(model.createdAt),
  updatedAt: toIsoOrEmpty(model.updatedAt),
});

export class ProductionLocalRepository {
  private collection = database.get<ProductionRecordModel>(DB_TABLES.productionRecords);

  async listByUserId(userId: string): Promise<ProductionRecord[]> {
    const records = await this.collection.query(Q.where('user_id', userId)).fetch();
    return records
      .map(toDomain)
      .filter(record => record.syncStatus !== 'DELETED')
      .sort((left, right) => right.date.localeCompare(left.date));
  }

  async getById(id: string): Promise<ProductionRecord | null> {
    try {
      const model = await this.collection.find(id);
      const record = toDomain(model);
      return record.syncStatus === 'DELETED' ? null : record;
    } catch {
      return null;
    }
  }

  async createLocal(
    userId: string,
    input: ProductionRecordCreateInput,
  ): Promise<ProductionRecord> {
    const id = generateUuid();
    const timestamp = nowTimestamp();

    await database.write(async () => {
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
        record.recordSyncStatus = 'PENDING';
        record.syncVersion = 1;
        record.createdAt = timestamp;
        record.updatedAt = timestamp;
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
    try {
      await database.write(async () => {
        const model = await this.collection.find(id);
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
          record.recordSyncStatus = 'PENDING';
          record.syncVersion += 1;
          record.updatedAt = nowTimestamp();
        });
      });
      return this.getById(id);
    } catch {
      return null;
    }
  }

  async deleteLocal(id: string): Promise<number | null> {
    let deletedVersion: number | null = null;

    try {
      await database.write(async () => {
        const model = await this.collection.find(id);
        await model.update(record => {
          record.recordSyncStatus = 'DELETED';
          record.syncVersion += 1;
          deletedVersion = record.syncVersion;
          record.updatedAt = nowTimestamp();
        });
      });
      return deletedVersion;
    } catch {
      return null;
    }
  }

  async listByAnimalId(animalId: string): Promise<ProductionRecord[]> {
    const records = await this.collection
      .query(Q.where('animal_id', animalId))
      .fetch();

    return records
      .map(toDomain)
      .filter(record => record.syncStatus !== 'DELETED')
      .sort((left, right) => right.date.localeCompare(left.date));
  }

  async listByAnimalAndType(
    animalId: string,
    type: ProductionType,
  ): Promise<ProductionRecord[]> {
    const records = await this.collection
      .query(
        Q.where('animal_id', animalId),
        Q.where('type', type),
      )
      .fetch();

    return records
      .map(toDomain)
      .filter(record => record.syncStatus !== 'DELETED')
      .sort((left, right) => right.date.localeCompare(left.date));
  }

  async upsertFromServer(records: ProductionRecord[]): Promise<void> {
    await database.write(async () => {
      for (const record of records) {
        try {
          const existing = await this.collection.find(record.id);
          await existing.update(item => {
            item.animalId = record.animalId;
            item.type = record.type;
            item.date = isoToTimestamp(record.date) ?? nowTimestamp();
            item.value = record.value;
            item.unit = record.unit;
            item.qualityScore = record.qualityScore;
            item.notes = record.notes;
            item.userId = record.userId;
            item.recordSyncStatus = record.syncStatus;
            item.syncVersion = record.syncVersion;
            item.createdAt = isoToTimestamp(record.createdAt) ?? nowTimestamp();
            item.updatedAt = isoToTimestamp(record.updatedAt) ?? nowTimestamp();
          });
        } catch {
          await this.collection.create(item => {
            (item._raw as { id: string }).id = record.id;
            item.animalId = record.animalId;
            item.type = record.type;
            item.date = isoToTimestamp(record.date) ?? nowTimestamp();
            item.value = record.value;
            item.unit = record.unit;
            item.qualityScore = record.qualityScore;
            item.notes = record.notes;
            item.userId = record.userId;
            item.recordSyncStatus = record.syncStatus;
            item.syncVersion = record.syncVersion;
            item.createdAt = isoToTimestamp(record.createdAt) ?? nowTimestamp();
            item.updatedAt = isoToTimestamp(record.updatedAt) ?? nowTimestamp();
          });
        }
      }
    });
  }
}

