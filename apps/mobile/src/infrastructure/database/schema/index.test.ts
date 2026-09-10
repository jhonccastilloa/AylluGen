import { databaseSchema } from './index';

it('defines one clean schema with five business tables and mandatory animal species', () => {
  expect(databaseSchema.version).toBe(7);
  expect(Object.keys(databaseSchema.tables).sort()).toEqual([
    'animals',
    'breedings',
    'health_records',
    'production_records',
    'species',
  ]);
  expect(databaseSchema.tables.animals.columns.species_id.isOptional).not.toBe(
    true,
  );
  for (const { columns } of Object.values(databaseSchema.tables)) {
    expect(columns.created_at.type).toBe('number');
    expect(columns.updated_at.type).toBe('number');
    for (const name of [
      'client_created_at',
      'client_updated_at',
      'sync_status',
      'sync_version',
    ])
      expect(columns).not.toHaveProperty(name);
  }
});
