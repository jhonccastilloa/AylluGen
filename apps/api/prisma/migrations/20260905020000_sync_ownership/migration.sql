BEGIN;
LOCK TABLE species, animals, breedings, health_records, production_records IN SHARE ROW EXCLUSIVE MODE;

-- Refuse to activate native sync over corrupt legacy relationships. Report/remediate
-- these rows before deployment; do not silently transfer ownership or delete history.
CREATE FUNCTION sync_assert_relationships(owner_id TEXT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM animals a LEFT JOIN species s ON s.id = a."speciesId"
    WHERE a."userId" = owner_id AND a."deletedAt" IS NULL
      AND (s.id IS NULL OR s."userId" <> a."userId" OR s."deletedAt" IS NOT NULL)
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

DO $$
DECLARE owner_id TEXT;
BEGIN
  FOR owner_id IN SELECT id FROM users LOOP
    PERFORM sync_assert_relationships(owner_id);
  END LOOP;
END $$;

CREATE FUNCTION sync_check_relationships() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id TEXT;
BEGIN
  owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."userId" ELSE NEW."userId" END;
  -- Validate once per owner at commit, after all rows/cascades in the batch exist.
  -- pg_temp state is transaction-scoped and never shared between requests.
  IF to_regclass('pg_temp.sync_checked_owners') IS NULL THEN
    CREATE TEMP TABLE sync_checked_owners (id TEXT PRIMARY KEY) ON COMMIT DROP;
  END IF;
  IF EXISTS (SELECT 1 FROM sync_checked_owners WHERE id = owner_id) THEN RETURN NULL; END IF;
  INSERT INTO sync_checked_owners VALUES (owner_id);
  PERFORM sync_assert_relationships(owner_id);
  RETURN NULL;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['species','animals','breedings','health_records','production_records'] LOOP
    EXECUTE format('CREATE CONSTRAINT TRIGGER sync_relationships AFTER INSERT OR UPDATE OR DELETE ON %I
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sync_check_relationships()', t);
  END LOOP;
END $$;
COMMIT;
