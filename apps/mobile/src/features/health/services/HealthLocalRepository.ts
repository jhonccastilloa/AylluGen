import {
  inputRaw,
  validateLocalRecord,
} from '@/infrastructure/database/localRules';
import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
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

const toTimestampIsoOrEmpty = (value?: Date | null): string =>
  value?.toISOString() ?? new Date(0).toISOString();

const toDomain = (model: HealthRecordModel): HealthRecord => ({
  id: model.id,
  animalId: model.animalId,
  type: model.type as HealthType,
  date: toIsoOrEmpty(model.date),
  notes: model.notes ?? null,
  nextDueDate: timestampToIso(model.nextDueDate),
  completed: model.completed,
  userId: model.userId,
  syncStatus: (model.syncStatus === 'synced'
    ? 'SYNCED'
    : 'PENDING') as SyncStatus,
  syncVersion: model.syncVersion,
  createdAt: toTimestampIsoOrEmpty(model.createdAt),
  updatedAt: toTimestampIsoOrEmpty(model.updatedAt),
});

export class HealthLocalRepository {
  constructor(
    private readonly database: Database,
    private readonly ownerId: string,
  ) {}

  private get collection() {
    return this.database.get<HealthRecordModel>(DB_TABLES.healthRecords);
  }

  async listByUserId(userId: string): Promise<HealthRecord[]> {
    if (userId !== this.ownerId) throw new Error('Cuenta local inválida.');
    const records = await this.collection
      .query(Q.where('user_id', userId))
      .fetch();
    return records
      .map(toDomain)
      .filter(record => record.syncStatus !== 'DELETED')
      .sort((left, right) => right.date.localeCompare(left.date));
  }

  async createLocal(
    userId: string,
    input: HealthRecordCreateInput,
  ): Promise<HealthRecord> {
    if (userId !== this.ownerId) throw new Error('Cuenta local inválida.');
    const id = generateUuid();
    const timestamp = nowTimestamp();

    await this.database.write(async () => {
      await validateLocalRecord(
        this.database,
        'health_records',
        inputRaw(id, input),
      );
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
      if (model.syncStatus === 'deleted') return null;
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
    await this.database.write(async () => {
      const model = await this.collection.find(id);
      if (model.syncStatus === 'deleted')
        throw new Error('El registro fue eliminado.');
      await validateLocalRecord(
        this.database,
        'health_records',
        inputRaw(id, input, model._raw),
      );
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
}
