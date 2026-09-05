import { tableSchema } from '@nozbe/watermelondb';
import { DB_TABLES } from '@/infrastructure/database/constants';

export const breedingSchema = tableSchema({
  name: DB_TABLES.breedings,
  columns: [
    { name: 'male_id', type: 'string', isIndexed: true },
    { name: 'female_id', type: 'string', isIndexed: true },
    { name: 'projected_coi', type: 'number' },
    { name: 'risk_level', type: 'string' },
    { name: 'offspring_id', type: 'string', isOptional: true },
    { name: 'breeding_date', type: 'number', isOptional: true },
    { name: 'notes', type: 'string', isOptional: true },
    { name: 'user_id', type: 'string', isIndexed: true },
    { name: 'sync_status', type: 'string', isIndexed: true },
    { name: 'sync_version', type: 'number' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});
