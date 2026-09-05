import { tableSchema } from '@nozbe/watermelondb';
import { DB_TABLES } from '@/infrastructure/database/constants';

export const animalSchema = tableSchema({
  name: DB_TABLES.animals,
  columns: [
    { name: 'crotal', type: 'string', isIndexed: true },
    { name: 'sex', type: 'string', isIndexed: true },
    { name: 'species', type: 'string' },
    { name: 'birth_date', type: 'number', isOptional: true },
    { name: 'is_founder', type: 'boolean' },
    { name: 'father_id', type: 'string', isOptional: true },
    { name: 'mother_id', type: 'string', isOptional: true },
    { name: 'user_id', type: 'string', isIndexed: true },
    { name: 'sync_status', type: 'string', isIndexed: true },
    { name: 'sync_version', type: 'number' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
    { name: 'deleted_at', type: 'number', isOptional: true },
  ],
});
