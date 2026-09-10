-- One device-date contract for all synchronized business entities.
BEGIN;
LOCK TABLE species, breedings, health_records, production_records IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE species
  ADD COLUMN "clientCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "clientUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE breedings DROP COLUMN "syncStatus", DROP COLUMN "syncVersion";
ALTER TABLE health_records DROP COLUMN "syncStatus", DROP COLUMN "syncVersion";
ALTER TABLE production_records DROP COLUMN "syncStatus", DROP COLUMN "syncVersion";
DROP TYPE "SyncStatus";

-- Update snapshot shape without recording artificial edits or resetting checkpoints.
UPDATE sync_records SET data = data - 'syncStatus' - 'syncVersion'
WHERE "tableName" IN ('breedings', 'health_records', 'production_records') AND data IS NOT NULL;
UPDATE sync_records r SET data = r.data || jsonb_build_object(
  'clientCreatedAt', s."clientCreatedAt", 'clientUpdatedAt', s."clientUpdatedAt")
FROM species s WHERE r."tableName" = 'species' AND r."recordId" = s.id AND r.data IS NOT NULL;
COMMIT;
