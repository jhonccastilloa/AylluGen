import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Database } from '@nozbe/watermelondb';
import { databaseSchema } from '@/infrastructure/database/schema';
import { databaseMigrations } from '@/infrastructure/database/migrations';
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
  migrations: databaseMigrations,
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
