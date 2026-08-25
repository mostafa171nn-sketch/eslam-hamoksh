-- AlterEnum
ALTER TYPE "WalletTransactionType" ADD VALUE 'SETTLEMENT';

-- AlterTable: Add settlementNumber as nullable first, then backfill, then enforce.
ALTER TABLE "Settlement" ADD COLUMN "settlementNumber" TEXT;

-- Backfill existing rows with a generated number
DO $$
DECLARE
  r RECORD;
  seq INT := 0;
BEGIN
  FOR r IN SELECT id, "createdAt" FROM "Settlement" ORDER BY "createdAt" LOOP
    seq := seq + 1;
    UPDATE "Settlement" SET "settlementNumber" = 'STL-' || EXTRACT(YEAR FROM r."createdAt")::TEXT || '-' || LPAD(seq::TEXT, 6, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- Enforce NOT NULL
ALTER TABLE "Settlement" ALTER COLUMN "settlementNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_settlementNumber_key" ON "Settlement"("settlementNumber");

-- CreateIndex
CREATE INDEX "Settlement_settlementNumber_idx" ON "Settlement"("settlementNumber");
