-- Species are identified by id; code is no longer part of their contract.
BEGIN;

DROP INDEX "species_userId_code_key";
ALTER TABLE "species" DROP COLUMN "code";

-- Keep stored snapshots aligned without creating artificial sync changes.
UPDATE sync_records
SET data = data - 'code'
WHERE "tableName" = 'species' AND data IS NOT NULL;

COMMIT;
