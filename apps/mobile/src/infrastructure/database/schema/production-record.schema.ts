import { tableSchema } from '@nozbe/watermelondb';
import { DB_TABLES } from '@/infrastructure/database/constants';

export const productionRecordSchema = tableSchema({
  name: DB_TABLES.productionRecords,
  columns: [
    { name: 'animal_id', type: 'string', isIndexed: true },
    { name: 'type', type: 'string', isIndexed: true },
    { name: 'date', type: 'number' },
    { name: 'value', type: 'number' },
    { name: 'unit', type: 'string' },
    { name: 'quality_score', type: 'number', isOptional: true },
    { name: 'notes', type: 'string', isOptional: true },
    { name: 'user_id', type: 'string', isIndexed: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});
