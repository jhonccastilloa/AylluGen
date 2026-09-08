import { tableSchema } from '@nozbe/watermelondb';
import { DB_TABLES } from '@/infrastructure/database/constants';

export const syncQueueSchema = tableSchema({
  name: DB_TABLES.syncQueue,
  columns: [
    { name: 'table_name', type: 'string', isIndexed: true },
    { name: 'record_id', type: 'string', isIndexed: true },
    { name: 'action', type: 'string', isIndexed: true },
    { name: 'payload', type: 'string', isOptional: true },
    { name: 'client_version', type: 'number' },
    { name: 'created_at', type: 'number' },
  ],
});
