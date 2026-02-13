import { Q } from '@nozbe/watermelondb';
import { database } from '@/infrastructure/database';
import { DB_TABLES, type DbTableName } from '@/infrastructure/database/constants';
import type { SyncQueueModel } from '@/infrastructure/database/models/SyncQueueModel';
import type { AppMetaModel } from '@/infrastructure/database/models/AppMetaModel';
import type {
  SyncAction,
  SyncQueueEntry,
} from '@/features/sync/interfaces/sync.types';
import { consolidateSyncQueueEntries } from '@/features/sync/services/syncQueueCompactor';
import { nowTimestamp } from '@/features/shared/utils/date';
import { generateUuid } from '@/features/shared/utils/id';

const LAST_SYNC_KEY = 'last_sync_at';
const DEVICE_ID_KEY = 'device_id';

const parsePayload = (payload: string | null): Record<string, unknown> | null => {
  if (!payload) return null;

  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const toPayloadString = (payload: Record<string, unknown> | null): string | null =>
  payload ? JSON.stringify(payload) : null;

const toDomain = (model: SyncQueueModel): SyncQueueEntry => ({
  id: model.id,
  tableName: model.tableName as DbTableName,
  recordId: model.recordId,
  action: model.action as SyncAction,
  payload: parsePayload(model.payload),
  clientVersion: model.clientVersion,
  createdAt: model.createdAt,
});

export class SyncQueueRepository {
  private queueCollection = database.get<SyncQueueModel>(DB_TABLES.syncQueue);
  private metaCollection = database.get<AppMetaModel>(DB_TABLES.appMeta);

  async enqueue(
    tableName: DbTableName,
    action: SyncAction,
    recordId: string,
    payload: Record<string, unknown> | null,
    clientVersion: number,
  ): Promise<void> {
    const existingModels = await this.queueCollection
      .query(
        Q.where('table_name', tableName),
        Q.where('record_id', recordId),
      )
      .fetch();
    const existingEntries = existingModels.map(toDomain).sort(
      (left, right) => left.createdAt - right.createdAt,
    );

    const compactedEntries = consolidateSyncQueueEntries([
      ...existingEntries,
      {
        id: generateUuid(),
        tableName,
        recordId,
        action,
        payload,
        clientVersion,
        createdAt: nowTimestamp(),
      },
    ]);

    await database.write(async () => {
      if (existingModels.length > 0) {
        await database.batch(
          ...existingModels.map(model => model.prepareDestroyPermanently()),
        );
      }

      for (const entry of compactedEntries) {
        await this.queueCollection.create(record => {
          (record._raw as { id: string }).id = generateUuid();
          record.tableName = entry.tableName;
          record.action = entry.action;
          record.recordId = entry.recordId;
          record.payload = toPayloadString(entry.payload);
          record.clientVersion = entry.clientVersion;
          record.createdAt = entry.createdAt;
        });
      }
    });
  }

  async listPending(): Promise<SyncQueueEntry[]> {
    const records = await this.queueCollection.query().fetch();
    return records
      .map(toDomain)
      .sort((left, right) => left.createdAt - right.createdAt);
  }

  async clear(entries: SyncQueueEntry[]): Promise<void> {
    await this.clearByIds(entries.map(entry => entry.id));
  }

  async clearByIds(entryIds: string[]): Promise<void> {
    if (entryIds.length === 0) return;

    const modelsToDelete = await Promise.all(
      entryIds.map(async entryId => {
        try {
          return await this.queueCollection.find(entryId);
        } catch {
          return null;
        }
      }),
    );
    const existingModels = modelsToDelete.filter(
      (model): model is SyncQueueModel => model !== null,
    );
    if (existingModels.length === 0) return;

    await database.write(async () => {
      await database.batch(
        ...existingModels.map(model => model.prepareDestroyPermanently()),
      );
    });
  }

  async pendingCount(): Promise<number> {
    return this.queueCollection.query().fetchCount();
  }

  async setLastSyncAt(value: string): Promise<void> {
    await this.upsertMeta(LAST_SYNC_KEY, value);
  }

  async getLastSyncAt(): Promise<string | undefined> {
    return this.getMeta(LAST_SYNC_KEY);
  }

  async getOrCreateDeviceId(): Promise<string> {
    const existing = await this.getMeta(DEVICE_ID_KEY);
    if (existing) return existing;

    const newDeviceId = `mobile-${generateUuid()}`;
    await this.upsertMeta(DEVICE_ID_KEY, newDeviceId);
    return newDeviceId;
  }

  private async getMeta(key: string): Promise<string | undefined> {
    const records = await this.metaCollection.query(Q.where('meta_key', key)).fetch();
    return records[0]?.metaValue;
  }

  private async upsertMeta(key: string, value: string): Promise<void> {
    const records = await this.metaCollection.query(Q.where('meta_key', key)).fetch();
    const timestamp = nowTimestamp();

    await database.write(async () => {
      if (records[0]) {
        await records[0].update(record => {
          record.metaValue = value;
          record.updatedAt = timestamp;
        });
        return;
      }

      await this.metaCollection.create(record => {
        (record._raw as { id: string }).id = generateUuid();
        record.metaKey = key;
        record.metaValue = value;
        record.updatedAt = timestamp;
      });
    });
  }
}

