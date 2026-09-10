-- AlterTable
ALTER TABLE "Center" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Center" ADD COLUMN "shortDescription" TEXT;
ALTER TABLE "Center" ADD COLUMN "workingHoursText" TEXT;
ALTER TABLE "Center" ADD COLUMN "equipment" JSONB;
ALTER TABLE "Center" ADD COLUMN "photos" JSONB;