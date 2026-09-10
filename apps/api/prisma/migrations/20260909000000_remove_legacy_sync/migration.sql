-- Development cleanup: the retired queue protocol no longer has consumers.
-- Native sync clocks, records, receipts and their triggers are unchanged.
BEGIN;
DROP TABLE "sync_logs";
DROP TYPE "SyncAction";
COMMIT;
