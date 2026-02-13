export const DB_TABLES = {
  animals: 'animals',
  breedings: 'breedings',
  healthRecords: 'health_records',
  productionRecords: 'production_records',
  syncQueue: 'sync_queue',
  appMeta: 'app_meta',
} as const;

export type DbTableName = (typeof DB_TABLES)[keyof typeof DB_TABLES];
