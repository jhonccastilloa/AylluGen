import { PreservingSQLiteAdapter } from './PreservingSQLiteAdapter';
import { Database } from '@nozbe/watermelondb';
import { Platform } from 'react-native';
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

import { SpeciesModel } from './models/SpeciesModel';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
import { generateUuid } from '@/features/shared/utils/id';

setGenerator(generateUuid);

export function createDatabase(dbName: string): Database {
  const adapter = new PreservingSQLiteAdapter({
    schema: databaseSchema,
    migrations: databaseMigrations,
    dbName,
    // Android currently autolinks the standard SQLite bridge, not android-jsi.
    // Both adapters support native transactions and the same sync protocol.
    jsi: Platform.OS === 'ios',
    onSetUpError: error => {
      console.error('WatermelonDB setup failed', { name: error.name });
    },
  });

  return new Database({
    adapter,
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

// Kept as an archive; the new application only writes per-account databases.
let legacy: Database | undefined;
export function getLegacyDatabase(): Database {
  return (legacy ??= createDatabase('ayllugen_offline'));
}

export function databaseReady(db: Database): Promise<void> {
  return (db.adapter.underlyingAdapter as PreservingSQLiteAdapter)
    .initializingPromise;
}
