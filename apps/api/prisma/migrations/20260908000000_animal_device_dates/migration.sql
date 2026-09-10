BEGIN;
LOCK TABLE animals IN SHARE ROW EXCLUSIVE MODE;

-- Drop only obsolete row-level tracking. Native checkpoints, tombstones and
-- receipts stay intact; device dates and server audit dates are preserved.
ALTER TABLE animals DROP COLUMN "syncStatus", DROP COLUMN "syncVersion";
UPDATE sync_records
SET data = data - 'syncStatus' - 'syncVersion'
WHERE "tableName" = 'animals' AND data IS NOT NULL;

COMMIT;
