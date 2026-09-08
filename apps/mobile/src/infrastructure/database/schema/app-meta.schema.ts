import { tableSchema } from '@nozbe/watermelondb';
import { DB_TABLES } from '@/infrastructure/database/constants';

export const appMetaSchema = tableSchema({
  name: DB_TABLES.appMeta,
  columns: [
    { name: 'meta_key', type: 'string', isIndexed: true },
    { name: 'meta_value', type: 'string' },
    { name: 'updated_at', type: 'number' },
  ],
});
