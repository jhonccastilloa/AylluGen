import { appSchema } from '@nozbe/watermelondb';
import { animalSchema } from './animal.schema';
import { breedingSchema } from './breeding.schema';
import { healthRecordSchema } from './health-record.schema';
import { productionRecordSchema } from './production-record.schema';
import { speciesSchema } from './species.schema';

export const databaseSchema = appSchema({
  version: 7,
  tables: [
    speciesSchema,
    animalSchema,
    breedingSchema,
    healthRecordSchema,
    productionRecordSchema,
  ],
});
