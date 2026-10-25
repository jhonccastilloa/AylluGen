import { tableSchema } from '@nozbe/watermelondb';

export const speciesColumns = [
  { name: 'name', type: 'string' },
  { name: 'description', type: 'string', isOptional: true },
  { name: 'user_id', type: 'string', isIndexed: true },
  { name: 'created_at', type: 'number' },
  { name: 'updated_at', type: 'number' },
] as const;

export const speciesSchema = tableSchema({
  name: 'species',
  columns: [...speciesColumns],
});
