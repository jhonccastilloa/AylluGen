BEGIN;
LOCK TABLE animals, species, breedings, health_records, production_records IN SHARE ROW EXCLUSIVE MODE;

-- Deletion must never erase history or detach pedigree links.
DROP TRIGGER sync_animal_deleted ON animals;
DROP FUNCTION sync_animal_deleted();
ALTER TABLE animals DROP CONSTRAINT "animals_fatherId_fkey", DROP CONSTRAINT "animals_motherId_fkey";
ALTER TABLE animals ADD CONSTRAINT "animals_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES animals(id) ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE animals ADD CONSTRAINT "animals_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES animals(id) ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE health_records DROP CONSTRAINT "health_records_animalId_fkey";
ALTER TABLE health_records ADD CONSTRAINT "health_records_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES animals(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE production_records DROP CONSTRAINT "production_records_animalId_fkey";
ALTER TABLE production_records ADD CONSTRAINT "production_records_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES animals(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE breedings DROP CONSTRAINT "breedings_offspringId_fkey";
ALTER TABLE breedings ADD CONSTRAINT "breedings_offspringId_fkey" FOREIGN KEY ("offspringId") REFERENCES animals(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE breedings ADD CONSTRAINT "breedings_maleId_fkey" FOREIGN KEY ("maleId") REFERENCES animals(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE breedings ADD CONSTRAINT "breedings_femaleId_fkey" FOREIGN KEY ("femaleId") REFERENCES animals(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Finish old deletions only when unreferenced. Invalid legacy data aborts the
-- migration rather than silently deleting history or inventing identifiers.
DELETE FROM animals WHERE "deletedAt" IS NOT NULL;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE animals DROP COLUMN "deletedAt", DROP COLUMN "isFounder";
CREATE TYPE "AnimalStatus" AS ENUM ('ACTIVE', 'SOLD', 'DECEASED');
ALTER TABLE animals ADD COLUMN code TEXT,
  ADD COLUMN status "AnimalStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "exitDate" DATE,
  ALTER COLUMN crotal DROP NOT NULL,
  ALTER COLUMN "birthDate" TYPE DATE USING "birthDate"::date;

CREATE OR REPLACE FUNCTION sync_assert_relationships(owner_id TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM animals a LEFT JOIN species s ON s.id = a."speciesId"
    WHERE a."userId" = owner_id AND (s.id IS NULL OR s."userId" <> a."userId")
    UNION ALL
    SELECT 1 FROM animals a JOIN LATERAL (VALUES (a."fatherId", 'MALE'), (a."motherId", 'FEMALE')) p(id, sex) ON p.id IS NOT NULL
    LEFT JOIN animals parent ON parent.id = p.id
    WHERE a."userId" = owner_id AND
      (parent.id IS NULL OR parent."userId" <> a."userId"
       OR parent."speciesId" <> a."speciesId" OR parent.sex::text <> p.sex OR parent.id = a.id
       OR parent."birthDate" >= a."birthDate")
    UNION ALL
    SELECT 1 FROM health_records r LEFT JOIN animals a ON a.id = r."animalId"
    WHERE r."userId" = owner_id AND (a.id IS NULL OR a."userId" <> r."userId")
    UNION ALL
    SELECT 1 FROM production_records r LEFT JOIN animals a ON a.id = r."animalId"
    WHERE r."userId" = owner_id AND (a.id IS NULL OR a."userId" <> r."userId")
    UNION ALL
    SELECT 1 FROM breedings r JOIN LATERAL (VALUES (r."maleId"), (r."femaleId"), (r."offspringId")) p(id) ON p.id IS NOT NULL
    LEFT JOIN animals a ON a.id = p.id
    WHERE r."userId" = owner_id AND (a.id IS NULL OR a."userId" <> r."userId")
  ) THEN
    RAISE EXCEPTION 'Invalid animal relationships for owner %', owner_id USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    WITH RECURSIVE ancestry(child, ancestor) AS (
      SELECT a.id, p.id FROM animals a
      CROSS JOIN LATERAL (VALUES (a."fatherId"), (a."motherId")) p(id)
      WHERE a."userId" = owner_id AND p.id IS NOT NULL
      UNION
      SELECT ancestry.child, p.id FROM ancestry
      JOIN animals a ON a.id = ancestry.ancestor AND a."userId" = owner_id
      CROSS JOIN LATERAL (VALUES (a."fatherId"), (a."motherId")) p(id)
      WHERE p.id IS NOT NULL
    ) SELECT 1 FROM ancestry WHERE child = ancestor
  ) THEN
    RAISE EXCEPTION 'Cyclic animal ancestry for owner %', owner_id USING ERRCODE = '23514';
  END IF;
END $$;

SET CONSTRAINTS ALL DEFERRED;
UPDATE animals SET code = upper(btrim(crotal)), crotal = upper(btrim(crotal));
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE animals ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX "animals_userId_code_key" ON animals("userId", code);
CREATE INDEX "animals_userId_status_code_id_idx" ON animals("userId", status, code, id);
ALTER TABLE animals ADD CONSTRAINT animals_code_valid CHECK (length(code) BETWEEN 1 AND 50 AND code = upper(btrim(code))),
  ADD CONSTRAINT animals_crotal_valid CHECK (crotal IS NULL OR (length(crotal) BETWEEN 1 AND 50 AND crotal = upper(btrim(crotal)))),
  ADD CONSTRAINT animals_dates_valid CHECK (
    ("birthDate" IS NULL OR "birthDate" BETWEEN DATE '0001-01-01' AND (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date)
    AND ("exitDate" IS NULL OR "exitDate" BETWEEN DATE '0001-01-01' AND (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date)
    AND ("birthDate" IS NULL OR "exitDate" IS NULL OR "exitDate" >= "birthDate")
    AND (status <> 'ACTIVE' OR "exitDate" IS NULL)),
  ADD CONSTRAINT animals_parents_valid CHECK (
    "fatherId" IS DISTINCT FROM id AND "motherId" IS DISTINCT FROM id
    AND ("fatherId" IS NULL OR "motherId" IS NULL OR "fatherId" <> "motherId"));

-- The generic sync_track trigger now snapshots the new shape and still records
-- physical deletes as tombstones. Validate all owners, including legacy rows.
DO $$ DECLARE owner_id TEXT; BEGIN
  FOR owner_id IN SELECT id FROM users LOOP
    PERFORM sync_assert_relationships(owner_id);
  END LOOP;
END $$;
COMMIT;
