export const DB_TABLES = {
  species: 'species',
  animals: 'animals',
  breedings: 'breedings',
  healthRecords: 'health_records',
  productionRecords: 'production_records',
} as const;

export type DbTableName = (typeof DB_TABLES)[keyof typeof DB_TABLES];
