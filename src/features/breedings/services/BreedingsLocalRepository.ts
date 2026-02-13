import { Q } from '@nozbe/watermelondb';
import { database } from '@/infrastructure/database';
import { DB_TABLES } from '@/infrastructure/database/constants';
import type { BreedingModel } from '@/infrastructure/database/models/BreedingModel';
import type {
  Breeding,
  BreedingCreateInput,
  BreedingUpdateInput,
  RiskLevel,
} from '@/features/breedings/interfaces/breedings.types';
import type { SyncStatus } from '@/features/shared/interfaces/common.types';
import {
  isoToTimestamp,
  nowTimestamp,
  timestampToIso,
} from '@/features/shared/utils/date';
import { generateUuid } from '@/features/shared/utils/id';

const toIsoOrEmpty = (value?: number | null): string =>
  timestampToIso(value) ?? new Date(0).toISOString();

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
  syncStatus: model.recordSyncStatus as SyncStatus,
  syncVersion: model.syncVersion,
  createdAt: toIsoOrEmpty(model.createdAt),
  updatedAt: toIsoOrEmpty(model.updatedAt),
});

export class BreedingsLocalRepository {
  private collection = database.get<BreedingModel>(DB_TABLES.breedings);

  async listByUserId(userId: string): Promise<Breeding[]> {
    const records = await this.collection.query(Q.where('user_id', userId)).fetch();
    return records
      .map(toDomain)
      .filter(record => record.syncStatus !== 'DELETED')
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getById(id: string): Promise<Breeding | null> {
    try {
      const model = await this.collection.find(id);
      const record = toDomain(model);
      return record.syncStatus === 'DELETED' ? null : record;
    } catch {
      return null;
    }
  }

  async createLocal(userId: string, input: BreedingCreateInput): Promise<Breeding> {
    const id = generateUuid();
    const timestamp = nowTimestamp();

    await database.write(async () => {
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
        record.recordSyncStatus = 'PENDING';
        record.syncVersion = 1;
        record.createdAt = timestamp;
        record.updatedAt = timestamp;
      });
    });

    const localBreeding = await this.getById(id);
    if (!localBreeding) throw new Error('No se pudo crear el cruce localmente');
    return localBreeding;
  }

  async updateLocal(id: string, input: BreedingUpdateInput): Promise<Breeding | null> {
    try {
      await database.write(async () => {
        const model = await this.collection.find(id);
        await model.update(record => {
          if (input.breedingDate !== undefined) {
            record.breedingDate = isoToTimestamp(input.breedingDate);
          }
          if (input.notes !== undefined) record.notes = input.notes;
          if (input.offspringId !== undefined) record.offspringId = input.offspringId;
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

  async listByAnimalId(userId: string, animalId: string): Promise<Breeding[]> {
    const records = await this.collection.query(Q.where('user_id', userId)).fetch();

    return records
      .map(toDomain)
      .filter(
        record =>
          record.syncStatus !== 'DELETED' &&
          (record.maleId === animalId || record.femaleId === animalId),
      )
      .sort((left, right) =>
        (right.breedingDate ?? right.updatedAt).localeCompare(
          left.breedingDate ?? left.updatedAt,
        ),
      );
  }

  async upsertFromServer(records: Breeding[]): Promise<void> {
    await database.write(async () => {
      for (const record of records) {
        try {
          const existing = await this.collection.find(record.id);
          await existing.update(item => {
            item.maleId = record.maleId;
            item.femaleId = record.femaleId;
            item.projectedCoi = record.projectedCOI;
            item.riskLevel = record.riskLevel;
            item.offspringId = record.offspringId;
            item.breedingDate = isoToTimestamp(record.breedingDate);
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
            item.maleId = record.maleId;
            item.femaleId = record.femaleId;
            item.projectedCoi = record.projectedCOI;
            item.riskLevel = record.riskLevel;
            item.offspringId = record.offspringId;
            item.breedingDate = isoToTimestamp(record.breedingDate);
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

