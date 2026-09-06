import {
  addColumns,
  createTable,
  schemaMigrations,
} from '@nozbe/watermelondb/Schema/migrations';
import { speciesColumns } from '../schema/species.schema';

export const databaseMigrations = schemaMigrations({
  migrations: [
    {
      // Establish migration history from the earliest known schema (version 2).
      // Version 3 only reorganizes source files; tables, columns and data stay intact.
      toVersion: 3,
      steps: [],
    },
    {
      toVersion: 4,
      steps: [
        createTable({ name: 'species', columns: [...speciesColumns] }),
        addColumns({
          table: 'animals',
          columns: [
            {
              name: 'species_id',
              type: 'string',
              isOptional: true,
              isIndexed: true,
            },
          ],
        }),
      ],
    },
  ],
});
