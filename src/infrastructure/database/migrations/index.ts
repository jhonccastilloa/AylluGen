import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const databaseMigrations = schemaMigrations({
  migrations: [
    {
      // Establish migration history from the earliest known schema (version 2).
      // Version 3 only reorganizes source files; tables, columns and data stay intact.
      toVersion: 3,
      steps: [],
    },
  ],
});
