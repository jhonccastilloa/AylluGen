import { tableSchema } from '@nozbe/watermelondb';
import { DB_TABLES } from '@/infrastructure/database/constants';

export const healthRecordSchema = tableSchema({
  name: DB_TABLES.healthRecords,
  columns: [
    { name: 'animal_id', type: 'string', isIndexed: true },
    { name: 'type', type: 'string', isIndexed: true },
    { name: 'date', type: 'number' },
    { name: 'notes', type: 'string', isOptional: true },
    { name: 'next_due_date', type: 'number', isOptional: true },
    { name: 'completed', type: 'boolean', isIndexed: true },
    { name: 'user_id', type: 'string', isIndexed: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});
