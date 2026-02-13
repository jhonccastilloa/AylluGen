import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Database } from '@nozbe/watermelondb';
import { databaseSchema } from '@/infrastructure/database/schema';
import {
  AnimalModel,
  AppMetaModel,
  BreedingModel,
  HealthRecordModel,
  ProductionRecordModel,
  SyncQueueModel,
} from '@/infrastructure/database/models';

const adapter = new SQLiteAdapter({
  schema: databaseSchema,
  dbName: 'ayllugen_offline',
  jsi: true,
  onSetUpError: error => {
    console.error('WatermelonDB setup failed', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    AnimalModel,
    BreedingModel,
    HealthRecordModel,
    ProductionRecordModel,
    SyncQueueModel,
    AppMetaModel,
  ],
});
