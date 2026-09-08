import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import type { DirtyRaw } from '@nozbe/watermelondb/RawRecord';
import { databaseSchema } from '@/infrastructure/database/schema';
import { databaseMigrations } from '@/infrastructure/database/migrations';
import {
  AnimalModel,
  BreedingModel,
  HealthRecordModel,
  ProductionRecordModel,
  SyncQueueModel,
  AppMetaModel,
} from '@/infrastructure/database/models';
import { SpeciesModel } from '@/infrastructure/database/models/SpeciesModel';
import { generateUuid } from '@/features/shared/utils/id';

export const OWNER = '11111111-1111-4111-8111-111111111111';
export const OTHER = '22222222-2222-4222-8222-222222222222';
export function testDatabase() {
  return new Database({
    adapter: new LokiJSAdapter({
      schema: databaseSchema,
      migrations: databaseMigrations,
      dbName: generateUuid(),
      useWebWorker: false,
      useIncrementalIndexedDB: true,
      extraLokiOptions: { autosave: false },
    }),
    modelClasses: [
      SpeciesModel,
      AnimalModel,
      BreedingModel,
      HealthRecordModel,
      ProductionRecordModel,
      SyncQueueModel,
      AppMetaModel,
    ],
  });
}
export async function seed(db: Database, table: string, raw: DirtyRaw) {
  await db.write(() =>
    db.batch(
      db.get(table).prepareCreateFromDirtyRaw({
        id: generateUuid(),
        user_id: OWNER,
        created_at: 1000,
        updated_at: 1000,
        _status: 'synced',
        _changed: '',
        sync_status: 'SYNCED',
        sync_version: 1,
        ...raw,
      }),
    ),
  );
}
