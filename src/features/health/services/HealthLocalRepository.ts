import { Q } from '@nozbe/watermelondb';
import { database } from '@/infrastructure/database';
import { DB_TABLES } from '@/infrastructure/database/constants';
import type { HealthRecordModel } from '@/infrastructure/database/models/HealthRecordModel';
import type {
  HealthRecord,
  HealthRecordCreateInput,
  HealthRecordUpdateInput,
  HealthType,
} from '@/features/health/interfaces/health.types';
import type { SyncStatus } from '@/features/shared/interfaces/common.types';
import {
  isoToTimestamp,
  nowTimestamp,
  timestampToIso,
} from '@/features/shared/utils/date';
import { generateUuid } from '@/features/shared/utils/id';

const toIsoOrEmpty = (value?: number | null): string =>
  timestampToIso(value) ?? new Date(0).toISOString();

const toDomain = (model: HealthRecordModel): HealthRecord => ({
  id: model.id,
  animalId: model.animalId,
  type: model.type as HealthType,
  date: toIsoOrEmpty(model.date),
  notes: model.notes ?? null,
  nextDueDate: timestampToIso(model.nextDueDate),
  completed: model.completed,
  userId: model.userId,
  syncStatus: model.recordSyncStatus as SyncStatus,
  syncVersion: model.syncVersion,
  createdAt: toIsoOrEmpty(model.createdAt),
  updatedAt: toIsoOrEmpty(model.updatedAt),
});

export class HealthLocalRepository {
  private collection = database.get<HealthRecordModel>(DB_TABLES.healthRecords);

  async listByUserId(userId: string): Promise<HealthRecord[]> {
    const records = await this.collection.query(Q.where('user_id', userId)).fetch();
    return records
      .map(toDomain)
      .filter(record => record.syncStatus !== 'DELETED')
      .sort((left, right) => right.date.localeCompare(left.date));
  }

  async createLocal(userId: string, input: HealthRecordCreateInput): Promise<HealthRecord> {
    const id = generateUuid();
    const timestamp = nowTimestamp();

    await database.write(async () => {
      await this.collection.create(record => {
        (record._raw as { id: string }).id = id;
        record.animalId = input.animalId;
        record.type = input.type;
        record.date = isoToTimestamp(input.date) ?? timestamp;
        record.notes = input.notes ?? null;
        record.nextDueDate = isoToTimestamp(input.nextDueDate);
        record.completed = input.completed ?? true;
        record.userId = userId;
        record.recordSyncStatus = 'PENDING';
        record.syncVersion = 1;
        record.createdAt = timestamp;
        record.updatedAt = timestamp;
      });
    });

    const localRecord = await this.getById(id);
    if (!localRecord) {
      throw new Error('No se pudo crear el registro de salud localmente');
    }

    return localRecord;
  }

  async getById(id: string): Promise<HealthRecord | null> {
    try {
      const model = await this.collection.find(id);
      const record = toDomain(model);
      return record.syncStatus === 'DELETED' ? null : record;
    } catch {
      return null;
    }
  }

  async updateLocal(
    id: string,
    input: HealthRecordUpdateInput,
  ): Promise<HealthRecord | null> {
    try {
      await database.write(async () => {
        const model = await this.collection.find(id);
        await model.update(record => {
          if (input.type !== undefined) record.type = input.type;
          if (input.date !== undefined) {
            record.date = isoToTimestamp(input.date) ?? record.date;
          }
          if (input.notes !== undefined) record.notes = input.notes;
          if (input.nextDueDate !== undefined) {
            record.nextDueDate = isoToTimestamp(input.nextDueDate);
          }
          if (input.completed !== undefined) record.completed = input.completed;
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

  async listUpcomingByUserId(
    userId: string,
    daysAhead = 30,
  ): Promise<HealthRecord[]> {
    const records = await this.listByUserId(userId);
    const now = Date.now();
    const maxDate = now + daysAhead * 24 * 60 * 60 * 1000;

    return records
      .filter(record => {
        if (record.syncStatus === 'DELETED' || record.completed) return false;
        if (!record.nextDueDate) return false;

        const dueTimestamp = Date.parse(record.nextDueDate);
        if (Number.isNaN(dueTimestamp)) return false;

        return dueTimestamp >= now && dueTimestamp <= maxDate;
      })
      .sort((left, right) => {
        const leftDueTimestamp = Date.parse(left.nextDueDate ?? '');
        const rightDueTimestamp = Date.parse(right.nextDueDate ?? '');
        return leftDueTimestamp - rightDueTimestamp;
      });
  }

  async upsertFromServer(records: HealthRecord[]): Promise<void> {
    await database.write(async () => {
      for (const record of records) {
        try {
          const existing = await this.collection.find(record.id);
          await existing.update(item => {
            item.animalId = record.animalId;
            item.type = record.type;
            item.date = isoToTimestamp(record.date) ?? nowTimestamp();
            item.notes = record.notes;
            item.nextDueDate = isoToTimestamp(record.nextDueDate);
            item.completed = record.completed;
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
            item.notes = record.notes;
            item.nextDueDate = isoToTimestamp(record.nextDueDate);
            item.completed = record.completed;
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

