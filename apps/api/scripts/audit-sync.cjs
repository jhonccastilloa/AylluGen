// Read-only deployment preflight. Prints counts, never connection strings or record data.
require('dotenv/config');
const { Client } = require('pg');
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const versions = await client.query('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name');
    console.log(JSON.stringify({ appliedMigrations: versions.rows.map(row => row.migration_name) }));
    for (const table of ['species', 'animals', 'breedings', 'health_records', 'production_records']) {
      const result = await client.query(`SELECT COUNT(*)::int AS records, COUNT(DISTINCT "userId")::int AS owners,
        COUNT(*) FILTER (WHERE id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')::int AS invalid_ids,
        (SELECT COALESCE(MAX(n), 0)::int FROM (SELECT COUNT(*) n FROM "${table}" GROUP BY "userId") counts) AS max_per_owner
        FROM "${table}"`);
      console.log(JSON.stringify({ table, ...result.rows[0] }));
      if (result.rows[0].invalid_ids) process.exitCode = 2;
    }
    const invalid = await client.query(`
      SELECT COUNT(*)::int AS invalid_relationships FROM (
        SELECT a.id FROM animals a LEFT JOIN species s ON s.id = a."speciesId"
        WHERE a."deletedAt" IS NULL AND (s.id IS NULL OR s."userId" <> a."userId" OR s."deletedAt" IS NOT NULL)
        UNION ALL
        SELECT a.id FROM animals a JOIN LATERAL (VALUES (a."fatherId", 'MALE'), (a."motherId", 'FEMALE')) p(id, sex) ON p.id IS NOT NULL
        LEFT JOIN animals parent ON parent.id = p.id WHERE a."deletedAt" IS NULL AND
          (parent.id IS NULL OR parent."userId" <> a."userId" OR parent."deletedAt" IS NOT NULL OR parent."speciesId" <> a."speciesId" OR parent.sex::text <> p.sex OR parent.id = a.id)
        UNION ALL
        SELECT r.id FROM health_records r LEFT JOIN animals a ON a.id = r."animalId" WHERE a.id IS NULL OR a."userId" <> r."userId" OR a."deletedAt" IS NOT NULL
        UNION ALL
        SELECT r.id FROM production_records r LEFT JOIN animals a ON a.id = r."animalId" WHERE a.id IS NULL OR a."userId" <> r."userId" OR a."deletedAt" IS NOT NULL
        UNION ALL
        SELECT r.id FROM breedings r JOIN LATERAL (VALUES (r."maleId"), (r."femaleId"), (r."offspringId")) p(id) ON p.id IS NOT NULL
        LEFT JOIN animals a ON a.id = p.id WHERE a.id IS NULL OR a."userId" <> r."userId" OR a."deletedAt" IS NOT NULL
      ) invalid`);
    console.log(JSON.stringify(invalid.rows[0]));
    if (invalid.rows[0].invalid_relationships) process.exitCode = 2;
    await client.query('ROLLBACK');
  } finally { await client.end(); }
}
main().catch(error => { console.error('Sync audit unavailable:', error.code ?? error.name); process.exitCode = 1; });
