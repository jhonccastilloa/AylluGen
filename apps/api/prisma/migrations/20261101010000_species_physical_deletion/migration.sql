BEGIN;
LOCK TABLE species, animals IN SHARE ROW EXCLUSIVE MODE;

-- Finish previous soft deletions. The existing RESTRICT foreign key prevents
-- deleting any species still referenced by an animal, including historical rows.
DELETE FROM species WHERE "deletedAt" IS NOT NULL;
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE species DROP COLUMN "deletedAt";

-- Preserve all relationship checks; species now exist or are physically absent.
CREATE OR REPLACE FUNCTION sync_assert_relationships(owner_id TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM animals a LEFT JOIN species s ON s.id = a."speciesId"
    WHERE a."userId" = owner_id AND a."deletedAt" IS NULL
      AND (s.id IS NULL OR s."userId" <> a."userId")
    UNION ALL
    SELECT 1 FROM animals a JOIN LATERAL (VALUES (a."fatherId", 'MALE'), (a."motherId", 'FEMALE')) p(id, sex) ON p.id IS NOT NULL
    LEFT JOIN animals parent ON parent.id = p.id
    WHERE a."userId" = owner_id AND a."deletedAt" IS NULL AND
      (parent.id IS NULL OR parent."userId" <> a."userId" OR parent."deletedAt" IS NOT NULL
       OR parent."speciesId" <> a."speciesId" OR parent.sex::text <> p.sex OR parent.id = a.id)
    UNION ALL
    SELECT 1 FROM health_records r LEFT JOIN animals a ON a.id = r."animalId"
    WHERE r."userId" = owner_id AND (a.id IS NULL OR a."userId" <> r."userId" OR a."deletedAt" IS NOT NULL)
    UNION ALL
    SELECT 1 FROM production_records r LEFT JOIN animals a ON a.id = r."animalId"
    WHERE r."userId" = owner_id AND (a.id IS NULL OR a."userId" <> r."userId" OR a."deletedAt" IS NOT NULL)
    UNION ALL
    SELECT 1 FROM breedings r JOIN LATERAL (VALUES (r."maleId"), (r."femaleId"), (r."offspringId")) p(id) ON p.id IS NOT NULL
    LEFT JOIN animals a ON a.id = p.id
    WHERE r."userId" = owner_id AND (a.id IS NULL OR a."userId" <> r."userId" OR a."deletedAt" IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Invalid legacy/sync relationships; audit owner % before enabling sync', owner_id USING ERRCODE = '23514';
  END IF;
END $$;

-- sync_track already records physical deletions as tombstones.
UPDATE sync_records SET data = data - 'deletedAt'
WHERE "tableName" = 'species' AND data IS NOT NULL;

COMMIT;
