BEGIN;

-- Hold writes during backfill and trigger installation. No application IDs change.
LOCK TABLE users, species, animals, breedings, health_records, production_records IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE sync_clocks (
  "userId" TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  version BIGINT NOT NULL DEFAULT 1 CHECK (version BETWEEN 1 AND 9007199254740991)
);
CREATE TABLE sync_records (
  "tableName" TEXT NOT NULL CHECK ("tableName" IN ('species','animals','breedings','health_records','production_records')),
  "recordId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "createdVersion" BIGINT NOT NULL,
  version BIGINT NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT false,
  data JSONB,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("tableName", "recordId")
);
CREATE INDEX "sync_records_userId_version_idx" ON sync_records("userId", version);
CREATE INDEX "sync_records_userId_tableName_idx" ON sync_records("userId", "tableName");
CREATE INDEX "sync_records_recordId_idx" ON sync_records("recordId");
-- JSON snapshots avoid per-record fetches during pull; relation indexes bound cascade checks.
CREATE INDEX "sync_records_animalId_idx" ON sync_records("userId", (data->>'animalId')) WHERE NOT deleted;
CREATE INDEX "sync_records_maleId_idx" ON sync_records("userId", (data->>'maleId')) WHERE NOT deleted;
CREATE INDEX "sync_records_femaleId_idx" ON sync_records("userId", (data->>'femaleId')) WHERE NOT deleted;
CREATE INDEX "sync_records_offspringId_idx" ON sync_records("userId", (data->>'offspringId')) WHERE NOT deleted;
CREATE INDEX "sync_records_fatherId_idx" ON sync_records("userId", (data->>'fatherId')) WHERE NOT deleted;
CREATE INDEX "sync_records_motherId_idx" ON sync_records("userId", (data->>'motherId')) WHERE NOT deleted;
CREATE TABLE sync_receipts (
  "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  hash TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", hash)
);

INSERT INTO sync_clocks ("userId") SELECT id FROM users;
DO $$
DECLARE t TEXT; invalid_ids BOOLEAN;
BEGIN
  FOREACH t IN ARRAY ARRAY['species','animals','breedings','health_records','production_records'] LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE id !~ %L)', t,
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') INTO invalid_ids;
    IF invalid_ids THEN RAISE EXCEPTION 'Invalid legacy IDs in %; audit before enabling sync', t USING ERRCODE = '23514'; END IF;
    EXECUTE format('INSERT INTO sync_records ("tableName", "recordId", "userId", "createdVersion", version, deleted, data)
      SELECT %L, id, "userId", 1, 1,
        COALESCE(to_jsonb(r)->>''deletedAt'', '''') <> '''',
        CASE WHEN COALESCE(to_jsonb(r)->>''deletedAt'', '''') <> '''' THEN NULL ELSE to_jsonb(r) END
      FROM %I r', t, t);
  END LOOP;
END $$;

CREATE FUNCTION sync_new_user() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO sync_clocks ("userId") VALUES (NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER sync_new_user AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION sync_new_user();

-- The counter row is a transaction-held mutex shared by *every* writer for this owner.
-- Unlike nextval(), increment and commit cannot be observed out of order.
CREATE FUNCTION sync_track_record() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r JSONB; owner_id TEXT; record_id TEXT; next_version BIGINT; is_deleted BOOLEAN;
BEGIN
  r := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  owner_id := r->>'userId';
  record_id := r->>'id';
  -- ON DELETE CASCADE may run before the clock's own cascade. Updating a
  -- clock whose owner has already disappeared would violate its foreign key.
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = owner_id) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND (OLD."userId" <> NEW."userId" OR OLD.id <> NEW.id) THEN
    RAISE EXCEPTION 'Sync identity and ownership are immutable' USING ERRCODE = '23514';
  END IF;
  -- Account deletion cascades remove all synchronization state too.
  UPDATE sync_clocks SET version = version + 1 WHERE "userId" = owner_id RETURNING version INTO next_version;
  IF next_version IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Sync owner does not exist' USING ERRCODE = '23503';
  END IF;
  is_deleted := TG_OP = 'DELETE' OR COALESCE(r->>'deletedAt', '') <> '';
  IF TG_OP = 'INSERT' AND EXISTS (
    SELECT 1 FROM sync_records WHERE "tableName" = TG_TABLE_NAME AND "recordId" = record_id
      AND (deleted OR "userId" <> owner_id)
  ) THEN
    RAISE EXCEPTION 'Sync identity cannot be reused' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND NOT is_deleted AND EXISTS (
    SELECT 1 FROM sync_records WHERE "tableName" = TG_TABLE_NAME AND "recordId" = record_id AND deleted
  ) THEN
    RAISE EXCEPTION 'Deleted sync record cannot be resurrected' USING ERRCODE = '23514';
  END IF;
  IF TG_OP <> 'DELETE' THEN
    NEW."updatedAt" := clock_timestamp();
    IF TG_OP = 'INSERT' THEN NEW."createdAt" := NEW."updatedAt"; END IF;
    r := to_jsonb(NEW);
  END IF;
  INSERT INTO sync_records ("tableName", "recordId", "userId", "createdVersion", version, deleted, data, "changedAt")
    VALUES (TG_TABLE_NAME, record_id, owner_id, next_version, next_version, is_deleted,
      CASE WHEN is_deleted THEN NULL ELSE r END, clock_timestamp())
    ON CONFLICT ("tableName", "recordId") DO UPDATE SET
      version = EXCLUDED.version, deleted = EXCLUDED.deleted, data = EXCLUDED.data, "changedAt" = EXCLUDED."changedAt"
      WHERE sync_records."userId" = EXCLUDED."userId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sync identity belongs to another owner' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['species','animals','breedings','health_records','production_records'] LOOP
    EXECUTE format('CREATE TRIGGER sync_track BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION sync_track_record()', t);
  END LOOP;
END $$;

-- Preserve historical animal rows for pedigree and dependent records. Soft-deleted
-- animals remain as local tombstones; references are detached and owned records deleted.
CREATE FUNCTION sync_animal_deleted() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'DELETE') OR (NEW."deletedAt" IS NOT NULL AND OLD."deletedAt" IS NULL) THEN
    DELETE FROM health_records WHERE "animalId" = OLD.id;
    DELETE FROM production_records WHERE "animalId" = OLD.id;
    DELETE FROM breedings WHERE "maleId" = OLD.id OR "femaleId" = OLD.id;
    UPDATE breedings SET "offspringId" = NULL WHERE "offspringId" = OLD.id;
    UPDATE animals SET "fatherId" = NULL WHERE "fatherId" = OLD.id;
    UPDATE animals SET "motherId" = NULL WHERE "motherId" = OLD.id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER sync_animal_deleted AFTER UPDATE OR DELETE ON animals FOR EACH ROW EXECUTE FUNCTION sync_animal_deleted();

-- Match Prisma's existing FK semantics but permit batch genealogy inserts in any order.
ALTER TABLE animals ALTER CONSTRAINT "animals_fatherId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE animals ALTER CONSTRAINT "animals_motherId_fkey" DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX "animals_fatherId_idx" ON animals("fatherId");
CREATE INDEX "animals_motherId_idx" ON animals("motherId");
CREATE INDEX "breedings_offspringId_idx" ON breedings("offspringId");
COMMIT;
