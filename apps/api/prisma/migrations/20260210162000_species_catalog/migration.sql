-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "species_userId_code_key" ON "species"("userId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "species_userId_name_key" ON "species"("userId", "name");

-- CreateIndex
CREATE INDEX "species_userId_idx" ON "species"("userId");

-- AddForeignKey
ALTER TABLE "species" ADD CONSTRAINT "species_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add speciesId to animals and backfill from enum value
ALTER TABLE "animals" ADD COLUMN "speciesId" TEXT;

INSERT INTO "species" ("id", "code", "name", "userId", "createdAt", "updatedAt")
SELECT
    LOWER(
      SUBSTRING(hash FROM 1 FOR 8) || '-' ||
      SUBSTRING(hash FROM 9 FOR 4) || '-' ||
      SUBSTRING(hash FROM 13 FOR 4) || '-' ||
      SUBSTRING(hash FROM 17 FOR 4) || '-' ||
      SUBSTRING(hash FROM 21 FOR 12)
    ) AS id,
    species_code,
    CASE species_code
      WHEN 'SHEEP' THEN 'Sheep'
      WHEN 'ALPACA' THEN 'Alpaca'
      WHEN 'LLAMA' THEN 'Llama'
      WHEN 'VICUGNA' THEN 'Vicugna'
      ELSE species_code
    END AS name,
    "userId",
    NOW(),
    NOW()
FROM (
    SELECT
      "userId",
      "species"::text AS species_code,
      MD5("userId" || ':' || "species"::text) AS hash
    FROM "animals"
    GROUP BY "userId", "species"
) AS distinct_species
ON CONFLICT ("userId", "code") DO NOTHING;

UPDATE "animals" AS a
SET "speciesId" = s."id"
FROM "species" AS s
WHERE s."userId" = a."userId"
  AND s."code" = a."species"::text;

ALTER TABLE "animals" ALTER COLUMN "speciesId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "animals_speciesId_idx" ON "animals"("speciesId");

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove old enum column
ALTER TABLE "animals" DROP COLUMN "species";

-- DropEnum
DROP TYPE "Species";
