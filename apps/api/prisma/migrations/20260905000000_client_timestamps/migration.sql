ALTER TABLE "animals" ADD COLUMN "clientCreatedAt" TIMESTAMP(3), ADD COLUMN "clientUpdatedAt" TIMESTAMP(3);
UPDATE "animals" SET "clientCreatedAt" = "createdAt", "clientUpdatedAt" = "updatedAt";
ALTER TABLE "animals" ALTER COLUMN "clientCreatedAt" SET NOT NULL, ALTER COLUMN "clientCreatedAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "clientUpdatedAt" SET NOT NULL, ALTER COLUMN "clientUpdatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "breedings" ADD COLUMN "clientCreatedAt" TIMESTAMP(3), ADD COLUMN "clientUpdatedAt" TIMESTAMP(3);
UPDATE "breedings" SET "clientCreatedAt" = "createdAt", "clientUpdatedAt" = "updatedAt";
ALTER TABLE "breedings" ALTER COLUMN "clientCreatedAt" SET NOT NULL, ALTER COLUMN "clientCreatedAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "clientUpdatedAt" SET NOT NULL, ALTER COLUMN "clientUpdatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "health_records" ADD COLUMN "clientCreatedAt" TIMESTAMP(3), ADD COLUMN "clientUpdatedAt" TIMESTAMP(3);
UPDATE "health_records" SET "clientCreatedAt" = "createdAt", "clientUpdatedAt" = "updatedAt";
ALTER TABLE "health_records" ALTER COLUMN "clientCreatedAt" SET NOT NULL, ALTER COLUMN "clientCreatedAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "clientUpdatedAt" SET NOT NULL, ALTER COLUMN "clientUpdatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "production_records" ADD COLUMN "clientCreatedAt" TIMESTAMP(3), ADD COLUMN "clientUpdatedAt" TIMESTAMP(3);
UPDATE "production_records" SET "clientCreatedAt" = "createdAt", "clientUpdatedAt" = "updatedAt";
ALTER TABLE "production_records" ALTER COLUMN "clientCreatedAt" SET NOT NULL, ALTER COLUMN "clientCreatedAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "clientUpdatedAt" SET NOT NULL, ALTER COLUMN "clientUpdatedAt" SET DEFAULT CURRENT_TIMESTAMP;
