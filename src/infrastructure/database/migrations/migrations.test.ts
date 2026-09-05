import { stepsForMigration } from '@nozbe/watermelondb/Schema/migrations/stepsForMigration';
import { databaseSchema } from '../schema';
import { databaseMigrations } from './index';

it('covers the current schema version with valid migrations', () => {
  expect(databaseMigrations.maxVersion).toBe(databaseSchema.version);
  expect(
    stepsForMigration({
      migrations: databaseMigrations,
      fromVersion: 2,
      toVersion: databaseSchema.version,
    }),
  ).not.toBeNull();
});

it('upgrades version 2 to 3 without modifying existing tables or data', () => {
  expect(
    stepsForMigration({
      migrations: databaseMigrations,
      fromVersion: 2,
      toVersion: 3,
    }),
  ).toEqual([]);
});

it('does not claim to support the unknown version 1 schema', () => {
  expect(
    stepsForMigration({
      migrations: databaseMigrations,
      fromVersion: 1,
      toVersion: databaseSchema.version,
    }),
  ).toBeNull();
});
