import { PreservingSQLiteAdapter } from './PreservingSQLiteAdapter';
import { Database } from '@nozbe/watermelondb';
import { Platform } from 'react-native';
import { databaseSchema } from '@/infrastructure/database/schema';
import {
  AnimalModel,
  BreedingModel,
  HealthRecordModel,
  ProductionRecordModel,
} from '@/infrastructure/database/models';

import { SpeciesModel } from './models/SpeciesModel';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
import { generateUuid } from '@/features/shared/utils/id';

setGenerator(generateUuid);

export function createDatabase(dbName: string): Database {
  const adapter = new PreservingSQLiteAdapter({
    schema: databaseSchema,
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
    ],
  });
}

export function databaseReady(db: Database): Promise<void> {
  return (db.adapter.underlyingAdapter as PreservingSQLiteAdapter)
    .initializingPromise;
}
