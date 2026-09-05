import { appSchema } from '@nozbe/watermelondb';
import { animalSchema } from './animal.schema';
import { appMetaSchema } from './app-meta.schema';
import { breedingSchema } from './breeding.schema';
import { healthRecordSchema } from './health-record.schema';
import { productionRecordSchema } from './production-record.schema';
import { syncQueueSchema } from './sync-queue.schema';

export const databaseSchema = appSchema({
  version: 3,
  tables: [
    animalSchema,
    breedingSchema,
    healthRecordSchema,
    productionRecordSchema,
    syncQueueSchema,
    appMetaSchema,
  ],
});
